# Classificação dos Supabase Advisors — 2026-08-17

**Projeto:** `fbhcmzzgwjdgkctlfvbo` (MX Gestão Preditiva)
**SHA auditado:** `d737729b6a913fcb57a19b2cb7908814429be168`
**Método:** `get_advisors` (security + performance) + verificação direta em `pg_proc`, `pg_class`, `pg_policies`.

## Resultado de topo

| Categoria | ERROR | WARN | INFO |
|---|---|---|---|
| Security | **0** | 164 | 8 |
| Performance | **0** | 341 | 342 |

Meta do contrato (Security ERROR = 0) atingida. Nenhum achado bloqueia release.

---

## Security

### `authenticated_security_definer_function_executable` — 161 × WARN → **EXPECTED**

O produto inteiro conversa com o banco por RPC `SECURITY DEFINER` chamada pelo papel `authenticated`; a autorização vive dentro da função, não no `EXECUTE`. Revogar o grant desligaria a aplicação.

O risco real de `SECURITY DEFINER` é `search_path` mutável, e ele está fechado — verificado, não presumido:

```sql
select count(*) filter (where prosecdef) as total,
       count(*) filter (where prosecdef and proconfig is null) as sem_search_path
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public';
-- total: 217 | sem_search_path: 0
```

217 de 217 funções fixam `search_path`. Distribuição: `public` (192), `public, pg_temp` (9), `public, pg_catalog` (6), `public, cron, net` (4), `public, extensions` (4), `public, cron, pg_catalog` (1), `public, auth, pg_temp` (1). Nenhuma herda o caminho do chamador.

### `rls_enabled_no_policy` — 8 × INFO → **ACCEPTED (transitório)**

Todas são tabelas `backup_*` da faxina de 2026-08-16. RLS ligado sem policy = negação por padrão: ninguém lê via API.

Auditei as 10 `backup_*` do schema `public`. As duas que têm policy (`backup_vendas_datas_20260805`, `backup_is_venda_loja_20260805`) usam `qual = false` — deny explícito para `anon` e `authenticated`. Nenhum grant direto a esses papéis em nenhuma das dez. **Zero exposição.**

Pendência de higiene, não de segurança: são 10 tabelas de backup residentes em `public`. Remoção é destrutiva e depende de decisão do dono dos dados — não executada.

### `extension_in_public` (pg_net) — 1 × WARN → **DEFERRED**

Mover `pg_net` de schema quebra as referências existentes em cron jobs e funções. Custo alto, ganho marginal num schema já sem grants abertos a `anon`.

### `auth_otp_long_expiry` — 1 × WARN → **PENDENTE DE AUTORIZAÇÃO**

OTP de e-mail expira em mais de uma hora; recomendado abaixo disso.

### `auth_leaked_password_protection` — 1 × WARN → **PENDENTE DE AUTORIZAÇÃO**

Checagem contra HaveIBeenPwned desligada.

> Os dois últimos são configuração de conta no dashboard do Auth, não código. Ficam pendentes de autorização explícita do operador — alterar política de autenticação afeta login de usuários reais em produção.

---

## Performance

| Lint | Qtd | Nível | Classificação |
|---|---|---|---|
| `auth_rls_initplan` | 178 | WARN | **DEFERRED** — `auth.uid()` reavaliado por linha nas policies. Correção (`(select auth.uid())`) é mecânica mas toca 178 policies; exige migration própria com reteste de RLS por papel. |
| `multiple_permissive_policies` | 160 | WARN | **DEFERRED** — políticas permissivas sobrepostas na mesma tabela/comando. Consolidar sem regressão de isolamento exige a mesma migration acima. |
| `unindexed_foreign_keys` | 256 | INFO | **DEFERRED** — índice por FK sem medição vira custo de escrita. Priorizar pelas FKs efetivamente usadas em join quente. |
| `unused_index` | 74 | INFO | **ACCEPTED** — estatística acumulada; parte é de rota sazonal. Não remover às cegas. |
| `duplicate_index` | 3 | WARN | **CANDIDATO A FIX** — ganho limpo, sem risco de comportamento. |
| `no_primary_key` | 11 | INFO | **ACCEPTED** — inclui as `backup_*` acima. |
| `auth_db_connections_absolute` | 1 | INFO | **ACCEPTED** — dimensionamento de pool, sem sintoma em produção. |

Nenhum item de performance foi corrigido nesta passagem: o prompt exige medir antes e depois, e não há evidência de degradação em produção que justifique tocar 338 policies agora.

---

## Próximos passos sugeridos

1. Autorizar (ou recusar) os dois ajustes de configuração do Auth.
2. Migration dedicada para `auth_rls_initplan` + `multiple_permissive_policies`, com E2E de isolamento por papel antes e depois.
3. Remover os 3 índices duplicados.
4. Decidir o destino das 10 tabelas `backup_*` em `public`.
