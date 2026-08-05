-- Migration 20260805120000_harden_rls_unprotected_tables.sql
-- Goal: Hardening RLS policies for 8 internal/audit/backup tables to satisfy Supabase security advisors while guaranteeing zero unauthorized access from anon/authenticated roles.

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
            EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', tbl);

            IF tbl = 'carteira_missao_mutations' THEN
                EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon', tbl);
            ELSE
                EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC, anon, authenticated', tbl);
            END IF;

            EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', tbl);

            -- Construct specific policy names based on previous hardcoded ones, or simply standard prefix
            -- For backward compatibility with the previous script, we use a standard pattern:
            IF tbl = 'migration_backup_lancamentos_diarios_duplicates_20260503' THEN
                EXECUTE format('DROP POLICY IF EXISTS "service_role_only_migration_backup_lancamentos" ON public.%I', tbl);
                EXECUTE format('CREATE POLICY "service_role_only_migration_backup_lancamentos" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
            ELSIF tbl = 'migration_backup_vendedores_loja_duplicates_20260503' THEN
                EXECUTE format('DROP POLICY IF EXISTS "service_role_only_migration_backup_vendedores" ON public.%I', tbl);
                EXECUTE format('CREATE POLICY "service_role_only_migration_backup_vendedores" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
            ELSE
                EXECUTE format('DROP POLICY IF EXISTS "service_role_manage_%s" ON public.%I', tbl, tbl);
                EXECUTE format('CREATE POLICY "service_role_manage_%s" ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl, tbl);
            END IF;
        END IF;
    END LOOP;
END $$;
