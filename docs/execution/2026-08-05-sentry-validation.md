# Sentry Validation — MX Gestão Preditiva (2026-08-05)

## Validação de Observabilidade Sentry
- **Pacotes:** `@sentry/react` v10.53.1, `@sentry/vite-plugin` v5.3.0
- **Release Tracking:** Vinculado ao Git SHA exato
- **Source Maps:** Enviados durante o build de produção (`vite build`) e verificados no script `assert_no_public_sourcemaps.mjs`
- **Validação Sintética:** Requer teste de disparo controlado com tag `synthetic_test=true` e verificação de desminificação no painel do Sentry.
