# UrbanParcelAI processing service

This service performs real, local semantic segmentation and writes project-scoped GeoJSON/features to Supabase. It never creates synthetic completion data.

## Models

- **Building Extraction**: `tomascanivari/segformer-b0-finetuned-buildings` via Hugging Face Transformers (`SegformerForSemanticSegmentation`) is a SegFormer model specifically fine-tuned for satellite and aerial building segmentation. It provides direct building probability masks, cleaned with morphological hole filling and small object removal, simplified to clean building polygon footprints. Configurable via `BUILDING_MODEL_ID` and `BUILDING_MODEL_THRESHOLD`.
- **Road Extraction**: `teohyc/Satellite-Road-Segmentation-UNet` checkpoint trained on satellite road imagery. It is downloaded to `backend/models/best_road_seg_unet.pth` and extracts road centerlines via skeletonization.
- **Outputs**: Features remain `ai_extracted` with provenance and confidence scores, and roads are spatially validated and clipped against building polygons. Outputs are AI-assisted prototype suggestions for surveyor review and do not constitute legal cadastral records until verified.

## Start on Windows PowerShell

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# edit .env with the Supabase URL, service-role key, and allowed origins
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The service uses the Supabase service-role key only on the server. Never put it in Vite `VITE_*` variables or commit `.env`.

From the repository root, the equivalent command is:

```powershell
backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000
```

The frontend uses `VITE_API_URL=http://localhost:8000` and checks `GET /health` before posting a GeoTIFF to `POST /v1/process`.

## Endpoints

- `GET /health` checks configuration and model availability.
- `POST /v1/jobs` accepts `{job_id, project_id, imagery_id, imagery_bucket?, imagery_path?, output_srid?}` and processes the private Storage object asynchronously.
- `POST /v1/process` accepts a multipart `file` plus `job_id`, `project_id`, and `imagery_id`; it validates and temporarily saves GeoTIFF uploads before processing. A retry may omit `file` and use an existing `imagery_id`.
- `POST /v1/cadastral-import` accepts an official parcel GeoJSON or Shapefile ZIP and validates CRS, polygon geometry, parcel identifiers, and project extent before persisting `official_cadastral` parcels.

The existing frontend uploads to the private `orthomosaics` bucket, creates a `processing_jobs` row, and calls `POST /v1/jobs`. The worker updates that row for every stage and invokes the `save_processing_output` RPC for GeoJSON/features.
