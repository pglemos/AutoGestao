-- Corrige a primeira versão já aplicada da automação gerencial:
-- 1. falhas horárias passam a ser persistidas em rpc_error_logs;
-- 2. o backfill corretivo é idempotente e falha de forma atômica.

BEGIN;

CREATE OR REPLACE FUNCTION public.run_manager_routine_snapshot_refresh_clock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  LOOP
    BEGIN
      PERFORM public.consolidate_manager_routine_snapshot(
        manager_row.manager_user_id,
        manager_row.store_id,
        local_date
      );
    EXCEPTION WHEN OTHERS THEN
      PERFORM public.log_rpc_error(
        'run_manager_routine_snapshot_refresh_clock',
        SQLSTATE,
        SQLERRM,
        NULL,
        jsonb_build_object(
          'manager_user_id', manager_row.manager_user_id,
          'store_id', manager_row.store_id,
          'reference_date', local_date
        )
      );
      RAISE WARNING
        'Falha ao consolidar rotina do gerente % na loja %: %',
        manager_row.manager_user_id,
        manager_row.store_id,
        SQLERRM;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.run_manager_routine_snapshot_refresh_clock()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_manager_routine_snapshot_refresh_clock()
  TO service_role;

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
-- Restaurar a versão anterior da função, se necessário. Não remover snapshots
-- já persistidos: eles são histórico operacional válido.
