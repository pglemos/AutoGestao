# Story MX-MGR-20260713-06 - Meta da Loja Base44 1:1

## Status

Em auditoria

## Escopo e fontes

Reproduzir Base44 `/meta-loja` em `/meta-loja`, usando `src/pages/MetaLoja.jsx`, `src/components/meta-loja/*`, `ManagerStoreGoalReference.tsx` e os contratos reais do dashboard MX. O sidebar não entra no escopo visual.

## Regras normativas

- Horizontes: Hoje, Esta semana, Esta dezena e Este mês.
- `metaProporcional = metaMensal * diasUteisDecorridos / diasUteisMes` sem arredondar antes do cálculo.
- `faltamNoMes = max(metaMensal - realizado, 0)`; `ritmoMensal = faltamNoMes / diasUteisRestantes`; `projecao = realizado / diasUteisDecorridos * diasUteisMes`.
- Exibir `1 venda a cada X dias` quando ritmo for inferior a uma venda/dia.
- Priorizar 30 dias oficiais, depois 90 dias e fallback configurado para agendamentos por venda; atendimentos por venda apenas como fallback normativo.
- Sem meta usa `Meta ainda não cadastrada.`; sem dados usa mensagem oficial.

## Estados, fluxos e testes

Validar cards, faixa, progresso, gráfico, plano, contribuição, canal, filtros, atualizar, meta ausente, dados parciais, erro, desktop/tablet/mobile e navegação contextual para rotina. Cobrir fórmulas, feriados/calendário da loja, zero e divisão por zero em unit/component/E2E.

## Evidências e file list

Baseline em `output/playwright/manager-parity/master-20260713/`.

Evidências reais desta iteração:

- Base44 autenticado: `base44/meta-loja-live-1440x900.png` e `base44/meta-loja-plan-390x844-scrolled.png`.
- MX local autenticado: `mx-local/meta-loja-viewport-after-plan.png` e `mx-local/meta-loja-plan-390x844-scrolled.png`.
- Interação do horizonte `Esta dezena` validada no Base44 e no MX local.

Implementado nesta iteração:

- Plano de Sustentação com quatro horizontes, três blocos e mensagem de foco.
- Dados do plano derivados dos check-ins reais do MX, com fallback explícito de 3 agendamentos por venda.
- Estado `Meta ainda não cadastrada.` nos cards, gráfico e plano quando não existe meta.
- Fórmulas puras e testes em `manager-store-goal.ts`.

File list:

- `src/features/manager/meta/ManagerStoreGoalReference.tsx`
- `src/features/manager/meta/ManagerStoreGoalReference.test.tsx`
- `src/features/manager/meta/manager-store-goal.ts`
- `src/features/manager/meta/manager-store-goal.test.ts`
- `src/lib/charts/tokens.ts`
- `docs/qa/MODULO_GERENCIAL_PARITY_MATRIX.md`

Reteste E2E autenticado real em Chromium após a verificação adicional dos quatro horizontes: `4 passed (1.2m)`; o clique em `Esta dezena` abriu e manteve o `Plano de Sustentação`.

Pendências reais: reconciliar dados equivalentes entre as contas Base44 e MX, validar estados de erro/loading com captura estável e concluir diff visual por viewport. A tela permanece `Em auditoria`.
