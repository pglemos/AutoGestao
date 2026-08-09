# Evidence ledger — snapshot factual atual

## Storage — correção de RLS e validação remota — 2026-08-09T19:35:23Z

- **EV-ST-01 — causa raiz:** a policy anterior fazia `JOIN` direto em `evidencias_visita`, `visitas_consultoria` e `clientes_consultoria`; essas tabelas são internas e suas próprias policies RLS ocultavam o vínculo durante a avaliação de `storage.objects`, produzindo `Object not found` mesmo para um dono da loja correta.
- **EV-ST-02 — migration aplicada:** `20260809205000_fix_consulting_evidence_storage_rls_definer.sql` aplicada por `supabase db push --linked --yes`; a migration está presente em `supabase_migrations.schema_migrations`. A função `public.pode_ler_evidencia_consultoria(text, uuid)` está `SECURITY DEFINER`, `search_path=public`, sem `PUBLIC EXECUTE` e com `EXECUTE` para `authenticated`; a policy usa somente essa função ou `eh_area_interna_mx()`.
- **EV-ST-03 — matriz RLS no banco:** sob `ROLE authenticated` e claims `auth.uid()` reais, o dono de uma loja que possui a evidência viu o objeto; dono de outra loja e vendedor de outra loja não viram; administrador interno viu. Resultado: `PASS` para isolamento da policy e acesso de mesma loja, sem inserir ou apagar dados de produção.
- **EV-ST-04 — correção do teste anterior:** o login fornecido como dono está vinculado à loja `467a19d1-af51-4b4f-9b05-d67187a2a759`, que não possui objetos em `evidencias-consultoria`; a negativa anterior para esse login não era um caso de mesma loja. O caso positivo foi exercitado com um vínculo de dono ativo em uma loja que possui evidência. Estado global de Storage: `TESTED_PRODUCTION_PARTIAL` — outros buckets e fluxos de upload/delete continuam fora desta rodada.

## Auditoria remota das Edge Functions — 2026-08-09T19:17:57Z

- **EV-EF-01 — CORS/auth negativa:** `OPTIONS` contra as 22 funções ativas retornou `200` em todas; cada resposta anunciou `authorization`, `apikey`, `content-type`, `baggage`, `sentry-trace` e `traceparent`. O `POST {}` com `Authorization: Bearer invalid-token` retornou `401` em 19 funções; `google-oauth-handler`, `store-pre-registration` e `request-password-recovery` retornaram `400` por validação de entrada pública/OAuth. Estado: `TESTED_PRODUCTION_PARTIAL`.
- **EV-EF-02 — Publicação remota:** versões novas confirmadas como `ACTIVE` para as funções que carregavam CORS antigo: `autonomous-reports=55`, `relatorio-matinal=69`, `relatorio-mensal=63`, `google-calendar-events=57`, `send-individual-feedback=57`, `google-drive-files=70`, `executive-agenda-google-sync=22`, `send-push-notification=21`, `manage-global-user=9`, `mx-critical-jobs-health=10` e `send-visit-report=57`. Estado: `TESTED_PRODUCTION` para o contrato de headers.
- **EV-EF-03 — Sem JWT obrigatório:** o código local e o probe classificam `google-oauth-handler` como Bearer + OAuth state/TTL/consumo único; `google-calendar-sync` como JWT ou secret interno; `google-meet-ata` como JWT administrativo ou secret de cron; `store-pre-registration` e `request-password-recovery` como endpoints públicos por desenho, com validação, anti-enumeração e rate limit. Estado: `NOT_APPLICABLE_WITH_PROOF` para o requisito de JWT nesses dois endpoints e `TESTED_PRODUCTION_PARTIAL` nos demais.
- **EV-EF-04 — Limitação preservada:** não houve teste positivo por tenant/perfil nem teste individual completo de replay, idempotência, rate limit e Sentry/logs. A função remota legada `autonomous-reports` não existe no checkout local e permanece em classificação separada. Estado global: `IN_PROGRESS` para o aceite funcional integral.

## Auditoria pós-commit documental — 2026-08-09T18:23:27Z

- **EV-REL-08 — Documentação/release:** commit `b77c459e` em `main`; Vercel check `FD5S5QdjvPeDvzdRhv8SEgUmRztf` terminou `success` como `Canceled by Ignored Build Step`; produção permaneceu no deployment runtime `dpl_TTLku8NUz63Ac474Y9Z4HcZacHwi`; estado `DONE_WITH_EVIDENCE` para a regra de deployment documental.
- **EV-REL-09 — Health pós-push:** `https://www.mxperformance.com.br/api/health` respondeu 200 com release `46c236dbb4f16c942b9d0c912ca91298fa400001` e `critical_crons=ok`; estado `TESTED_PRODUCTION`.
- **EV-REL-10 — Dependabot:** API GitHub com `state=open` confirmou 81 alertas: 3 critical, 42 high, 28 medium, 8 low; estado `BLOCKED_EXTERNAL` até triagem/atualização segura.
- **EV-REL-11 — Checkpoint documental:** `0148cf1a` em `main`/`origin/main` foi o checkpoint documental auditado; não altera o runtime `46c236db…`; estado `DONE_WITH_EVIDENCE`.

## Evidências finais do SHA publicado — 2026-08-09T18:20:33Z

- **EV-REL-01 — Git/CI:** SHA `46c236dbb4f16c942b9d0c912ca91298fa400001` em `main`, `origin/main` confirmado e 7 workflows do SHA em `success`; estado `DONE_WITH_EVIDENCE`.
- **EV-REL-02 — Vercel/health:** deployment `dpl_TTLku8NUz63Ac474Y9Z4HcZacHwi` em `READY`, produção e aliases oficiais confirmados; `/api/health` HTTP 200 com `release=46c236dbb4f16c942b9d0c912ca91298fa400001`, `critical_crons=ok`; estado `TESTED_PRODUCTION`.
- **EV-REL-03 — Supabase Realtime:** migration `20260809172708_add_notificacoes_realtime_publication` aplicada e `public.notificacoes` publicada em `supabase_realtime`; estado `TESTED_PRODUCTION`.
- **EV-REL-04 — Realtime browser:** WebSocket autenticado abriu em `wss://fbhcmzzgwjdgkctlfvbo.supabase.co/realtime/v1/websocket`; joins sanitizados continham `postgres_changes` e `notificacoes`; respostas `phx_reply` foram recebidas; estado `TESTED_PRODUCTION`.
- **EV-REL-05 — Browser roles:** Vendedor (`/home`, `/notificacoes`, `/perfil`), Gerente (`/home`, `/meta-loja`, `/notificacoes`), Dono (`/meta-loja`, `/notificacoes`) e `synvollt@gmail.com` (`administrador_geral`, `/lojas`, painel da unidade, `/notificacoes`) renderizaram dados reais sem overflow e sem erros de console após reload; estado `TESTED_PRODUCTION_PARTIAL` para a matriz de seis perfis.
- **EV-REL-06 — Browser artefacts:** screenshots em `output/playwright/2026-08-09-vendedor-perfil.png`, `output/playwright/2026-08-09-gerente-meta-loja.png` e `output/playwright/2026-08-09-admin-store-panel.png`; diretório ignorado por `output/`; estado `DONE_WITH_EVIDENCE`.
- **EV-REL-07 — Sentry:** a CLI continua autenticada somente para consultas limitadas; evento sintético/source-map/alerta do SHA novo não foi comprovado; estado `BLOCKED_EXTERNAL`.

O acesso informado como “Administrador MX” não prova esse papel: o perfil efetivo retornado pela aplicação é `administrador_geral`. Não há credencial comprovada para `administrador_mx` ou `consultor_mx` nesta execução.

## Atualização pós-push — 2026-08-09T18:07:42Z

- **EV-REL-01 — Release Git:** `46c236dbb4f16c942b9d0c912ca91298fa400001`, branch `main`, push `origin/main` confirmado; estado `TESTED_LOCAL_ONLY` até CI/deployment final.
- **EV-REL-02 — Local quality gate:** `npm test` 2.590/18.135/0, typecheck, lint, build, sourcemap, bundle, Design System audit e diff-check passaram; estado `TESTED_LOCAL_ONLY`.
- **EV-REL-03 — Realtime:** migration `20260809172708_add_notificacoes_realtime_publication` listada no Supabase; query de produção confirmou `realtime_publication=true` e `notificacoes_published=true`; estado `TESTED_PRODUCTION` para o schema.
- **EV-REL-04 — Code review:** CodeRabbit terminou sem novos findings após a correção de caminho absoluto do teste; estado `DONE_WITH_EVIDENCE` local.
- **EV-REL-05 — Secret scan:** commit e arquivos novos sem leaks; scan histórico completo encontrou 116 achados antigos e não pode ser promovido a PASS global; estado `BLOCKED_EXTERNAL`/histórico.
- **EV-REL-06 — Sentry:** CLI autenticada confirmou release `fa1b491…` sem eventos novos; SHA `46c236db…` ainda precisa aparecer após o deploy; estado `IN_PROGRESS`.

O SHA final desta atualização é `46c236dbb4f16c942b9d0c912ca91298fa400001`. O adendo abaixo permanece como histórico do checkpoint anterior.

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
