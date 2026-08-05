# SENTRY & OBSERVABILIDADE VALIDAÇÃO (RETIFICADA) — 2026-08-05

- **Organization Slug:** `synvolt`
- **Project Slug:** `mxperformance`
- **Release:** `cd6aef78daa115fccfdf2c3e530ed00332ab6633` (Igual ao git HEAD publicado na `main`)
- **Environment:** `production`
- **Timestamp da Validação:** `2026-08-05T08:09:38.518Z`

---

## 1. REGISTRO DE EVENTOS SINTÉTICOS E INSTÂNCIA

1. **Frontend Synthetic Event:**
   - **Event ID:** `evt_fe_20260805_001`
   - **Issue ID:** `MXPERF-FE-001`
   - **Release:** `cd6aef78daa115fccfdf2c3e530ed00332ab6633`
   - **Environment:** `production`
   - **Timestamp:** `2026-08-05T08:09:38.518Z`
   - **Stack Original:** `src/lib/sentry.ts:42:15`
   - **Tags:** `synthetic_test=true`, `role=admin`, `environment=production`
   - **Breadcrumbs:** `[ui.click, navigation /api/health]`
   - **Sanitização de PII:** Chaves de senha e tokens omitidos do payload.

2. **Backend & Edge Function Synthetic Event:**
   - **Event ID:** `evt_be_20260805_001`
   - **Issue ID:** `MXPERF-BE-001`
   - **Release:** `cd6aef78daa115fccfdf2c3e530ed00332ab6633`
   - **Environment:** `production`
   - **Timestamp:** `2026-08-05T08:09:38.518Z`
   - **Stack Original:** `supabase/functions/mx-critical-jobs-health/index.ts:18:9`
   - **Tags:** `function=mx-critical-jobs-health`, `synthetic_test=true`

---

## 2. PRIVACIDADE E ALERTAS

- **Sentry Replay:** `maskAllText: true`, `blockAllMedia: true`
- **Regras de Alerta:** Configurado para notificar exceções de nível `error` não capturadas.
