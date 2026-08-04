# Revisão de segurança Supabase — 2026-08-04

Estado: `IN_PROGRESS`
Projeto esperado: MX Gestão Preditiva; identificador remoto não é repetido neste artefato.
Último SHA de código observado: `11a9465f253ce8f96052db70c9171b14425e9d4e`.

## Escopo obrigatório

- migrations locais versus histórico remoto;
- tabelas/views, RLS, policies, grants, ownership, PKs, FKs e índices;
- todas as funções `SECURITY DEFINER`, especialmente `anon`/`authenticated`;
- `search_path`, Storage, Auth, Edge Functions, Realtime e `pg_net`;
- matriz de acesso por Vendedor, Gerente, Dono, Administrador Geral, Administrador MX e Consultor MX;
- teste cross-tenant por query, RPC, view, Realtime, Storage, Edge Function, exportação, simulação, URL e ID previsível.

## Inventário inicial revalidado

O prompt de execução traz contagens históricas de advisors, tabelas sem policy, funções privilegiadas e Edge Functions. Elas são hipóteses, não resultados atuais. Cada contagem será substituída por query/CLI atual com timestamp e estado individual.

## Ledger de findings

| ID | Objeto | Evidência atual | Risco | Ação | Migration | Testes | Estado |
|---|---|---|---|---|---|---|---|
| SB-001 | Advisors de segurança | ainda não reexecutados nesta rodada | desconhecido | inventariar e classificar individualmente | pendente | pendente | `IN_PROGRESS` |
| SB-002 | Funções `SECURITY DEFINER` | contagem histórica não é prova atual | desconhecido | exportar assinatura, grants, search_path e chamadores | pendente | pendente | `IN_PROGRESS` |
| SB-003 | RLS/policies/grants | auditoria completa pendente | alto se houver acesso amplo | matriz anon/auth/roles/tenant | pendente | pendente | `IN_PROGRESS` |
| SB-004 | Backup/restore | bundle Git validado; backup Supabase ainda não provado | alto | verificar capacidade e restore seguro fora de produção | pendente | pendente | `IN_PROGRESS` |

Não haverá revogação em massa nem mutação remota sem reconciliação de consumidores, migration idempotente, rollback documentado e testes de acesso.
