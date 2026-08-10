# MX Unificação Total — Plano de Execução

> Data: 2026-07-30 · Branch histórica: `main` · Stack real revalidada: Vite 6.4.3 + React 19 + TypeScript + Tailwind 4 + Radix/shadcn + Supabase + Vercel + Playwright + Storybook + bun test
> **Revalidação corrente (2026-08-10):** a execução atual ocorre em worktree local isolado, branch `fix/mx-full-execution-20260810`, sobre `origin/main` `cd03df2a8ee472664c07dae881074d911c6775d5`. O checkpoint de código remoto verificado antes desta atualização documental é `d2c491578438491e5d6b4e878caa48dd51141a95`; a unidade gerencial foi implementada nos commits `f5c813ce`, `52a761ed` e `ae3da0b8`, com a documentação/security scan reconciliada nos commits posteriores. O PR #188 está aberto, mas Preview/produção continuam sem aprovação.
> A suíte corrente passou `2612/2612` testes e `18234` asserts; números menores e SHAs anteriores citados nas seções datadas abaixo são snapshots históricos, não evidência do checkout corrente.

## Revalidação corrente da unidade gerencial — 2026-08-10

- `ManagerDailyClosingBase44` e `ManagerDayRoutineCanonical` usam `PageCanvas`
  sem gutters/`max-w-7xl`/safe area próprios.
- `ManagerTeamPerformance` deixa o canvas pai controlar também o loading;
  `HelpTooltip` é botão nativo e `CheckinHeader` usa escala tipográfica
  canônica nos trechos ajustados.
- Contratos direcionados: `38 pass / 0 fail / 8222 expect()` (snapshot da
  unidade gerencial); suíte corrente: `2612 pass / 0 fail / 18234 expect()`.
- Lint, typecheck, build, bundle (`1564,22/1860 KB gzip`), layout/route
  audits, AIOX structure/parity/IDE sync, a11y, management design system e
  diff-check passaram.
- Commit, PR, CI remoto, preview, produção, backup/PITR, Sentry/source maps,
  browser autenticado novo e rollback operacional ainda não foram provados.

## 0. Estado real medido (Fase 0 — concluída)

Auditado em 2026-07-30, não por leitura de relatório anterior mas por execução:

| Item | Estado medido | Evidência |
|---|---|---|
| Build | **verde** | `npm run build` → exit 0 |
| Token lint (hex hardcoded) | **verde** | `lint-tokens-ast` → 842 arquivos, 0 hex |
| Z-index lint | **verde** | `lint-z-index` → 61 ocorrências, dentro do inventário |
| Tokens em camadas | **parcial** | `primitives.css`, `semantic.css`, `components.css` existem |
| App Shell | **duplicado** | ver Gap 2 |
| PageCanvas / larguras semânticas | **inexistente** | ver Gap 1 |
| Scopes CSS legados | **ativos, e fixados por teste** | ver Gap 3 |
| Rotas | 110 `path=` em `src/App.tsx` (516 linhas) | — |
| Páginas | 54 em `src/pages` (+ subpasta `owner`) | — |

Conclusão: o sistema **não** é greenfield. A premissa "nada existe" do briefing está incorreta para tokens, z-index, shell frame e contratos de teste. Recomeçar do zero destruiria trabalho verificadamente verde. O plano abaixo audita e fecha os gaps reais.

## 1. Gaps reais

### Gap 1 — Não existe container canônico de página (requisito central §7/§8)
`src/design-system/` tem `tokens/`, `shell/`, `sidebar/`, `internal-mx/` — **nenhum** `PageCanvas`, largura semântica, margem responsiva por breakpoint, safe-area inferior centralizada ou `RouteLayoutMetadata`. Cada página decide sua própria margem: 15 arquivos em `src/pages` usam `max-w-*`/`px-*`/`mx-auto` na raiz (pior caso `PDIPrint.tsx` com 14 ocorrências, `ConsultorTreinamentos.tsx` com 11).

### Gap 2 — Dois shells vivos em paralelo
`src/App.tsx` importa **ambos**:
- `Layout` (`src/components/Layout.tsx`) → usa `MxSidebarShell`, importa `owner-base44-exact.css`
- `AppShell` (`src/components/AppShell.tsx`, lazy) → usa `design-system/shell/AppShellFrame`

Mais `src/components/layout/AppLayout.jsx` (aparentemente órfão) e `src/components/layout/Sidebar.jsx`. O AppShellFrame canônico existe mas não é o único caminho de runtime.

### Gap 3 — Legado fixado por contrato de teste (conflito a resolver antes de remover)
Quatro folhas de scope ativas: `manager-visual-scope.css` e `search-interactions.css` (via `main.tsx`), `owner-base44-exact.css` (via `Layout.tsx`), `internal-mx-manager-scope.css` + `internal-mx-template-slots.css` (via `InternalMxVisualScope.tsx`).

**Elas não são resíduo esquecido — são requisito de teste.** `src/test/module-design-system-parity.test.ts:82` exige `main.tsx` conter `./styles/manager-visual-scope.css`; `src/lib/owner-base44-exact-parity-contract.test.ts:24` exige `Layout.tsx` conter o import de `owner-base44-exact.css`; `tokens/semantic.css:62` documenta que valores shadcn foram *medidos a partir* de `owner-base44-exact.css`.

Ou seja: a Fase 10 do briefing ("remover scopes CSS antigos") colide de frente com os contratos de paridade Base44 que o projeto adotou deliberadamente. Isso exige decisão de produto, não execução silenciosa — ver §3.

## 2. Ondas de execução

Cada onda = commit atômico + gate verde antes da próxima.

- **Onda 1 — PageCanvas + tokens de layout.** Criar `src/design-system/page/` com `PageCanvas.tsx` (variantes `fluid|dashboard|wide|focused|form|reading`, densidade, `bottomClearance`), `FullBleed.tsx`, tokens de espaço/margem/breakpoint em `primitives.css`+`semantic.css`, `routeLayoutMetadata.ts`, e `page-contract.test.ts`. Gate: `npm run lint` + `npm run test` verdes.
- **Onda 2 — regra automatizada anti-padding na raiz.** `scripts/lint-page-roots.mjs`, exit≠0 acima do inventário congelado; inventário inicial = 15 arquivos atuais, só pode decrescer.
- **Onda 3 — consolidar shell.** Um único caminho de runtime via `AppShellFrame`; migrar consumidores de `Layout`; remover `layout/AppLayout.jsx` se órfão comprovado.
- **Onda 4 — migração por perfil.** Vendedor → Gerente → Dono → Admin/Consultor → rotas públicas. Por rota: PageCanvas + largura semântica + remover padding de raiz + estados + responsivo.
- **Onda 5 — validação.** Playwright matriz perfil × rota × viewport (390/600/840/1024/1280/1440/1600/1920), axe, console/rede limpos, regressão visual.
- **Onda 6 — publicação.** Preview → validação → produção → smoke → monitoramento Sentry.

## 2.1 Estado das ondas medido em 2026-07-31

| Onda | Estado | Evidência (comando, exit code) |
|---|---|---|
| 1 — PageCanvas + tokens de layout | **concluída** | `src/design-system/page/` com `PageCanvas.tsx`, `FullBleed.tsx`, `routeLayoutMetadata.ts`, `page-contract.test.ts`; tokens `--mx-page-*` em `semantic.css` |
| 2 — lint anti-padding na raiz | **concluída** | `npm run lint` → `[lint-page-roots] OK — 0 ocorrência(s) em 64 páginas, teto 0` (partiu de 15) |
| 3 — shell único | **concluída** | `src/App.tsx` importa só `AppShell` → `AppShellFrame`; `Layout.tsx` só aparece em testes de contrato |
| 4 — migração por perfil | **concluída** | inventário de raiz zerado; `lint-tokens-ast` 847 arquivos, 0 hex; `lint-z-index` 60 |
| 5 — validação | **em curso** | matriz interna MX 19 rotas × 3 viewports × 3 perfis verde (exit 0); demais suítes em medição |
| 6 — publicação | **não iniciada** | — |

Gates medidos em 2026-07-31: `npm run lint` exit 0, `npm run test` exit 0 (1697 testes), `npm run build` exit 0.

## 2.2 Estado das ondas medido em 2026-08-03

| Onda | Estado | Evidência (comando, exit code) |
|---|---|---|
| 1–4 | **concluídas** | inalteradas desde 2026-07-31 |
| 5 — validação | **concluída localmente** | `npm test` 1712 pass / 0 fail / 14004 asserts; `npm run lint`, `npm run typecheck`, `npm run build`, `npm run check:bundle-size` e `git diff --check` verdes; smoke real do consultor e rota crítica revalidados em produção |
| 6 — publicação | **parcialmente validada** | Snapshot histórico de 2026-08-03: commit `75147ef3`, seis workflows GitHub verdes, Supabase `store-pre-registration` versão 76, Vercel `dpl_5RuA6xgKUgHaEUNXxZyhHkd76Fuq` `Ready`, Chrome real em `/pre-cadastro/acertt` sem console error/warn e POST de duplicidade `409`. O estado corrente está registrado abaixo em `7387fb32`/`dpl_DNhwTvPwY9tQTQrrZ69WZAmVK6HS`; Sentry controlado, smoke autenticado completo e rollback operacional continuam pendentes. |

### Estado operacional atualizado em 2026-08-03

- A execução permanece diretamente em `main`, conforme decisão explícita do solicitante; o diretório não rastreado `mx-v3-csv-VzMBNx/` foi preservado sem alterações.
- Inventário medido: 111 rotas, 103 protegidas, 8 públicas, 127 tabelas, 84 RPCs e 14 Edge Functions.
- Acesso GitHub, Supabase e Vercel confirmado por CLIs; `sentry-cli` não está instalado nesta máquina, e `npx @sentry/cli` 2.58.5 foi usado apenas para consultas sem persistir credenciais.
- Produção autenticada como Administrador Geral em `/relatorios/performance-vendas` mostrou dados reais (`49 lojas`, `204` sell-outs históricos, `476` meta consolidada) e nenhum overflow horizontal, porém o deployment vigente ainda não contém `data-mx-module-header` nessa rota.
- O warning Recharts `width(-1)/height(-1)` foi observado no deployment vigente e precisa ser revalidado após o novo deploy.
- O SHA `7387fb325dd645aaa2f832895e341c541c1f1d60` está em `origin/main`; CI, `/api/health` e o deployment observado `dpl_DNhwTvPwY9tQTQrrZ69WZAmVK6HS` estão verdes/`READY`, com aliases oficiais. Bundle e health declaram a mesma release Sentry; ainda não há prova de stack trace desminificado a partir de frame do bundle.
- `npm audit --omit=dev` ficou em 2 high após atualização lockfile de `brace-expansion`; a API paginada atual lista 133 alertas Dependabot (3 critical, 70 high, 47 medium, 13 low) e findings CodeRabbit em arquivos concorrentes permanecem pendentes.
- Não declarar conclusão total enquanto a matriz integral de rotas/estados/viewports, a dívida histórica de segredos, os alertas críticos, a dívida CodeRabbit concorrente e a prova do stack trace desminificado permanecerem abertas.

### Revalidação complementar de 2026-08-03

- O perfil `consultor_mx` foi coberto por fixture Auth temporário e smoke real contra o deployment da `main`: `1 passed` em `2,1 min`; nenhuma conta permanente foi reativada.
- O teste `src/test/mx-consultoria-role-smoke.playwright.ts` passou a diferenciar requisições por navegação, leituras secundárias do shell e falhas HTTP reais. A mudança não mascara status HTTP, `requestfailed` de API, `pageerror` ou `console.error` de aplicação.
- Os gates locais após a mudança passaram: `typecheck`, `lint`, `npm test`, `build`, `check:bundle-size` e `git diff --check`.
- O Supabase continua sem backup restaurável verificável: `backups: []`, `pitr_enabled: false`; esse gate permanece bloqueado externamente.

### Defeitos reais encontrados na medição de 2026-08-03

Todos reproduzidos antes de corrigir e re-medidos depois:

1. **`veiculos_estoque` legível e não gravável pela área interna MX.** A policy de
   SELECT aceitava `eh_area_interna_mx()`, as de INSERT/UPDATE/DELETE não. O botão
   "Registrar veículo" aparecia e o POST voltava 403. Achado em evento real de
   produção registrado em 2026-07-30, não em leitura de código. Migration
   `20260803120000_veiculos_estoque_internal_mx_write.sql`, aplicada em produção.
2. **`/devolutivas` no perfil interno fora do template canônico.** Cabeçalho
   próprio, sem slot canônico, raio 0, margem lateral cravada em `px-4 lg:px-8`.
3. **`/meu-funil` com uma violação `serious` de contraste.** `amber-600` sobre
   `slate-50` em 14px bold mede 3.05:1 contra os 4.5:1 exigidos.
4. **Atividade manual da Rotina do Dia impossível de concluir.** A linha vinda de
   `execution_actions` era mapeada com `actions: []`, então o card pendente
   renderizava sem botão nenhum.
5. **Modal de referência vazando 16px à direita em 390px.** `w-full` somado a
   `left-4 right-4` faz a largura ser 100% da viewport a partir de x=16.
6. **Login sem retorno para leitor de tela.** Os banners de erro e sucesso não
   eram live regions.

### Lacuna da Onda 5 fechada em 2026-08-03

`administrador_mx` tem conta real de teste, aceita a senha
padrão dos perfis de teste e passa as dezenove áreas nos três viewports com sessão
autenticada — não mais por bypass.

`consultor_mx` **continua sem cobertura de sessão real**: a conta de teste dedicada
está com `active=false` no banco e o app
corretamente recusa o login. A única outra conta do papel pertence a uma pessoa real.
Reativar a conta de teste é decisão do solicitante — ver §3.3.

### Lacuna conhecida na Onda 5

`administrador_mx` tem conta E2E real e cobertura autenticada das dezenove áreas nos três
viewports. `consultor_mx` permanece sem conta E2E ativa: a auditoria desse papel continua
limitada ao bypass de desenvolvimento e não comprova conteúdo carregado por consultas reais.

## 3. Decisões que precisam do solicitante

1. **Gap 3:** manter a paridade visual Base44 (e portanto os scopes CSS e seus contratos de teste) ou removê-los, quebrando deliberadamente contratos de paridade que já foram aprovados? O briefing pede remoção; a memória do projeto registra "paridade Base44↔MX é visual, não só funcional" como requisito firme. Não resolvo isso por conta própria.
2. **Conta de teste do consultor:** reativar a conta dedicada (`active=false`
   hoje) para fechar a última faixa da matriz, ou aceitar que
   `consultor_mx` siga coberto só por bypass? Ativar login em produção não é decisão
   que eu tome sozinho.
3. **Publicação:** o solicitante autorizou explicitamente a execução diretamente em `main`; o
push dispara deploy de produção na Vercel e deve ser seguido por CI, deployment `READY` e
smoke autenticado.
4. **Escopo vs. sessão:** 110 rotas × 8 viewports × ~13 estados de captura = ordem de 10⁴ artefatos visuais. Isso é um programa de semanas, não de uma sessão. Executo por ondas, com evidência por onda.

## 4. Gates por onda

```bash
npm run lint          # tsc + lint-tokens-ast + lint-z-index + eslint
npm run test          # bun test
npm run build         # vite build + assert_no_public_sourcemaps
npm run test:e2e      # playwright (ondas 4+)
```

Nenhuma onda é declarada concluída sem exit code 0 registrado e, para mudanças visíveis, screenshot.
