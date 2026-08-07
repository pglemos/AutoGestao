# Supabase Security Review — MX Gestão Preditiva (2026-08-05)

## Inventário Inicial de Segurança (Project ID: `fbhcmzzgwjdgkctlfvbo`)

### Tabelas RLS sem Policy
1. `ai_model_daily_usage`
2. `carteira_missao_mutations`
3. `data_correction_audit`
4. `internal_mx_admin_rate_limits`
5. `migration_backup_lancamentos_diarios_duplicates_20260503`
6. `migration_backup_vendedores_loja_duplicates_20260503`
7. `password_change_challenges`
8. `password_recovery_attempts`

### Revisão de Funções SECURITY DEFINER
- Total de funções públicas: 237
- Total `SECURITY DEFINER`: 204
- Acessíveis por `anon`: 60
- Acessíveis por `authenticated`: 148

### Edge Functions
- Total ativas: 22
- `verify_jwt=false`: 13 (Requer auditoria de auth interna HMAC / secret token)