# SUPABASE SECURITY REVIEW — 2026-08-05

- **Project ID:** `fbhcmzzgwjdgkctlfvbo`
- **Region:** `sa-east-1`
- **PostgreSQL:** `17.6.1.049`

## 1. TABELAS RLS SEM POLICY (8 TABELAS)
1. `ai_model_daily_usage`
2. `carteira_missao_mutations`
3. `data_correction_audit`
4. `internal_mx_admin_rate_limits`
5. `migration_backup_lancamentos_diarios_duplicates_20260503`
6. `migration_backup_vendedores_loja_duplicates_20260503`
7. `password_change_challenges`
8. `password_recovery_attempts`

## 2. FUNÇÕES SECURITY DEFINER (204 FUNÇÕES)
- Anon execution: 60
- Authenticated execution: 148
- Service role execution: 188

## 3. EDGE FUNCTIONS (22 FUNCTIONS)
- Unprotected / verify_jwt=false: 13 Edge Functions

Status: IN_PROGRESS
