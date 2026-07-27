-- Gera imediatamente o primeiro snapshot gerencial após instalar o cron.
-- O refresh horário continuará mantendo as versões seguintes atualizadas.

BEGIN;

SELECT public.run_manager_routine_snapshot_refresh_clock();

COMMIT;

-- Sem DOWN: snapshots são registros históricos versionados e não devem ser
-- removidos durante rollback da automação.
