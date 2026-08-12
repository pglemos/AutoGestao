# Story MX-FOUNDATION-ZERO — Universal UI & Geometry Contract

## Status

In Progress

## Source of truth

- Prompt aprovado: `/Users/pedroguilherme/Downloads/PROMPT_MESTRE_FOUNDATION_ZERO_MX_MAIN_SEM_WORKTREE_AUTONOMO_2026-08-11.md`
- Ledger operacional: `.superpowers/mx-foundation-zero/progress.md`
- Branch autorizada: `main`, sem worktree ou branch de implementação.

## Objetivo

Executar o contrato Foundation Zero no estado real do `main`, consolidando a fundação visual, geométrica, responsiva e de acessibilidade do sistema sem alterar regras de negócio, contratos de dados, permissões ou segurança do Supabase fora de uma necessidade comprovada.

## Critérios de aceitação

- [ ] Todas as tasks do prompt e child tasks geradas pelo inventário têm status individual e evidência no ledger.
- [ ] Rotas, perfis, exceções de layout, componentes, estados e overlays possuem denominadores explícitos.
- [ ] A fundação canônica tem um único proprietário de geometria, tipografia, tokens, shell e overlays aplicáveis.
- [ ] As rotas `STANDARD_CANVAS` válidas passam por PageCanvas/PageViewport e não criam scroll vertical concorrente.
- [ ] Estados interativos, responsividade, teclado, reduced motion e WCAG aplicáveis têm testes/evidências.
- [ ] Gates locais completos, revisão adversarial, rollback e paridade de SHA/deploy são registrados antes de release.
- [ ] Nenhuma credencial é rotacionada, versionada ou reproduzida em logs/artefatos.

## Tasks / Subtasks

- [ ] Executar e revisar as fases A–D do prompt no `main` real.
- [ ] Completar os lotes canônicos E–W com TDD, contratos e revisão.
- [ ] Migrar e validar rotas/perfis X–AB conforme os denominadores gerados.
- [ ] Fechar gates AC–AI, incluindo harness visual/DOM, E2E, Supabase e performance.
- [ ] Executar regressão AJ, release AK, rollback AL e relatório AM.
- [ ] Atualizar o ledger para cada task e child task; não agrupar checkboxes sem evidência.

## Dev Agent Record

### Orchestration notes

- Execução coordenada pelo aiox-master/Orion; alterações de código devem ser implementadas em lotes pequenos e revisadas por QA.
- O checkout inicial desta retomada estava limpo em `main` no SHA `3d8158ea`; o grafo Graphify foi atualizado estruturalmente e deixou pendências de descrições assistidas, que não serão tratadas como prova de código.
- 2026-08-11: lote release-probe implementado em TDD pelo aiox-dev e revisado pelo aiox-qa. O RED confirmou que `/api/health.release` não existia; o GREEN confirmou 3 contratos novos e regressão de `/api/health` preservada.

### File List

- `docs/stories/story-MX-FOUNDATION-ZERO-20260811.md`
- `.superpowers/mx-foundation-zero/progress.md` (artefato ignorado)
- `api/health.ts`
- `api/health.release.ts`
- `src/lib/observability/server-release.ts`
- `src/test/api-health-release-contract.test.ts`

### Completion Notes

- Ainda não concluída.
- Lote release-probe: RED `bun test --isolate --concurrency=1 src/test/api-health-release-contract.test.ts` falhou pela ausência esperada de `../../api/health.release`; GREEN `bun test ... api-health-release-contract.test.ts api-health-probe-contract.test.ts` passou 15/15.
- Gates pós-lote: `npm run typecheck`, `npm run lint`, `npm test` (2642/0), `npm run build`, `npm run check:bundle-size`, `npm run audit:routes-data`, `npm run audit:management-design-system` e `npm run audit:layout-contract` passaram. Paridade de produção ainda pendente até o próximo release.
