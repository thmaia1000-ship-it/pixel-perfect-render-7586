DROP FUNCTION IF EXISTS public.precisa_primeiro_admin();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM public.user_roles WHERE role = 'admin';
  IF total > 0 AND current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'BR3_SOMENTE_ADMIN_CRIA_CONTAS';
  END IF;

  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
          COALESCE(NEW.email,''),
          NEW.raw_user_meta_data->>'telefone');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN total = 0 THEN 'admin'::public.app_role
                       ELSE COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role,'atendente'::public.app_role) END);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;