# Sentry Validation — MX Gestão Preditiva (2026-08-05)

> SUPERSEDED — histórico preservado; não é evidência da release atual.
> Consulte os snapshots e o relatório atuais em `docs/execution/2026-08-09-*.md`.


## Validação de Observabilidade Sentry

### Configuração e Pacotes
- **Pacotes:** `@sentry/react` v10.53.1, `@sentry/vite-plugin` v5.3.0
- **Organização Sentry:** `synvolt`
- **Projetos Ativos:**
  - `mx-performance-frontend` (ID: 4511816660680704)
  - `mx-performance-edge` (ID: 4511816660746240)
  - `mx-performance-health` (ID: 4511816660811776)

### Release Tracking
- **Release mais recente:** `9429c6f77c965330baf98a2080f961d103829a3d`
- **Associação:** Criada e vinculada ao projeto `mx-performance-frontend` via Sentry API
- **CSP:** Diretiva `connect-src` inclui `https://*.sentry.io`, `https://*.ingest.sentry.io`, `https://*.ingest.us.sentry.io`

### Proteção de Source Maps
- **Verificação:** Script `assert_no_public_sourcemaps.mjs` executado após o build de produção (`dist/`)
- **Resultado:** Nenhum `.map` público exposto no bundle estático distribuído aos usuários finais
