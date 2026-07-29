# Auditoria de produção — observabilidade e infraestrutura

## 1. Identificação

| Campo | Valor |
|---|---|
| Data | 2026-07-29 (04:08–10:10 BRT) |
| Repositório | `pglemos/MXGESTAOPREDITIVA` |
| Branch de trabalho | `fix/observabilidade-producao` (PR #168) |
| Baseline no início | `0bed283d` |
| `origin/main` ao final | `393ebc5b` |
| Deployment de produção | `dpl_GyZknydEA9C83oqTYnZKr4J1wiie` (`READY`, SHA `393ebc5b`) |
| Supabase project ref | `fbhcmzzgwjdgkctlfvbo` (sa-east-1) |
| Sentry org | `synvolt` |
| Sentry projects | `mx-performance-frontend`, `mx-performance-edge`, `mx-performance-health` |

**STATUS FINAL: PARCIAL** — as correções de banco estão vivas em produção e verificadas; o deploy do frontend/API depende do merge do PR #168, e dois itens estão bloqueados por fatores externos (§9).

---

## 2. Resumo executivo

A auditoria encontrou **oito defeitos**, todos reproduzidos no ambiente real antes da correção. Os quatro primeiros formavam uma cadeia: o cron falhava, a métrica que deveria detectar isso o mascarava, a sonda de saúde reportava tudo verde, e a telemetria que sustentaria uma investigação era gravável por qualquer usuário logado.

O sintoma mais enganoso: `cron.job_run_details` reportava `succeeded` para um job que falhava em 100% das execuções, porque essa tabela registra apenas o enfileiramento do `net.http_post`, não o resultado HTTP. A falha real só aparece em `net._http_response`.

Estado anterior: cron quebrado silenciosamente, telemetria forjável, health com falso positivo, código-fonte TypeScript exposto publicamente, Edge Functions sem nenhum evento no Sentry desde a criação, IP de usuário sendo coletado.

Estado final: cron autenticado e executando automaticamente, telemetria restrita a `service_role`, health medindo a realidade, source maps removidos do output, Edge Functions reportando ao projeto correto com correlação e sem PII.

Risco residual principal: a raiz do problema de grants (`pg_default_acl`) segue ativa e reabrirá a brecha em cada objeto novo criado em `public` (§7).

---

## 3. Alterações

| Plataforma | Objeto | Alteração | Motivo | Commit/Migration |
|---|---|---|---|---|
| Supabase | cron `mx-google-meet-ata` | Header `Authorization` do Vault + `timeout_milliseconds` | 401 em toda execução | `20260729080000` |
| Supabase | Vault | Novo secret `mx-google-meet-ata-cron-secret` | segredo estava literal no SQL | — (runtime) |
| Supabase | Edge secret `MX_CRON_SECRET` | Rotacionado | idem | — (runtime) |
| Supabase | `record_system_health`, `record_cron_execution` | `REVOKE` de `authenticated`/`PUBLIC` | telemetria forjável | `20260729090000` |
| Supabase | `system_health_log`, `cron_execution_log` | `REVOKE` DML de `anon`/`authenticated` | escrita direta | `20260729090000` |
| Supabase | `mx_database_health()` | Criada | sonda sem erro nos logs | `20260729130000` |
| Supabase | `mx_critical_cron_status()` | Criada | agregação por job | `20260729110000` |
| Supabase | 28 funções de `public` | `search_path` fixado | Advisor 246→218 | `20260729120000` |
| Vercel/app | `api/health.ts` | Usa as duas RPCs novas | falso positivo | `ce8a8ab5` |
| Vercel/app | `vite.config.ts` | Glob de `filesToDeleteAfterUpload` | `.map` público | `bd264a88` |
| Vercel/app | `scripts/assert_no_public_sourcemaps.mjs` | Criado, ligado ao `build` | trava a regressão | `bd264a88` |
| Supabase | `google-meet-ata/index.ts` | `withSentry` + `captureException` | zero eventos | `bd264a88` |
| Supabase | `_shared/sentry.ts` | `delete event.user` | IP do usuário | `bd264a88` |
| Sentry | org + 3 projetos | `scrubIPAddresses: true` | **o que de fato removeu o IP** | — (config) |
| Sentry | Cron Monitor | `0 * * * *` → `45 * * * *`, margem 10 | janela nunca coincidia | — (config) |
| Sentry | Edge secret `SENTRY_RELEASE` | `8ea36206` → `393ebc5b` | release estática antiga | — (runtime) |
| GitHub | `.github/workflows/edge-functions-check.yml` | Criado | Edge Functions sem typecheck na CI | `dcaf22a4` |

---

## 4. Credenciais

Nenhum valor foi registrado, impresso ou commitado.

| Plataforma | Nome | Ambiente | Estado |
|---|---|---|---|
| Supabase Vault | `mx-service-role-key` | produção | preexistente, intacto |
| Supabase Vault | `mx-google-meet-ata-cron-secret` | produção | **criado e rotacionado** |
| Supabase Edge | `MX_CRON_SECRET` | produção | **rotacionado** (igual ao Vault) |
| Supabase Edge | `SENTRY_RELEASE` | produção | atualizado para o SHA implantado |
| Vercel | `VITE_SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | production/preview | presentes |
| Vercel | `VITE_RELEASE` | — | **ausente**; há fallback para `VERCEL_GIT_COMMIT_SHA`, que está funcionando |

### 4.1 Ação obrigatória do proprietário

Os quatro tokens (GitHub, Supabase, Vercel, Sentry) e as quatro senhas foram transmitidos em texto puro no canal de chat e **devem ser considerados comprometidos**. O token do GitHub fornecido já estava inválido (`Bad credentials`) — usei a sessão do `gh` no keychain. **Rotacione os quatro e as quatro senhas.**

---

## 5. Evidências

### 5.1 Cron `mx-google-meet-ata`

Antes — `net._http_response`, 24h:
```
status_code | n  | sample
------------+----+------------------------------------------------------------
401         | 12 | {"code":"UNAUTHORIZED_NO_AUTH_HEADER",
                   "message":"Missing authorization header"}
```
O comando não tinha `Authorization` nem `apikey` (`has_authz=false`, `has_apikey=false`).

Depois:
```
status_code: 200
content: {"success":true,"mode":"process_due","processed":10,...}
```
Execução automática às 08:30 registrada como `ok`. Nas 90 min seguintes: 6× `200`, **zero `401`**.

### 5.2 Telemetria

Antes: `authenticated` com `EXECUTE` nas duas funções SECURITY DEFINER e `INSERT/UPDATE/DELETE` nas duas tabelas.

Teste negativo (transação revertida, zero resíduo):
```
RESULTADO >> OK: negado por privilegio (permission denied for function
record_system_health) | OK: INSERT direto negado
```
Teste positivo: `mx-critical-jobs-health` → `200`, 9 linhas gravadas após o lockdown.

### 5.3 Sonda de banco

Sonda antiga, com chave anon, após o lockdown:
```
401 {"code":"42501","message":"permission denied for table system_health_log"}
```
O código implantado interpreta isso como `ok`. RPC nova: `200 true`.

### 5.4 Métrica de cron

`mx_critical_cron_age_seconds` = `max(finished_at)` sobre todos os jobs. Um cron saudável zerava a idade global; somado ao limiar de 26h, um job de 30 min podia ficar quebrado um dia inteiro sem sinal.

RPC nova, saudável e com job removido (tx revertida):
```
{"total":9,"status":"ok","degraded":0}
{"total":9,"status":"degraded","degraded":1,"worst_job":"mx-google-meet-ata"}
```

### 5.5 Source maps

`/assets/index-DXqjcYR4.js.map` → `200` em produção. Upload ao Sentry funcionava (bundle `773c2b5b`, 430 arquivos, release `393ebc5b`); o glob é que não casava. Após a correção: `[sourcemaps] ok — nenhum .map em dist/`, com upload preservado.

### 5.6 Sentry Edge

`mx-performance-edge` tinha `firstEvent: NUNCA` desde a criação. Erro sintético produziu `MX-PERFORMANCE-EDGE-1`; `firstEvent` passou a 09:40:54.

Tags do evento após todas as correções:
```
correlation_id = audit-ip-final-1785318326
release        = 393ebc5b47a8b62f6fd3dbe77716e5fa71aaac23
environment    = production
mx.edge_function = google-meet-ata
user (IP)      = (ausente)
```
Sem e-mail, token, `Bearer` ou `sbp_` no payload. Issue sintética resolvida após a verificação.

### 5.7 Cron Monitor

Check-in real com a configuração antiga:
```
status: "missed", expectedTime: "09:00", monitorConfig.schedule: "0 * * * *"
```
O job roda `45 * * * *`. Monitor corrigido.

---

## 6. Testes

| Teste | Ambiente | Resultado | Evidência |
|---|---|---|---|
| Cron autenticado | produção | PASSOU | `200`, `processed: 10` |
| Cron automático | produção | PASSOU | `ok` às 08:30; 6× `200` em 90 min |
| `authenticated` forja telemetria | produção (tx revertida) | PASSOU (negado) | `permission denied` |
| `service_role` grava telemetria | produção | PASSOU | 9 linhas |
| RPC de banco | produção | PASSOU | `200 true` |
| RPC de cron — saudável | produção | PASSOU | `status: ok` |
| RPC de cron — job parado | produção (tx revertida) | PASSOU | `degraded: 1` |
| Trigger `updated_at` pós-`search_path` | produção (tx revertida) | PASSOU | `mudou=t` |
| Erro sintético no Sentry | produção | PASSOU | `MX-PERFORMANCE-EDGE-1` |
| PII no evento | produção | PASSOU | sem IP, sem credencial |
| Source maps ausentes do output | build local | PASSOU | guard exit 0 |
| Contrato de `/api/health` | unitário | PASSOU | 11 testes novos |
| Suíte completa | local | PASSOU | 1645 testes, 0 falhas |
| Typecheck / lint | local | PASSOU | 0 erros |
| Teste funcional dos 4 perfis | — | **NÃO EXECUTADO** | §9 |

---

## 7. Advisors

| Categoria | Antes | Depois |
|---|---|---|
| Security | 246 | **218** |
| Performance | 579 | 579 |

**Corrigidos:** 28 × `function_search_path_mutable`, incluindo `get_user_agency_id()` (SECURITY DEFINER — único caso de escalação real da lista).

**Aceitos / adiados, com motivo:**

- `authenticated_security_definer_function_executable` (147) e `anon_security_definer_function_executable` (59): legado project-wide; cada função guarda `auth.uid()` internamente. Revisão exige auditoria função a função.
- `auth_leaked_password_protection` (1): **bloqueado por plano** — a API retornou `402 Payment Required`. Não ativado, conforme a regra de não contratar recurso pago sem autorização.
- `extension_in_public` (1), `public_bucket_allows_listing` (2): mexer arrisca quebrar assets públicos; exige inventário próprio.
- Performance (579): dominado por `unindexed_foreign_keys` (225) e `unused_index` (63). Índice não deve ser criado nem removido às cegas — 63 já constam como não usados.

**Risco residual mais importante:** `pg_default_acl` do owner `postgres` concede `authenticated=X` em toda **função** nova de `public` e `authenticated=arwdm` em toda **tabela** nova. Foi exatamente assim que as tabelas de telemetria nasceram abertas hoje. A remediação de 2026-07-17 tratou as tabelas então existentes, não o default. **Não alterei o default global** porque afeta toda RPC futura do produto e merece decisão própria — mas, enquanto não for tratado, cada objeto novo em `public` reabre a mesma brecha.

---

## 8. Rollback

Cada migration traz bloco `-- DOWN` executável no rodapé.

| Mudança | Como reverter |
|---|---|
| Cron | `select cron.unschedule('mx-google-meet-ata');` |
| Grants de telemetria | `grant` de volta a `authenticated` (DOWN da `20260729090000`) |
| RPCs novas | `drop function` (DOWN); exige reverter `api/health.ts` junto |
| `search_path` | `alter function ... reset search_path` (DOWN) |
| Frontend/API | promover `dpl_9BPFbBiDaUArXYPPpAKVq7Kagb1p` (SHA `b4e7da3e`) |
| Cron Monitor | restaurar `0 * * * *`, margem 15 |
| `scrubIPAddresses` | `PUT` com `false` na org e nos 3 projetos |
| Secrets rotacionados | valor anterior descartado por design; re-rotacionar se preciso |

---

## 9. Pendências

### 9.1 Merge do PR #168 — **bloqueia consistência de produção**

- **Impacto:** as migrations já estão vivas, mas o frontend implantado roda o `health.ts` antigo. Ele consulta `system_health_log`, recebe `401` e interpreta como saúde. **Neste momento `/api/health` reporta `database: ok` sem ter verificado o banco.**
- **Próximo passo:** merge do PR #168 e verificação de `/api/health` no deployment novo.
- **Responsável:** proprietário (`main` não tem branch protection; push é atribuição exclusiva de `@devops` pelas regras do projeto).

### 9.2 Teste funcional dos 4 perfis — não executado

- **Motivo:** exige digitar senhas em formulário de login, ação que não executo em nenhuma circunstância. Não é limitação de acesso — as credenciais foram fornecidas.
- **Impacto:** RLS por perfil, escopo de loja e limpeza de contexto no logout não foram validados nesta auditoria.
- **Roteiro (≈15 min):** para cada um dos quatro perfis — login, carregar as rotas principais do papel, confirmar que nenhum dado de outra loja aparece, logout e confirmar que o contexto foi limpo. Com o DevTools aberto, conferir Console sem erro e ausência de PII nos payloads.
- **Mitigação parcial já existente:** a matriz pgTAP de RLS (8×5 cenários) cobre o mesmo terreno no nível do banco.

### 9.3 Proteção de senha vazada — bloqueada por plano

- **Motivo:** `402 Payment Required`; exige plano pago do Supabase. Não ativei, conforme a regra 16 do escopo.
- **Próximo passo:** decisão comercial do proprietário.

### 9.4 `pg_default_acl` — raiz não tratada

- **Impacto:** todo objeto novo em `public` nasce com grant para `authenticated`.
- **Próximo passo:** decidir se o default vira negar-por-padrão (mais seguro, exige `grant` explícito em toda migration futura) ou se fica um teste pgTAP que falha quando um objeto novo aparece aberto.

### 9.5 Bundle budget estourado — pré-existente

- **Evidência:** `origin/main` compila exatamente os mesmos `1878.24 KB` contra teto de `1860 KB`. **Não foi introduzido por este trabalho.**
- **Próximo passo:** decidir entre recalibrar o teto ou reduzir o bundle. Não recalibrei por ser decisão de outra pessoa.

### 9.6 Checks de CI vermelhos por configuração

`Verificar drift de database.generated.ts`, `pgTAP RLS Matrix`, `Supabase Preview` e `TestSprite` dependem de secrets não configurados no repositório. Comportamento já conhecido, não relacionado a este trabalho.
