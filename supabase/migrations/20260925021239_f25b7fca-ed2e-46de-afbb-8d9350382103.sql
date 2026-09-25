CREATE OR REPLACE FUNCTION public.precisa_primeiro_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;
REVOKE ALL ON FUNCTION public.precisa_primeiro_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.precisa_primeiro_admin() TO anon, authenticated;