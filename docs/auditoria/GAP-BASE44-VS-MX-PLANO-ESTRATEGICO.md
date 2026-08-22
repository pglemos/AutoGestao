# Gap 1:1 — Base44 `/indicadores` × MX `/plano-estrategico`

Fonte: cliques ao vivo em 2026-08-22 (MX produção + preview Base44) + `docs/base44-import/INVENTORY-indicadores-strategic-plan.md`.

Persistência: wizard **Novo indicador** aberto e percorrido; **não gravei nem apaguei** catálogo/plano de produção (campo Nome prefixou `undefined`; risco em dados reais). `Abrir` do plano ACERTT foi clicado.

## P0 — fluxo quebrado

| # | Base44 | MX produção | Fazer |
|---|---|---|---|
| 1 | Abrir plano → editor do ciclo (matriz, unidades, consolidado, validar/publicar) | **Abrir** vai para workspace Dono `?storeId&year&tab=resumo` | `Abrir` → `/plano-estrategico?cycleId=` + `AdminStrategicPlanEditor` |
| 2 | Entrada `/indicadores` = Catálogo (4 abas) | Entrada = “Plano por cliente” (seletor de loja) | Default admin = catálogo; workspace de loja só com `storeId` |
| 3 | 46 ind. / 19 digitáveis / 28 calculáveis / 12 c/ parâmetro / 13 params / 9 arquivados | 50 / 50 / **0** / **0** / 16 / 0 | Seed/migração do catálogo canônico (fórmulas + params) |
| 4 | `seedDemoData` — **Criar Demo** | Ausente | Botão + RPC/seed cliente demo + plano 2026 |

## P1 — editor e ciclo

| # | Base44 | MX | Fazer |
|---|---|---|---|
| 5 | Editor: Cadastro rápido, revisão, unidades, consolidado, preview Dono | Editor admin não abre (só workspace Resumo/Visão Geral) | Entregar editor local já esboçado |
| 6 | Criar → validar → publicar → revisar + copiar ano anterior | Lista tem Criar/Abrir/Preview; **Enviar para Validação** só no workspace | Ciclo no editor; copiar ano anterior no criar |
| 7 | Ações da loja: copiar metas, export, modelo, import, histórico | Aba Metas: 4 botões **disabled**; combobox Loja vazio | Bind lojas do ciclo; habilitar import/export/cópia |
| 8 | Params: override cliente/mês + restaurar + prévia impacto | 16 params globais; override/prévia não validados no clique | Paridade `saveClientParameterOverride` / `previewParameterImpact` |
| 9 | Add/ocultar indicador no plano; sync pacote | Não acessível (editor não abre) | `addIndicatorToPlan` + toggle Dono no ciclo |

## P2 — catálogo e UX

| # | Base44 | MX | Fazer |
|---|---|---|---|
| 10 | Criar indicador + fórmula `IND()`/`PAR()` | Wizard 7 passos existe; fórmula **readonly** no modo manual | Ligar modo calculado → editor de fórmula; gravar/arquivar |
| 11 | Arquivar / desabilitar / ocultar Dono | Toggle Dono + Editar/Histórico; **sem Excluir/Arquivar** na linha | Ação Arquivar no drawer de edição |
| 12 | 4 abas: Catálogo, Params, Planos, Histórico | 2 abas domínio + 5 internas; nomes duplicados | Uma IA: 4 abas Base44; “Gestão global” ou some |
| 13 | Comercial 22 / códigos `SALES_*` | Vendas 9 / `sales_*` snake | Alinhar códigos e agrupamento |
| 14 | — | Nome do wizard grava `undefined` + texto | Bug no value inicial do input |

## Clicado e confirmado

- MX: Catálogo, Planos (ACERTT 2026 rascunho 50 ind / 1 un), Metas (ações disabled), **Abrir** (workspace errado), **Novo indicador** (passos 1–4).
- Wizard: Identificação, Formato (tipo/casas/direção/freq/vigência), Meta (manual / calculado bloqueado / ajustável), Fórmula (disabled se manual).
- Base44: Catálogo com Editar Ordem, Criar Demo, Parâmetros, + Criar Indicador, pills, tabela Comercial, toggle Dono, ações doc/olho/histórico. Cliques no iframe do editor falharam (chrome só).

## Fora de escopo deste gap

CSS Base44. Tokens MX já ok no catálogo.
