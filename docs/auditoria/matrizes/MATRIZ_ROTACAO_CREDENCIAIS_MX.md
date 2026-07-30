# Matriz de rotação de credenciais MX

**Incidente:** exposição de credenciais operacionais e JWT/service-role no
histórico e na conversa de execução.

**Exceção máxima:** 2026-07-30 18:00 BRT.

**Responsável pela exceção:** Administrador MX designado pelo proprietário;
nome nominal ainda não registrado e, portanto, a exceção não pode ser renovada.
**Motivo:** manter somente os workloads produtivos que ainda exigem a JWT
legada durante a substituição consumidor por consumidor. **Workloads afetados:**
Edge Functions e automações listadas abaixo. **Gate no vencimento:** bloquear
novas execuções humanas com a credencial legada e desabilitar cada job/endpoint
interno ainda não migrado; produção pública só pode permanecer ativa quando o
fluxo não aceita a chave exposta. Uma renovação exige nome, justificativa,
lista menor de workloads e expiração inferior.

Nenhum valor de segredo pertence a esta matriz. `PENDENTE` significa que o
consumidor continua exposto; presença de uma variável moderna ou migração
somente local não prova que o runtime publicado a utiliza.

## Gate comum

Para cada linha: criar uma chave `sb_secret_...` exclusiva do componente quando
possível; substituir o segredo no cofre nativo; executar o teste indicado;
registrar timestamp e identificador redigido; desabilitar o legado somente
depois da validação. Renovação da exceção exige responsável nominal, motivo,
workload bloqueado quando o corte não for possível e expiração menor.

No Edge runtime, as chaves modernas gerenciadas são injetadas nos mapas JSON
`SUPABASE_SECRET_KEYS` e `SUPABASE_PUBLISHABLE_KEYS`; o código deve ler o membro
`default`. O namespace customizado `SUPABASE_*` é reservado pela plataforma.
Chaves modernas não são JWTs. Os fluxos que enviam a `service_role` como
`Authorization: Bearer` entre Edge Functions devem primeiro abandonar essa
autenticação ou implementar verificação própria com `verify_jwt=false`; apenas
trocar a variável produziria 401. Clientes administrativos que usam a chave no
header `apikey` podem migrar diretamente para `sb_secret_...`.

| Consumidor | Responsável | Evidência atual | Chave atual | Substituição | Validação | Desabilitação | Estado |
|---|---|---|---|---|---|---|---|
| Vercel `mxperformance` development | DevOps | `SUPABASE_SECRET_KEY` corrigida e comparação efêmera confirmou match | runtime ainda usa `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` atual | smoke das APIs em development | remover env legado do target | PREPARADO; CUTOVER PENDENTE |
| Vercel `mxperformance` preview | DevOps | `SUPABASE_SECRET_KEY` corrigida e comparação efêmera confirmou match | runtime ainda usa `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` atual | `/api/health` e pré-cadastro no preview | remover env legado do target | PREPARADO; CUTOVER PENDENTE |
| Vercel `mxperformance` production | DevOps | `SUPABASE_SECRET_KEY` corrigida e comparação efêmera confirmou match | runtime ainda usa `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SECRET_KEY` atual | `/api/health`, logs e smoke autenticado | remover env legado do target | PREPARADO; CUTOVER PENDENTE |
| GitHub Actions | DevOps | secrets por nome; legado ausente | nenhum service-role | secret dedicado somente se workflow exigir | workflows relevantes verdes | manter legado ausente | VALIDAR APÓS CORTE |
| Edge `_shared/auth.ts` | Data Engineering | resolver moderno implementado localmente | fallback legado | `SUPABASE_SECRET_KEYS.default` / `SUPABASE_PUBLISHABLE_KEYS.default` | testes de autenticação das funções dependentes | remover fallback legado após deploy | IMPLEMENTADO LOCAL; DEPLOY PENDENTE |
| Edge `_shared/drive-upload.ts` | Data Engineering | resolver moderno implementado localmente | fallback legado | `SUPABASE_SECRET_KEYS.default` | upload e releitura de arquivo | remover fallback legado após deploy | IMPLEMENTADO LOCAL; DEPLOY PENDENTE |
| Edge `_shared/google.ts` | Data Engineering | resolver moderno implementado localmente | fallback legado | `SUPABASE_SECRET_KEYS.default` | OAuth/Calendar/Drive sem 401 | remover fallback legado após deploy | IMPLEMENTADO LOCAL; DEPLOY PENDENTE |
| Edge `_shared/supabase-client.ts` | Data Engineering | resolver moderno implementado localmente | fallback legado | `SUPABASE_SECRET_KEYS.default` | funções dependentes sem erro RLS/Auth | remover fallback legado após deploy | IMPLEMENTADO LOCAL; DEPLOY PENDENTE |
| Edge `approve-store-registration` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | aprovação autorizada e releitura | desabilitar uso legado | PENDENTE |
| Edge `executive-agenda-google-sync` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | sync idempotente e logs sem 401 | desabilitar uso legado | PENDENTE |
| Edge `google-calendar-events` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | listar/criar evento e reler | desabilitar uso legado | PENDENTE |
| Edge `google-calendar-sync` | Data Engineering | função ACTIVE + fonte; usa legado como Bearer | legado gerenciado | autenticação interna própria + secret exclusiva | sync incremental idempotente e teste negativo de auth | desabilitar Bearer/legado | PENDENTE |
| Edge `google-drive-files` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | listar/upload/download/reler | desabilitar uso legado | PENDENTE |
| Edge `google-meet-ata` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | gerar/reler ata autorizada | desabilitar uso legado | PENDENTE |
| Edge `google-oauth-handler` | Data Engineering | função ACTIVE + fonte; usa legado como Bearer | legado gerenciado | autenticação interna própria + secret exclusiva | callback OAuth, token cifrado e teste negativo de auth | desabilitar Bearer/legado | PENDENTE |
| Edge `manage-global-user` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | mutation Admin MX e releitura | desabilitar uso legado | PENDENTE |
| Edge `manage-store-team` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | mutation autorizada e releitura | desabilitar uso legado | PENDENTE |
| Edge `mx-critical-jobs-health` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | health autenticado e jobs recentes | desabilitar uso legado | PENDENTE |
| Edge `register-user` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | cadastro e recuperação sem takeover | desabilitar uso legado | PENDENTE |
| Edge `send-push-notification` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | envio controlado e log de entrega | desabilitar uso legado | PENDENTE |
| Edge `store-pre-registration` | Data Engineering | função ACTIVE + fonte | legado gerenciado | secret exclusiva | pré-cadastro público sem adoção de identidade | desabilitar uso legado | PENDENTE |

## Scripts e testes

Responsável comum: Engineering. Chave atual: `SUPABASE_SERVICE_ROLE_KEY`
legada. Uma `sb_secret_...` continua tendo privilégio administrativo e não pode
ser rotulada honestamente como read-only, mutação ou emergência apenas por ter
outro identificador. A substituição segura exige três superfícies distintas:
identidade/RPC com grants somente de leitura para auditorias; broker/RPC
transacional autorizado para mutations; e credencial de emergência guardada
por DevOps, sem uso rotineiro. Até essas superfícies existirem, nenhum script
recebe uma nova chave administrativa direta. Validação: `--dry-run` ou smoke
read-only específico, seguido de releitura quando houver mutation.
Desabilitação: rejeitar o nome legado no código e no ambiente do operador.
Estado de todas as linhas: `PENDENTE`.

| Consumidor | Evidência | Ação/teste específico |
|---|---|---|
| `scripts/audit_data_migration_final.ts` | referência no fonte | auditoria read-only |
| `scripts/audit_mx_team_access.ts` | referência no fonte | auditoria de acesso read-only |
| `scripts/check_memberships.ts` | referência no fonte | memberships read-only |
| `scripts/check_rls.ts` | referência no fonte | matriz RLS sem bypass indevido |
| `scripts/consultoria_carregar_parametros.ts` | referência no fonte | dry-run e releitura |
| `scripts/consultoria_gerar_planejamento_estrategico.ts` | referência no fonte | sandbox e releitura |
| `scripts/consultoria_gerar_resumo_executivo.ts` | referência no fonte | sandbox e releitura |
| `scripts/consultoria_importar_fechamento_mensal.ts` | referência no fonte | dry-run, contagem e releitura |
| `scripts/consultoria_sincronizar_metricas_pmr.ts` | referência no fonte | dry-run idempotente |
| `scripts/debug_stores.ts` | referência no fonte | read-only sem PII em log |
| `scripts/debug_users.ts` | referência no fonte | read-only sem PII em log |
| `scripts/export_team_contacts.ts` | referência no fonte | export controlado sem log sensível |
| `scripts/import_checkins.mjs` | referência no fonte | dry-run e contagem |
| `scripts/import_cronograma_2026_mx.ts` | referência no fonte | dry-run e releitura |
| `scripts/import_google_forms_history.js` | referência no fonte | dry-run idempotente |
| `scripts/provision_mx_consultoria_sandbox.ts` | referência no fonte | somente sandbox |
| `scripts/provision_mx_team.ts` | referência no fonte | sandbox e releitura |
| `scripts/reconcile_google_calendar_sync.ts` | referência no fonte | reconciliação read-only |
| `scripts/reconcile_pre_cadastro_team.mjs` | referência no fonte | dry-run e releitura |
| `scripts/reconcile_stores_network.ts` | referência no fonte | dry-run e releitura |
| `scripts/recover_lost_data.ts` | referência no fonte | bloquear até backup restaurável |
| `scripts/repair_retry.ts` | referência no fonte | bloquear até backup restaurável |
| `scripts/repair_system.ts` | referência no fonte | bloquear até backup restaurável |
| `scripts/reset_admin_single.ts` | referência no fonte | autorização nominal e recuperação |
| `scripts/reset_passwords.ts` | referência no fonte | bloquear uso massivo |
| `scripts/reset_passwords_v2.ts` | referência no fonte | bloquear uso massivo |
| `scripts/reset_user_password.ts` | referência no fonte | autorização nominal e recuperação |
| `scripts/restore_all_sellers.mjs` | referência no fonte | bloquear até backup restaurável |
| `scripts/run_sql_emergency.ts` | referência no fonte | bloquear até backup restaurável |
| `scripts/seed-admins.mjs` | referência no fonte | somente sandbox |
| `scripts/seed_pmr_methodology.ts` | referência no fonte | dry-run e releitura |
| `scripts/validate_admin_master_full_e2e.mjs` | referência no fonte | E2E Admin MX |
| `scripts/validate_mx_cons_dev_rls_smoke.ts` | referência no fonte | smoke Consultor em dev |
| `scripts/validate_mx_development_full_smoke.ts` | referência no fonte | smoke completo em dev |
| `src/test/e2e-helpers/owner-auth.ts` | referência no fonte | E2E Dono sem vazar segredo |
| `src/test/e2e-helpers/supabase-admin.ts` | referência no fonte | helpers admin isolados |
| `src/test/manager-day-routine.playwright.ts` | referência no fonte | E2E Gerente |
| `src/test/owner-base44-interactions.playwright.ts` | referência no fonte | E2E Dono |
| `src/test/security/evidencias-visita.playwright.ts` | referência no fonte | RLS/evidências |

## Evidência para encerramento

- Identificadores redigidos e timestamps de criação/rotação das novas chaves.
- Resultado de validação por linha e releitura persistida onde aplicável.
- Evidência de remoção dos fallbacks e variáveis legadas.
- Evidência de desabilitação das chaves legadas no Supabase.
- Scan posterior de Git completo, branches/tags, CI artifacts/logs, Vercel logs,
  screenshots, caches e arquivos gerados.
- Registro das rotações das contas, GitHub, Supabase, Vercel e Sentry expostos.
