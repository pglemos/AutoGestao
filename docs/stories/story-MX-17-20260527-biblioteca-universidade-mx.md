# Story MX-17.1 - Biblioteca Universidade MX

## Status

Ready for Review

## Story

**As a** vendedor, gerente ou RH,
**I want** acessar uma biblioteca de conteudos da Universidade MX organizada por tema, perfil, departamento e gargalo,
**so that** treinamentos e trilhas apoiem feedbacks, PDIs, score e alertas.

## Executor Assignment

executor: "ux-design-expert"
quality_gate: "dev"
quality_gate_tools: ["npm run lint", "npm run typecheck", "npm test", "npm run build", "browser responsive audit"]

## Epic Reference

- **Epic:** EPIC-MX-17 - Universidade MX
- **PRD:** `docs/prd/prd-mx-performance-visao-estrutural-2026-05-27.md`
- **Dependencies:** EPIC-MX-02, EPIC-MX-16
- **Related stories:** `docs/stories/story-DEV-25-biblioteca-conteudo-temas-avaliacao.md`, `docs/stories/story-DEV-26-trilha-novo-colaborador.md`, `docs/stories/story-APP-28-trilha-institucional-personalizada-loja.md`
- **Current implementation candidates:** telas e componentes existentes de treinamentos/conteudos

## Context

Esta story cria a entrada da Biblioteca Universidade MX, reaproveitando o que ja existir em treinamentos e conteudos. Trilhas, aulas ao vivo, certificacoes e recomendacao automatica ficam para stories posteriores, mas a biblioteca precisa nascer pesquisavel, filtravel e segura por perfil.

## Acceptance Criteria

1. Biblioteca exibe conteudos disponiveis da Universidade MX.
2. Conteudos podem ser filtrados por tema, perfil, departamento e gargalo.
3. Conteudos mostram status basico: disponivel, em andamento, concluido ou pendente quando houver dado.
4. Vendedor visualiza apenas conteudos liberados para seu perfil/loja.
5. Gerente/RH consegue ver estrutura de conteudos para orientar equipe.
6. Estados pendentes nao inventam progresso ou certificacao.
7. A biblioteca prepara vinculo futuro com PDI, feedback, score e alerta.
8. Desktop e mobile passam sem overflow horizontal.

## Tasks / Subtasks

- [x] Mapear implementacoes existentes de treinamentos, conteudos e trilhas.
- [x] Definir shell da Biblioteca Universidade MX.
- [x] Implementar filtros por tema, perfil, departamento e gargalo.
- [x] Conectar dados existentes ou criar estado pendente documentado.
- [x] Validar visibilidade por perfil/loja.
- [x] Preparar contrato para recomendacao futura por PDI/feedback/score/alerta.
- [x] Rodar browser audit desktop/mobile.
- [x] Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.
- [x] Atualizar Dev Agent Record e File List antes de concluir.
- [ ] Revalidar filtro e visibilidade por perfil/loja em sessão autenticada real.

## Dev Notes

- Nao criar certificacao completa nesta story.
- Nao criar recomendacao automatica nesta story.
- Usar conteudos reais existentes quando disponiveis; caso contrario, estado pendente explicito.
- Universidade MX deve ser simples e orientada a continuidade, nao landing page.

## Testing

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Browser audit: desktop `1366x768`
- Browser audit: mobile `390x844`
- Teste de filtro e visibilidade por perfil

## Article IV - Rastreabilidade

| Item | Fonte |
|---|---|
| Universidade MX | PRD §4.1 FR-MENU |
| Biblioteca, trilhas, aulas ao vivo, certificacoes | PRD §4.1 |
| Treinamentos e trilhas na Home Vendedor | PRD §4.2 FR-HOME-3 |
| Recomendacao por PDI/feedback | EPIC-MX-17 |

## File List

- `docs/stories/story-MX-17-20260527-biblioteca-universidade-mx.md`
- `docs/stories/story-DEV-24-reposicionar-treinamentos-desenvolvimento.md`
- `docs/stories/story-DEV-25-biblioteca-conteudo-temas-avaliacao.md`
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/lib/development-content.ts`
- `src/pages/ConsultorTreinamentos.tsx`
- `src/pages/GerenteTreinamentos.tsx`
- `src/pages/VendedorTreinamentos.tsx`
- `src/hooks/useData.ts`
- `src/features/universidade/hooks/useUniversidadeMx.ts`
- `src/features/universidade/sections/UniversidadeMx.tsx`

## Dev Agent Record

### Debug Log

- Story criada em modo YOLO via @sm para formalizar EPIC-MX-17.1.
- 2026-05-27: Reconciliado com `story-DEV-24`, que reposicionou treinamentos como desenvolvimento, e `story-DEV-25`, que implementou biblioteca por busca, tema, avaliação, sugestão e curadoria persistida.
- 2026-05-27: `src/App.tsx` já roteia `/treinamentos` por perfil: vendedor usa `VendedorTreinamentos`, gerente/dono usam `GerenteTreinamentos` e perfis internos usam `ConsultorTreinamentos`.
- 2026-05-27: `VendedorTreinamentos` já oferece busca, filtro por tema, recomendações de PDI/feedback, gargalo tático, trilha de novo colaborador e sugestão de conteúdo.
- 2026-05-27: `GerenteTreinamentos` já cobre equipe, matriz, trilha, atribuição e acompanhamento; `ConsultorTreinamentos` cobre curadoria, público-alvo, origem e backlog editorial.
- 2026-05-27: Gates executados no lote MX: `npm run lint` passou com warnings preexistentes, `npm run typecheck` passou, `npm test` passou com 329 testes e `npm run build` passou.
- 2026-05-27: Browser audit autenticado ficou pendente pelo mesmo bloqueio de bypass local sem loja/vínculo ativo suficiente para abrir as rotas autenticadas por RLS.
- 2026-08-19: `useUniversidadeMx` passou a carregar a biblioteca publicada em `treinamentos` via `listarTreinamentosVendedor`, mantendo filtro por busca e estado de conclusão sem inventar progresso.
- 2026-08-19: Gates atuais passaram: `npm run lint`, `npm run typecheck`, `npm test` (`4091 pass / 0 fail`) e `npm run build` (`5257` módulos, sem sourcemaps públicos).
- 2026-08-19: Browser audit MX em `http://localhost:3458/` passou em desktop `1440x900` e mobile `390x844`, com a11y `0` violações; evidência em `visual-evidence/agent-browser/pre-push-mx-2026-08-19T15-00-55/`.

### Completion Notes

- Universidade MX foi reconciliada como rota existente `/treinamentos`, com renderização específica por perfil e sem criar uma biblioteca paralela.
- Departamento ainda é derivado de tema/público-alvo/origem; se o PRD exigir taxonomia formal de departamento, isso deve virar contrato de dados posterior.
- O audit visual desktop/mobile passou no shell local, mas a rota autenticada Universidade MX ainda precisa de sessão real ou seed local de loja/membership para provar os critérios de visibilidade por perfil/loja.

### Change Log

- 2026-05-27: Story atualizada de `Draft` para `InProgress` com evidência de biblioteca existente, rotas por perfil e gates de qualidade.
