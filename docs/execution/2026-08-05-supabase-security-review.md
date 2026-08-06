# Supabase Security Review — MX Gestão Preditiva

A preencher durante fases C0.4-C0.6 e fase 10.

## 8 Tabelas RLS sem policy
1. ai_model_daily_usage
2. carteira_missao_mutations
3. data_correction_audit
4. internal_mx_admin_rate_limits
5. migration_backup_lancamentos_diarios_duplicates_20260503
6. migration_backup_vendedores_loja_duplicates_20260503
7. password_change_challenges
8. password_recovery_attempts

## Funções SECURITY DEFINER (~204)
A classificar por owner, search_path, grants, chamadores, risco.

## Edge Functions (22)
A revisar verify_jwt, CORS, auth interna.

### 13 sem JWT obrigatório
A listar e proteger.