# Story QA-20260515 - Estabilizacao da Suite E2E Playwright

**Status:** Done  
**Epic:** EPIC-MX-CONS-DEV-20260515  
**Owner:** @qa  
**Implementacao sugerida:** @dev  
**Quality Gate:** @qa  
**Prioridade:** High

## Contexto

A validacao do sistema em 2026-05-15 passou nos gates locais e nos smokes principais, mas a suite Playwright ampla ainda possuia testes antigos com credenciais fixas e um cenario de agenda que esperava permissao de admin master em um usuario temporario fora da allowlist.

## User Story

Como time MX,  
quero estabilizar a suite Playwright ampla,  
para usar E2E como gate confiavel de regressao dos fluxos principais.

## Acceptance Criteria

- [x] Testes Playwright antigos de admin/admin master/consultor deixam de usar e-mail admin legado e senha fixa hardcoded.
- [x] Login E2E interno usa `[EMAIL_REDACTED]` como e-mail padrao e senha via variavel de ambiente local.
- [x] Nenhuma senha real e gravada em arquivos versionados.
- [x] Cenario `#agenda-consultant-filter` usa um usuario que atende a regra real de admin master.
- [x] Smoke manual/mobile cobre vendedor, gerente, dono e admin MX.
- [x] Suite E2E ampla volta a ser candidata a gate oficial ou registra pendencias especificas.

## Gates

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] `npm run build`
- [x] Playwright Chromium dos specs corrigidos.
- [x] Playwright Chromium amplo.
- [x] Smoke mobile por papel.
- [x] Playwright mobile amplo.

## File List

- `docs/stories/story-QA-20260515-e2e-suite-stabilization.md`
- `.env.example`
- `src/test/e2e-helpers/auth.ts`
- `src/test/agenda-filters.playwright.ts`
- `src/test/agenda.playwright.ts`
- `src/test/components.playwright.ts`
- `src/test/consultoria.playwright.ts`
- `src/test/e2e/smoke-flows.playwright.ts`
- `src/test/mx-consultoria-role-smoke.playwright.ts`
- `src/test/navigation.playwright.ts`
- `src/test/security/RLS-Isolation.playwright.ts`
- `src/test/security/evidencias-visita.playwright.ts`
- `src/test/security/perfis-reais-e-dados-sensiveis.playwright.ts`

## Completion Notes

- Login interno E2E centralizado em `src/test/e2e-helpers/auth.ts`.
- Senha real removida dos specs; a execucao exige `E2E_AUTH_PASSWORD` local.
- `E2E_ROLE_PASSWORD` separa perfis de loja do admin master.
- Filtro de consultor da agenda validado com conta admin master allowlist.
- Suite Chromium ampla passou com 80 testes.
- Smoke mobile passou com 18 testes e 2 skips esperados para sidebar substituida no mobile.
- Suite mobile ampla passou com 78 testes e 2 skips esperados para sidebar desktop no mobile.

## QA Results

- 2026-08-03: revalidação de produção do smoke `mx-consultoria-role-smoke.playwright.ts` para `consultor_mx` passou (`1 passed`, `2,1 min`) com fixture Auth temporário, dados Supabase reais, isolamento de clientes e limpeza automática.
- 2026-08-03: o teste passou a rastrear pendências por navegação e a não bloquear por consultas secundárias do shell depois que a rota realizou leitura de negócio; falhas HTTP reais, `requestfailed`, `pageerror` e `console.error` continuam bloqueando.
- 2026-08-03: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle-size` e `git diff --check` passaram.
- Resultado QA: **PASS para esta revalidação do smoke; CONCERNS para o gate global**, devido ao transporte Sentry intermitente observado em uma execução, ao backup restaurável ausente e às pendências de dependências/CodeRabbit já registradas no relatório mestre.
