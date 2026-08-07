-- C0.5 follow-up — Restaurar EXECUTE público da sonda de liveness mx_database_health.
--
-- Contexto: a migration 20260806150000 (C0.5) revogou o grant nominal a `anon`
-- de 11 funções, incluindo mx_database_health(). Porém api/health.ts invoca
-- essa RPC com a apikey ANON (sonda pública de liveness — responde sem
-- autenticação por design). Após a revogação, o check `database` de
-- /api/health passou a retornar `fail` (permission denied for function
-- mx_database_health) e o endpoint passou a responder 503.
--
-- mx_database_health() é SECURITY DEFINER e não expõe dados: retorna apenas
-- `true` (sonda). É a exceção legítima e única de execução anônima.
--
-- Registro: EV-F3-007.

REVOKE ALL ON FUNCTION public.mx_database_health() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.mx_database_health() TO anon;
