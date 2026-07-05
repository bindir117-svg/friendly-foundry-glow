
REVOKE ALL ON FUNCTION public.award_xp(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer) TO authenticated, service_role;
