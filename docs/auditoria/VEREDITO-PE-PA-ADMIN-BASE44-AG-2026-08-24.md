# Veredito runtime — PE + PA Admin MX × Base44 (AG)

**Data:** 2026-08-24 · sessão `bb88b1` · app `http://127.0.0.1:3010`  
**Cliente:** AG AUTOMÓVEIS (`79130186-…`) · ciclo `bd5f482d-…`

## Resposta direta

**Fluxos Admin PE + PA estão comprovados de ponta a ponta no AG** (preencher → publicar PE; aplicar template → 1 aplicação lógica / 3 lojas).

Ainda **não é clone byte-a-byte do Base44** (schema `store` + `request_id`), mas a paridade de produto no Admin está **fechada** para o caminho crítico.

## Prova pós-correção (esta rodada)

### PE
| Etapa | Evidência |
|-------|-----------|
| Bug demo fill | `fillOfficialDemoForCycle` só preenchia a **matriz** → prontidão 31/45 |
| Fix | Preenche **todas** unidades ativas (company-scoped só matriz) |
| Após fill | log: `ready:45/45`, `canPublish:true` |
| Publicação | `status:publicado`, `publishedAt:2026-08-24T04:52:08Z` |
| Ficha cliente | **Metas publicadas: 45** · **pendentes: 0** · status Publicado |

### PA
| Etapa | Evidência |
|-------|-----------|
| Apply AG | `created:3`, `stores:3`, `requestId:e0931e87-…` |
| Agrupamento | log `materializations:3 → grouped:1`, `multiUnit:1` |
| UI Aplicações | `AG AUTOMÓVEIS` · `3 unidades: Matriz, 3 PISO, TITO` · `QA Apply AG` |

## Correção de código desta rodada

- `strategicPlanEditorRepository.ts` — `fillOfficialDemoForCycle` multi-unidade
- `strategicPlanAdmin.ts` — lista/clientes de PE excluem filiais-como-cliente (`excludeBranchClients`)

## Limitações restantes (não bloqueiam o Admin)

1. Persistência PA continua `scope_type=store` (N linhas) com UI 1:1 por `request_id`.
2. Ciclos órfãos de filiais-como-cliente podem existir no banco; a UI Admin não lista mais.
