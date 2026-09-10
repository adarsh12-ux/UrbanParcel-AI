# Processing service contract

UrbanParcelAI persists uploads and jobs in Supabase. It does not claim that a browser timer or an AI label creates cadastral data. A separate worker must perform raster processing and write PostGIS features.

## Configuration

Set `VITE_API_URL=http://localhost:8000` for the processing service. The browser must never receive a Supabase service-role key.

## Start a job

`POST {VITE_API_URL}/v1/process`

Request:

```json
multipart/form-data: `file`, `job_id`, `project_id`, `imagery_id`, `output_srid`
```

The service saves the uploaded GeoTIFF temporarily, validates CRS/bounds/dimensions with Rasterio, runs the configured real model, and updates `processing_jobs` as it progresses. Retry requests may omit `file` and provide `imagery_id`; the service then downloads the private Storage object using server-only credentials.

## Status updates

The worker updates the job row with one of:

- `validating`
- `processing`
- `extracting features`
- `generating GIS layers`
- `completed`
- `failed`

Each update includes `progress`, `current_step`, `steps`, `logs`, and, on failure, `error_message`. The frontend polls this row and never invents progress.

## Outputs

On successful extraction, the worker inserts project-scoped PostGIS features into:

- `parcels`: polygon geometry, survey number, area, perimeter, land use, confidence, source, and review status
- `buildings`: polygon geometry and attributes
- `roads`: line geometry and attributes
- `water_bodies`: polygon geometry and attributes
- `vegetation`: polygon geometry and attributes
- `cadastral_references`: official reference geometry and attributes

Every output includes the processing job ID and a provenance source such as `ai_extracted`, `official_cadastral`, `manual_edit`, or `verified`. AI-extracted boundaries are not legal ownership records or official cadastral boundaries until an authorized review workflow verifies them.

## Failure response

The service returns a non-2xx response such as:

```json
{
  "error": {
    "code": "CRS_UNSUPPORTED",
    "message": "The raster CRS could not be transformed to EPSG:4326"
  }
}
```

It must also mark the persisted job as `failed` so the application can show the reason and offer retry. A worker should produce a tiled/Cloud-Optimized GeoTIFF or tile endpoint for projected imagery; a raw GeoTIFF signed URL is not assumed to be browser-renderable by Leaflet.

## Editing integration

Manual edits must write PostGIS geometries to the `parcels` table with `source = 'manual_edit'`, retain the prior geometry in an audit table, and transition to `verified` only after an authorized reviewer saves the verification action. Geometry must not be stored only in localStorage.

## Local setup

1. Apply `supabase/migrations/20260908_add_processing_geojson_output.sql` in the Supabase SQL editor after the complete application schema, then apply `supabase/migrations/20260910_fix_save_processing_output_rpc_signature.sql` and `supabase/migrations/20260910_add_official_cadastral_import.sql`. The first correction replaces the RPC with the PostgREST-compatible signature `(p_geojson, p_job_id, p_project_id)`; the cadastral migration adds the service-role import RPC. Both preserve source provenance and reload the PostgREST schema cache.
2. Copy `.env.example` to `.env` at the repository root and set the public Supabase URL/key plus `VITE_API_URL=http://localhost:8000`. The Vite variables must contain only the Supabase anon key; never put the service-role key here.
3. In `backend`, create a Python 3.11 virtual environment, install `requirements.txt`, copy `.env.example` to `.env`, and set the server-only `SUPABASE_SERVICE_ROLE_KEY`.
4. Downloading `nvidia/mit-b0` happens on first inference. For an offline machine, run `huggingface-cli download nvidia/mit-b0` before starting the worker.
5. Start the service from the repository root with `backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000`, then start the frontend with `npm run dev -- --host localhost --port 5175`.

## Complete workflow test

1. Sign in as an approved Supabase user and create/select a project. Apply the migration before testing so the RPC and result columns exist.
2. Use a real RGB GeoTIFF with a CRS and affine transform. The upload page must reject a non-TIFF, a TIFF without CRS, or an empty file before creating a job.
3. Upload it from `/projects/{projectId}/upload`. Confirm a private object exists in Storage `orthomosaics`, a `project_imagery` row exists, and a `processing_jobs` row is created.
4. Confirm `GET http://localhost:8000/health` reports `status: ok`, then confirm `POST http://localhost:8000/v1/process` returns `202`. Watch the processing page; its status, stage, logs, and progress must come from the Supabase row.
5. On completion, verify `processing_jobs.result_geojson` is a valid `FeatureCollection`, `model_name` is `nvidia/segformer-b0-finetuned-ade-512-512`, and `buildings`/`roads` rows have `source = 'ai_extracted'` and the job ID.
6. Confirm the page enables `/projects/{projectId}/map` only after completion and the map renders the persisted building/road geometries. These are AI-assisted prototype results, not official cadastral boundaries.
7. Stop the backend and retry a failed/uploaded job. The page must show `AI processing service is unavailable. Start the Python backend and retry.` with Retry and Back to Upload actions; it must not claim completion.
