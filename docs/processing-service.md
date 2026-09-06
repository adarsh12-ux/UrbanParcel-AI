# Processing service contract

UrbanParcelAI persists uploads and jobs in Supabase. It does not claim that a browser timer or an AI label creates cadastral data. A separate worker must perform raster processing and write PostGIS features.

## Configuration

Set `VITE_PROCESSING_SERVICE_URL` for the authenticated orchestration endpoint. The browser must never receive a Supabase service-role key.

## Start a job

`POST {PROCESSING_SERVICE_URL}/v1/jobs`

Request:

```json
{
  "job_id": "processing_jobs.id",
  "project_id": "projects.id",
  "imagery_bucket": "orthomosaics",
  "imagery_path": "projects/{project_id}/{upload_id}-orthomosaic.tif",
  "output_srid": 4326
}
```

The service downloads the private Storage object using server-side credentials, validates CRS/bounds/dimensions with GDAL/rasterio, and updates `processing_jobs` as it progresses.

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
