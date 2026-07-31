# Drift de schema: constraints em produção sem migration correspondente

> Medido em 2026-07-31 durante a validação da Onda 5 (matriz E2E).

## O que aconteceu

Duas fixtures E2E (`agenda-filters`, `mx-consultoria-role-smoke`) falhavam ao criar
cliente de consultoria:

```text
new row for relation "clientes_consultoria" violates check constraint
"clientes_consultoria_active_requires_store_check"
```

A constraint existe no banco de produção (`fbhcmzzgwjdgkctlfvbo`) e recusa cliente com
`status = 'ativo'` sem `primary_store_id`. Confirmado por leitura: todos os clientes
ativos têm `primary_store_id` preenchido.

**`grep -rn "active_requires_store" supabase/migrations/` não retorna nada.** A regra
não está declarada em nenhuma migration do repositório.

## Por que importa

O repositório deixa de ser a descrição completa do banco. Um ambiente novo levantado a
partir das migrations não terá essa constraint, e o comportamento divergirá de produção
exatamente onde a regra de negócio é aplicada — não em detalhe cosmético.

`db-types-diff` não pega isso: constraint de CHECK não altera os tipos gerados. É o
mesmo ponto cego que já deixou passar divergência de função SQL antes.

## Estado atual

- Fixtures corrigidas para criar a loja primária junto com o cliente e removê-la no
  cleanup (`src/test/e2e-helpers/supabase-admin.ts`).
- Descoberto no mesmo caminho: `stores_source_mode_check` aceita apenas
  `legacy_forms | native_app | hybrid`; essa está declarada no baseline.

## Pendente (precisa de decisão)

1. Migration de reconciliação que declare `clientes_consultoria_active_requires_store_check`
   no repositório — escrever a definição exata exige ler `pg_constraint` em produção, e o
   MCP do Supabase responde `You do not have permission to perform this action` para
   execução de SQL nesta sessão.
2. Auditoria ampla: quantas outras constraints existem só em produção? Responder isso
   exige o mesmo acesso de leitura a `pg_catalog`.

Sem esse acesso, declarar o schema reconciliado seria afirmação sem evidência.

### Caminhos tentados

| Caminho | Resultado |
|---|---|
| MCP Supabase `execute_sql` | `You do not have permission to perform this action` |
| PostgREST `rpc/exec_sql`, `rpc/execute_sql`, `rpc/sql` | 404 — nenhuma função de SQL arbitrário publicada |
| `DATABASE_URL` / `SUPABASE_DB_URL` no `.env` | ausentes; `psql` não instalado |
| `supabase db dump --linked` (CLI autenticada, projeto correto) | falha: exige Docker Desktop, daemon desligado |

O caminho mais curto é subir o Docker Desktop e rodar `supabase db dump --linked`, ou
`supabase db diff --linked`, que compara migrations locais com o remoto e lista todo o
drift de uma vez — não só esta constraint.
