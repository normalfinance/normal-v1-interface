-- CREATE ROLE role_name LOGIN PASSWORD '<insert password>';
ALTER ROLE role_name WITH PASSWORD '<insert password>';

-- edit the permissions below as needed by the role
GRANT SELECT, INSERT, UPDATE ON public.table_name TO role_name;

REVOKE ALL ON SCHEMA public FROM role_name;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM role_name;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM role_name;

-- Setup RLS using Supabase GUI

-- Enable RLS (if not already)
-- ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- Allow reads for role_name
-- CREATE POLICY "Read access for role_name"
--   ON public.table_name
--   FOR SELECT
--   TO role_name
--   USING (true);