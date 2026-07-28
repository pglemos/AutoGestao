# Cancelamento e Projeções Determinísticas — Implementation Plan

> Execute tarefa por tarefa com TDD, commits pequenos e revisão entre tarefas.

**Goal:** corrigir o cancelamento de venda e integrar progresso/próximos passos determinísticos às telas existentes, sem IA e sem novas páginas.

**Architecture:** fatos canônicos no Supabase (`oportunidades.etapa` enum `crm_etapa_funil` com `cancelada`), funções de domínio puras e testáveis em `src/features/carteira-clientes/lib/carteira-mappers.ts`, estados terminais imutáveis e projeções consistentes para as páginas atuais.

**Tech Stack:** Vite + React 18 + TypeScript, Supabase (Postgres 17.6), bun test, Playwright, Vercel.

## Global Constraints
- Não adicionar IA.
- Não criar página, tela ou rota.
- Preservar histórico.
- Produção é fonte de verdade.
- Usar TDD.
- Não alterar política financeira sem evidência.

---

## Causas raiz comprovadas (Fase 2)

### Decisão D-001 — `cancelada` não é estado terminal no domínio
**Evidência:** `src/features/carteira-clientes/lib/carteira-mappers.ts:49` — `const CLOSED_STAGES = new Set(['ganho', 'perdido'])`. O enum de produção `crm_etapa_funil` tem 8 valores, incluindo `cancelada` (verificado via `pg_enum`). Produção já tem 2 oportunidades em `cancelada`.
**Consequência:** `selectActiveOpportunity` trata a oportunidade cancelada como **ativa** e a ordena antes das encerradas. `deriveSituation` não tem ramo para `cancelada`, então cai no heurístico e devolve `Veículo definido` / `Em negociação ativa`; `deriveCommercialStatus` devolve `Em negociação`. É exatamente o "Resultado proibido" do Caso 1.
**Decisão:** incluir `cancelada` em `CLOSED_STAGES` e tratá-lo como terminal próprio.
**Alternativas rejeitadas:** mapear `cancelada`→`perdido` (mistura conceitos, quebra métricas); corrigir só na UI (deixa o bug em todos os outros consumidores do mapper).

### Decisão D-002 — `selectActiveOpportunity` nunca devolve `null`
**Evidência:** `carteira-mappers.ts:72-81` — ordena e devolve `sorted[0] ?? null`. Se todas as oportunidades estão encerradas, devolve a encerrada como se fosse ativa.
**Decisão:** separar contratos: `selectActiveOpportunity` (só não-terminais, senão `null`), `selectLatestClosedOpportunity`, `selectLatestCancelledOpportunity`.
**Alternativas rejeitadas:** filtrar no chamador (duplica regra em cada consumidor).

### Decisão D-003 — view `clientes_oportunidades` classifica `cancelada` como `ativa`
**Evidência:** `pg_get_viewdef` em produção:
```sql
CASE WHEN etapa = 'ganho' THEN 'vendido'
     WHEN etapa = 'perdido' THEN 'perdido'
     ELSE 'ativa' END AS status_oportunidade
```
**Consumidores:** `src/pages/FunilVendedor.tsx:152`, `src/features/vendedor-treinamentos/hooks/useVendedorTreinamentos.ts:82`.
**Decisão:** adicionar ramo `cancelada`. View é `security_invoker=true` — preservar.
**Alternativas rejeitadas:** filtrar `cancelada` no frontend (não corrige os demais consumidores).

### Decisão D-004 — `situationToStage` rebaixa estado terminal para `prospeccao`
**Evidência:** `carteira-mappers.ts:255-265` — `'Venda cancelada'` não casa com nenhuma regra e cai no `return 'prospeccao'`. Qualquer salvamento da ficha reabriria a venda cancelada silenciosamente, apagando o estado terminal.
**Decisão:** lançar erro explícito para situações terminais.

---

### Task 1 — `cancelada` como estado terminal no domínio
**Files:**
- Modify: `src/features/carteira-clientes/lib/carteira-mappers.ts`
- Test: `src/features/carteira-clientes/lib/carteira-mappers.test.ts`

**Interfaces:**
- Produces: `TERMINAL_STAGES`, `selectActiveOpportunity` (retorna `null` quando tudo encerrado), `selectLatestClosedOpportunity`, `selectLatestCancelledOpportunity`
- Consumes: `OpportunityRow`

- [ ] Escrever teste que falha (Casos 1, 2 do prompt).
- [ ] Confirmar falha esperada.
- [ ] Implementar mudança mínima.
- [ ] Regressão completa (`npm test`).
- [ ] Commitar.

### Task 2 — Apresentação de venda cancelada no mapper
**Files:**
- Modify: `src/features/carteira-clientes/lib/carteira-mappers.ts`
- Test: `src/features/carteira-clientes/lib/carteira-mappers.test.ts`

Situação `Venda cancelada`, status `Cancelada`, temperatura `Frio`, sem dados ativos herdados da venda cancelada (veículo/valor/financiamento/proposta/próximo passo), com `motivo_cancelamento`, `cancelada_em`, `cancelada_por` expostos para a ficha.

### Task 3 — `situationToStage` bloqueia transição a partir de terminal
**Files:**
- Modify: `src/features/carteira-clientes/lib/carteira-mappers.ts`
- Test: `src/features/carteira-clientes/lib/carteira-mappers.test.ts`

### Task 4 — View de compatibilidade `clientes_oportunidades`
**Files:**
- Create: `supabase/migrations/20260727<hhmmss>_clientes_oportunidades_classifica_cancelada.sql`
- Test: verificação SQL em produção pós-migration

`security_invoker=true` e grants preservados; DOWN documentado.

### Task 5 — Ficha do cliente: badge, motivo, autor, ações permitidas
**Files:**
- Modify: componentes existentes da ficha (sem nova rota)

### Task 6 — Próxima ação e agendamentos antigos ao cancelar
**Files:**
- Create: migration que encerra próxima ação/agendamentos vinculados à oportunidade cancelada, preservando histórico.
