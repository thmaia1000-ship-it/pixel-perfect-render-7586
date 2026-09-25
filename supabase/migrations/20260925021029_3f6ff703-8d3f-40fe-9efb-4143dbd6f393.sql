REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.gera_numero_os() RETURNS text
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path = public AS $$
  SELECT 'OS-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.os_numero_seq')::text, 4, '0');
$$;
REVOKE ALL ON FUNCTION public.gera_numero_os() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gera_numero_os() TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.os_numero_seq TO authenticated;
GRANT ALL ON SEQUENCE public.os_numero_seq TO service_role;