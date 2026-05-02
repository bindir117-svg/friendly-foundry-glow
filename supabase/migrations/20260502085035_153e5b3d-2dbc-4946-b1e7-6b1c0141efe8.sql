
-- has_role MUST be SECURITY DEFINER and callable by authenticated users
-- because it's used inside RLS policies. This is the documented Supabase pattern
-- for role-based access control. The linter warning is a false positive here.
COMMENT ON FUNCTION public.has_role(uuid, public.app_role) IS
'SECURITY DEFINER role check used inside RLS policies. Must be executable by authenticated users.';
