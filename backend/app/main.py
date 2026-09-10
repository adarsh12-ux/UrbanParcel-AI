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
import uuid
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
    from pyproj import Geod, Transformer
    from rasterio.features import shapes
    from rasterio.windows import Window
    from scipy.ndimage import label as nd_label
    from shapely.geometry import LineString, MultiPolygon, Point, Polygon, box, mapping, shape
    from shapely.ops import transform as shapely_transform, unary_union
    from shapely.validation import make_valid
    from skimage.morphology import disk, opening, remove_small_holes, remove_small_objects, skeletonize
    from supabase import Client, create_client
except ImportError as dependency_error:
    gpd = np = rasterio = requests = None
    Geod = Transformer = Window = LineString = MultiPolygon = Point = Polygon = box = mapping = shape = shapely_transform = unary_union = make_valid = None
    nd_label = disk = opening = remove_small_holes = remove_small_objects = skeletonize = None
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

MODEL_ID = os.getenv("MODEL_ID", "tomascanivari/segformer-b0-finetuned-buildings")
BUILDING_MODEL_ID = os.getenv("BUILDING_MODEL_ID", MODEL_ID)
BUILDING_MODEL_THRESHOLD = float(os.getenv("BUILDING_MODEL_THRESHOLD", os.getenv("BUILDING_THRESHOLD", "0.35")))
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


class CadastralConfirmRequest(BaseModel):
    project_id: str
    preview_id: str


_cadastral_previews: dict[str, dict[str, Any]] = {}


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
            logger.info("loading pretrained building model %s", BUILDING_MODEL_ID)
            _processor = AutoImageProcessor.from_pretrained(BUILDING_MODEL_ID)
            _model = SegformerForSemanticSegmentation.from_pretrained(BUILDING_MODEL_ID)
            _model.eval()
            logger.info("pretrained building model %s loaded", BUILDING_MODEL_ID)
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


def clean_binary_mask(mask: np.ndarray, min_object_size: int = 16, hole_fill_size: int = 36) -> np.ndarray:
    if not mask.any():
        return mask
    try:
        mask = remove_small_objects(mask, max_size=min_object_size)
    except TypeError:
        mask = remove_small_objects(mask, min_size=min_object_size)
    try:
        mask = remove_small_holes(mask, max_size=hole_fill_size)
    except TypeError:
        mask = remove_small_holes(mask, area_threshold=hole_fill_size)
    return mask


def infer_building_mask(
    image: np.ndarray,
    processor: AutoImageProcessor,
    model: SegformerForSemanticSegmentation,
) -> tuple[np.ndarray, np.ndarray]:
    """Infers building presence on an aerial RGB tile and returns a cleaned boolean mask and confidence map."""
    inputs = processor(images=image, return_tensors="pt")
    with torch.inference_mode():
        logits = model(**inputs).logits
    logits = torch.nn.functional.interpolate(logits, size=image.shape[:2], mode="bilinear", align_corners=False)
    probabilities = torch.softmax(logits, dim=1)[0]
    id_to_label = {
        int(k): str(v).lower()
        for k, v in getattr(model.config, "id2label", {}).items()
    }

    # Identify building-related class indices
    building_class_ids = [
        idx for idx, name in id_to_label.items()
        if any(term in name for term in ("building", "house", "skyscraper", "roof", "structure", "shed", "residential", "edifice", "wall"))
    ]

    if len(id_to_label) == 2:
        # Standard binary building segmentation model (0: background, 1: building)
        building_idx = building_class_ids[0] if building_class_ids else 1
        building_probs = probabilities[building_idx].cpu().numpy()
    elif building_class_ids:
        # Multi-class model: sum probabilities of building-related classes
        tensor_indices = torch.tensor(building_class_ids, dtype=torch.long, device=probabilities.device)
        building_probs = probabilities[tensor_indices].sum(dim=0).cpu().numpy()
    else:
        # Fallback: take max non-background channel
        building_probs = probabilities.max(dim=0)[0].cpu().numpy()

    binary = building_probs >= BUILDING_MODEL_THRESHOLD
    binary = clean_binary_mask(binary, min_object_size=16, hole_fill_size=36)
    return binary, building_probs


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


def _geometry_parts(geometry: Any, geometry_type: str) -> list[Any]:
    if geometry is None or (hasattr(geometry, "is_empty") and geometry.is_empty):
        return []
    if geometry_type == "building":
        if geometry.geom_type == "Polygon":
            return [geometry]
        if geometry.geom_type == "MultiPolygon":
            return [part for part in geometry.geoms if not part.is_empty and part.geom_type == "Polygon"]
        if geometry.geom_type == "GeometryCollection":
            polygons = []
            for part in geometry.geoms:
                if part.geom_type == "Polygon" and not part.is_empty:
                    polygons.append(part)
                elif part.geom_type == "MultiPolygon":
                    polygons.extend([p for p in part.geoms if not p.is_empty and p.geom_type == "Polygon"])
            return polygons
    if geometry_type == "road":
        if geometry.geom_type == "LineString":
            return [geometry]
        if geometry.geom_type == "MultiLineString":
            return [part for part in geometry.geoms if not part.is_empty and part.geom_type == "LineString"]
        if geometry.geom_type == "GeometryCollection":
            lines = []
            for part in geometry.geoms:
                if part.geom_type == "LineString" and not part.is_empty:
                    lines.append(part)
                elif part.geom_type == "MultiLineString":
                    lines.extend([l for l in part.geoms if not l.is_empty and l.geom_type == "LineString"])
            return lines
    return []


def clean_roads_against_buildings_spatial(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Performs spatial validation and clipping between road lines and building polygons.

    Removes any road segments running inside building footprint interiors while preserving
    legitimate road segments outside and along building edges.
    """
    building_features = [f for f in features if f.get("properties", {}).get("feature_type") == "building"]
    road_features = [f for f in features if f.get("properties", {}).get("feature_type") == "road"]
    other_features = [f for f in features if f.get("properties", {}).get("feature_type") not in ("building", "road")]

    if not road_features or not building_features:
        return features

    building_geoms = []
    for bf in building_features:
        try:
            b_shape = shape(bf["geometry"])
            if not b_shape.is_valid:
                b_shape = make_valid(b_shape)
            if not b_shape.is_empty and b_shape.geom_type in ("Polygon", "MultiPolygon", "GeometryCollection"):
                b_parts = _geometry_parts(b_shape, "building")
                building_geoms.extend(b_parts)
        except Exception:
            continue

    if not building_geoms:
        return features

    buildings_union = unary_union(building_geoms).buffer(0)
    if buildings_union.is_empty or not buildings_union.is_valid:
        return features

    cleaned_road_features: list[dict[str, Any]] = []
    for rf in road_features:
        try:
            r_shape = shape(rf["geometry"])
            if not r_shape.is_valid:
                r_shape = make_valid(r_shape)
            if r_shape.is_empty:
                continue

            road_parts = _geometry_parts(r_shape, "road")
            valid_parts = []
            removed_meters_approx = 0.0

            for r_part in road_parts:
                if not r_part.intersects(buildings_union):
                    valid_parts.append(r_part)
                    continue

                inter = r_part.intersection(buildings_union)
                if inter.is_empty or inter.length == 0:
                    valid_parts.append(r_part)
                    continue

                inter_lines = (
                    [inter]
                    if inter.geom_type == "LineString"
                    else [g for g in getattr(inter, "geoms", []) if g.geom_type == "LineString" and g.length > 0]
                )
                interior_segments = []
                for line_seg in inter_lines:
                    mid = line_seg.interpolate(0.5, normalized=True)
                    if buildings_union.contains(mid):
                        interior_segments.append(line_seg)

                if not interior_segments:
                    # Road only touches building exterior boundaries -> keep
                    valid_parts.append(r_part)
                    continue

                diff = r_part.difference(buildings_union)
                if not diff.is_empty:
                    diff_parts = _geometry_parts(diff, "road")
                    valid_parts.extend(diff_parts)

                removed_len_deg = sum(s.length for s in interior_segments)
                removed_meters_approx += removed_len_deg * 111320.0

            if valid_parts:
                if removed_meters_approx > 0:
                    road_id = rf.get("properties", {}).get("id") or "ai_road"
                    logger.info(
                        "[GIS VALIDATION] Road %s intersects Building(s). Removed segment inside building: %.1f m. Remaining road geometry: %d segment(s)",
                        road_id,
                        removed_meters_approx,
                        len(valid_parts),
                    )
                for part in valid_parts:
                    new_rf = dict(rf)
                    new_rf["geometry"] = mapping(part)
                    cleaned_road_features.append(new_rf)
        except Exception:
            logger.exception("Error cleaning road feature against buildings")
            cleaned_road_features.append(rf)

    return building_features + cleaned_road_features + other_features


def extract_geojson(path: str, output_srid: int, on_stage, project_center: tuple[float, float] | None = None) -> dict[str, Any]:
    processor, model = load_model()
    features: list[dict[str, Any]] = []
    road_model_error: str | None = None
    candidate_count = 0
    outside_count = 0
    inside_count = 0
    with rasterio.open(path) as dataset:
        if dataset.crs is None or dataset.transform is None:
            raise ValueError("The GeoTIFF has no CRS or affine transform")
        if dataset.width < 2 or dataset.height < 2:
            raise ValueError("The raster dimensions are too small for feature extraction")
        source_crs = dataset.crs
        to_output = Transformer.from_crs(source_crs, f"EPSG:{output_srid}", always_xy=True).transform
        source_bounds = [float(value) for value in dataset.bounds]
        source_footprint = box(*source_bounds)
        survey_footprint = shapely_transform(to_output, source_footprint).buffer(0)
        if survey_footprint.is_empty or not survey_footprint.is_valid:
            raise ValueError("The GeoTIFF bounds could not be transformed into a valid survey footprint")
        west, south, east, north = survey_footprint.bounds
        geographic_bounds = [west, south, east, north]
        project_point = Point(project_center[1], project_center[0]) if project_center else None
        geographic_mismatch = bool(project_point and not survey_footprint.covers(project_point))
        total_tiles = ((dataset.width + TILE_SIZE - 1) // TILE_SIZE) * ((dataset.height + TILE_SIZE - 1) // TILE_SIZE)
        tile_number = 0

        # Calculate latitude scaling factor for geographic CRS square meter calculation
        deg_to_m = 111320.0
        if not source_crs.is_projected:
            center_lat = (dataset.bounds.bottom + dataset.bounds.top) / 2.0
            lat_rad = np.radians(center_lat)
            geo_deg2_to_m2 = (deg_to_m ** 2) * max(0.01, float(np.cos(lat_rad)))
        else:
            geo_deg2_to_m2 = 1.0

        for top in range(0, dataset.height, TILE_SIZE):
            for left in range(0, dataset.width, TILE_SIZE):
                tile_number += 1
                window = Window(left, top, min(TILE_SIZE, dataset.width - left), min(TILE_SIZE, dataset.height - top))
                image = rgb_tile(dataset, window)
                tile_transform = dataset.window_transform(window)

                # 1. Building detection via dedicated aerial/satellite model
                try:
                    building_binary, building_conf = infer_building_mask(image, processor, model)
                    if building_binary.any():
                        for raw_geometry, _ in shapes(building_binary.astype(np.uint8), mask=building_binary, transform=tile_transform):
                            geom = shape(raw_geometry)
                            if geom.is_empty or not geom.is_valid or geom.area <= 0:
                                continue

                            if source_crs.is_projected:
                                area_sqm = float(geom.area)
                                if area_sqm < MIN_FEATURE_AREA_M2:
                                    continue
                                geom = geom.simplify(0.2, preserve_topology=True)
                            else:
                                area_sqm = float(geom.area * geo_deg2_to_m2)
                                if area_sqm < MIN_FEATURE_AREA_M2:
                                    continue
                                geom = geom.simplify(0.000002, preserve_topology=True)

                            candidate_count += 1
                            geom_out = shapely_transform(to_output, geom).buffer(0)
                            if geom_out.is_empty or not geom_out.is_valid:
                                continue

                            parts = _geometry_parts(geom_out.intersection(survey_footprint), "building")
                            if not parts:
                                outside_count += 1
                                continue
                            inside_count += 1
                            mean_conf = float(building_conf[building_binary].mean()) if building_binary.any() else 0.85
                            for part in parts:
                                features.append({
                                    "type": "Feature",
                                    "geometry": mapping(part),
                                    "properties": {
                                        "feature_type": "building",
                                        "area_sqm": round(area_sqm, 2) if area_sqm else None,
                                        "confidence": round(mean_conf, 4),
                                        "source": "ai_extracted",
                                        "model": BUILDING_MODEL_ID,
                                    },
                                })
                except Exception:
                    logger.exception("building inference failed on tile %s", tile_number)

                # 2. Road detection via dedicated satellite Road-UNet model
                if road_model_error is None:
                    try:
                        road_mask = infer_road_mask(image)
                        road_geometry = line_from_skeleton(road_mask, tile_transform)
                        if road_geometry is not None:
                            candidate_count += 1
                            road_geometry = shapely_transform(to_output, road_geometry)
                            parts = _geometry_parts(road_geometry.intersection(survey_footprint), "road")
                            if not parts:
                                outside_count += 1
                            else:
                                inside_count += 1
                                for part in parts:
                                    features.append({
                                        "type": "Feature",
                                        "geometry": mapping(part),
                                        "properties": {
                                            "feature_type": "road",
                                            "source": "ai_extracted",
                                            "model": ROAD_MODEL_ID,
                                        },
                                    })
                    except Exception as road_error:
                        road_model_error = str(road_error)
                        logger.exception("road model unavailable; continuing with feature extraction")

                on_stage(20 + int(tile_number / max(total_tiles, 1) * 55), f"AI inference tile {tile_number}/{total_tiles}")

        logger.info("geometry generation produced %s raw features from %s tiles", len(features), total_tiles)
        if not features:
            raise ValueError("The pretrained model produced no building or road geometries above the configured threshold")

        # Apply Road-Building spatial validation and clipping
        features = clean_roads_against_buildings_spatial(features)
        logger.info("features after road/building spatial validation: %s", len(features))

        geo_frame = gpd.GeoDataFrame.from_features(features, crs=f"EPSG:{output_srid}")
        geo_frame = geo_frame[geo_frame.geometry.notna() & ~geo_frame.geometry.is_empty].copy()
        if not geo_frame.geometry.is_valid.all():
            geo_frame["geometry"] = geo_frame.geometry.buffer(0)
        validated_features = json.loads(geo_frame.to_json())["features"]
        diagnostics = {
            "raster_crs": source_crs.to_string(),
            "raster_bounds": source_bounds,
            "epsg4326_bounds": geographic_bounds,
            "survey_footprint": mapping(survey_footprint),
            "feature_counts": {"candidates": candidate_count, "inside_footprint": inside_count, "outside_footprint": outside_count},
            "geographic_mismatch": geographic_mismatch,
            "project_center": list(project_center) if project_center else None,
        }
        return {
            "type": "FeatureCollection",
            "features": validated_features,
            "properties": {
                "source_crs": source_crs.to_string(),
                "output_crs": f"EPSG:{output_srid}",
                "model": BUILDING_MODEL_ID,
                "building_model": BUILDING_MODEL_ID,
                "road_model": ROAD_MODEL_ID,
                "road_model_error": road_model_error,
                "geospatial_diagnostics": diagnostics,
                "prototype": True,
            },
        }


def save_output(job: JobRequest, geojson: dict[str, Any]) -> None:
    logger.info("saving GeoJSON and extracted records for job %s", job.job_id)
    response = get_supabase().rpc("save_processing_output", {"p_job_id": job.job_id, "p_project_id": job.project_id, "p_geojson": geojson}).execute()
    if getattr(response, "data", None) is None:
        raise RuntimeError("Supabase did not confirm processing output storage")


def run_job(job: JobRequest, source_path: str | None = None, source_bytes: bytes | None = None) -> None:
    logs: list[str] = []
    try:
        project_center: tuple[float, float] | None = None
        try:
            project_row = get_supabase().table("projects").select("center_lat,center_lng").eq("id", job.project_id).single().execute().data
            if project_row and project_row.get("center_lat") is not None and project_row.get("center_lng") is not None:
                project_center = (float(project_row["center_lat"]), float(project_row["center_lng"]))
        except Exception:
            logger.warning("could not load project center for geographic mismatch diagnostics", exc_info=True)

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
                imagery_metadata = get_supabase().table("project_imagery").select("metadata").eq("id", job.imagery_id).maybe_single().execute().data or {}
                metadata = imagery_metadata.get("metadata") or {}
                metadata.update({"raster_crs": dataset.crs.to_string(), "raster_bounds": [float(value) for value in dataset.bounds]})
                get_supabase().table("project_imagery").update({"crs": dataset.crs.to_string(), "metadata": metadata}).eq("id", job.imagery_id).execute()
            stage(12, "Raster metadata validated")
            geojson = extract_geojson(local_path, job.output_srid, stage, project_center)
            diagnostics = geojson["properties"]["geospatial_diagnostics"]
            imagery_metadata = get_supabase().table("project_imagery").select("metadata").eq("id", job.imagery_id).maybe_single().execute().data or {}
            metadata = imagery_metadata.get("metadata") or {}
            metadata.update({
                "raster_crs": diagnostics["raster_crs"],
                "raster_bounds": diagnostics["raster_bounds"],
                "epsg4326_bounds": diagnostics["epsg4326_bounds"],
                "survey_footprint": diagnostics["survey_footprint"],
                "feature_counts": diagnostics["feature_counts"],
                "geographic_mismatch": diagnostics["geographic_mismatch"],
            })
            get_supabase().table("project_imagery").update({"crs": diagnostics["raster_crs"], "metadata": metadata}).eq("id", job.imagery_id).execute()
            stage(78, f"Raster CRS: {diagnostics['raster_crs']}; EPSG:4326 bounds: {diagnostics['epsg4326_bounds']}")
            counts = diagnostics["feature_counts"]
            stage(79, f"Survey footprint validated; features inside: {counts['inside_footprint']}; outside: {counts['outside_footprint']}")
            if diagnostics["geographic_mismatch"]:
                stage(79, "Geographic mismatch: project metadata center is outside the uploaded raster footprint")
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
        imagery = get_supabase().table("project_imagery").select("id,storage_bucket,storage_path,metadata,crs").eq("project_id", project_id).order("created_at", desc=True).limit(1).maybe_single().execute().data
        if not imagery or not imagery.get("storage_path"):
            return {"url": None, "bounds": None}
        signed = get_supabase().storage.from_(imagery["storage_bucket"]).create_signed_url(imagery["storage_path"], 3600)
        signed_url = signed.get("signedURL") or signed.get("signedUrl")
        if not signed_url:
            raise RuntimeError("Supabase did not return a signed imagery URL")
        bounds = None
        imagery_metadata = imagery.get("metadata") or {}
        raw_bounds = imagery_metadata.get("epsg4326_bounds")
        if isinstance(raw_bounds, list) and len(raw_bounds) == 4:
            west, south, east, north = [float(value) for value in raw_bounds]
            bounds = [[south, west], [north, east]]
        raw_bounds = raw_bounds or imagery_metadata.get("bounds")
        crs_match = re.search(r"EPSG:(\d+)", imagery.get("crs") or "")
        if bounds is None and isinstance(raw_bounds, list) and len(raw_bounds) == 4 and crs_match:
            transformer = Transformer.from_crs(f"EPSG:{crs_match.group(1)}", "EPSG:4326", always_xy=True)
            west, south = transformer.transform(float(raw_bounds[0]), float(raw_bounds[1]))
            east, north = transformer.transform(float(raw_bounds[2]), float(raw_bounds[3]))
            bounds = [[south, west], [north, east]]
        return {"url": signed_url, "bounds": bounds, "survey_footprint": imagery_metadata.get("survey_footprint"), "crs": imagery.get("crs")}
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


def _survey_footprint_for_project(project_id: str) -> tuple[Any, dict[str, Any]]:
    imagery = get_supabase().table("project_imagery").select("storage_bucket,storage_path,metadata,crs").eq("project_id", project_id).order("created_at", desc=True).limit(1).maybe_single().execute().data
    if not imagery or not imagery.get("storage_path"):
        raise HTTPException(status_code=400, detail="Upload and process a GeoTIFF before importing cadastral data; no survey footprint is available.")
    metadata = imagery.get("metadata") or {}
    footprint_json = metadata.get("survey_footprint")
    if footprint_json:
        footprint = shape(footprint_json)
        if not footprint.is_empty and footprint.is_valid:
            return footprint, {"raster_crs": imagery.get("crs"), "epsg4326_bounds": list(footprint.bounds)}
    try:
        raster_bytes = fetch_imagery(imagery["storage_bucket"], imagery["storage_path"])
        with tempfile.NamedTemporaryFile(suffix=".tif", delete=False) as raster_file:
            raster_file.write(raster_bytes)
            raster_path = raster_file.name
        try:
            with rasterio.open(raster_path) as dataset:
                if dataset.crs is None or dataset.transform is None:
                    raise HTTPException(status_code=400, detail="The project GeoTIFF has no CRS or affine transform; a survey footprint cannot be derived.")
                transformer = Transformer.from_crs(dataset.crs, "EPSG:4326", always_xy=True).transform
                footprint = shapely_transform(transformer, box(*dataset.bounds)).buffer(0)
                diagnostics = {"raster_crs": dataset.crs.to_string(), "raster_bounds": [float(value) for value in dataset.bounds], "epsg4326_bounds": list(footprint.bounds), "survey_footprint": mapping(footprint)}
            get_supabase().table("project_imagery").update({"crs": diagnostics["raster_crs"], "metadata": {**metadata, **diagnostics}}).eq("id", imagery["id"] if "id" in imagery else "").execute()
            return footprint, diagnostics
        finally:
            Path(raster_path).unlink(missing_ok=True)
    except HTTPException:
        raise
    except Exception as footprint_error:
        raise HTTPException(status_code=400, detail=f"Could not derive the survey footprint from the uploaded GeoTIFF: {footprint_error}") from footprint_error


def _read_cadastral_dataset(source_path: Path, filename: str, temporary_directory: Path) -> tuple[Any, str]:
    lower_name = filename.lower()
    read_path = source_path
    if lower_name.endswith(".zip"):
        try:
            with zipfile.ZipFile(source_path) as archive:
                members = archive.infolist()
                if len(members) > 1000 or any(member.file_size > 200 * 1024 * 1024 for member in members):
                    raise HTTPException(status_code=400, detail="The Shapefile ZIP contains an oversized member")
                for member in members:
                    member_path = Path(member.filename)
                    if member_path.is_absolute() or ".." in member_path.parts:
                        raise HTTPException(status_code=400, detail="The Shapefile ZIP contains an unsafe path")
                extraction_path = temporary_directory / "extracted"
                archive.extractall(extraction_path)
        except zipfile.BadZipFile as zip_error:
            raise HTTPException(status_code=400, detail=f"The cadastral ZIP is corrupt: {zip_error}") from zip_error
        shapefiles = list(extraction_path.rglob("*.shp"))
        if len(shapefiles) != 1:
            raise HTTPException(status_code=400, detail="The ZIP must contain exactly one Shapefile")
        if not shapefiles[0].with_suffix(".prj").exists():
            raise HTTPException(status_code=400, detail="The Shapefile ZIP is missing its .prj CRS definition")
        read_path = shapefiles[0]
    elif not lower_name.endswith((".geojson", ".json", ".gpkg")):
        raise HTTPException(status_code=400, detail="Supported cadastral formats are GeoJSON, JSON GeoJSON, Shapefile ZIP, and GeoPackage")
    try:
        dataset = gpd.read_file(read_path)
    except Exception as read_error:
        raise HTTPException(status_code=400, detail=f"Could not read cadastral data: {read_error}") from read_error
    if dataset.empty:
        raise HTTPException(status_code=400, detail="The cadastral dataset contains no features")
    if dataset.crs is None:
        if lower_name.endswith((".geojson", ".json")):
            dataset = dataset.set_crs("EPSG:4326", allow_override=True)
        else:
            raise HTTPException(status_code=400, detail="The cadastral dataset has no declared CRS; Shapefile and GeoPackage CRS must not be guessed")
    source_crs = dataset.crs.to_string()
    return dataset.to_crs("EPSG:4326"), source_crs


def _validate_cadastral_dataset(dataset: Any, filename: str, footprint: Any, footprint_diagnostics: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    allowed_types = {"Polygon", "MultiPolygon"}
    errors: list[str] = []
    warnings: list[str] = []
    identifier_fields = {str(column).lower().strip(): column for column in dataset.columns if column != "geometry"}
    candidate_id_names = ("parcel_identifier", "parcel_id", "parcel_no", "parcel_number", "survey_number", "survey_no", "khasra_no", "khasra", "plot_no", "plot_number", "pin", "id", "gid", "objectid", "fid")
    identifier_column = next((identifier_fields[name] for name in candidate_id_names if name in identifier_fields), None)

    if identifier_column is not None:
        identifiers = dataset[identifier_column].astype(str).str.strip()
        if identifiers.eq("").any() or identifiers.eq("nan").any() or identifiers.eq("None").any():
            errors.append(f"Parcel identifier column '{identifier_column}' contains empty or missing values")
        if identifiers.duplicated().any():
            duplicates = identifiers[identifiers.duplicated()].unique()[:5].tolist()
            errors.append(f"Parcel identifiers must be unique; duplicate values found: {duplicates}")
    else:
        warnings.append("No standard parcel identifier column was found; generated default parcel identifiers.")
        identifiers = dataset.index.to_series().apply(lambda i: f"PARCEL-{(i + 1):04d}")

    survey_col = next((identifier_fields[name] for name in ("survey_number", "survey_no", "khasra_no", "plot_no") if name in identifier_fields), None)
    subdivision_col = next((identifier_fields[name] for name in ("subdivision_number", "subdivision_no", "sub_div", "subdivision") if name in identifier_fields), None)
    land_use_col = next((identifier_fields[name] for name in ("land_use", "landuse", "zoning", "use_type") if name in identifier_fields), None)

    features: list[dict[str, Any]] = []
    inside_count = partial_count = outside_count = 0
    for index, (row_index, row) in enumerate(dataset.iterrows(), start=1):
        geometry = row["geometry"]
        if geometry is None or not hasattr(geometry, "is_empty") or geometry.is_empty:
            errors.append(f"Feature {index} has an empty geometry")
            continue
        if geometry.geom_type not in allowed_types:
            errors.append(f"Feature {index} has unsupported geometry type '{geometry.geom_type}'; only Polygon and MultiPolygon are allowed")
            continue
        if not geometry.is_valid:
            repaired = make_valid(geometry)
            if repaired.geom_type == "GeometryCollection":
                poly_parts = [p for p in repaired.geoms if p.geom_type in allowed_types and not p.is_empty]
                if poly_parts:
                    from shapely.geometry import MultiPolygon as ShapelyMultiPolygon
                    repaired = ShapelyMultiPolygon(poly_parts) if len(poly_parts) > 1 else poly_parts[0]
            if repaired.is_empty or not repaired.is_valid or repaired.geom_type not in allowed_types:
                errors.append(f"Feature {index} has invalid parcel geometry that could not be safely repaired")
                continue
            warnings.append(f"Feature {index} had a topology issue and was safely repaired")
            geometry = repaired

        min_x, min_y, max_x, max_y = geometry.bounds
        if min_x < -180 or max_x > 180 or min_y < -90 or max_y > 90:
            errors.append(f"Feature {index} contains coordinates outside EPSG:4326 limits: bounds [{min_x}, {min_y}, {max_x}, {max_y}]")
            continue

        intersection = geometry.intersection(footprint)
        overlap = 0.0 if geometry.area <= 0 else max(0.0, min(1.0, intersection.area / geometry.area))
        if overlap <= 0:
            outside_count += 1
        elif overlap < 0.999999:
            partial_count += 1
        else:
            inside_count += 1

        properties = {str(key): value for key, value in row.drop(labels=["geometry"]).items() if value is not None and not (isinstance(value, float) and np.isnan(value))}
        parcel_id_str = str(identifiers.loc[row_index]) if row_index in identifiers.index else f"PARCEL-{index:04d}"
        properties.update({
            "parcel_identifier": parcel_id_str,
            "source": "user_imported_cadastral",
            "source_file": filename,
            "survey_overlap_percent": round(overlap * 100, 2),
        })
        if survey_col and survey_col in row and row[survey_col] is not None:
            properties["survey_number"] = str(row[survey_col]).strip()
        if subdivision_col and subdivision_col in row and row[subdivision_col] is not None:
            properties["subdivision_number"] = str(row[subdivision_col]).strip()
        if land_use_col and land_use_col in row and row[land_use_col] is not None:
            properties["land_use"] = str(row[land_use_col]).strip()

        features.append({"type": "Feature", "geometry": mapping(geometry), "properties": properties})

    if not features and not errors:
        errors.append("No valid Polygon or MultiPolygon parcel features remain after validation")
    if outside_count:
        warnings.append(f"{outside_count} parcel(s) are completely outside the actual survey footprint.")
    if partial_count:
        warnings.append(f"{partial_count} parcel(s) only partially overlap the survey footprint.")

    if errors:
        raise HTTPException(status_code=400, detail={"message": "Cadastral validation failed", "validation_errors": errors, "warnings": warnings})

    collection = {"type": "FeatureCollection", "features": features}
    diagnostics = {
        **footprint_diagnostics,
        "parcel_count": len(features),
        "survey_overlap_count": inside_count + partial_count,
        "inside_survey_count": inside_count,
        "partially_overlapping_count": partial_count,
        "outside_survey_count": outside_count,
        "validation_errors": errors,
        "warnings": warnings,
    }
    return collection, diagnostics


@app.post("/v1/cadastral-import/preview")
async def preview_cadastral_import(project_id: str = Form(...), file: UploadFile = File(...)) -> dict[str, Any]:
    content = await file.read()
    if not content or len(content) > 200 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="The cadastral file must be larger than 0 bytes and no larger than 200 MB")
    temporary_directory = Path(tempfile.mkdtemp(prefix="urbanparcel-cadastral-"))
    try:
        project = get_supabase().table("projects").select("id,center_lat,center_lng").eq("id", project_id).maybe_single().execute().data
        if not project:
            raise HTTPException(status_code=404, detail="Project was not found")
        filename = Path(file.filename or "cadastral-upload").name
        source_path = temporary_directory / filename
        source_path.write_bytes(content)
        footprint, footprint_diagnostics = _survey_footprint_for_project(project_id)
        dataset, source_crs = _read_cadastral_dataset(source_path, filename, temporary_directory)
        collection, diagnostics = _validate_cadastral_dataset(dataset, filename, footprint, footprint_diagnostics)
        project_point = Point(float(project["center_lng"]), float(project["center_lat"])) if project.get("center_lat") is not None and project.get("center_lng") is not None else None
        diagnostics["geographic_mismatch"] = bool(project_point and not footprint.covers(project_point))
        if diagnostics["geographic_mismatch"]:
            diagnostics["warnings"].append("Project location and uploaded imagery geographic extent do not appear to match.")
        diagnostics["source_crs"] = source_crs
        preview_id = str(uuid.uuid4())
        _cadastral_previews[preview_id] = {"project_id": project_id, "collection": collection, "diagnostics": diagnostics}
        return {"status": "preview", "preview_id": preview_id, "project_id": project_id, "source_crs": source_crs, "target_crs": "EPSG:4326", "preview": collection, **diagnostics}
    finally:
        shutil.rmtree(temporary_directory, ignore_errors=True)


@app.post("/v1/cadastral-import/confirm")
async def confirm_cadastral_import(request: CadastralConfirmRequest) -> dict[str, Any]:
    preview = _cadastral_previews.pop(request.preview_id, None)
    if not preview or preview["project_id"] != request.project_id:
        raise HTTPException(status_code=404, detail="Cadastral preview was not found or has expired")
    try:
        response = get_supabase().rpc("import_user_cadastral", {"p_project_id": request.project_id, "p_geojson": preview["collection"]}).execute()
        return {"status": "imported", "project_id": request.project_id, **(response.data or {}), **preview["diagnostics"]}
    except Exception as import_error:
        logger.exception("cadastral import confirmation failed for project %s", request.project_id)
        raise HTTPException(status_code=500, detail=f"Database insertion failed: {import_error}") from import_error


@app.get("/v1/cadastral-import/{project_id}")
async def get_cadastral_parcels(project_id: str) -> dict[str, Any]:
    try:
        rows = get_supabase().table("parcels").select("*").eq("project_id", project_id).order("parcel_identifier").execute().data or []
        return {"project_id": project_id, "parcel_count": len(rows), "parcels": rows}
    except Exception as parcel_error:
        raise HTTPException(status_code=500, detail=f"Could not load cadastral parcels: {parcel_error}") from parcel_error


@app.delete("/v1/cadastral-import/{project_id}")
async def delete_cadastral_parcels_endpoint(project_id: str) -> dict[str, Any]:
    try:
        try:
            response = get_supabase().rpc("delete_cadastral_parcels", {"p_project_id": project_id}).execute()
            return {"status": "deleted", "project_id": project_id, **(response.data or {})}
        except Exception:
            get_supabase().table("parcels").delete().eq("project_id", project_id).in_("source", ["user_imported_cadastral", "official_cadastral"]).execute()
            rows = get_supabase().table("parcels").select("id").eq("project_id", project_id).execute().data or []
            get_supabase().table("projects").update({"parcel_count": len(rows), "updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", project_id).execute()
            return {"status": "deleted", "project_id": project_id, "remaining_parcels": len(rows)}
    except Exception as exc:
        logger.exception("could not delete cadastral parcels for project %s", project_id)
        raise HTTPException(status_code=500, detail=f"Could not delete cadastral parcels: {exc}") from exc


@app.post("/v1/cadastral-import")
async def import_cadastral_legacy(project_id: str = Form(...), file: UploadFile = File(...)) -> dict[str, Any]:
    preview = await preview_cadastral_import(project_id, file)
    return preview

