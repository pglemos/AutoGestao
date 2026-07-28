-- DOWN
BEGIN;

DROP TABLE IF EXISTS public.deterministic_action_resolutions;

GRANT EXECUTE ON FUNCTION public.prevent_valor_negociado_tamper_after_close()
  TO PUBLIC, anon, authenticated, postgres, service_role;

COMMIT;
