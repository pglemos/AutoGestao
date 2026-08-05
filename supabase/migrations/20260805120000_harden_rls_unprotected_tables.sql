-- Migration 20260805120000_harden_rls_unprotected_tables.sql
-- Goal: Hardening RLS policies for 8 internal/audit/backup tables to satisfy Supabase security advisors while guaranteeing zero unauthorized access from anon/authenticated roles.

-- 1. ai_model_daily_usage
ALTER TABLE IF EXISTS public.ai_model_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_model_daily_usage FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ai_model_daily_usage TO service_role;
DROP POLICY IF EXISTS "service_role_manage_ai_model_daily_usage" ON public.ai_model_daily_usage;
CREATE POLICY "service_role_manage_ai_model_daily_usage" ON public.ai_model_daily_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. carteira_missao_mutations
ALTER TABLE IF EXISTS public.carteira_missao_mutations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.carteira_missao_mutations FROM PUBLIC, anon;
GRANT ALL ON TABLE public.carteira_missao_mutations TO service_role;
DROP POLICY IF EXISTS "service_role_manage_carteira_missao_mutations" ON public.carteira_missao_mutations;
CREATE POLICY "service_role_manage_carteira_missao_mutations" ON public.carteira_missao_mutations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. data_correction_audit
ALTER TABLE IF EXISTS public.data_correction_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.data_correction_audit FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.data_correction_audit TO service_role;
DROP POLICY IF EXISTS "service_role_manage_data_correction_audit" ON public.data_correction_audit;
CREATE POLICY "service_role_manage_data_correction_audit" ON public.data_correction_audit
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. internal_mx_admin_rate_limits
ALTER TABLE IF EXISTS public.internal_mx_admin_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.internal_mx_admin_rate_limits FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.internal_mx_admin_rate_limits TO service_role;
DROP POLICY IF EXISTS "service_role_manage_internal_mx_admin_rate_limits" ON public.internal_mx_admin_rate_limits;
CREATE POLICY "service_role_manage_internal_mx_admin_rate_limits" ON public.internal_mx_admin_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. migration_backup_lancamentos_diarios_duplicates_20260503
ALTER TABLE IF EXISTS public.migration_backup_lancamentos_diarios_duplicates_20260503 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.migration_backup_lancamentos_diarios_duplicates_20260503 FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.migration_backup_lancamentos_diarios_duplicates_20260503 TO service_role;
DROP POLICY IF EXISTS "service_role_only_migration_backup_lancamentos" ON public.migration_backup_lancamentos_diarios_duplicates_20260503;
CREATE POLICY "service_role_only_migration_backup_lancamentos" ON public.migration_backup_lancamentos_diarios_duplicates_20260503
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. migration_backup_vendedores_loja_duplicates_20260503
ALTER TABLE IF EXISTS public.migration_backup_vendedores_loja_duplicates_20260503 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.migration_backup_vendedores_loja_duplicates_20260503 FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.migration_backup_vendedores_loja_duplicates_20260503 TO service_role;
DROP POLICY IF EXISTS "service_role_only_migration_backup_vendedores" ON public.migration_backup_vendedores_loja_duplicates_20260503;
CREATE POLICY "service_role_only_migration_backup_vendedores" ON public.migration_backup_vendedores_loja_duplicates_20260503
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. password_change_challenges
ALTER TABLE IF EXISTS public.password_change_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_change_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.password_change_challenges TO service_role;
DROP POLICY IF EXISTS "service_role_manage_password_change_challenges" ON public.password_change_challenges;
CREATE POLICY "service_role_manage_password_change_challenges" ON public.password_change_challenges
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. password_recovery_attempts
ALTER TABLE IF EXISTS public.password_recovery_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.password_recovery_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.password_recovery_attempts TO service_role;
DROP POLICY IF EXISTS "service_role_manage_password_recovery_attempts" ON public.password_recovery_attempts;
CREATE POLICY "service_role_manage_password_recovery_attempts" ON public.password_recovery_attempts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
