-- Permite a criação de novos usuários pelo menu administrativo da BR3 Tech
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM public.user_roles;

  INSERT INTO public.profiles (id, nome, email, telefone)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)),
          COALESCE(NEW.email,''),
          NEW.raw_user_meta_data->>'telefone')
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    email = EXCLUDED.email,
    telefone = COALESCE(EXCLUDED.telefone, public.profiles.telefone);

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN total = 0 THEN 'admin'::public.app_role
                       ELSE COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'atendente'::public.app_role) END)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
