# MX Unificação Total — Progresso

Atualizado em 2026-08-03 após o SHA `7387fb32`. Execução direta no branch `main`, sem criar branch ou worktree, conforme decisão explícita do solicitante.

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
- `npm update brace-expansion --package-lock-only --ignore-scripts` atualizou os pacotes compatíveis para `brace-expansion` 5.0.9/2.1.4/1.1.18; `npm audit --omit=dev` caiu de 3 para 2 findings high, ambos em `react-router`/`react-router-dom`.
- Dependabot revalidado pela API paginada: 133 alertas abertos (3 critical, 70 high, 47 medium, 13 low). Os alertas distribuídos em `.aiox-core`, `whatsapp-service` e backends auxiliares permanecem fora do escopo seguro desta correção.

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
- Revalidação após o lockfile: `npm test` 1710 pass / 0 fail / 13.997 asserts; `npm run lint` exit 0; `npm run build` exit 0; `npm run check:bundle-size` 1831,30/1860 KB, todos os chunks dentro do budget.
- `npm run validate:structure`, `validate:parity`, `sync:ide:check`, `audit:routes-data`: exit 0.
- `npm run validate:agents`: exit 0, 121 warnings históricos.
- Produção: `/relatorios/performance-vendas` autenticada como Administrador Geral, dados reais renderizados e sem overflow horizontal; deployment vigente sem a correção local.
- Pós-patch final: `npm test` 1707 pass, 0 fail, 13.988 asserts; `npm run build` exit 0; `npm run lint` exit 0; `npm run check:bundle-size` 1831,32/1860 KB, todos os chunks dentro do budget.
- Produção atual observada: SHA `7387fb325dd645aaa2f832895e341c541c1f1d60`; deployment `dpl_DNhwTvPwY9tQTQrrZ69WZAmVK6HS`, `READY`, aliases oficiais ativos.
- `/api/health`: HTTP 200, `healthy`, Vercel/Supabase API/database/crons críticos `ok`, release `7387fb325dd645aaa2f832895e341c541c1f1d60`.
- `/relatorios/performance-vendas`: HTTP 200 em `https://mxperformance.com.br`.
- `/home`: bloqueio de autorização esperado para `administrador_geral`, sem erro de console e sem overflow.
- Evidência visual final revisada: `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-final-f51ad48e.png`.

### Resultado

Correção local aplicada, publicada e validada em produção. O warning Recharts não reapareceu no carregamento limpo do SHA final.

### Evidências

- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas.png`
- `visual-evidence/internal-mx/administrador_geral-desktop-performance-vendas-metrics.json`
- Commits desta etapa: `b841d50e`, `59b1c51e`, `f51ad48e`.
- Deployment atual observado da `main`: `dpl_DNhwTvPwY9tQTQrrZ69WZAmVK6HS`, `READY`, aliases oficiais ativos.
- CodeRabbit CLI `0.7.1` autenticado executou revisão contra `1480ea42`: 6 issues; as duas issues documentais foram corrigidas, 1 crítica, 1 major e 2 menores permanecem em arquivos concorrentes de pré-cadastro/teste.
- Sentry confirmou organização `synvolt` e projeto `mx-performance-frontend`; bundle e `/api/health` atuais convergem para release `7387fb325dd645aaa2f832895e341c541c1f1d60`. O evento histórico `08093d7cae174d23824a5273fa42bb91` e o debug ID `ff71a893-c507-4440-9653-17416b1f2be4` permanecem evidências antigas; stack trace desminificado da release atual permanece aberto.
- `sentry-cli` global está ausente; `npx @sentry/cli` 2.58.5 foi usado somente para validação read-only.

### Próximo passo

Manter o relatório final como fonte de verdade: a correção está liberada e a atualização transitiva de `brace-expansion` está no lockfile; dívida histórica de segredos, rotação de credenciais, React Router vulnerável, findings CodeRabbit concorrentes, stack trace desminificado de frame do bundle e backup restaurável permanecem explícitos.

## Revalidação autônoma — 2026-08-03

- O smoke real do perfil `consultor_mx` foi executado contra `https://mxperformance.com.br` com fixture temporário de Auth/perfil, dados Supabase reais, isolamento de consultoria e limpeza automática: `1 passed` em `2,1 min`.
- Durante reexecuções, o runner revelou consultas secundárias do shell mantidas abertas após a rota concluir e `ERR_QUIC_PROTOCOL_ERROR` em um avatar público; a query equivalente de `devolutivas` respondeu em `131–223 ms`, e o avatar respondeu `HTTP/1.1 200` com curl. O teste agora rastreia pendências por navegação, não bloqueia por consulta secundária após uma leitura de negócio bem-sucedida e mantém falhas HTTP/console reais como bloqueadores.
- O smoke também observou uma tentativa intermitente de envio ao Sentry sem CORS; a repetição passou, e a inspeção CDP capturou o envelope com `HTTP 200` e `Access-Control-Allow-Origin: *`. A prova de stack trace desminificado continua aberta.
- Gates locais após a alteração do teste: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run check:bundle-size` e `git diff --check` passaram; bundle `1844,83/1860 KB`, sem sourcemaps públicos.
- Nenhuma conta permanente foi reativada; fixtures temporários foram removidos pelo `afterAll` do teste.
- Reexecução local final: `npm test` 1712 pass / 0 fail / 14.004 asserts; `npm run typecheck` exit 0; `npm run lint` exit 0; `npm run build` exit 0; `npm run check:bundle-size` 1844,83/1860 KB; `git diff --check` exit 0.

## Revalidação de produção — 2026-08-03 (sessão final)

- Navegador autenticado como Administrador Geral abriu `https://www.mxperformance.com.br/relatorios/performance-vendas`: dados reais visíveis (`204` sell-outs e `476` meta), `main` presente, zero logs de erro e `scrollWidth === clientWidth` em viewport padrão de 1721 px.
- A mesma rota foi recarregada em `390×844`: `scrollWidth === clientWidth === 390`, títulos `BI Executivo da Rede`, `204` e `476` presentes, zero elementos fixos fora da viewport e zero logs de erro.
- Smoke Playwright contra produção, filtrado para `consultor_mx`, com fixture Auth/consultoria temporário e limpeza automática: `1 passed (2.0m)`.
- CI do SHA `7387fb325dd645aaa2f832895e341c541c1f1d60`: `Quality Gates`, `Typecheck`, `unit-tests`, `eslint-a11y`, `Atomic Design`, `parity`, `Detect Secrets` e `Supabase Preview` concluídos com sucesso.
- O `npx @sentry/cli` local está disponível (`2.58.6`), porém o token operacional fornecido para esta sessão retornou `401 Invalid token`; source maps e stack trace desminificado da release atual continuam sem prova independente da API.
- Após o follow-up documental `6d5eebe2`, a Vercel publicou `dpl_2nEL2EZ6yhxXz3E3TGeMzh6VBFmh` como `READY`; `/api/health` e o bundle servido convergiram para `6d5eebe206c89481336f3f1584c14ee67d6ee842`, e o smoke pós-deploy do `consultor_mx` passou `1 passed (2.4m)`.
- A checagem de `index-C5PCw3sv.js.map` respondeu `200` por rewrite, mas com `Content-Type: text/html` e `content-disposition: index.html`; não havia source map público servido.
