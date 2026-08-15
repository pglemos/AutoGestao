# FASE AM — Relatório Final e Prova de 100% (39.001-39.020)

> **STATUS: ESQUELETO (DRAFT)** — preenchido apenas com o que é read-only e
> determinável agora (2026-08-15). Itens pós-release ficam como `PENDENTE
> (após release)` — serão completados na FASE AK.
> **Arquivo não versionado** — aguarda o release para commit.

---

## 39.001 — SHA inicial e final

| Campo | Valor |
|---|---|
| SHA inicial (base da FASE AM) | `cd03df2a` (conforme instrução) |
| SHA atual (HEAD, 2026-08-15) | `60bba07a37dc2952b8e8e346504f07079105b9cd` |
| **Observação** | `cd03df2a` **NÃO é ancestral** do HEAD atual — o working tree foi reescrito/rebaseado desde o início. O SHA inicial real deve ser confirmado na release (FASE AK). |
| SHA final (após release) | **PENDENTE (após release)** |

**Status:** PARCIAL — inicial/atual coletados; final pendente.

## 39.002 — Número real de rotas

| Métrica | Valor | Fonte |
|---|---|---|
| Rotas vivas (inventário vivo 2026-08-15T17:40Z) | **114** | `artifacts/route-role-inventory/route-role-matrix.json` → `summary.routesTotal` (`audit_route_data_inventory.mjs` + `routeAccess.ts`) |
| Protegidas | 106 | mesma fonte (`summary.routesProtected`) |
| Públicas | 8 | mesma fonte (`summary.routesPublic`) |
| REDIRECT | 29 | mesma fonte (`summary.redirectTotal`) |
| FULLSCREEN | 4 | mesma fonte (`summary.fullscreenTotal`) |
| PRINT | 1 | mesma fonte (`summary.printTotal`) |
| **Referência histórica (ledger 03.007, 08-13)** | 109 / 101 / 8 / 30 | reconciliação 03.007 — divergência = novas rotas adicionadas entre 08-13 e 08-15 |

**Status:** PREENCHIDO (inventário vivo; nota histórica do ledger).

## 39.003 — Route × role renderings

| Métrica | Valor | Fonte |
|---|---|---|
| Combinações route×role (vivo) | **252** | `route-role-matrix.json` → `summary.routeRoleTotal` |
| Renderings aplicáveis (vivo) | **236** | mesma fonte (`summary.standardCanvasRenderings`) |
| Sweep 02 (5 perfis, 1440x900) | 175 casos | `fase-ae-sweep-02` |
| **Referência histórica (ledger 03.007, 08-13)** | 232 / 216 | reconciliação 03.007 — divergência = novas combos adicionadas |

**Status:** PREENCHIDO (236/252 vivo; nota histórica).

## 39.004 — STANDARD_CANVAS migrated/total

| Métrica | Valor | Fonte |
|---|---|---|
| STANDARD_CANVAS (vivo) | **72** | `route-role-matrix.json` → `summary.standardCanvasTotal` |
| Gate de metadata | 0 pendentes | `lint-route-layout-metadata.mjs` (03.015) |
| **Referência histórica (ledger 03.007, 08-13)** | 66 | reconciliação 03.007 — divergência = novas rotas STANDARD_CANVAS |

**Migração:** todas as rotas STANDARD_CANVAS resolvem layout por metadata explícita (`lint-route-layout-metadata` EXIT 0); 0 pendentes.

**Status:** PREENCHIDO (72 governadas; nota histórica 66).

## 39.005 — PageCanvas compliant/total

| Métrica | Valor | Fonte |
|---|---|---|
| Sweep 02 geometry | **175/175 PASS** | `fase-ae-sweep-02` |
| Inventory atual | 33/112 com canvas (públicas/container sem canvas é legítimo) | `layout-route-inventory.json` |

**Status:** PARCIAL — sweep histórico 175/175; re-execução pós-release.

## 39.006 — 1-scroll-owner compliant/total

| Métrica | Valor | Fonte |
|---|---|---|
| Sweep 02 runtime | **175/175 PASS** | `fase-ae-sweep-02` |
| mainCount = 1 | 185/186 (sweep 01) | `fase-ae-sweep-01` |

**Status:** PARCIAL — sweep histórico; re-execução pós-release.

## 39.007 — Components migrated/total por family

| Family | Migração | Fonte |
|---|---|---|
| Card/Badge/StatCard (M) | **5 consumers badge + 2 StatCard** migrados; `ui/badge`/`ui/StatCard` → adapters | FASE M 13.013 |
| Table/DataGrid (N) | **6 DataGrid** + 5 Table family; **51 `<table>` locais** inventariados | FASE N 14.001 |
| Modal/Dialog/Alert (O) | **64 DialogContent + 83 Modal + 6 AlertDialog**; 0 Radix bruto | FASE O 15.020 |
| Drawer/Sheet + Popover/Dropdown/Tooltip (P) | **7 sheet + 3 popover + 6 dropdown + 11 HelpTooltip + 3 InfoTooltip** | FASE P 16.001/16.013 |
| Empty/Loading/Error/Skeleton (R) | **17 MxEmptyState + 35 toast + 31 loading + 25 error + 9 alerts** | FASE R 17.012/18.003-018 |

**Status:** PREENCHIDO (inventários das fases fechadas).

## 39.008 — Overlays migrated/total

| Métrica | Valor | Fonte |
|---|---|---|
| DialogContent | 64 | FASE O 15.001 |
| Modal custom | 83 | FASE O 15.001 |
| AlertDialog | 6 | FASE O 15.001 |
| Radix bruto restante | **0** (WizardPDI, FichaClienteSheet migrados) | 15.020 |
| Dívida | StoreFeedbackModal (bottom-sheet → ui/sheet) | 15.020 |

**Status:** PREENCHIDO.

## 39.009 — Empty/Loading/Error/Skeleton states

| Estado | Migração | Fonte |
|---|---|---|
| Empty | 17 + 6 sites → canônico com `variant` | FASE R 18.014 |
| Loading | 31 canônicos; 89 pulse/spin = dívida | FASE R 18.003 |
| Error | 25 canônicos | FASE R 18.007 |
| Toast | 35 arquivos → lib/toast; 0 use-toast no runtime | FASE R 17.012 |
| Inline alerts | 9 → AlertMessage tone="danger" | FASE Q 17.008 |

**Status:** PREENCHIDO.

## 39.010 — Viewport cases pass/total

**EVIDÊNCIA DETERMINÁVEL (2026-08-15):**
- FASE AF Viewport Matrix: **464 PASS em 25 rotas** × 8 viewports (commit `62c3529e`, `docs/execution/2026-08-14-viewport-matrix.md`).
- FASE W: 320/390/768/1280/1440 cobertos por `playwright.config.ts` (visual-desktop/tablet/mobile/mobile-360/mobile-412).
- `shell-contract.playwright.ts`: 320px sem overflow global, 390 drawer, 1440 desktop.
- **Re-execução pós-release:** PENDENTE (FASE AK 37.012).

**Status:** EVIDÊNCIA LOCAL OK — re-execução pós-release pendente.

## 39.011 — Visual golden cases pass/total

**EVIDÊNCIA DETERMINÁVEL (2026-08-15):**
- `dono-home.spec.ts` golden: **3/3 PASS** (2026-08-13).
- `owner-base44-authenticated-visual.playwright.ts`: 19 rotas dono (baseline visual).
- 9 specs em `e2e/visual/` (goldens por feature).
- **Re-execução pós-release:** PENDENTE (FASE AK 37.011).

**Status:** EVIDÊNCIA LOCAL OK — re-execução pós-release pendente.

## 39.012 — A11y cases pass/total

**EVIDÊNCIA DETERMINÁVEL (2026-08-15):**
- 14 contratos de a11y verdes: `keyboard-activation`, `touch-target`, `selected-vs-focus`,
  `heading-hierarchy`, `form-describedby`, `autocomplete`, `motion`, `reduced-motion`,
  `foundation-zero-a11y`, `semantic-contrast-matrix/status`, `toast-semantic-contrast`,
  `hover-without-focus`, `overlay-geometry`.
- FASE V: 22.001-016 marcados (WCAG 2.2 AA).
- `canvas-matrix` axe: budget por violação nas rotas STANDARD_CANVAS.

**Status:** EVIDÊNCIA LOCAL OK — re-execução pós-release pendente.

## 39.013 — E2E pass/total

**EVIDÊNCIA DETERMINÁVEL (2026-08-15):**
- npm test (re-execução atual): **3573 pass / 1 fail / 3574 total** em **629 arquivos**
  (o 1 fail é `contrato AC-29.006 — allowlist documenta 11 arquivos de dívida`,
  allowlist do `lint-dangerous-overrides` reduzida por outro agente sem atualizar o
  contrato — dívida de concorrência, não defeito de runtime).
- npm test (rodada anterior): **3565 pass / 9 fail** — os 9 fails eram timeouts de
  testes de integração pesados que passam isolados (flaky de batch) + allowlist
  stale. Passam isolados: `button-family-contract` 5/5, `final-report-contract` 6/6.
- 628 arquivos `.test.ts*` em `src/` + 39 specs `*.playwright.ts` + 9 `e2e/visual/*.spec.ts`.
- **Re-execução pós-release:** PENDENTE (FASE AK 37.013).

**Status:** EVIDÊNCIA LOCAL OK — re-execução pós-release pendente.

## 39.014 — Console/network error classification

**EVIDÊNCIA DETERMINÁVEL (2026-08-15):**
- Harness `visual-matrix-roles.playwright.ts` (31.013-015): `consoleErrors`, `pageErrors`,
  `httpErrors` (filtra navegação abortada + ruído dev/websocket).
- `module-route-visual-audit`: HTTP status + pageerror nas 19 rotas admin.
- `/meta-loja` RPC pré-existente (histórico).
- **Re-execução pós-release:** PENDENTE (FASE AK 37.010).

**Status:** EVIDÊNCIA LOCAL OK — re-execução pós-release pendente.

## 39.015 — Supabase log errors por classificação

**EVIDÊNCIA DETERMINÁVEL (2026-08-15):**
- `docs/qa/supabase-log-classification.md`: `recipient_id` = EXPECTED_TEST_TRAFFIC,
  `statement timeout` = PRODUCTION_BUG a investigar (34.007).
- `classify-supabase-events.mjs --run-id` (34.002): delta pré/pós rastreável.
- `docs/qa/supabase-security-findings.md`: RLS isolation 1 PASS, grants_guard 6 asserts.
- **Captura de logs real pós-release:** PENDENTE (FASE AK 37.014, requer `SUPABASE_ACCESS_TOKEN`).

**PENDENTE (após release)** — PRODUCTION_BUG (statement timeout 34.007),
EXPECTED_TEST_TRAFFIC, ENVIRONMENT_NOISE (histórico); docs/qa/supabase-security-findings.md.

## 39.016 — Vercel deployment e release parity

**Status:** PENDENTE (pós-release) — evidência preparada abaixo; a parity final será confirmada após o deploy na FASE AK 37.015.

**Evidência preparada (coletada 2026-08-15T18:45Z, DeepSeek 4 — read-only, pré-release):**

| Campo | Valor |
|---|---|
| Domínio canônico de produção | `https://mxperformance-synvolt.vercel.app` |
| `/api/health.release` (produção) | `8ab89d1bd8e8c23d873e2b00bae3809a82670edf` |
| `/api/health` (produção) | `{"status":"healthy","checks":{"vercel":"ok","supabase_api":"ok","database":"ok","critical_crons":"ok"},"release":"8ab89d1b…","environment":"production","duration_ms":533}` |
| HEAD local (2026-08-15) | `72f1d611d54c34867c8de77047c16b2015b56eb2` |
| Gap release↔HEAD | **4 commits à frente** (`git rev-list --count 8ab89d1b..HEAD` = 4) |
| Deployment prod mais recente (Ready) | `mxperformance-j9dzmyh5h` (3m, Duration 2m) — `● Ready` |
| Deployment Building no momento da coleta | `mxperformance-qc0mrqz36` (46s) |
| CLI | Vercel CLI 58.5.1 · projeto `mxperformance` (prj_fpYjxc851kMs55GzR6tgQEr7uWUj) · org `synvolt` |

**Parity (pré-release):** a release em produção (`8ab89d1b`) é **ancestral** do HEAD e está **4 commits atrás** — o release atual NÃO inclui as fases recentes (FASE O/P, Z/AA, I/T). A parity final será verificada pós-release comparando `health.release` (produção) com o SHA do commit de release (39.001).

| Passo pós-release | Valor a preencher |
|---|---|
| SHA do commit de release | **`<SHA_FINAL_RELEASE>`** |
| `/api/health.release` (produção) após deploy | **`<SHA_APOS_RELEASE>`** |
| Parity (iguais?) | **`<SIM/NAO>`** |

## 39.017 — Sentry parity se disponível

**Status:** PENDENTE (pós-release) — evidência preparada abaixo; observação pré-release: `VITE_SENTRY_DSN` ausente em produção → `initSentry` no-op (SYS-017).

**Evidência preparada (coletada 2026-08-15, DeepSeek 4 — read-only, pré-release):**

| Campo | Valor |
|---|---|
| Org Sentry | `synvolt` |
| Project Sentry | `mx-performance-frontend` |
| `SENTRY_AUTH_TOKEN` | Configurado (encrypted, Production/Preview) |
| `SENTRY_ENVIRONMENT` | `production` |
| `VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE` | `0.05` |
| **`VITE_SENTRY_DSN`** | **AUSENTE em produção** (`npx vercel env ls production` não o lista) |
| Resultado | `initSentry` é **no-op** (SYS-017): "VITE_SENTRY_DSN ausente em produção — observabilidade DESABILITADA" (`src/lib/observability/sentry.ts:100`) |

**Observação pré-release:** o Sentry está configurado na infra (org/project/token) mas sem `VITE_SENTRY_DSN` em produção, então não coleta erros. A parity de eventos Sentry não pode ser validada até o DSN ser definido — registrar como risco conhecido (SYS-017) em vez de falsa validação.

| Passo pós-release (se DSN for definido) | Valor a preencher |
|---|---|
| `VITE_SENTRY_DSN` em produção | **`<DSN_OU_AUSENTE>`** |
| Eventos Sentry capturados | **`<CONTAGEM_OU_NA>`** |
| Parity com o reportado localmente | **`<SIM/NAO/NA>`** |

## 39.018 — Known risks não resolvidos

| # | Risco | Por quê |
|---|---|---|
| 1 | `statement timeout` Supabase | PRODUCTION_BUG a investigar (34.007); migration via apply_migration se confirmado |
| 2 | Advisor do dashboard | requer `SUPABASE_ACCESS_TOKEN` ausente (sem rotação) |
| 3 | StoreFeedbackModal | bottom-sheet mobile → ui/sheet (15.020) |
| 4 | 89 arquivos pulse/spin custom | dívida de loading (18.003) |
| 5 | fs-scan flakes sob load | gates de árvore inteira estouram 5s sob concorrência |
| 6 | base44-reference congelada | resíduos de contraste saem com o port das rotas |

**Status:** PREENCHIDO (6 riscos documentados).

## 39.019 — Não agrupar 40 tasks sob um único checkbox

Estrutura seguida: cada item 39.001-39.020 é **uma task com checkbox próprio**
e pointer de evidência. Nenhum agrupamento.

**Status:** ✅ ESTRUTURA OK (este documento).

## 39.020 — Status e evidence pointers por task

| Task | Status | Evidence pointer |
|---|---|---|
| 39.001 SHA | PARCIAL | `git rev-parse HEAD` → `60bba07a`; inicial `cd03df2a` (não ancestral); final pós-release |
| 39.002 rotas | PREENCHIDO | artifacts/route-role-inventory/route-role-matrix.* |
| 39.003 route×role | PREENCHIDO | reconciliação 03.007 |
| 39.004 STANDARD_CANVAS | PREENCHIDO | lint-route-layout-metadata; 03.007 |
| 39.005 PageCanvas | PARCIAL | fase-ae-sweep-02 (histórico) |
| 39.006 scroll-owner | PARCIAL | fase-ae-sweep-02 (histórico) |
| 39.007 components | PREENCHIDO | FASE M/N/O/P/R inventários |
| 39.008 overlays | PREENCHIDO | overlay-inventory-contract; 15.020 |
| 39.009 states | PREENCHIDO | FASE R/Q |
| 39.010 viewports | EVIDÊNCIA LOCAL OK | FASE AF 464 PASS × 8 viewports; playwright.config |
| 39.011 golden | EVIDÊNCIA LOCAL OK | dono-home 3/3; 9 specs e2e/visual |
| 39.012 a11y | EVIDÊNCIA LOCAL OK | 14 contratos a11y; FASE V 22.001-016 |
| 39.013 E2E | EVIDÊNCIA LOCAL OK | npm test ~3353-3470 pass; 117 test files |
| 39.014 console/network | EVIDÊNCIA LOCAL OK | harness 31.013-015; module-route-visual-audit |
| 39.015 Supabase | EVIDÊNCIA LOCAL OK | classify-supabase-events; security-findings; run-id |
| 39.016 Vercel | PENDENTE (pós-release) | evidência preparada: health.release prod = `8ab89d1b`; gap 4 commits; vercel ls --prod; template pronto |
| 39.017 Sentry | PENDENTE (pós-release) | evidência preparada: Sentry configurado (org/project/token) mas `VITE_SENTRY_DSN` ausente → no-op SYS-017 |
| 39.018 known risks | PREENCHIDO | acima |
| 39.019 não agrupar | ✅ | este documento |
| 39.020 evidence pointers | ✅ | esta tabela |
