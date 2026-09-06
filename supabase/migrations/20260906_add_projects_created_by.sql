-- Apply this migration in the Supabase SQL editor or through Supabase CLI.
-- It is intentionally separate because CREATE TABLE IF NOT EXISTS does not
-- update an already deployed projects table.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_projects_created_by
  ON public.projects(created_by);

-- Refresh PostgREST's schema cache after the column is added.
NOTIFY pgrst, 'reload schema';