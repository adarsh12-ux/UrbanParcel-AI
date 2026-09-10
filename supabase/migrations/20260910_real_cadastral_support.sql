-- ========================================================================
-- Real Cadastral / Parcel Boundary Support Migration
-- Supabase / PostGIS Schema & RPC Functions
-- ========================================================================

-- 1. Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- 2. Extend public.parcels table with necessary fields
ALTER TABLE public.parcels
  ADD COLUMN IF NOT EXISTS subdivision_number TEXT,
  ADD COLUMN IF NOT EXISTS source_file TEXT;

-- Ensure geometry is MultiPolygon with SRID 4326
ALTER TABLE public.parcels
  ALTER COLUMN geometry TYPE extensions.geometry(MultiPolygon, 4326)
  USING extensions.ST_Multi(geometry);

-- Ensure source constraint includes all valid cadastral and edit sources
ALTER TABLE public.parcels DROP CONSTRAINT IF EXISTS parcels_source_check;
ALTER TABLE public.parcels ADD CONSTRAINT parcels_source_check
  CHECK (source IN ('user_imported_cadastral', 'official_cadastral', 'ai_extracted', 'manual_edit', 'verified'));

-- 3. Ensure Spatial and Relationship Indexes
CREATE INDEX IF NOT EXISTS idx_parcels_project_id ON public.parcels(project_id);
CREATE INDEX IF NOT EXISTS idx_parcels_geometry ON public.parcels USING GIST(geometry);

-- 4. Import User Cadastral RPC Function
CREATE OR REPLACE FUNCTION public.import_user_cadastral(
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
  subdivision_number TEXT;
  land_use_val TEXT;
  source_file TEXT;
  inserted_count INTEGER := 0;
  v_parcel_count INTEGER := 0;
  v_source TEXT;
BEGIN
  IF jsonb_typeof(p_geojson) <> 'object'
    OR p_geojson->>'type' <> 'FeatureCollection'
    OR jsonb_typeof(p_geojson->'features') <> 'array' THEN
    RAISE EXCEPTION 'Cadastral input must be a GeoJSON FeatureCollection';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project does not exist';
  END IF;

  FOR feature IN SELECT value FROM jsonb_array_elements(p_geojson->'features') LOOP
    feature_geometry := feature->'geometry';
    feature_properties := COALESCE(feature->'properties', '{}'::jsonb);
    
    parcel_identifier := NULLIF(BTRIM(COALESCE(
      feature_properties->>'parcel_identifier',
      feature_properties->>'parcel_id',
      feature_properties->>'survey_number',
      feature_properties->>'id'
    )), '');

    survey_number := NULLIF(BTRIM(COALESCE(
      feature_properties->>'survey_number',
      feature_properties->>'survey_no',
      feature_properties->>'khasra_no',
      feature_properties->>'plot_no'
    )), '');

    subdivision_number := NULLIF(BTRIM(COALESCE(
      feature_properties->>'subdivision_number',
      feature_properties->>'subdivision_no'
    )), '');

    land_use_val := NULLIF(BTRIM(COALESCE(
      feature_properties->>'land_use',
      feature_properties->>'landuse',
      feature_properties->>'zoning'
    )), '');

    source_file := NULLIF(BTRIM(feature_properties->>'source_file'), '');
    
    -- Preserve explicit source or default to user_imported_cadastral
    v_source := COALESCE(NULLIF(BTRIM(feature_properties->>'source'), ''), 'user_imported_cadastral');

    IF feature->>'type' <> 'Feature'
      OR feature_geometry->>'type' NOT IN ('Polygon', 'MultiPolygon')
      OR parcel_identifier IS NULL THEN
      RAISE EXCEPTION 'Every cadastral feature must be a Polygon or MultiPolygon with a valid parcel identifier';
    END IF;

    geometry_value := extensions.ST_Multi(extensions.ST_SetSRID(
      extensions.ST_GeomFromGeoJSON(feature_geometry::text), 4326
    ));

    IF geometry_value IS NULL
      OR extensions.ST_IsEmpty(geometry_value)
      OR NOT extensions.ST_IsValid(geometry_value) THEN
      RAISE EXCEPTION 'Cadastral feature % has invalid geometry', parcel_identifier;
    END IF;

    feature_properties := jsonb_set(feature_properties, '{source}', to_jsonb(v_source), true);
    feature_properties := jsonb_set(feature_properties, '{review_status}', '"needs_review"'::jsonb, true);

    INSERT INTO public.parcels (
      project_id,
      parcel_identifier,
      survey_number,
      subdivision_number,
      source_file,
      area_sqm,
      perimeter_m,
      land_use,
      source,
      review_status,
      attributes,
      geometry,
      source_job_id
    ) VALUES (
      p_project_id,
      parcel_identifier,
      survey_number,
      subdivision_number,
      source_file,
      extensions.ST_Area(extensions.ST_Transform(geometry_value, 3857)),
      extensions.ST_Perimeter(extensions.ST_Transform(geometry_value, 3857)),
      COALESCE(land_use_val, 'Vacant'),
      v_source,
      'needs_review',
      feature_properties,
      geometry_value,
      NULL
    )
    ON CONFLICT (project_id, parcel_identifier) DO UPDATE SET
      survey_number = EXCLUDED.survey_number,
      subdivision_number = EXCLUDED.subdivision_number,
      source_file = EXCLUDED.source_file,
      area_sqm = EXCLUDED.area_sqm,
      perimeter_m = EXCLUDED.perimeter_m,
      land_use = EXCLUDED.land_use,
      attributes = EXCLUDED.attributes,
      geometry = EXCLUDED.geometry,
      source = EXCLUDED.source,
      review_status = 'needs_review',
      updated_at = now();

    IF FOUND THEN
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  SELECT COUNT(*) INTO v_parcel_count FROM public.parcels WHERE project_id = p_project_id;
  UPDATE public.projects SET parcel_count = v_parcel_count, updated_at = now() WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'inserted', inserted_count,
    'parcels', v_parcel_count,
    'source', 'user_imported_cadastral'
  );
END;
$$;

-- 5. Delete Cadastral Parcels RPC Function
CREATE OR REPLACE FUNCTION public.delete_cadastral_parcels(
  p_project_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  deleted_count INTEGER := 0;
  v_remaining_count INTEGER := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id) THEN
    RAISE EXCEPTION 'Project does not exist';
  END IF;

  DELETE FROM public.parcels
  WHERE project_id = p_project_id
    AND source IN ('user_imported_cadastral', 'official_cadastral');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  SELECT COUNT(*) INTO v_remaining_count FROM public.parcels WHERE project_id = p_project_id;
  UPDATE public.projects SET parcel_count = v_remaining_count, updated_at = now() WHERE id = p_project_id;

  RETURN jsonb_build_object(
    'deleted', deleted_count,
    'remaining_parcels', v_remaining_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_user_cadastral(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_user_cadastral(UUID, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.delete_cadastral_parcels(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_cadastral_parcels(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
