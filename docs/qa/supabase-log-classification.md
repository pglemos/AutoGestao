# Classificação de Eventos Supabase — FASE AH (34.004/34.005/34.012)

Data: 2026-08-14

## Objetivo

Classificar eventos de log do Supabase capturados no delta pré/pós E2E em
categorias estáveis, para que nenhuma reforma visual sirva de desculpa para
afrouxar segurança (34.006) e nenhum tráfego de teste vire "defeito" ou
vice-versa. Classificação é **read-only**: não altera RLS, não concede
SELECT/EXECUTE global.

## Categorias

| Categoria | Significado |
|---|---|
| `PRODUCTION_BUG` | Sintoma real do produto: schema/RPC/query errada, timeout, coluna/tabela inexistente. |
| `EXPECTED_TEST_TRAFFIC` | Tráfego de fixtures/E2E que o RLS bloqueia **de propósito** (vendedor sem vínculo, rota de outro perfil). |
| `ENVIRONMENT_NOISE` | Ruído de ambiente: websocket dev, analytics ausente fora da Vercel, 401 de perfil trocado em teste. |
| `UNCLASSIFIED` | Evento sem padrão ainda — exige investigação manual. |

## Classificação dos eventos observados

### `recipient_id` errors → `EXPECTED_TEST_TRAFFIC` (tabela `notificacoes` correta)

O app consulta `supabase.from('notificacoes')` com filtro
`.eq('recipient_id', profile.id)`. A migration
`20260430230000_fund02_nomenclatura_secundaria_portugues.sql` (linha 45) faz
`ALTER TABLE public.notifications RENAME TO notificacoes`, e o
`src/types/database.generated.ts` confirma a tabela `notificacoes` com a coluna
`recipient_id`. **Não é bug de schema.**

Os erros `recipient_id` no log são gerados por:
- **Vendedores de fixture sem vínculo ativo**: a RLS `recipient_id = auth.uid()`
  filtra a notificação de um seller cujo `vinculos_loja`/`vendedores_loja` não
  foi criado ou está inativo → `0 rows` / `new row violates row-level security`.
  Isso é **tráfego esperado de teste** (a fixture E2E em
  `src/test/e2e-helpers/supabase-admin.ts` cria vínculo ativo; um vendedor sem
  vínculo cai no caminho esperado de bloqueio).
- **Perfis trocados em E2E**: um gerente/dono autenticado consulta notificações
  de outro perfil → RLS retorna vazio (esperado).

### `vendedor sem vínculo` → `EXPECTED_TEST_TRAFFIC`

A matriz RLS pgTAP (`supabase/tests/rls-matrix/vinculos_loja.test.sql`, 20
assertions) prova que `vendedor` só vê o próprio vínculo e qualquer INSERT de
auto-promoção/escalada é bloqueado. Um vendedor sem `vinculos_loja` ativo não
vê dados — comportamento **intencional**, não defeito. Nos logs E2E, `0 rows`
para vendedor de fixture sem vínculo é `EXPECTED_TEST_TRAFFIC`.

### `statement timeout` → `PRODUCTION_BUG` (a investigar)

Timeout de statement em RPC é sintoma real (plano ruim, index ausente, loop).
Ex.: RPCs de cobrança diária / relatórios de rede. **Não** é mascarado como
tráfego de teste. Se confirmado como bug de schema/RPC, segue 34.007
(migration + teste + rollback lógico) via `apply_migration` (34.008).

## Regra de ouro (34.006/34.019)

- **Nunca** conceder SELECT/EXECUTE global para fazer teste passar.
- **Nunca** alterar RLS por causa de tráfego de teste.
- Baseline visual/RLS só muda após evidência de intenção.

## Ferramenta

`scripts/classify-supabase-events.mjs` classifica linhas de log
deterministicamente:

```bash
cat logs.txt | node scripts/classify-supabase-events.mjs
cat logs.txt | node scripts/classify-supabase-events.mjs --json
```

Contrato: `src/test/supabase-log-classification-contract.test.ts`.
