-- Gera imediatamente o primeiro snapshot gerencial após instalar o cron.
-- O refresh horário continuará mantendo as versões seguintes atualizadas.

BEGIN;

SELECT public.run_manager_routine_snapshot_refresh_clock();

COMMIT;

-- DOWN
-- Nenhuma exclusão é executada: snapshots são registros históricos versionados
-- e devem permanecer disponíveis mesmo após rollback da automação horária.
