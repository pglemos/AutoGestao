# Advisors Supabase — snapshot 2026-08-09

> Consulta atual do projeto `fbhcmzzgwjdgkctlfvbo`; SHA do checkout `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`. Findings são classificados, não apagados por revogação em massa.

## Segurança

| Regra | Quantidade | Estado |
|---|---:|---|
| `extension_in_public` | 1 | bloqueio externo/configuração ou decisão explícita pendente |
| `authenticated_security_definer_function_executable` | 155 | revisão individual de autorização/tenant pendente |
| `auth_otp_long_expiry` | 1 | bloqueio externo/configuração ou decisão explícita pendente |
| `auth_leaked_password_protection` | 1 | bloqueio externo/configuração ou decisão explícita pendente |

**Total:** 158. A consulta de funções confirma `anon=0`; os 155 findings de authenticated correspondem aos grants atuais e exigem análise por consumidor, não revogação automática.

## Performance

| Regra | Quantidade | Estado |
|---|---:|---|
| `unindexed_foreign_keys` | 226 | classificação e correção priorizada individualmente; não aplicada sem plano de impacto |
| `auth_rls_initplan` | 177 | classificação e correção priorizada individualmente; não aplicada sem plano de impacto |
| `no_primary_key` | 3 | classificação e correção priorizada individualmente; não aplicada sem plano de impacto |
| `unused_index` | 62 | classificação e correção priorizada individualmente; não aplicada sem plano de impacto |
| `multiple_permissive_policies` | 126 | classificação e correção priorizada individualmente; não aplicada sem plano de impacto |
| `duplicate_index` | 3 | classificação e correção priorizada individualmente; não aplicada sem plano de impacto |
| `auth_db_connections_absolute` | 1 | classificação e correção priorizada individualmente; não aplicada sem plano de impacto |

**Total:** 598.
