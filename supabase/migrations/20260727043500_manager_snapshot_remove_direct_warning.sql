-- Remove a emissão direta de SQLERRM do cron gerencial.
-- Falhas continuam isoladas por gerente/loja e ficam persistidas em rpc_error_log.

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
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.run_manager_routine_snapshot_refresh_clock()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_manager_routine_snapshot_refresh_clock()
  TO service_role;

COMMIT;

-- DOWN
-- Restaurar a definição anterior apenas se a exposição de SQLERRM em WARNING
-- voltar a ser uma exigência operacional formal.
