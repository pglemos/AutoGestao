# MX Unificação Total — Progresso

Atualizado em 2026-08-03. Execução direta no branch `main`, sem criar branch ou worktree, conforme decisão explícita do solicitante.

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

### Arquivos

- `src/features/sales-performance/sections/AdminHeader.tsx`
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

### Resultado

Correção local aplicada e aprovada pela auditoria visual isolada. A aprovação de release depende do push/CI, do novo deployment `READY` e da repetição do smoke de produção.

### Evidências

- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas.png`
- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-metrics.json`
- Deployment observado: `dpl_8gzZzXj6QGey2r4Wu8nG4bJugpeH`, `READY`, aliases oficiais ativos.
- CLI `sentry-cli`: ausente; validação real do Sentry ainda não comprovada.

### Próximo passo

Revisar diff, commitar e fazer push na `main`; aguardar CI/Vercel; validar a rota corrigida e `/home`; fechar o relatório final com o status real.
