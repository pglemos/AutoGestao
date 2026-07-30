# Story OPS-20260602 - Google Calendar Sync Reconciliation

## Status

Ready for Review

## Contexto

A agenda MX nao esta removendo eventos cancelados do Google Calendar, nao limpa eventos pessoais quando o responsavel muda e pode deixar duplicatas visiveis em agendas conectadas.

Auditoria somente leitura em 2026-06-02 encontrou 3 visitas canceladas ainda com IDs Google e 1 grupo de visitas duplicadas no banco. A limpeza deve ser conservadora: remover duplicatas no Google quando a origem MX e deterministica, mas nao apagar linhas ambiguas do sistema.

## Acceptance Criteria

- [x] `google-calendar-sync` remove do Google visitas/eventos com status cancelado e limpa IDs Google no banco.
- [x] Responsavel/consultor atual recebe espelho pessoal via `espelhos_agenda_google_usuario`.
- [x] Espelhos pessoais antigos sao removidos quando o responsavel/consultor deixa de estar relacionado ao evento.
- [x] Admin Master/Admin MX nao recebe duplicata pessoal quando a Agenda Central ja e a fonte de leitura.
- [x] Duplicatas Google com mesma origem MX sao deduplicadas mantendo o ID canonico salvo no banco/espelho.
- [x] Consultor/responsavel com espelho pessoal nao fica tambem como convidado do evento central, evitando duplicidade no Google Calendar externo.
- [x] Agenda mesclada remove duplicata central+pessoal da mesma origem MX antes de retornar eventos para o app.
- [x] Consultor responsavel/auxiliar explicitamente relacionado recebe espelho pessoal mesmo quando tambem possui papel administrativo MX.
- [x] Bloqueio de agenda nao convida o usuario criador; apenas o consultor responsavel recebe espelho pessoal.
- [x] CLI `scripts/reconcile_google_calendar_sync.ts` roda em dry-run por padrao e possui modo `--execute`.
- [x] CLI remove eventos Google cancelados/duplicados e apenas reporta duplicidades ambiguas do banco.
- [x] Secrets/tokens nao sao impressos em logs.
- [x] Rodar `npm run lint`.
- [x] Rodar `npm run typecheck`.
- [x] Rodar `npm test`.

## Checklist por Papel

- [x] Admin MX: cancelamento/remove Google Calendar sem apagar historico no sistema.
- [x] Consultor MX: troca de responsavel remove evento da agenda antiga e cria/atualiza na agenda correta.
- [x] Admin Master/Admin MX: consulta usa Agenda Central sem duplicar espelho pessoal.
- [x] Operacao: CLI permite previsualizar e executar reconciliacao conservadora.

## Dev Agent Record

### Agentes

- @dev (Dex): implementacao local, testes e gates.

### Debug Log

- Story criada antes das alteracoes de codigo para cumprir Constitution AIOX.
- `google-calendar-sync` agora converte status cancelado em delete efetivo, remove espelhos pessoais antigos e grava novos espelhos por usuario relacionado.
- Evento pessoal direto legado deixa de ser recriado; quando possivel, a funcao remove o legado e usa `espelhos_agenda_google_usuario` como mapa canonico.
- Admin Master MX e filtrado dos espelhos pessoais para evitar duplicidade com a Agenda Central.
- Upsert central e upsert de espelho pessoal deduplicam eventos Google pela origem `mx_source_kind` + `mx_source_id`.
- CLI de reconciliacao lista eventos MX por calendario em janela configuravel e roda em dry-run por padrao.
- Dry-run local rodou sem escrita, mas nao escaneou Google porque `GOOGLE_TOKEN_ENCRYPTION_SECRET` nao esta presente no ambiente; confirmou 1 grupo ambiguo no banco: PAAY em 2026-02-25T17:00:00+00:00.
- Deploy remoto de `google-calendar-sync` aplicado no projeto Supabase `fbhcmzzgwjdgkctlfvbo`.
- Validacao remota pos-deploy processou 3 visitas canceladas com vinculo Google; uma segunda rodada limpou 2 IDs pessoais legados orfaos. Resultado final: 0 visitas canceladas com `google_event_id`/`google_event_id_central`.
- Re-sync remoto do Gandini executado com sucesso; funcao retornou `ok: true`, sem erros, e sem recriar espelho pessoal para Admin Master.
- Auditoria complementar encontrou 9 espelhos pessoais ativos para o usuario administrador Jose, todos com evento central salvo; regra ajustada para suprimir espelhos pessoais de `administrador_geral` e `administrador_mx`.
- Deploy remoto v70 aplicado e os 9 espelhos pessoais administrativos foram reprocessados/removidos. Validacao final: 0 espelhos pessoais administrativos ativos e 0 visitas canceladas com IDs Google.
- Follow-up 2026-06-10: evento central deixa de manter como attendee usuarios que ja recebem espelho pessoal; o payload envia `attendees: []` quando necessario para limpar convidados antigos no PATCH do Google.
- Follow-up 2026-06-10: `google-calendar-merged` passa a deduplicar eventos pessoais e centrais pela origem MX, preferindo o evento pessoal quando a mesma visita/evento aparece nas duas fontes.
- Follow-up 2026-06-10: chamada administrativa de `google-calendar-sync` aceita JWT `service_role` validado pela Supabase, alem da comparacao exata com o secret, para permitir reconciliacao remota com chaves rotacionadas.
- Deploy remoto aplicado em `fbhcmzzgwjdgkctlfvbo`: `google-calendar-sync` e `google-calendar-merged`.
- Reconciliacao remota de 14 visitas futuras ativas executada com sucesso; resultado: 14 ok, 0 falhas, 14 espelhos obsoletos removidos. Avisos restantes foram apenas de permissao de co-host Google Meet em 5 reunioes.
- Follow-up 2026-06-10: regra de espelho pessoal reabilitada para administradores quando eles estao explicitamente como consultor responsavel/auxiliar. Caso real validado: Ideal Automotive 2026-06-16 09:00, auxiliar Jose com espelho pessoal criado e `sync_error` nulo.
- Reconciliacao remota reaplicada apos o ajuste: 14 visitas futuras ativas, 0 falhas, 10 espelhos pessoais criados/atualizados; 4 espelhos sem sucesso por usuarios sem Google pessoal conectado.
- Follow-up 2026-06-10: bloqueios de agenda deixam de incluir `creator_email` e `associated_admins` como convidados do evento central. Caso real validado: bloqueio de Jose em 2026-06-23 08:00-16:00, criado por Mariane, reprocessado sem warnings e com espelho pessoal ativo apenas para Jose.
- Follow-up 2026-07-29: a produção bloqueava o POST de `google-calendar-merged`/`google-calendar-sync` no preflight porque o Sentry envia `baggage` e `sentry-trace`, mas o CORS compartilhado não os declarava. O Chrome registrou `HeaderDisallowedByPreflightResponse` e a Agenda exibia `Failed to send a request to the Edge Function`; o contrato foi ampliado e coberto por teste de regressão.

### Gates

- [x] `npm run typecheck` - passed.
- [x] `npm run lint` - passed.
- [x] `npm test` - 384 passed.
- [x] `npm run build` - passed.
- [x] `deno check supabase/functions/google-calendar-sync/index.ts supabase/functions/_shared/google_calendar_sync_rules.ts` - passed.
- [x] `bun test src/lib/agenda/google-calendar-sync-rules.test.ts src/lib/agenda/google-calendar-privacy.test.ts` - passed.
- [x] `npm run typecheck` - passed apos correcao Admin MX.
- [x] `npm run lint` - passed apos correcao Admin MX.
- [x] `npm test` - 384 passed apos correcao Admin MX.
- [x] `npm run build` - passed apos correcao Admin MX.
- [x] `deno check supabase/functions/google-calendar-sync/index.ts supabase/functions/_shared/google_calendar_sync_rules.ts` - passed apos correcao Admin MX.
- [x] `npx tsx scripts/reconcile_google_calendar_sync.ts --dry-run` - partial; Google calendars skipped because `GOOGLE_TOKEN_ENCRYPTION_SECRET` is missing locally.
- [x] `npx supabase functions deploy google-calendar-sync` - deployed.
- [x] `npx supabase functions deploy google-calendar-sync` - deployed v70 apos correcao Admin MX.
- [x] Validacao remota com `x-google-calendar-sync-admin-token` - passed; canceladas com IDs Google: 2 antes da rodada final, 0 depois.
- [x] Validacao remota Admin MX - passed; espelhos pessoais administrativos: 9 antes, 0 depois.
- [x] `bun test src/lib/agenda/google-calendar-sync-rules.test.ts src/lib/agenda/google-calendar-privacy.test.ts` - 9 passed apos correcao de attendee central.
- [x] `npm run typecheck` - passed apos correcao de attendee central.
- [x] `npm run lint` - passed apos correcao de attendee central.
- [x] `npm test` - 407 passed apos correcao de attendee central.
- [x] `npm run build` - passed apos correcao de attendee central.
- [x] `deno check supabase/functions/google-calendar-sync/index.ts supabase/functions/google-calendar-merged/index.ts supabase/functions/_shared/google_calendar_sync_rules.ts` - passed.
- [x] `npx supabase functions deploy google-calendar-sync google-calendar-merged` - deployed.
- [x] `npx supabase functions deploy google-calendar-sync` - deployed apos ajuste de service role JWT.
- [x] Reconciliacao remota via `google-calendar-sync` - 14 visitas futuras ativas reprocessadas, 0 falhas.
- [x] `npm run lint` - passed apos deploy/reconciliacao.
- [x] `npm test` - 407 passed apos deploy/reconciliacao.
- [x] `npm run build` - passed apos deploy/reconciliacao.
- [x] `bun test src/lib/agenda/google-calendar-sync-rules.test.ts src/lib/agenda/google-calendar-privacy.test.ts` - 9 passed apos ajuste de consultor auxiliar admin.
- [x] `deno check supabase/functions/google-calendar-sync/index.ts supabase/functions/google-calendar-merged/index.ts supabase/functions/_shared/google_calendar_sync_rules.ts` - passed apos ajuste de consultor auxiliar admin.
- [x] `npx supabase functions deploy google-calendar-sync` - deployed apos ajuste de consultor auxiliar admin.
- [x] Reconciliacao remota via `google-calendar-sync` - 14 visitas futuras ativas reprocessadas, 0 falhas; Ideal Automotive/Jose validado com espelho pessoal ativo.
- [x] `npm run typecheck` - passed apos ajuste de consultor auxiliar admin.
- [x] `npm run lint` - passed apos ajuste de consultor auxiliar admin.
- [x] `npm test` - 407 passed apos ajuste de consultor auxiliar admin.
- [x] `npm run build` - passed apos ajuste de consultor auxiliar admin.
- [x] `bun test src/lib/agenda/google-calendar-sync-rules.test.ts src/lib/agenda/google-calendar-privacy.test.ts` - 10 passed apos ajuste de bloqueio sem convite ao criador.
- [x] `deno check supabase/functions/google-calendar-sync/index.ts supabase/functions/_shared/google_calendar_sync_rules.ts` - passed apos ajuste de bloqueio sem convite ao criador.
- [x] `npx supabase functions deploy google-calendar-sync` - deployed apos ajuste de bloqueio sem convite ao criador.
- [x] Reprocessamento remoto do bloqueio `e7f4c1c7-b76f-4f5a-a18d-3fe4f05f10ed` - ok, 1 espelho pessoal para Jose, 0 warnings.
- [x] `npm run typecheck` - passed apos ajuste de bloqueio sem convite ao criador.
- [x] `npm run lint` - passed apos ajuste de bloqueio sem convite ao criador.
- [x] `npm test` - 412 passed apos ajuste de bloqueio sem convite ao criador.
- [x] `npm run build` - passed apos ajuste de bloqueio sem convite ao criador.
- [x] `git diff --check` - passed.
- [x] Teste de contrato CORS: `bun test supabase/functions/_shared/cors.test.ts`.

### File List

- `docs/stories/story-OPS-20260602-google-calendar-sync-reconciliation.md`
- `supabase/functions/google-calendar-sync/index.ts`
- `supabase/functions/google-calendar-merged/index.ts`
- `supabase/functions/_shared/google_calendar_sync_rules.ts`
- `scripts/reconcile_google_calendar_sync.ts`
- `src/lib/agenda/google-calendar-sync-rules.test.ts`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/_shared/cors.test.ts`
