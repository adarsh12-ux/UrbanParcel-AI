-- Persist the exact AI output alongside normalized project-scoped features.
ALTER TABLE public.processing_jobs
  ADD COLUMN IF NOT EXISTS result_geojson JSONB,
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS result_crs TEXT;

CREATE OR REPLACE FUNCTION public.save_processing_output(
  p_job_id UUID,
  p_project_id UUID,
  p_geojson JSONB
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
  v_building_count INTEGER := 0;
  v_road_count INTEGER := 0;
  v_model_name TEXT := COALESCE(p_geojson->'properties'->>'model', 'unknown');
  result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.processing_jobs
    WHERE id = p_job_id AND project_id = p_project_id
  ) THEN
    RAISE EXCEPTION 'Processing job does not belong to project';
  END IF;

  DELETE FROM public.buildings WHERE source_job_id = p_job_id;
  DELETE FROM public.roads WHERE source_job_id = p_job_id;

  FOR feature IN SELECT value FROM jsonb_array_elements(COALESCE(p_geojson->'features', '[]'::jsonb)) LOOP
    feature_type := feature->'properties'->>'feature_type';
    feature_geometry := feature->'geometry';

    IF feature_type = 'building' AND feature_geometry->>'type' IN ('Polygon', 'MultiPolygon') THEN
      INSERT INTO public.buildings (project_id, attributes, source, geometry, source_job_id)
      VALUES (
        p_project_id,
        feature->'properties',
        'ai_extracted',
        extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(feature_geometry::text), 4326),
        p_job_id
      );
      v_building_count := v_building_count + 1;
    ELSIF feature_type = 'road' AND feature_geometry->>'type' = 'LineString' THEN
      INSERT INTO public.roads (project_id, attributes, source, geometry, source_job_id)
      VALUES (
        p_project_id,
        feature->'properties',
        'ai_extracted',
        extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(feature_geometry::text), 4326),
        p_job_id
      );
      v_road_count := v_road_count + 1;
    END IF;
  END LOOP;

  UPDATE public.processing_jobs
  SET result_geojson = p_geojson,
      model_name = v_model_name,
      result_crs = COALESCE(p_geojson->'properties'->>'output_crs', 'EPSG:4326'),
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

  result := jsonb_build_object('buildings', v_building_count, 'roads', v_road_count, 'model', v_model_name);
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.save_processing_output(UUID, UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_processing_output(UUID, UUID, JSONB) TO service_role;
