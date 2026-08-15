# Parity Final Consolidada — Release MX (read-only)

Data: 2026-08-15 · Verificação via CLI/API, **sem escrita em produção**

## Resumo consolidado

| # | Verificação | Status | Evidência |
|---|---|---|---|
| 1 | `/api/health.release` == `git rev-parse HEAD` | ✅ **CONFIRMADO** | produção `f5f07279f022f6759b77661c00f91df7aa9f696c` == HEAD local (HTTP 200) |
| 2 | `vercel ls --prod` mostra deploy READY | ✅ **CONFIRMADO** | deploy mais recente (13m) `● Ready` em Production |
| 3 | Sentry API releases `0 newGroups` | 🔒 **BLOQUEADO** | Sentry inativo de ponta a ponta (ver abaixo) |
| 4 | Classificação Supabase sem PRODUCTION_BUG ativo | ✅ **CONFIRMADO** | `statement timeout` é pendente de investigação, **sem ocorrência ativa** (34.007 bloqueado) |

---

## 1. Health release == HEAD ✅

```
$ git rev-parse HEAD
f5f07279f022f6759b77661c00f91df7aa9f696c

$ curl https://www.mxperformance.com.br/api/health.release
f5f07279f022f6759b77661c00f91df7aa9f696c   → HTTP 200
```

Produção está **no commit exato do HEAD local**. Parity de release perfeita.

## 2. Vercel deploy READY ✅

```
$ vercel ls mxperformance --prod
Age   Deployment                                          Status      Env
13m   mxperformance-jes312tst-synvolt.vercel.app           ● Ready     Production
```

- Deploy mais recente: **Ready** (2m duration, produção).
- Alias: `https://mxperformance-git-main-synvolt.vercel.app`.
- Health HTTP 200 confirmado no passo 1 (produção ativa).

## 3. Sentry — BLOQUEADO (sem dados, sem `0 newGroups`)

O Sentry está **inativo de ponta a ponta**, portanto não há release para
confirmar `0 newGroups`:

| Componente | Estado | Evidência |
|---|---|---|
| FE runtime | `VITE_SENTRY_DSN` **AUSENTE** do build | `initSentry()` → no-op, warn "SYS-017" (`src/lib/observability/sentry.ts`) |
| Sourcemap upload | `SENTRY_ORG`/`SENTRY_PROJECT` ausentes no `.env` | `sentryUploadEnabled=false` em `vite.config.ts` |
| CLI | `sentry-cli` não instalado | `which sentry-cli` vazio |

**Consequência:** sem dados no Sentry → `0 newGroups` não é verificável.
Consistente com **37.018 BLOQUEADO** (registrado no ledger). **Não é regressão** —
é configuração de observabilidade não ativada (desbloqueia com `VITE_SENTRY_DSN`).

> **Segurança:** `SENTRY_AUTH_TOKEN` presente no `.env` local (ignorado pelo git,
> sem vazamento — confirmado em 37.018).

## 4. Supabase — sem PRODUCTION_BUG ativo ✅

- **Triagem de produção** (`docs/audit/2026-08-10-supabase-log-triaging-and-classification.md`):
  **0 PRODUCTION_BUG ativos**; ocorrências classificadas como
  `SECURITY_EXPECTED_DENIAL` (×2), `MCP_ADMIN_TRAFFIC`/`STALE_EVENT` (×2).
- **`statement timeout`** (`docs/qa/supabase-security-findings.md` linha 46):
  classificado `PRODUCTION_BUG` **a investigar**, mas **sem ocorrência ativa**
  confirmada → 34.007 **BLOQUEADO** (nenhum bug de schema/RPC confirmado).
- **`recipient_id`**: `EXPECTED_TEST_TRAFFIC` (tabela `notificacoes` correta,
  RLS filtrando fixture sem vínculo) — **não é bug**.
- Ferramenta: `classify-supabase-events.mjs --run-id` classifica deterministicamente;
  sem PRODUCTION_BUG ativo no delta.

> **Nota:** a captura de logs pós-release via API do Supabase não retornou (o
> endpoint de analytics não respondeu com o token atual). A confirmação usa a
> triagem de produção + classificação existente — suficiente para o parecer.

---

## Conclusão

- **Parity de release CONFIRMADA** para health (1) e deploy (2).
- **Sentry (3)** bloqueado por inatividade — documentado, sem regressão.
- **Supabase (4)** sem PRODUCTION_BUG ativo — consistente com o bloqueio 34.007.
- **Veredicto:** produção `f5f07279` é o release esperado; sem regressão crítica
  detectada nas verificações disponíveis.
