# UrbanParcelAI processing service

This service performs real, local semantic segmentation and writes project-scoped GeoJSON/features to Supabase. It never creates synthetic completion data.

## Model

`nvidia/segformer-b0-finetuned-ade-512-512` via Hugging Face Transformers (`SegformerForSemanticSegmentation`) is a lightweight MIT-B0 SegFormer semantic-segmentation checkpoint with an ADE20K-finetuned decoder. It is used for masks whose ADE20K labels include `building`, `house`, `skyscraper`, and `road`. It expects RGB imagery; GeoTIFF bands are converted to an 8-bit RGB tile for inference. The checkpoint is general-scene, not cadastral or aerial-specialized, so outputs are AI-assisted prototype suggestions and require surveyor review. It does not provide legal parcel boundaries or government-grade accuracy.

Road centerlines use a separate MIT-licensed `teohyc/Satellite-Road-Segmentation-UNet` checkpoint trained on the Massachusetts Roads Dataset. It is downloaded to `backend/models/` on first road inference and remains `ai_extracted`; it never creates official cadastral data.

The Windows setup installs the geospatial, PyTorch, and Hugging Face model packages from `requirements.txt`. The checkpoint is downloaded on first inference. If those packages or model weights are unavailable, `/v1/process` returns HTTP 503 with `AI model is not configured yet.` and never fabricates processing results.

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
