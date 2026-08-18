# Importação Base44 → MX (6 módulos admin)

## Fonte de verdade
App Base44: **MX Performance Admin** — `appId 6a6fd5b82088f81a3baebb5d` (acessível via MCP base44).
Repo alvo: `pglemos/MXGESTAOPREDITIVA` (main), deploy Vercel + Supabase `fbhcmzzgwjdgkctlfvbo`.

## Inventário real do Base44 (via MCP, 2026-08-18)
- **80 entidades** em `base44/entities/*.jsonc` (ClientAccount, Store, ConsultingProduct, JourneyEncounter, Encounter{Template,DeliverableTemplate,EvidenceTemplate,Report,Lesson}, IndicatorDefinition, StrategicTarget(+MonthlyValue), StrategicIndicatorPackage(+Item/Version), ActionPlan(+Template/TemplateItem/TemplateVersion/Item/Suggestion), MxConsultant, ConsultantWorkloadReservation, ClientContract, ClientCapabilityConfig, RoleGrant, ImportBatch, AuditLog, …).
- **35 páginas** `src/pages/*.jsx`. As pesadas: `NovoCliente` 53KB, `PlanoEstrategicoEditor` 38KB, `ClienteDetalhe` 31KB, `ConsultoriaEntregas` 23KB, `PlanoEstrategico` 22KB, `ClientesMX` 14KB.
- **~30 libs de regra de negócio** `src/lib/*.js` — é aqui que mora a lógica que hoje falta/está errada no MX:
  `actionPlanOps` 61KB, `strategicPlanOps` 41KB, `indicatorCatalog` 31KB, `excel*Import/Template*` ~57KB, `clientActivationReadiness` 17KB, `unitConsolidation` 16KB, `productPackageOps` 16KB, `unitScopeOps` 13KB, `indicatorFormat` 13KB, `actualCalc` 19KB, `journeyTemplates` 15KB, `capacityCalc`, `unitPolicyDefaults`, `ownerMasterResolver`.

## Mapa módulo → origem Base44 → destino MX
| Módulo | Base44 | MX hoje |
|---|---|---|
| /clientes | ClientesMX, NovoCliente, ClienteDetalhe + client/ | `InternalClientsPage`, `AdminNovoClientePage`, `AdminClienteDetalhePage` |
| /equipe | EquipeMX + users/ | `AdminEquipeMxPage` |
| /produtos | ProdutosConsultoria | `AdminProdutosConsultoriaPage` |
| /indicadores | PlanoEstrategico{,Editor,Global,Preview}, Indicadores + strategic/ | `AdminIndicadoresPage` |
| /planos-acao | PlanoAcao, PlanosAcao, PlanosAcaoGlobal + actionplans/ | `AdminPlanosAcaoPage` |
| /consultoria-mx | ConsultoriaMX, Consultoria, ConsultoriaEntregas + consultingMx/ | `AdminConsultoriaMxPage` |

## Bloqueio atual
`npx base44 whoami` / `login` exige fluxo OAuth interativo — não roda nesta sessão (comandos ficaram pendurados, exit 144). Sem CLI não dá `base44 eject` (pull do código inteiro pro disco).
**Ação do usuário:** rodar num terminal:
```
npx base44 login
```
Depois disso eu faço `npx base44 eject` do app para `docs/base44-import/_source/` e trabalho offline sobre o código real.

## Plano por ondas (após desbloqueio)
0. Eject + snapshot do Base44 → `_source/`. Congela a fonte de verdade.
1. **Diff de dados**: 80 entidades Base44 × tabelas Supabase → matriz campo-a-campo, migrations faltantes.
2. **Diff de regra**: cada `src/lib/*.js` Base44 × equivalente MX. Onde não existe, portar 1:1 com testes.
3–8. Uma onda por módulo (clientes → produtos → indicadores → planos-acao → consultoria-mx → equipe): portar telas + ações + fluxos, validar com digitação real no browser (não só suíte), evidência desktop+mobile.
9. RLS/grants, E2E autenticado, deploy prod.
