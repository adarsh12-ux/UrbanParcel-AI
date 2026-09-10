-- Persist validated official cadastral parcel imports separately from AI output.

CREATE OR REPLACE FUNCTION public.import_official_cadastral(
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
  feature_geometry JSONB;
  feature_properties JSONB;
  geometry_value extensions.geometry;
  parcel_identifier TEXT;
  survey_number TEXT;
  inserted_count INTEGER := 0;
  v_parcel_count INTEGER := 0;
BEGIN
  IF jsonb_typeof(p_geojson) <> 'object'
    OR p_geojson->>'type' <> 'FeatureCollection'
    OR jsonb_typeof(p_geojson->'features') <> 'array' THEN
    RAISE EXCEPTION 'Official cadastral input must be a GeoJSON FeatureCollection';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project does not exist';
  END IF;

  FOR feature IN SELECT value FROM jsonb_array_elements(p_geojson->'features') LOOP
    feature_geometry := feature->'geometry';
    feature_properties := COALESCE(feature->'properties', '{}'::jsonb);
    parcel_identifier := NULLIF(BTRIM(feature_properties->>'parcel_identifier'), '');
    survey_number := NULLIF(BTRIM(feature_properties->>'survey_number'), '');

    IF feature->>'type' <> 'Feature'
      OR feature_geometry->>'type' <> 'Polygon'
      OR parcel_identifier IS NULL THEN
      RAISE EXCEPTION 'Every official cadastral feature must be a Polygon with parcel_identifier';
    END IF;

    geometry_value := extensions.ST_SetSRID(
      extensions.ST_GeomFromGeoJSON(feature_geometry::text),
      4326
    );
    IF geometry_value IS NULL
      OR extensions.ST_IsEmpty(geometry_value)
      OR NOT extensions.ST_IsValid(geometry_value) THEN
      RAISE EXCEPTION 'Official cadastral feature % has invalid geometry', parcel_identifier;
    END IF;

    feature_properties := jsonb_set(feature_properties, '{source}', '"official_cadastral"'::jsonb, true);
    feature_properties := jsonb_set(feature_properties, '{review_status}', '"needs_review"'::jsonb, true);

    INSERT INTO public.parcels (
      project_id, parcel_identifier, survey_number, area_sqm, perimeter_m,
      source, review_status, attributes, geometry, source_job_id
    ) VALUES (
      p_project_id,
      parcel_identifier,
      survey_number,
      extensions.ST_Area(extensions.ST_Transform(geometry_value, 3857)),
      extensions.ST_Perimeter(extensions.ST_Transform(geometry_value, 3857)),
      'official_cadastral',
      'needs_review',
      feature_properties,
      geometry_value,
      NULL
    )
    ON CONFLICT (project_id, parcel_identifier) DO NOTHING;

    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;

    INSERT INTO public.cadastral_references (project_id, attributes, source, geometry)
    VALUES (p_project_id, feature_properties, 'official_cadastral', geometry_value);
  END LOOP;

  SELECT COUNT(*) INTO v_parcel_count
  FROM public.parcels
  WHERE project_id = p_project_id;

  UPDATE public.projects
  SET parcel_count = v_parcel_count,
      updated_at = now()
  WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'parcels', v_parcel_count,
    'source', 'official_cadastral'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_official_cadastral(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_official_cadastral(UUID, JSONB) TO service_role;

NOTIFY pgrst, 'reload schema';
