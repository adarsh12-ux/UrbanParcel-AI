-- Persist authoritative raster geospatial diagnostics and enforce footprint clipping.
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS raster_crs TEXT,
  ADD COLUMN IF NOT EXISTS raster_bounds JSONB,
  ADD COLUMN IF NOT EXISTS survey_footprint JSONB,
  ADD COLUMN IF NOT EXISTS geographic_mismatch BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geographic_diagnostic JSONB;

ALTER TABLE public.processing_jobs
  ADD COLUMN IF NOT EXISTS raster_crs TEXT,
  ADD COLUMN IF NOT EXISTS raster_bounds JSONB,
  ADD COLUMN IF NOT EXISTS survey_footprint JSONB,
  ADD COLUMN IF NOT EXISTS geographic_mismatch BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS geographic_diagnostic JSONB;

CREATE OR REPLACE FUNCTION public.save_processing_output(
  p_geojson JSONB,
  p_job_id UUID,
  p_project_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  feature JSONB;
  feature_type TEXT;
  feature_geometry JSONB;
  feature_properties JSONB;
  geometry_value extensions.geometry;
  survey_footprint_geometry extensions.geometry;
  diagnostics JSONB;
  v_building_count INTEGER := 0;
  v_road_count INTEGER := 0;
  v_model_name TEXT;
  v_output_crs TEXT;
BEGIN
  IF jsonb_typeof(p_geojson) <> 'object'
    OR p_geojson->>'type' <> 'FeatureCollection'
    OR jsonb_typeof(p_geojson->'features') <> 'array' THEN
    RAISE EXCEPTION 'AI output must be a GeoJSON FeatureCollection';
  END IF;

  v_model_name := NULLIF(p_geojson->'properties'->>'model', '');
  v_output_crs := COALESCE(p_geojson->'properties'->>'output_crs', 'EPSG:4326');
  diagnostics := p_geojson->'properties'->'geospatial_diagnostics';
  IF v_model_name IS NULL THEN
    RAISE EXCEPTION 'AI output is missing its model provenance';
  END IF;
  IF v_output_crs <> 'EPSG:4326' THEN
    RAISE EXCEPTION 'AI output CRS must be EPSG:4326 for the project GIS tables';
  END IF;
  IF jsonb_typeof(diagnostics->'survey_footprint') <> 'object' THEN
    RAISE EXCEPTION 'AI output is missing the authoritative survey footprint';
  END IF;

  survey_footprint_geometry := extensions.ST_SetSRID(
    extensions.ST_GeomFromGeoJSON((diagnostics->'survey_footprint')::text), 4326
  );
  IF survey_footprint_geometry IS NULL
    OR extensions.ST_IsEmpty(survey_footprint_geometry)
    OR NOT extensions.ST_IsValid(survey_footprint_geometry) THEN
    RAISE EXCEPTION 'AI output contains an invalid survey footprint';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.processing_jobs
    WHERE id = p_job_id AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Processing job does not belong to project';
  END IF;

  DELETE FROM public.buildings WHERE source_job_id = p_job_id;
  DELETE FROM public.roads WHERE source_job_id = p_job_id;

  FOR feature IN SELECT value FROM jsonb_array_elements(p_geojson->'features') LOOP
    IF jsonb_typeof(feature) <> 'object' OR feature->>'type' <> 'Feature' THEN CONTINUE; END IF;
    feature_type := feature->'properties'->>'feature_type';
    feature_geometry := feature->'geometry';
    feature_properties := COALESCE(feature->'properties', '{}'::jsonb);
    IF jsonb_typeof(feature_geometry) <> 'object'
      OR feature_geometry->>'type' IS NULL
      OR feature_geometry->'coordinates' IS NULL THEN CONTINUE; END IF;

    geometry_value := extensions.ST_SetSRID(
      extensions.ST_GeomFromGeoJSON(feature_geometry::text), 4326
    );
    geometry_value := extensions.ST_Intersection(geometry_value, survey_footprint_geometry);
    IF geometry_value IS NULL OR extensions.ST_IsEmpty(geometry_value)
      OR NOT extensions.ST_IsValid(geometry_value) THEN CONTINUE; END IF;

    feature_properties := jsonb_set(
      jsonb_set(feature_properties, '{source}', '"ai_extracted"'::jsonb, true),
      '{processing_job_id}', to_jsonb(p_job_id::text), true
    );

    IF feature_type = 'building'
      AND extensions.ST_GeometryType(geometry_value) = 'ST_Polygon' THEN
      INSERT INTO public.buildings (project_id, attributes, source, geometry, source_job_id)
      VALUES (p_project_id, feature_properties, 'ai_extracted', geometry_value, p_job_id);
      v_building_count := v_building_count + 1;
    ELSIF feature_type = 'road'
      AND extensions.ST_GeometryType(geometry_value) = 'ST_LineString' THEN
      INSERT INTO public.roads (project_id, attributes, source, geometry, source_job_id)
      VALUES (p_project_id, feature_properties, 'ai_extracted', geometry_value, p_job_id);
      v_road_count := v_road_count + 1;
    END IF;
  END LOOP;

  UPDATE public.processing_jobs
  SET result_geojson = p_geojson,
      model_name = v_model_name,
      result_crs = v_output_crs,
      raster_crs = diagnostics->>'raster_crs',
      raster_bounds = diagnostics->'raster_bounds',
      survey_footprint = diagnostics->'survey_footprint',
      geographic_mismatch = COALESCE((diagnostics->>'geographic_mismatch')::boolean, false),
      geographic_diagnostic = diagnostics,
      updated_at = now()
  WHERE id = p_job_id;

  UPDATE public.projects
  SET building_count = v_building_count,
      road_segment_count = v_road_count,
      raster_crs = diagnostics->>'raster_crs',
      raster_bounds = diagnostics->'raster_bounds',
      survey_footprint = diagnostics->'survey_footprint',
      geographic_mismatch = COALESCE((diagnostics->>'geographic_mismatch')::boolean, false),
      geographic_diagnostic = diagnostics,
      status = 'Completed',
      updated_at = now()
  WHERE id = p_project_id;

  UPDATE public.project_imagery
  SET crs = diagnostics->>'raster_crs',
      bounds = survey_footprint_geometry,
      metadata = metadata || jsonb_build_object(
        'raster_crs', diagnostics->'raster_crs',
        'raster_bounds', diagnostics->'raster_bounds',
        'epsg4326_bounds', diagnostics->'epsg4326_bounds',
        'survey_footprint', diagnostics->'survey_footprint',
        'feature_counts', diagnostics->'feature_counts',
        'geographic_mismatch', diagnostics->'geographic_mismatch'
      )
  WHERE id = (SELECT imagery_id FROM public.processing_jobs WHERE id = p_job_id);

  INSERT INTO public.analysis_results (
    project_id, precision, recall, f1_score, mean_iou,
    total_parcels_detected, total_buildings_detected, total_road_segments, total_water_bodies
  ) VALUES (
    p_project_id, 0, 0, 0, 0, 0, v_building_count, v_road_count, 0
  )
  ON CONFLICT (project_id) DO UPDATE SET
    total_buildings_detected = EXCLUDED.total_buildings_detected,
    total_road_segments = EXCLUDED.total_road_segments,
    updated_at = now();

  RETURN jsonb_build_object(
    'buildings', v_building_count,
    'roads', v_road_count,
    'model', v_model_name,
    'source', 'ai_extracted',
    'geospatial_diagnostics', diagnostics
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_processing_output(JSONB, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_processing_output(JSONB, UUID, UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
