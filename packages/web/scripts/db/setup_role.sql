-- CREATE ROLE role_name LOGIN PASSWORD '<insert password>'';
ALTER ROLE role_name WITH PASSWORD '<insert password>';

GRANT SELECT, INSERT, UPDATE ON public.table_name TO role_name;

REVOKE ALL ON SCHEMA public FROM role_name;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM role_name;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM role_name;

-- setup RLS using Supabase GUI