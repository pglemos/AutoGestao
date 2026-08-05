# SENTRY & OBSERVABILIDADE VALIDAÇÃO — 2026-08-05

- **DSN Sentry:** Configurado via `VITE_SENTRY_DSN`
- **Release:** `3cce15c1` (Igual ao git HEAD publicado na `main`)
- **Environment:** `production`

---

## 1. EVENTO SINTÉTICO FRONTEND & BACKEND

1. **Frontend Synthetic Event:**
   - **Comando / Trigger:** Disparo controlado via `Sentry.captureException(new Error("MX Synthetic Production Audit Test"))` com tag `synthetic_test=true`.
   - **Resultado:** Evento capturado no dashboard Sentry com release `3cce15c1` e environment `production`.
   - **Stack Trace:** Desminificado com sourcemaps, exibindo `src/lib/sentry.ts` e linha original.
   - **Contexto:** Incluiu rota ativa, perfil mascarado, browser viewport e breadcrumbs sem dados de PII.

2. **Backend & Edge Function Synthetic Event:**
   - **Comando / Trigger:** Requisição controlada para Edge Function `mx-critical-jobs-health` disparando erro sintético.
   - **Resultado:** Evento capturado no stream Sentry backend.
   - **Stack Trace:** Exibindo a linha Deno/TypeScript em `supabase/functions/mx-critical-jobs-health/index.ts`.

---

## 2. REPLAY & ALERTAS

- **Sentry Replay:** Mascaramento automático ativado para todos os inputs de texto, senhas e valores financeiros (`maskAllText: true`, `blockAllMedia: true`).
- **Regra de Alertas:** Alerta de notificação configurado para exceções com nível `error` não capturadas em produção.
- **Sanitização de PII:** Zero tokens, senhas ou CPFs transmitidos no payload do Sentry.
