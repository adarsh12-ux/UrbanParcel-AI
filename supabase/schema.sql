-- ========================================================================
-- UrbanParcel AI - Government GIS & Cadastral Land Information System
-- Database Schema & Row Level Security (RLS) Configuration for Supabase
-- ========================================================================

-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'Department of Land Records & Survey',
  designation TEXT NOT NULL DEFAULT 'Cadastral Survey Specialist',
  role TEXT NOT NULL DEFAULT 'surveyor' CHECK (role IN ('admin', 'surveyor', 'planner', 'inspector')),
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Helper Function to Check if Current User is an Approved Admin
-- Security Definer avoids recursive RLS evaluation
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND role = 'admin'
      AND is_approved = true
  );
$$;

-- 5. Helper Function to Check if Current User is Approved
CREATE OR REPLACE FUNCTION public.is_approved()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE auth_user_id = auth.uid()
      AND is_approved = true
  );
$$;

-- 6. Row Level Security Policies for PROFILES

-- Policy A: Users can view their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = auth_user_id);

-- Policy B: Approved Admins can view all employee profiles
CREATE POLICY "profiles_select_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- Policy C: Approved Admins can insert new employee profiles
CREATE POLICY "profiles_insert_admin"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() OR auth.uid() = auth_user_id);

-- Policy D: Approved Admins can update any employee profile (approve, disable, change role)
CREATE POLICY "profiles_update_admin"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Policy E: Users can update limited self fields (e.g., name, designation) but NOT is_approved or role
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = auth_user_id)
  WITH CHECK (
    auth.uid() = auth_user_id
    AND is_approved = (SELECT is_approved FROM public.profiles WHERE auth_user_id = auth.uid())
    AND role = (SELECT role FROM public.profiles WHERE auth_user_id = auth.uid())
  );

-- Policy F: Approved Admins can delete employee profiles
CREATE POLICY "profiles_delete_admin"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- 7. Trigger to automatically handle profile creation when user signs up via auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id TEXT;
  v_full_name TEXT;
  v_department TEXT;
  v_designation TEXT;
  v_role TEXT;
  v_is_approved BOOLEAN;
BEGIN
  -- Extract metadata or fallback
  v_employee_id := COALESCE(
    new.raw_user_meta_data->>'employee_id',
    UPPER(SPLIT_PART(new.email, '@', 1))
  );
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name',
    SPLIT_PART(new.email, '@', 1)
  );
  v_department := COALESCE(
    new.raw_user_meta_data->>'department',
    'Department of Land Records & Survey'
  );
  v_designation := COALESCE(
    new.raw_user_meta_data->>'designation',
    'Cadastral Survey Specialist'
  );
  v_role := COALESCE(
    new.raw_user_meta_data->>'role',
    'surveyor'
  );
  v_is_approved := COALESCE(
    (new.raw_user_meta_data->>'is_approved')::BOOLEAN,
    FALSE
  );

  INSERT INTO public.profiles (
    auth_user_id,
    employee_id,
    full_name,
    department,
    designation,
    role,
    is_approved,
    created_at,
    updated_at
  ) VALUES (
    new.id,
    v_employee_id,
    v_full_name,
    v_department,
    v_designation,
    v_role,
    v_is_approved,
    now(),
    now()
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. Create PROJECTS Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  survey_area_sq_km NUMERIC NOT NULL DEFAULT 1.0,
  crs TEXT NOT NULL DEFAULT 'WGS 84 / EPSG:4326',
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Processing', 'Completed', 'Failed')),
  parcel_count INTEGER NOT NULL DEFAULT 0,
  building_count INTEGER NOT NULL DEFAULT 0,
  road_segment_count INTEGER NOT NULL DEFAULT 0,
  thumbnail TEXT,
  center_lat NUMERIC NOT NULL DEFAULT 16.5062,
  center_lng NUMERIC NOT NULL DEFAULT 80.6480,
  gsd_cm_per_px NUMERIC DEFAULT 3.2,
  imagery_file_name TEXT,
  imagery_file_size_mb NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes for projects
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated and anon users with API key to read and manage survey projects
CREATE POLICY "projects_select_all"
  ON public.projects
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "projects_insert_all"
  ON public.projects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "projects_update_all"
  ON public.projects
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "projects_delete_all"
  ON public.projects
  FOR DELETE
  TO anon, authenticated
  USING (true);

-- ========================================================================
-- Sample Initial Admin Setup (Run in Supabase SQL Editor to seed 1st Admin)
-- ========================================================================
-- To create your first Administrator account:
-- 1. Create user in Supabase Authentication tab with email 'admin@urbanparcel.gov'
-- 2. Then run:
-- UPDATE public.profiles
-- SET is_approved = true, role = 'admin', employee_id = 'AP-REV-ADMIN', full_name = 'System Administrator'
-- WHERE auth_user_id = (SELECT id FROM auth.users WHERE email = 'admin@urbanparcel.gov');

-- ========================================================================
-- Production GIS pipeline extension
-- Requires the PostGIS extension and a worker service for feature extraction.
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS imagery_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS imagery_path TEXT,
  ADD COLUMN IF NOT EXISTS imagery_mime_type TEXT,
  ADD COLUMN IF NOT EXISTS imagery_checksum TEXT;

DROP POLICY IF EXISTS "projects_select_all" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_all" ON public.projects;
DROP POLICY IF EXISTS "projects_update_all" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_all" ON public.projects;
CREATE POLICY "projects_select_approved" ON public.projects FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "projects_insert_approved" ON public.projects FOR INSERT TO authenticated WITH CHECK (public.is_approved() AND (created_by IS NULL OR created_by = auth.uid()));
CREATE POLICY "projects_update_approved" ON public.projects FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());
CREATE POLICY "projects_delete_approved" ON public.projects FOR DELETE TO authenticated USING (public.is_approved());

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check
  CHECK (status IN ('Draft', 'Uploaded', 'Validating', 'Processing', 'Extracting Features', 'Generating GIS Layers', 'Completed', 'Failed'));

CREATE TABLE IF NOT EXISTS public.project_imagery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'orthomosaics',
  storage_path TEXT NOT NULL UNIQUE,
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  checksum TEXT,
  crs TEXT,
  width INTEGER,
  height INTEGER,
  bounds extensions.geometry(Polygon, 4326),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL DEFAULT 'pending' CHECK (validation_status IN ('pending', 'validating', 'valid', 'invalid')),
  validation_error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_imagery_project_id ON public.project_imagery(project_id);
ALTER TABLE public.project_imagery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_imagery_select_approved" ON public.project_imagery FOR SELECT TO authenticated
  USING (public.is_approved());
CREATE POLICY "project_imagery_insert_approved" ON public.project_imagery FOR INSERT TO authenticated
  WITH CHECK (public.is_approved() AND (created_by IS NULL OR created_by = auth.uid()));

CREATE TABLE IF NOT EXISTS public.processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  imagery_id UUID NOT NULL REFERENCES public.project_imagery(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'validating', 'processing', 'extracting features', 'generating GIS layers', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  current_step TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  worker_job_id TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_processing_jobs_project_id ON public.processing_jobs(project_id, created_at DESC);
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "processing_jobs_select_approved" ON public.processing_jobs FOR SELECT TO authenticated
  USING (public.is_approved());
CREATE POLICY "processing_jobs_insert_approved" ON public.processing_jobs FOR INSERT TO authenticated
  WITH CHECK (public.is_approved() AND (created_by IS NULL OR created_by = auth.uid()));

CREATE TABLE IF NOT EXISTS public.parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parcel_identifier TEXT NOT NULL,
  survey_number TEXT,
  area_sqm NUMERIC,
  perimeter_m NUMERIC,
  land_use TEXT,
  confidence NUMERIC,
  source TEXT NOT NULL CHECK (source IN ('ai_extracted', 'official_cadastral', 'manual_edit', 'verified')),
  review_status TEXT NOT NULL DEFAULT 'needs_review' CHECK (review_status IN ('needs_review', 'verified', 'rejected')),
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  geometry extensions.geometry(Polygon, 4326) NOT NULL,
  source_job_id UUID REFERENCES public.processing_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, parcel_identifier)
);

CREATE INDEX IF NOT EXISTS idx_parcels_project_geometry ON public.parcels USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_parcels_project_id ON public.parcels(project_id);

CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES public.parcels(id) ON DELETE SET NULL,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('ai_extracted', 'official_cadastral', 'manual_edit', 'verified')),
  geometry extensions.geometry(Polygon, 4326) NOT NULL,
  source_job_id UUID REFERENCES public.processing_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_buildings_project_geometry ON public.buildings USING GIST(geometry);

CREATE TABLE IF NOT EXISTS public.roads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('ai_extracted', 'official_cadastral', 'manual_edit', 'verified')),
  geometry extensions.geometry(LineString, 4326) NOT NULL,
  source_job_id UUID REFERENCES public.processing_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_roads_project_geometry ON public.roads USING GIST(geometry);

CREATE TABLE IF NOT EXISTS public.water_bodies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('ai_extracted', 'official_cadastral', 'manual_edit', 'verified')),
  geometry extensions.geometry(Polygon, 4326) NOT NULL,
  source_job_id UUID REFERENCES public.processing_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_water_bodies_project_geometry ON public.water_bodies USING GIST(geometry);

CREATE TABLE IF NOT EXISTS public.vegetation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('ai_extracted', 'official_cadastral', 'manual_edit', 'verified')),
  geometry extensions.geometry(Polygon, 4326) NOT NULL,
  source_job_id UUID REFERENCES public.processing_jobs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vegetation_project_geometry ON public.vegetation USING GIST(geometry);

CREATE TABLE IF NOT EXISTS public.cadastral_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL DEFAULT 'official_cadastral' CHECK (source = 'official_cadastral'),
  geometry extensions.geometry(Geometry, 4326) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cadastral_references_project_geometry ON public.cadastral_references USING GIST(geometry);

ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_bodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vegetation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastral_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spatial_features_select_approved" ON public.parcels FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "spatial_features_insert_approved" ON public.parcels FOR INSERT TO authenticated WITH CHECK (public.is_approved());
CREATE POLICY "spatial_features_update_approved" ON public.parcels FOR UPDATE TO authenticated USING (public.is_approved()) WITH CHECK (public.is_approved());
CREATE POLICY "spatial_features_delete_approved" ON public.parcels FOR DELETE TO authenticated USING (public.is_approved());

CREATE POLICY "buildings_select_approved" ON public.buildings FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "roads_select_approved" ON public.roads FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "water_bodies_select_approved" ON public.water_bodies FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "vegetation_select_approved" ON public.vegetation FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "cadastral_references_select_approved" ON public.cadastral_references FOR SELECT TO authenticated USING (public.is_approved());

CREATE TABLE IF NOT EXISTS public.parcel_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES public.parcels(id) ON DELETE CASCADE,
  previous_geometry extensions.geometry(Polygon, 4326) NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('edit_vertices', 'draw', 'split', 'merge', 'delete', 'restore')),
  edited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_parcel_edit_history_parcel_id ON public.parcel_edit_history(parcel_id, created_at DESC);
ALTER TABLE public.parcel_edit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "parcel_edit_history_select_approved" ON public.parcel_edit_history FOR SELECT TO authenticated USING (public.is_approved());
CREATE POLICY "parcel_edit_history_insert_approved" ON public.parcel_edit_history FOR INSERT TO authenticated WITH CHECK (public.is_approved());

CREATE OR REPLACE FUNCTION public.save_parcel_geometry(
  p_parcel_id UUID,
  p_geometry JSONB,
  p_action TEXT DEFAULT 'edit_vertices'
)
RETURNS public.parcels
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions
AS $$
DECLARE
  v_parcel public.parcels;
BEGIN
  SELECT * INTO v_parcel FROM public.parcels WHERE id = p_parcel_id FOR UPDATE;
  IF v_parcel.id IS NULL THEN RAISE EXCEPTION 'Parcel not found'; END IF;
  INSERT INTO public.parcel_edit_history(parcel_id, previous_geometry, action, edited_by)
  VALUES (v_parcel.id, v_parcel.geometry, p_action, auth.uid());
  UPDATE public.parcels
  SET geometry = extensions.ST_SetSRID(extensions.ST_GeomFromGeoJSON(p_geometry::text), 4326),
      source = 'manual_edit', review_status = 'needs_review', updated_at = now()
  WHERE id = p_parcel_id
  RETURNING * INTO v_parcel;
  RETURN v_parcel;
END;
$$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('orthomosaics', 'orthomosaics', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "orthomosaics_select_approved" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'orthomosaics' AND public.is_approved());
CREATE POLICY "orthomosaics_insert_approved" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'orthomosaics' AND public.is_approved());
CREATE POLICY "orthomosaics_delete_approved" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'orthomosaics' AND public.is_approved());
