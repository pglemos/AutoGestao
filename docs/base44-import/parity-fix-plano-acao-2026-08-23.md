# Paridade `/plano-acao` ↔ Base44 `/planos-acao` — 2026-08-23

## Corrigido nesta rodada

- Título conteúdo: **Planos de Ação** (não “e Playbooks”)
- Abas canônicas Base44 (4): Planos Padrão · Sugestões ao Dono · **Aplicações nos Clientes** · Histórico
- Removida aba **Planos da rede** da TabNav (board ainda via `?tab=planos`)
- Cards depto: copy **Planos Padrão** / **N indicadores ativos** + ícones coloridos Base44
- Prioridade exibida: Crítica / **Atenção** / **Evolução** (filtro + tabela)
- Código novo de template: `PA_{DEPT}_{INDICATOR}_{NNN}` + validação aceita maiúsculas

## Ainda diverge (não é bug de tela / depende de dados)

| Item | Base44 | MX | Nota |
|------|--------|----|------|
| Totais cards | 1 plano / 46 ind. / 6 rascunho | 7 / 45 / 1 | Dataset demo ≠ produção |
| Chaves antigas | `PA_COMERCIAL_…` | `adequacao_quadro_colab` | Só templates novos geram `PA_*` |
| Sidebar shell | Benchmark, Dados, Segurança… | Ranking, Devolutivas, PMR… | Fora do escopo desta página |
| TopBar chrome | “Planos de Ação e Playbooks” | só título do módulo | Shell Base44 vs MX |

## Evidência

- Local: `http://127.0.0.1:3457/plano-acao` (admin SynVolt)
- Base44: `…/editor/preview` → `/planos-acao`
- Testes: `bun test` em `actionPlanTemplates` / `templateTableMetrics` / `action-plan-table-parity` — 27 pass
