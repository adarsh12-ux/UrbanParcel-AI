from __future__ import annotations

import logging
import json
import importlib.util
import os
import re
import shutil
import tempfile
import threading
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
except ImportError:
    pass

try:
    import geopandas as gpd
    import numpy as np
    import rasterio
    import requests
    from pyproj import Transformer
    from rasterio.features import shapes
    from rasterio.windows import Window
    from shapely.geometry import LineString, box, mapping, shape
    from shapely.ops import transform as shapely_transform
    from skimage.morphology import skeletonize
    from supabase import Client, create_client
except ImportError as dependency_error:
    gpd = np = rasterio = requests = None
    Transformer = Window = LineString = box = mapping = shape = shapely_transform = skeletonize = None
    Client = create_client = None
    dependency_error_message = str(dependency_error)
else:
    dependency_error_message = None

torch = AutoImageProcessor = SegformerForSemanticSegmentation = None
ai_dependency_error = None if (
    importlib.util.find_spec("torch") is not None
    and importlib.util.find_spec("transformers") is not None
) else "PyTorch or Hugging Face Transformers is not installed"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("urbanparcel.worker")

MODEL_ID = os.getenv("MODEL_ID", "nvidia/segformer-b0-finetuned-ade-512-512")
ROAD_MODEL_ID = os.getenv("ROAD_MODEL_ID", "teohyc/Satellite-Road-Segmentation-UNet")
ROAD_MODEL_URL = os.getenv("ROAD_MODEL_URL", "https://huggingface.co/teohyc/Satellite-Road-Segmentation-UNet/resolve/main/best_road_seg_unet.pth?download=true")
ROAD_MODEL_PATH = Path(os.getenv("ROAD_MODEL_PATH", Path(__file__).resolve().parents[1] / "models" / "best_road_seg_unet.pth"))
ROAD_MODEL_THRESHOLD = float(os.getenv("ROAD_MODEL_THRESHOLD", "0.5"))
OUTPUT_SRID = int(os.getenv("OUTPUT_SRID", "4326"))
TILE_SIZE = int(os.getenv("TILE_SIZE", "512"))
MIN_FEATURE_AREA_M2 = float(os.getenv("MIN_FEATURE_AREA_M2", "12"))
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ALLOWED_ORIGINS = [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5175,http://localhost:5173,http://localhost:3000").split(",") if origin.strip()]

app = FastAPI(title="UrbanParcelAI real AI processing service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

supabase: Client | None = None
_model: SegformerForSemanticSegmentation | None = None
_processor: AutoImageProcessor | None = None
_model_lock = threading.Lock()
_road_model = None
_road_model_lock = threading.Lock()


class JobRequest(BaseModel):
    job_id: str
    project_id: str
    imagery_id: str
    imagery_bucket: str = "orthomosaics"
    imagery_path: str | None = None
    output_srid: int = Field(default=OUTPUT_SRID, ge=1, le=998999)


def get_supabase() -> Client:
    global supabase
    if supabase is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required by the backend")
        supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    return supabase


def require_processing_dependencies() -> None:
    if dependency_error_message:
        raise RuntimeError(f"Required processing dependency is missing: {dependency_error_message}. Install backend\\requirements.txt in the active virtual environment.")


def require_ai_model() -> None:
    require_processing_dependencies()
    if ai_dependency_error or not MODEL_ID:
        raise RuntimeError("AI model is not configured yet.")


def update_job(job_id: str, status: str, progress: int, step: str, logs: list[str], error: str | None = None) -> None:
    payload: dict[str, Any] = {
        "status": status,
        "progress": max(0, min(100, progress)),
        "current_step": step,
        "logs": logs,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if error:
        payload["error_message"] = error
    if status == "completed":
        payload["completed_at"] = datetime.now(timezone.utc).isoformat()
    try:
        get_supabase().table("processing_jobs").update(payload).eq("id", job_id).execute()
    except RuntimeError as database_error:
        logger.warning("job %s status was not persisted: %s", job_id, database_error)
    except Exception:
        logger.exception("database error updating job %s", job_id)


def fetch_imagery(bucket: str, path: str) -> bytes:
    require_processing_dependencies()
    client = get_supabase()
    try:
        signed = client.storage.from_(bucket).create_signed_url(path, 3600)
        signed_url = signed.get("signedURL") or signed.get("signedUrl")
        if not signed_url:
            raise RuntimeError("Supabase did not return a signed imagery URL")
        response = requests.get(signed_url, timeout=180)
        response.raise_for_status()
        return response.content
    except Exception:
        logger.exception("upload/storage error while downloading %s/%s", bucket, path)
        raise


def load_model() -> tuple[AutoImageProcessor, SegformerForSemanticSegmentation]:
    require_ai_model()
    global _model, _processor, torch, AutoImageProcessor, SegformerForSemanticSegmentation, ai_dependency_error
    with _model_lock:
        if _model is None or _processor is None:
            try:
                import torch as torch_module
                from transformers import AutoImageProcessor as processor_class
                from transformers import SegformerForSemanticSegmentation as model_class
                torch = torch_module
                AutoImageProcessor = processor_class
                SegformerForSemanticSegmentation = model_class
            except ImportError as dependency_error:
                ai_dependency_error = str(dependency_error)
                raise RuntimeError("AI model is not configured yet.") from dependency_error
            logger.info("loading pretrained model %s", MODEL_ID)
            _processor = AutoImageProcessor.from_pretrained(MODEL_ID)
            _model = SegformerForSemanticSegmentation.from_pretrained(MODEL_ID)
            _model.eval()
            logger.info("pretrained model %s loaded", MODEL_ID)
    return _processor, _model


def load_road_model():
    global _road_model, torch
    require_processing_dependencies()
    if importlib.util.find_spec("torch") is None:
        raise RuntimeError("Road AI model requires PyTorch")
    with _road_model_lock:
        if _road_model is not None:
            return _road_model
        import torch as torch_module
        import torch.nn as nn

        class ConvBlock(nn.Module):
            def __init__(self, input_channels: int, output_channels: int):
                super().__init__()
                self.conv = nn.Sequential(
                    nn.Conv2d(input_channels, output_channels, kernel_size=3, padding=1),
                    nn.BatchNorm2d(output_channels),
                    nn.ReLU(inplace=True),
                    nn.Conv2d(output_channels, output_channels, kernel_size=3, padding=1),
                    nn.BatchNorm2d(output_channels),
                    nn.ReLU(inplace=True),
                    nn.Dropout(0.3),
                )

            def forward(self, value):
                return self.conv(value)

        class RoadUNet(nn.Module):
            def __init__(self):
                super().__init__()
                self.enc1 = ConvBlock(3, 64)
                self.enc2 = ConvBlock(64, 128)
                self.enc3 = ConvBlock(128, 256)
                self.enc4 = ConvBlock(256, 512)
                self.pool = nn.MaxPool2d(2)
                self.bottleneck = ConvBlock(512, 1024)
                self.upconv4 = nn.ConvTranspose2d(1024, 512, kernel_size=2, stride=2)
                self.dec4 = ConvBlock(1024, 512)
                self.upconv3 = nn.ConvTranspose2d(512, 256, kernel_size=2, stride=2)
                self.dec3 = ConvBlock(512, 256)
                self.upconv2 = nn.ConvTranspose2d(256, 128, kernel_size=2, stride=2)
                self.dec2 = ConvBlock(256, 128)
                self.upconv1 = nn.ConvTranspose2d(128, 64, kernel_size=2, stride=2)
                self.dec1 = ConvBlock(128, 64)
                self.conv_final = nn.Conv2d(64, 1, kernel_size=1)

            def forward(self, value):
                enc1 = self.enc1(value)
                enc2 = self.enc2(self.pool(enc1))
                enc3 = self.enc3(self.pool(enc2))
                enc4 = self.enc4(self.pool(enc3))
                bottleneck = self.bottleneck(self.pool(enc4))
                dec4 = self.dec4(torch.cat([self.upconv4(bottleneck), enc4], dim=1))
                dec3 = self.dec3(torch.cat([self.upconv3(dec4), enc3], dim=1))
                dec2 = self.dec2(torch.cat([self.upconv2(dec3), enc2], dim=1))
                dec1 = self.dec1(torch.cat([self.upconv1(dec2), enc1], dim=1))
                return torch.sigmoid(self.conv_final(dec1))

        if not ROAD_MODEL_PATH.exists():
            ROAD_MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
            temporary_path = ROAD_MODEL_PATH.with_suffix(".download")
            logger.info("downloading road segmentation model %s", ROAD_MODEL_ID)
            with requests.get(ROAD_MODEL_URL, stream=True, timeout=300) as response:
                response.raise_for_status()
                with temporary_path.open("wb") as handle:
                    for chunk in response.iter_content(chunk_size=1024 * 1024):
                        if chunk:
                            handle.write(chunk)
            temporary_path.replace(ROAD_MODEL_PATH)
        model = RoadUNet()
        state = torch_module.load(ROAD_MODEL_PATH, map_location="cpu", weights_only=False)
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        model.load_state_dict(state)
        model.eval()
        torch = torch_module
        _road_model = model
        logger.info("road segmentation model %s loaded", ROAD_MODEL_ID)
    return _road_model


def infer_road_mask(image: np.ndarray) -> np.ndarray:
    from PIL import Image

    model = load_road_model()
    source_height, source_width = image.shape[:2]
    resized = Image.fromarray(image).resize((256, 256))
    tensor = torch.from_numpy(np.asarray(resized, dtype=np.float32).transpose(2, 0, 1) / 255.0).unsqueeze(0)
    with torch.inference_mode():
        prediction = model(tensor)
        prediction = torch.nn.functional.interpolate(prediction, size=(source_height, source_width), mode="bilinear", align_corners=False)
    return (prediction[0, 0].cpu().numpy() >= ROAD_MODEL_THRESHOLD)


def rgb_tile(dataset: rasterio.DatasetReader, window: Window) -> np.ndarray:
    count = dataset.count
    indexes = [1, 2, 3] if count >= 3 else [1, 1, 1]
    bands = dataset.read(indexes, window=window, boundless=True, fill_value=0).astype(np.float32)
    result = np.zeros((bands.shape[1], bands.shape[2], 3), dtype=np.uint8)
    for channel in range(3):
        band = bands[channel]
        valid = np.isfinite(band)
        if valid.any():
            low, high = np.percentile(band[valid], [2, 98])
            if high <= low:
                high = low + 1
            result[:, :, channel] = np.clip((band - low) * 255 / (high - low), 0, 255).astype(np.uint8)
    return result


def infer_mask(image: np.ndarray, processor: AutoImageProcessor, model: SegformerForSemanticSegmentation) -> tuple[np.ndarray, np.ndarray, list[str]]:
    inputs = processor(images=image, return_tensors="pt")
    with torch.inference_mode():
        logits = model(**inputs).logits
    logits = torch.nn.functional.interpolate(logits, size=image.shape[:2], mode="bilinear", align_corners=False)
    probabilities = torch.softmax(logits, dim=1)[0]
    confidence, labels = probabilities.max(dim=0)
    id_to_label = model.config.id2label
    label_names = [str(id_to_label.get(index, id_to_label.get(str(index), "unknown"))).lower() for index in range(logits.shape[1])]
    return labels.cpu().numpy(), confidence.cpu().numpy(), label_names


def line_from_skeleton(mask: np.ndarray, transform: rasterio.Affine) -> LineString | None:
    skeleton = skeletonize(mask)
    rows, cols = np.where(skeleton)
    if len(rows) < 2:
        return None
    coordinates = [transform * (float(col) + 0.5, float(row) + 0.5) for row, col in zip(rows, cols)]
    if len(coordinates) > 250:
        coordinates = coordinates[:: max(1, len(coordinates) // 250)]
    line = LineString(coordinates)
    return line if line.is_valid and not line.is_empty and line.length > 0 else None


def extract_geojson(path: str, output_srid: int, on_stage) -> dict[str, Any]:
    processor, model = load_model()
    features: list[dict[str, Any]] = []
    road_model_error: str | None = None
    with rasterio.open(path) as dataset:
        if dataset.crs is None or dataset.transform is None:
            raise ValueError("The GeoTIFF has no CRS or affine transform")
        if dataset.width < 2 or dataset.height < 2:
            raise ValueError("The raster dimensions are too small for feature extraction")
        source_crs = dataset.crs
        to_output = Transformer.from_crs(source_crs, f"EPSG:{output_srid}", always_xy=True).transform
        total_tiles = ((dataset.width + TILE_SIZE - 1) // TILE_SIZE) * ((dataset.height + TILE_SIZE - 1) // TILE_SIZE)
        tile_number = 0
        label_names: list[str] = []
        for top in range(0, dataset.height, TILE_SIZE):
            for left in range(0, dataset.width, TILE_SIZE):
                tile_number += 1
                window = Window(left, top, min(TILE_SIZE, dataset.width - left), min(TILE_SIZE, dataset.height - top))
                image = rgb_tile(dataset, window)
                labels, confidence, label_names = infer_mask(image, processor, model)
                tile_transform = dataset.window_transform(window)
                building_ids = [index for index, name in enumerate(label_names) if any(term in name for term in ("building", "house", "skyscraper", "roof"))]
                road_ids = [index for index, name in enumerate(label_names) if "road" in name]
                for feature_type, class_ids in (("building", building_ids), ("road", road_ids)):
                    if not class_ids:
                        continue
                    binary = np.isin(labels, class_ids)
                    if feature_type == "road":
                        geometry = line_from_skeleton(binary, tile_transform)
                        if geometry is None:
                            continue
                        geometry = shapely_transform(to_output, geometry)
                        features.append({"type": "Feature", "geometry": mapping(geometry), "properties": {"feature_type": "road", "confidence": float(confidence[binary].mean()), "source": "ai_extracted", "model": MODEL_ID}})
                        continue
                    for raw_geometry, value in shapes(binary.astype(np.uint8), mask=binary, transform=tile_transform):
                        geometry = shape(raw_geometry)
                        if geometry.is_empty or geometry.area <= 0:
                            continue
                        if geometry.is_empty or not geometry.is_valid:
                            continue
                        if source_crs.is_projected and geometry.area < MIN_FEATURE_AREA_M2:
                            continue
                        area_sqm = float(geometry.area) if source_crs.is_projected else None
                        geometry = shapely_transform(to_output, geometry).buffer(0)
                        if geometry.is_empty or not geometry.is_valid:
                            continue
                        features.append({"type": "Feature", "geometry": mapping(geometry), "properties": {"feature_type": "building", "area_sqm": area_sqm, "confidence": float(confidence[binary].mean()), "source": "ai_extracted", "model": MODEL_ID}})
                if road_model_error is None:
                    try:
                        road_mask = infer_road_mask(image)
                        road_geometry = line_from_skeleton(road_mask, tile_transform)
                        if road_geometry is not None:
                            road_geometry = shapely_transform(to_output, road_geometry)
                            if road_geometry.is_valid and not road_geometry.is_empty:
                                features.append({"type": "Feature", "geometry": mapping(road_geometry), "properties": {"feature_type": "road", "source": "ai_extracted", "model": ROAD_MODEL_ID}})
                    except Exception as road_error:
                        road_model_error = str(road_error)
                        logger.exception("road model unavailable; continuing with building extraction")
                on_stage(20 + int(tile_number / max(total_tiles, 1) * 55), f"AI inference tile {tile_number}/{total_tiles}")
        if not label_names:
            raise ValueError("The model returned no semantic labels")
        logger.info("geometry generation produced %s features from %s tiles", len(features), total_tiles)
        if not features:
            raise ValueError("The pretrained model produced no building or road geometries above the configured threshold")
        geo_frame = gpd.GeoDataFrame.from_features(features, crs=f"EPSG:{output_srid}")
        geo_frame = geo_frame[geo_frame.geometry.notna() & ~geo_frame.geometry.is_empty].copy()
        if not geo_frame.geometry.is_valid.all():
            geo_frame["geometry"] = geo_frame.geometry.buffer(0)
        validated_features = json.loads(geo_frame.to_json()) ["features"]
        return {"type": "FeatureCollection", "features": validated_features, "properties": {"source_crs": source_crs.to_string(), "output_crs": f"EPSG:{output_srid}", "model": MODEL_ID, "road_model": ROAD_MODEL_ID, "road_model_error": road_model_error, "prototype": True}}


def save_output(job: JobRequest, geojson: dict[str, Any]) -> None:
    logger.info("saving GeoJSON and extracted records for job %s", job.job_id)
    response = get_supabase().rpc("save_processing_output", {"p_job_id": job.job_id, "p_project_id": job.project_id, "p_geojson": geojson}).execute()
    if getattr(response, "data", None) is None:
        raise RuntimeError("Supabase did not confirm processing output storage")


def run_job(job: JobRequest, source_path: str | None = None, source_bytes: bytes | None = None) -> None:
    logs: list[str] = []
    try:
        def stage(progress: int, message: str, status: str = "processing") -> None:
            logs.append(message)
            update_job(job.job_id, status, progress, message, logs[-30:])
            logger.info("job %s: %s", job.job_id, message)

        stage(5, "Validating GeoTIFF and CRS", "validating")
        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as handle:
            if source_bytes is not None:
                handle.write(source_bytes)
            elif source_path:
                handle.write(Path(source_path).read_bytes())
            else:
                handle.write(fetch_imagery(job.imagery_bucket, job.imagery_path or ""))
            local_path = handle.name
        try:
            with rasterio.open(local_path) as dataset:
                if dataset.driver not in ("GTiff", "COG"):
                    raise ValueError(f"Unsupported raster driver: {dataset.driver}")
                if dataset.crs is None:
                    raise ValueError("The uploaded TIFF is not georeferenced: CRS is missing")
                if dataset.transform is None:
                    raise ValueError("The uploaded TIFF is not georeferenced: affine transform is missing")
                logger.info("raster metadata width=%s height=%s bands=%s crs=%s", dataset.width, dataset.height, dataset.count, dataset.crs)
            stage(12, "Raster metadata validated")
            geojson = extract_geojson(local_path, job.output_srid, stage)
            stage(80, "AI masks converted to geospatial geometries", "extracting features")
            stage(90, "Validating and saving GeoJSON", "generating GIS layers")
            save_output(job, geojson)
            stage(100, f"Completed: saved {len(geojson['features'])} AI-assisted features", "completed")
        finally:
            Path(local_path).unlink(missing_ok=True)
            if source_path:
                Path(source_path).unlink(missing_ok=True)
    except Exception as exc:
        logger.exception("inference/geometry/database error for job %s", job.job_id)
        error_message = "AI model is not configured yet." if isinstance(exc, (OSError, ImportError)) or "model" in str(exc).lower() or "checkpoint" in str(exc).lower() else str(exc)
        update_job(job.job_id, "failed", 100, "Processing failed", logs[-30:], error_message)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "configured": bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY),
        "model": MODEL_ID,
        "model_configured": bool(MODEL_ID and ai_dependency_error is None and dependency_error_message is None),
        "ai_dependency_error": ai_dependency_error,
        "dependency_error": dependency_error_message,
        "prototype": True,
    }


@app.get("/v1/imagery/{project_id}")
async def project_imagery(project_id: str) -> dict[str, Any]:
    try:
        imagery = get_supabase().table("project_imagery").select("storage_bucket,storage_path,metadata,crs").eq("project_id", project_id).order("created_at", desc=True).limit(1).maybe_single().execute().data
        if not imagery or not imagery.get("storage_path"):
            return {"url": None, "bounds": None}
        signed = get_supabase().storage.from_(imagery["storage_bucket"]).create_signed_url(imagery["storage_path"], 3600)
        signed_url = signed.get("signedURL") or signed.get("signedUrl")
        if not signed_url:
            raise RuntimeError("Supabase did not return a signed imagery URL")
        bounds = None
        raw_bounds = (imagery.get("metadata") or {}).get("bounds")
        crs_match = re.search(r"EPSG:(\d+)", imagery.get("crs") or "")
        if isinstance(raw_bounds, list) and len(raw_bounds) == 4 and crs_match:
            transformer = Transformer.from_crs(f"EPSG:{crs_match.group(1)}", "EPSG:4326", always_xy=True)
            west, south = transformer.transform(float(raw_bounds[0]), float(raw_bounds[1]))
            east, north = transformer.transform(float(raw_bounds[2]), float(raw_bounds[3]))
            bounds = [[south, west], [north, east]]
        return {"url": signed_url, "bounds": bounds, "crs": imagery.get("crs")}
    except Exception as imagery_error:
        logger.exception("could not load imagery for project %s", project_id)
        raise HTTPException(status_code=502, detail=f"Could not load project imagery: {imagery_error}") from imagery_error


@app.get("/api/projects")
async def projects() -> list[dict[str, str]]:
    return []


@app.post("/v1/jobs", status_code=202)
async def start_job(request: JobRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    if not request.imagery_path:
        try:
            row = get_supabase().table("project_imagery").select("storage_bucket,storage_path").eq("id", request.imagery_id).eq("project_id", request.project_id).single().execute().data
            request.imagery_bucket = row["storage_bucket"]
            request.imagery_path = row["storage_path"]
        except Exception as exc:
            logger.exception("database error resolving imagery %s", request.imagery_id)
            raise HTTPException(status_code=400, detail=f"Could not resolve imagery record: {exc}") from exc
    background_tasks.add_task(run_job, request)
    return {"job_id": request.job_id, "status": "accepted", "model": MODEL_ID}


@app.post("/v1/process", status_code=202)
async def process_uploaded_file(
    background_tasks: BackgroundTasks,
    file: UploadFile | None = File(None),
    job_id: str | None = Form(None),
    project_id: str = Form(...),
    imagery_id: str | None = Form(None),
    output_srid: int = Form(OUTPUT_SRID),
) -> dict[str, Any]:
    if not file and not imagery_id:
        raise HTTPException(status_code=400, detail="Provide a GeoTIFF file or an imagery_id for an existing Supabase upload.")
    source_path: str | None = None
    if file:
        if not file.filename or not file.filename.lower().endswith((".tif", ".tiff", ".geotiff")):
            raise HTTPException(status_code=400, detail="Only GeoTIFF files are accepted")
        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as temporary_file:
            source_path = temporary_file.name
            content = await file.read()
            if not content:
                Path(source_path).unlink(missing_ok=True)
                raise HTTPException(status_code=400, detail="The uploaded GeoTIFF is empty")
            temporary_file.write(content)
        try:
            with rasterio.open(source_path) as dataset:
                if dataset.crs is None or dataset.transform is None:
                    raise HTTPException(status_code=400, detail="The uploaded TIFF is not georeferenced: CRS and affine transform are required.")
                logger.info("received GeoTIFF %s: %sx%s, %s bands, CRS %s", file.filename, dataset.width, dataset.height, dataset.count, dataset.crs)
        except HTTPException:
            Path(source_path).unlink(missing_ok=True)
            raise
        except Exception as raster_error:
            Path(source_path).unlink(missing_ok=True)
            raise HTTPException(status_code=400, detail=f"Could not read GeoTIFF metadata: {raster_error}") from raster_error
    try:
        require_processing_dependencies()
        require_ai_model()
    except RuntimeError as dependency_error:
        if source_path:
            Path(source_path).unlink(missing_ok=True)
        raise HTTPException(status_code=503, detail=str(dependency_error)) from dependency_error
    request = JobRequest(job_id=job_id or str(__import__("uuid").uuid4()), project_id=project_id, imagery_id=imagery_id or "direct-upload", output_srid=output_srid)
    if source_path is None:
        if not imagery_id:
            raise HTTPException(status_code=400, detail="imagery_id is required when retrying an existing upload.")
        try:
            imagery_row = get_supabase().table("project_imagery").select("storage_bucket,storage_path").eq("id", imagery_id).eq("project_id", project_id).single().execute().data
            request.imagery_bucket = imagery_row["storage_bucket"]
            request.imagery_path = imagery_row["storage_path"]
        except Exception as imagery_error:
            logger.exception("database error resolving imagery %s", imagery_id)
            raise HTTPException(status_code=400, detail=f"Could not resolve imagery record: {imagery_error}") from imagery_error
    background_tasks.add_task(run_job, request, source_path=source_path)
    return {"job_id": request.job_id, "status": "accepted", "model": MODEL_ID}


@app.post("/v1/cadastral-import")
async def import_official_cadastral(
    project_id: str = Form(...),
    file: UploadFile = File(...),
) -> dict[str, Any]:
    filename = (file.filename or "").lower()
    if not filename.endswith((".geojson", ".json", ".zip")):
        raise HTTPException(status_code=400, detail="Upload a parcel GeoJSON file or a ZIP containing a Shapefile")
    content = await file.read()
    if not content or len(content) > 200 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="The cadastral file must be larger than 0 bytes and no larger than 200 MB")

    temporary_directory = Path(tempfile.mkdtemp(prefix="urbanparcel-cadastral-"))
    try:
        source_path = temporary_directory / (Path(file.filename or "cadastral-upload").name)
        source_path.write_bytes(content)
        read_path = source_path
        if filename.endswith(".zip"):
            with zipfile.ZipFile(source_path) as archive:
                members = archive.infolist()
                if len(members) > 1000 or any(member.file_size > 200 * 1024 * 1024 for member in members):
                    raise HTTPException(status_code=400, detail="The Shapefile ZIP contains an oversized member")
                for member in members:
                    member_path = Path(member.filename)
                    if member_path.is_absolute() or ".." in member_path.parts:
                        raise HTTPException(status_code=400, detail="The Shapefile ZIP contains an unsafe path")
                archive.extractall(temporary_directory / "extracted")
            shapefiles = list((temporary_directory / "extracted").rglob("*.shp"))
            if len(shapefiles) != 1:
                raise HTTPException(status_code=400, detail="The ZIP must contain exactly one Shapefile")
            read_path = shapefiles[0]

        project = get_supabase().table("projects").select("id,center_lat,center_lng,survey_area_sq_km").eq("id", project_id).single().execute().data
        if not project:
            raise HTTPException(status_code=404, detail="Project was not found")
        try:
            cadastral = gpd.read_file(read_path)
        except Exception as read_error:
            raise HTTPException(status_code=400, detail=f"Could not read cadastral data: {read_error}") from read_error
        if cadastral.empty or cadastral.crs is None:
            raise HTTPException(status_code=400, detail="Cadastral data must contain features and a declared CRS")
        if cadastral.crs.is_geographic and cadastral.crs.to_epsg() is None:
            logger.info("cadastral import has a non-EPSG geographic CRS: %s", cadastral.crs)
        cadastral = cadastral.to_crs("EPSG:4326")
        cadastral = cadastral[cadastral.geometry.notna() & ~cadastral.geometry.is_empty].copy()
        cadastral["geometry"] = cadastral.geometry.buffer(0)
        if cadastral.empty or not cadastral.geometry.is_valid.all():
            raise HTTPException(status_code=400, detail="Cadastral geometries must be non-empty and valid")
        if not cadastral.geometry.geom_type.eq("Polygon").all():
            raise HTTPException(status_code=400, detail="Cadastral parcel geometries must be Polygon features")

        identifier_fields = {str(column).lower(): column for column in cadastral.columns if column != "geometry"}
        identifier_column = next((identifier_fields[name] for name in ("parcel_identifier", "parcel_id", "parcel_no", "parcel_number", "survey_number", "survey_no", "id") if name in identifier_fields), None)
        if identifier_column is None:
            raise HTTPException(status_code=400, detail="Cadastral data must include a parcel identifier field")
        identifiers = cadastral[identifier_column].astype(str).str.strip()
        if identifiers.eq("").any() or identifiers.isna().any() or identifiers.duplicated().any():
            raise HTTPException(status_code=400, detail="Parcel identifiers must be present and unique")

        center_lat = float(project.get("center_lat") or 0)
        center_lng = float(project.get("center_lng") or 0)
        area_sq_km = max(float(project.get("survey_area_sq_km") or 1), 0.01)
        half_side_degrees = (area_sq_km ** 0.5) / 111.0
        project_extent = box(center_lng - half_side_degrees, center_lat - half_side_degrees, center_lng + half_side_degrees, center_lat + half_side_degrees)
        if not cadastral.geometry.intersects(project_extent).all():
            raise HTTPException(status_code=400, detail="Cadastral features fall outside the configured project extent")

        collection = json.loads(cadastral.to_json())
        for feature, identifier in zip(collection["features"], identifiers.tolist()):
            properties = feature.setdefault("properties", {})
            properties["parcel_identifier"] = identifier
            properties["source"] = "official_cadastral"
            properties["import_file"] = file.filename
            feature["properties"] = properties
        response = get_supabase().rpc("import_official_cadastral", {"p_project_id": project_id, "p_geojson": collection}).execute()
        return {"status": "imported", "project_id": project_id, **(response.data or {})}
    except HTTPException:
        raise
    except Exception as import_error:
        logger.exception("official cadastral import failed for project %s", project_id)
        raise HTTPException(status_code=500, detail=f"Official cadastral import failed: {import_error}") from import_error
    finally:
        shutil.rmtree(temporary_directory, ignore_errors=True)
