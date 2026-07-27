-- Gera imediatamente o primeiro snapshot gerencial após instalar o cron.
-- O refresh horário continuará mantendo as versões seguintes atualizadas.
-- Reaplicações não geram versões duplicadas: apenas gerentes ativos sem
-- snapshot na data local são consolidados.

BEGIN;

DO $$
DECLARE
  manager_row record;
  local_date date := timezone('America/Sao_Paulo', now())::date;
BEGIN
  FOR manager_row IN
    SELECT DISTINCT
      vl.user_id AS manager_user_id,
      vl.store_id
    FROM public.vinculos_loja vl
    JOIN public.usuarios u
      ON u.id = vl.user_id
     AND u.active = true
     AND u.role = 'gerente'
    JOIN public.lojas l
      ON l.id = vl.store_id
     AND l.active = true
    WHERE vl.role = 'gerente'
      AND vl.is_active = true
      AND vl.ended_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.manager_routine_snapshots snapshot
        WHERE snapshot.manager_user_id = vl.user_id
          AND snapshot.store_id = vl.store_id
          AND snapshot.reference_date = local_date
      )
  LOOP
    -- Sem bloco EXCEPTION por gerente: qualquer falha aborta o backfill inteiro,
    -- evitando um estado parcialmente preenchido sem sinalização ao deploy.
    PERFORM public.consolidate_manager_routine_snapshot(
      manager_row.manager_user_id,
      manager_row.store_id,
      local_date
    );
  END LOOP;
END
$$;

COMMIT;

-- DOWN
-- Nenhuma exclusão é executada: snapshots são registros históricos versionados
-- e devem permanecer disponíveis mesmo após rollback da automação horária.
