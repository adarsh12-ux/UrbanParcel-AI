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
