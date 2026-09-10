-- Fix the PostgREST RPC signature used by the processing worker.
-- AI output is persisted as reviewable ai_extracted buildings/roads only.

ALTER TABLE public.processing_jobs
  ADD COLUMN IF NOT EXISTS result_geojson JSONB,
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS result_crs TEXT;

DROP FUNCTION IF EXISTS public.save_processing_output(UUID, UUID, JSONB);
DROP FUNCTION IF EXISTS public.save_processing_output(JSONB, UUID, UUID);

CREATE FUNCTION public.save_processing_output(
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
  IF v_model_name IS NULL THEN
    RAISE EXCEPTION 'AI output is missing its model provenance';
  END IF;
  IF v_output_crs <> 'EPSG:4326' THEN
    RAISE EXCEPTION 'AI output CRS must be EPSG:4326 for the project GIS tables';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.processing_jobs
    WHERE id = p_job_id AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Processing job does not belong to project';
  END IF;

  DELETE FROM public.buildings WHERE source_job_id = p_job_id;
  DELETE FROM public.roads WHERE source_job_id = p_job_id;

  FOR feature IN
    SELECT value FROM jsonb_array_elements(p_geojson->'features')
  LOOP
    IF jsonb_typeof(feature) <> 'object' OR feature->>'type' <> 'Feature' THEN
      CONTINUE;
    END IF;

    feature_type := feature->'properties'->>'feature_type';
    feature_geometry := feature->'geometry';
    feature_properties := COALESCE(feature->'properties', '{}'::jsonb);

    IF jsonb_typeof(feature_geometry) <> 'object'
      OR feature_geometry->>'type' IS NULL
      OR feature_geometry->'coordinates' IS NULL THEN
      CONTINUE;
    END IF;

    geometry_value := extensions.ST_SetSRID(
      extensions.ST_GeomFromGeoJSON(feature_geometry::text),
      4326
    );

    IF geometry_value IS NULL OR extensions.ST_IsEmpty(geometry_value)
      OR NOT extensions.ST_IsValid(geometry_value) THEN
      CONTINUE;
    END IF;

    -- Never promote model output to official cadastral or verified data.
    feature_properties := jsonb_set(
      jsonb_set(feature_properties, '{source}', '"ai_extracted"'::jsonb, true),
      '{processing_job_id}', to_jsonb(p_job_id::text), true
    );

    IF feature_type = 'building'
      AND feature_geometry->>'type' = 'Polygon'
      AND extensions.ST_GeometryType(geometry_value) = 'ST_Polygon' THEN
      INSERT INTO public.buildings (project_id, attributes, source, geometry, source_job_id)
      VALUES (p_project_id, feature_properties, 'ai_extracted', geometry_value, p_job_id);
      v_building_count := v_building_count + 1;
    ELSIF feature_type = 'road'
      AND feature_geometry->>'type' = 'LineString'
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
      updated_at = now()
  WHERE id = p_job_id;

  UPDATE public.projects
  SET building_count = v_building_count,
      road_segment_count = v_road_count,
      status = 'Completed',
      updated_at = now()
  WHERE id = p_project_id;

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
    'source', 'ai_extracted'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.save_processing_output(JSONB, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_processing_output(JSONB, UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
