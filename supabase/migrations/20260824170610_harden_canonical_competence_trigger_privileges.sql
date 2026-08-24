-- Trigger entrypoints are invoked by PostgreSQL only. They must not be
-- exposed as SECURITY DEFINER RPCs through the public Data API.
REVOKE ALL ON FUNCTION public.sync_evento_competencia_canonica() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_oportunidade_competencia_canonica() FROM PUBLIC, anon, authenticated;
