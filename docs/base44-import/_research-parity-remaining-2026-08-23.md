# Base44 parity — remaining research (2026-08-23)

Sources: `PROMPT DE CORREÇÃO BASE44.md` (correction prompts ~L38849+), `docs/base44-import/action-plan-ui-parity-indicators.md`, `.graphify/graph.json`.

## PROMPT structure (no checkbox checklist)

Three correction modules (not Gerente/Vendedor/Shell standalone specs):

1. **Dono / Strategic / Metas (runtime)** — L38849 Visão do Dono, competência, realizado, cards (aceitação L40169–40188)
2. **Admin MX / Metas published** — L41178 resumo plano, metas publicadas/pendentes/versão
3. **Admin MX / Pessoas** — L41919 Dono Master, papéis, ativação (multi-papel Dono+Gerente+Vendedor L42862+)

## Remaining (P0/P1) — action-plan + aceite unproven

### data parity / Strategic plan / Metas
- **P0/P1** Admin↔Dono mesma célula / mesma fonte (aceitação #13 L40185; action-plan “diagnóstico de origem ainda aberto” ~prompt 40249)
- **P1** Parcial N/M + banner CONSOLIDATED: **unproven** em tenant multiunidade com Realizado incompleto (ex. AG); 1-loja = banner consolidado indisponível (esperado)
- Aceite Visão Dono #1–12,14–16: marcados feitos no action-plan; **QA formal multiunidade AG** ainda depende de tenant

### Admin MX
- Contagem metas publicadas/pendentes DISTINCT (Prompt 2): marcado [x] no action-plan — revalidar em AG se card divergir
- Dono Master / Corrigir / N-donos picker (Prompt 3): marcado [x] — multi-papel Gerente+Vende testes de aceite P3 podem estar unproven

### Dono/home / Shell/nav
- M-1 pill (`OwnerFilterButton`): feito
- “Todas as lojas” em cliente 1 loja: pill muda, dados=loja única + aviso (depende tenant; esperado)

### Gerente / Vendedor
- Sem módulo próprio nestes 3 prompts de correção; só regras multi-papel no Prompt 3 (Dono∩Gerente∩Vendedor; Gerente∩Vende) — **parity 1:1 de telas Gerente/Vendedor não listada como gap aberto neste action-plan**

## Already done (action-plan + known session)

- Competência M-1, seletor, monthIndex único, cards Meta/Resultado/AA, Agosto aberto, overlay Vendas Total, attainment compartilhado
- Consolidado parcial + banner fallback; STORE não lê consolidado
- Prompt 2/3 Admin metas + Dono Master
- AG pessoas/`vinculos_loja`, archive filiais, unidades operacionais persist
- Ativos cards (97778ba4), /home M-1, Deploy READY
- QA Lote 4 PASS parcial

## Graphify key paths (src/)

- AdminClienteDetalhePage → `src/features/admin-mx/AdminClienteDetalhePage.tsx`
- clientPortfolio → `src/features/admin-mx/clientes/clientPortfolio.ts` (+ `useClientPortfolio.ts`, `AdminClientPortfolioPage.tsx`)
- OwnerFilterButton → `src/components/owner/OwnerFilterButton.jsx`
- unitConsolidation → `src/features/strategic-plan/unitConsolidation.ts`
- StrategicPlanWorkspace → `src/features/strategic-plan/StrategicPlanWorkspace.tsx`

## Suggested next 3 WPs

1. **Admin↔Dono cell parity diagnostic** — trace same indicator/month/unit from Admin Metas/Realizados vs Dono Resumo/Visão Geral (`AdminClienteDetalhePage.tsx`, adapters Dono, `unitConsolidation.ts`, grids oficiais)
2. **AG multiunidade QA** — prove Parcial N/M + CONSOLIDATED banner + aceite #2–5,#11 on AG (`StrategicPlanWorkspace.tsx`, `unitConsolidation.ts`, Owner filters)
3. **P3 multi-role smoke** — Dono+Gerente+Vendedor / Gerente que vende acceptance (`AdminClienteDetalhePage` Pessoas, membership/role grants)
