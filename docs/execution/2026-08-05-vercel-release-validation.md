# Vercel Release Validation — MX Gestão Preditiva (2026-08-05)

> SUPERSEDED — histórico preservado; não é evidência da release atual.
> Consulte os snapshots e o relatório atuais em `docs/execution/2026-08-09-*.md`.


## Validação de Deploy Vercel

### Configuração do Projeto
- **Projeto Vercel:** `mxperformance` (`prj_fpYjxc851kMs55GzR6tgQEr7uWUj`)
- **Team ID:** `team_9kUTSaoIkwnAVxy9nXMcAnej`
- **Deploy em Produção:** `mxperformance-dl5qtyt87-synvolt.vercel.app`
- **Status do Deployment:** `READY` / `state: READY`
- **Commit SHA Publicado:** `9429c6f77c965330baf98a2080f961d103829a3d`

### Pipeline e Build
- **Ignore Build Command:** Script `vercel-ignore-build.mjs` testado com 15/15 casos de teste para suporte a clones rasos e controle de build.
- **Headers de Segurança Produção:** CSP, HSTS, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy.
- **Health Check Endpoint:** `https://mxperformance.vercel.app/api/health` respondendo HTTP 200:
  ```json
  {
    "status": "healthy",
    "checks": {
      "vercel": "ok",
      "supabase_api": "ok",
      "database": "ok",
      "critical_crons": "unknown"
    },
    "release": "9429c6f77c965330baf98a2080f961d103829a3d",
    "environment": "production"
  }
  ```
