# MX Unificação Total — Progresso

Atualizado em 2026-08-03 após o SHA `d8f10447`. Execução direta no branch `main`, sem criar branch ou worktree, conforme decisão explícita do solicitante.

## Tarefa

Fechar a validação da reconstrução visual e funcional do MX, publicar o SHA atual e validar a rota crítica de Performance de Vendas em produção.

### Objetivo

Concluir os gates restantes do prompt mestre com evidência reproduzível, mantendo pendências externas explícitas.

### Diagnóstico

Os gates locais anteriores estavam verdes, mas a matriz E2E longa encontrou a rota `/relatorios/performance-vendas` sem o marcador visual canônico do cabeçalho. O deployment vigente também não apresentava esse marcador e emitia warnings de dimensões negativas do Recharts.

### Causa raiz

`src/features/sales-performance/sections/AdminHeader.tsx` renderizava um `header` legado, sem `data-mx-module-header` e sem a superfície canônica (`rounded-2xl`, borda, fundo branco, padding e sombra).

### Alterações

- Adicionado `data-mx-module-header=""` ao cabeçalho.
- Aplicadas as classes canônicas de superfície, mantendo as ações, a responsividade e a hierarquia existentes.
- Plano de execução atualizado para refletir os gates reais de 03/08.
- Corrigidos os quatro `ResponsiveContainer` da Performance de Vendas com `minWidth={0}`, `minHeight={0}` e dimensões iniciais positivas para eliminar o warning de montagem `width(-1)/height(-1)`.
- Gerado o inventário estruturado atual em `docs/audits/route-inventory.md` e `docs/audits/route-inventory.json`: 111 rotas, 103 protegidas, 8 públicas, 127 tabelas, 84 RPCs e 14 Edge Functions.
- CI do SHA `a81c3f86`: Quality Gates, Typecheck/unit, ESLint a11y, bundle-budget, Module Design System Parity e MX Atomic Design Enforcement passaram.
- Gitleaks no evento `push` passou (run `30847358188`); a execução manual histórica (run `30847366721`) encontrou 77 achados em commits antigos e permanece registrada como dívida de rotação/limpeza, sem allowlist.

### Arquivos

- `src/features/sales-performance/sections/AdminHeader.tsx`
- `src/features/sales-performance/sections/AdminFunnelChart.tsx`
- `src/features/sales-performance/sections/AdminGoalCompareChart.tsx`
- `src/features/sales-performance/sections/AdminPeopleChart.tsx`
- `src/features/sales-performance/sections/AdminSellOutEvolution.tsx`
- `docs/audits/route-inventory.md`
- `docs/audits/route-inventory.json`
- `docs/superpowers/plans/2026-07-30-mx-unificacao-total.md`
- `docs/reports/2026-07-30-mx-unificacao-total-progress.md`
- `docs/reports/2026-07-30-mx-unificacao-total-final.md`

### Testes executados

- `npm test`: 1703 pass, 0 fail, 13.975 asserts (antes desta alteração).
- `npm run lint`: verde (847 arquivos; tokens, z-index, page roots e landmarks verdes).
- `npm run build`: verde, sem sourcemaps públicos.
- `npx playwright test --project=chromium --project=mobile-chrome`: `184 passed`, `8 failed`, `182 skipped` em 46,5 min; os 6 failures antigos do Chromium foram revalidados isoladamente após o patch.
- Auditoria visual isolada: `PLAYWRIGHT_REUSE_SERVER=1 npx playwright test src/test/module-route-visual-audit.playwright.ts --project=chromium` → `9 passed` em 6,4 min.
- Smoke de consultoria isolado: `PLAYWRIGHT_REUSE_SERVER=1 npx playwright test src/test/mx-consultoria-role-smoke.playwright.ts --project=mobile-chrome` → `1 passed` em 11,4 min.
- Agenda afetada: `agenda-filters` mobile reexecutado; caso que falhou por deadlock passou, segundo caso foi skip por condição de dados.
- `npm run typecheck`: exit 0.
- `npm run check:bundle-size`: 1831,43/1860 KB, todos os chunks dentro do budget.
- `npm run validate:structure`, `validate:parity`, `sync:ide:check`, `audit:routes-data`: exit 0.
- `npm run validate:agents`: exit 0, 121 warnings históricos.
- Produção: `/relatorios/performance-vendas` autenticada como Administrador Geral, dados reais renderizados e sem overflow horizontal; deployment vigente sem a correção local.
- Pós-patch final: `npm test` 1707 pass, 0 fail, 13.988 asserts; `npm run build` exit 0; `npm run lint` exit 0; `npm run check:bundle-size` 1831,32/1860 KB, todos os chunks dentro do budget.
- Produção final do código funcional: `f51ad48e`; deployment atual da `main`/evidência operacional: `d8f10447` em `dpl_Fo6p841PvUk6aLMKcnUkUyrUwCAY`, `READY`, aliases oficiais ativos.
- `/api/health`: HTTP 200, `healthy`, Vercel/Supabase API/database/crons críticos `ok`, release `d8f10447f6ce77c5e94c5510927ef78c8dc3f7b5`.
- `/relatorios/performance-vendas`: HTTP 200 em `https://mxperformance.com.br`.
- `/home`: bloqueio de autorização esperado para `administrador_geral`, sem erro de console e sem overflow.
- Evidência visual final revisada: `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-final-f51ad48e.png`.

### Resultado

Correção local aplicada, publicada e validada em produção. O warning Recharts não reapareceu no carregamento limpo do SHA final.

### Evidências

- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas.png`
- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-metrics.json`
- Commits desta etapa: `b841d50e`, `59b1c51e`, `f51ad48e`.
- Deployment funcional validado: `dpl_m2uGGrqo3PezodqcwTFPDagDepYw`; deployment atual da `main`: `dpl_Fo6p841PvUk6aLMKcnUkUyrUwCAY`, `READY`, aliases oficiais ativos.
- CodeRabbit CLI `0.7.1` autenticado executou revisão contra `1480ea42`: 6 issues; as duas issues documentais foram corrigidas, três issues permanecem em arquivos concorrentes de pré-cadastro e uma em teste concorrente.
- Sentry API read-only confirmou organização `synvolt`, projeto `mx-performance-frontend` e release `a81c3f86d391dd5646feaab8f8443adad1a370d5`; evento controlado `21d41cfbda2d407e9c424f0ae488313f` chegou com tags de produção, rota e release, issue `MX-PERFORMANCE-FRONTEND-5` foi resolvida. O plugin local informou upload de source maps, mas a listagem Sentry/CLI retornou 0 arquivos; stack trace desminificado permanece não comprovado.
- `sentry-cli` global está ausente; `npx @sentry/cli` 2.58.5 foi usado somente para validação read-only.

### Próximo passo

Manter o relatório final como fonte de verdade: a correção está liberada; source maps desminificados, dívida histórica de segredos, rotação de credenciais e issues CodeRabbit em arquivos concorrentes permanecem explícitos.
