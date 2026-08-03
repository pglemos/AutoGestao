-- A exclusão de um vínculo e a remoção do pré-cadastro correspondente devem
-- ocorrer na mesma transação. O trigger também cobre o caminho autenticado
-- existente que altera o vínculo sem passar pela Edge Function.

CREATE OR REPLACE FUNCTION public.cleanup_pre_registration_after_team_deactivation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(btrim(email)) INTO v_email
  FROM public.usuarios
  WHERE id = NEW.user_id;

  DELETE FROM public.pre_cadastros_loja
  WHERE store_id = NEW.store_id
    AND (
      auth_user_id = NEW.user_id
      OR (auth_user_id IS NULL AND v_email IS NOT NULL AND lower(btrim(email)) = v_email)
    );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_pre_registration_after_team_deactivation()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS cleanup_pre_registration_after_team_deactivation
  ON public.vinculos_loja;
CREATE TRIGGER cleanup_pre_registration_after_team_deactivation
  AFTER UPDATE OF is_active ON public.vinculos_loja
  FOR EACH ROW
  WHEN (OLD.is_active IS TRUE AND NEW.is_active IS FALSE)
  EXECUTE FUNCTION public.cleanup_pre_registration_after_team_deactivation();

-- DOWN
DROP TRIGGER IF EXISTS cleanup_pre_registration_after_team_deactivation
  ON public.vinculos_loja;
DROP FUNCTION IF EXISTS public.cleanup_pre_registration_after_team_deactivation();
