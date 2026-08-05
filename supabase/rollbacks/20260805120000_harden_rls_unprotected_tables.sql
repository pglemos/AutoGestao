-- Rollback for 20260805120000_harden_rls_unprotected_tables.sql
-- Goal: Revert RLS hardening for internal/audit/backup tables.

DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'ai_model_daily_usage',
        'carteira_missao_mutations',
        'data_correction_audit',
        'internal_mx_admin_rate_limits',
        'migration_backup_lancamentos_diarios_duplicates_20260503',
        'migration_backup_vendedores_loja_duplicates_20260503',
        'password_change_challenges',
        'password_recovery_attempts'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            EXECUTE format('ALTER TABLE IF EXISTS public.%I DISABLE ROW LEVEL SECURITY', tbl);

            -- Grant back ALL to roles that were revoked
            EXECUTE format('GRANT ALL ON TABLE public.%I TO PUBLIC, anon, authenticated', tbl);

            -- Drop the policies created
            IF tbl = 'migration_backup_lancamentos_diarios_duplicates_20260503' THEN
                EXECUTE format('DROP POLICY IF EXISTS "service_role_only_migration_backup_lancamentos" ON public.%I', tbl);
            ELSIF tbl = 'migration_backup_vendedores_loja_duplicates_20260503' THEN
                EXECUTE format('DROP POLICY IF EXISTS "service_role_only_migration_backup_vendedores" ON public.%I', tbl);
            ELSE
                EXECUTE format('DROP POLICY IF EXISTS "service_role_manage_%s" ON public.%I', tbl, tbl);
            END IF;
        END IF;
    END LOOP;
END $$;
