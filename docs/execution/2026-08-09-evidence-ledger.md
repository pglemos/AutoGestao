# Evidence ledger — snapshot factual atual

## Atualização de execução — 2026-08-09T17:04:10Z

Este adendo supersede o checkpoint abaixo para os itens reexecutados nesta sessão.

- `git bundle verify ../MXGESTAOPREDITIVA-pre-main-autonomous-20260809-101705.bundle`: **PASS**; bundle completo.
- `git diff --check`: **PASS**.
- `npm run lint`: **PASS**, 0 erros; 1 warning a11y preexistente em `HelpTooltip.tsx`.
- `npm run typecheck`: **PASS**.
- `npm test`: **PASS**, 2.589 testes, 18.131 expectativas, 0 falhas; uma primeira execução concorrente apresentou uma falha transitória de foco, reproduzida isoladamente e aprovada na segunda execução serial.
- `npm run build`: **PASS**; sourcemaps públicos ausentes.
- `npm run check:bundle-size`: **PASS**, 1.806,96/1.860 KB gzip; warnings individuais dentro do budget.
- `coderabbit review --uncommitted --base main`: **BLOCKED_EXTERNAL** por limite atingido/seat não atribuído à organização.
- `npm audit --audit-level=high`: **BLOCKED_EXTERNAL** somente por `xlsx@0.18.5` high sem correção upstream; o pacote é usado nos scripts de import/export, não no exportador web baseado em `fflate`.
- Branch inventory remoto: **3 branches totais** — `main` + 2 Dependabot com PRs abertas; nenhuma branch obsoleta adicional foi apagada.
- `main` protection: checks obrigatórios `typecheck`, `unit-tests`, `verify`, `Detect Secrets`, `review`.

O checkout e as mudanças continuam no SHA base abaixo até o commit de release.

- **Gerado em:** 2026-08-09T17:04:10Z
- **SHA do checkout:** `ea7dcec591467db2e844fe42e3e3622cecdf1b3f`
- **Branch:** `main`
- **Tag de backup detectada:** `pre-main-autonomous-20260809-101705`
- **Bundle:** presente; verificar com git bundle verify

| ID | Task | Ambiente | Ação/evidência | Resultado observado | Estado |
|---|---|---|---|---|---|
| EV-T0-01 | T0.1 | Local Git | git rev-parse HEAD / branch --show-current | checkout e branch capturados no SHA acima | DONE_WITH_EVIDENCE |
| EV-T0-02 | T0.2 | Local Git | tag e bundle detectados | tag pre-main-autonomous-20260809-101705; bundle presente; verificar com git bundle verify | TESTED_LOCAL_ONLY |
| EV-C0-03 | C0.3 | Local | node scripts/audit-owner-b44-graph.mjs --check | guard sem imports runtime retirados no checkpoint atual | TESTED_LOCAL_ONLY |
| EV-C0-04 | C0.4 | Supabase | snapshot SQL de RLS | 225 tabelas públicas com RLS; 0 sem policy | TESTED_LOCAL_ONLY |
| EV-C0-05 | C0.5 | Supabase | pg_proc + has_function_privilege | 211 SECURITY DEFINER; anon=0; authenticated=155; service_role=194 | IN_PROGRESS |
| EV-C0-06 | C0.6 | Supabase | list_edge_functions | 22 funções ativas; endpoints ainda não exercitados | IN_PROGRESS |
| EV-C0-07 | GitHub | API/CI do checkpoint | proteção e checks registrados no handoff | revalidar no SHA final | TESTED_LOCAL_ONLY |
| EV-C0-08 | GitHub | branch inventory | remanescentes são branches dependabot | decisão de retenção ainda deve ser registrada | IN_PROGRESS |
| EV-C0-09 | Vercel | /api/health | health do checkpoint anterior | revalidar após push final | NOT_REEVALUATED |
| EV-C0-10 | Local/externo | matriz atual | snapshot e bloqueios explícitos | browser/Sentry/restore ainda pendentes | IN_PROGRESS |

## Regra de leitura

Este ledger substitui os geradores que marcavam testes como concluídos sem artefato. Matrizes antigas permanecem preservadas como histórico, mas não são evidência da release atual.
