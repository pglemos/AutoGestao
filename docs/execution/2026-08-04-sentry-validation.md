# Validação Sentry — 2026-08-04

Estado: `BLOCKED_EXTERNAL`

Checkout atual auditado: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`

Timestamp: `2026-08-04T07:12:57-03:00`

## Alternativas executadas

| Comando / ação | Resultado observado | Estado |
|---|---|---|
| `npx --yes @sentry/cli --version` | `sentry-cli 2.58.5` | ferramenta disponível |
| presença de `SENTRY_AUTH_TOKEN` (somente booleano) | ausente | `BLOCKED_EXTERNAL` |
| `npx --yes @sentry/cli info` | `Auth token is required` | `BLOCKED_EXTERNAL` |
| comparação de SHAs/runtime | alias `1b99c0ab...`, READY `7387fb32...`, candidato `f7c36b98...` | `IN_PROGRESS` |

## Conclusão permitida

- O blocker não é mais falta de binário: a CLI foi instalada/executada.
- Sem autenticação não é possível provar org/projeto, release, source maps, eventos, alerts, Replay ou performance.
- Nenhuma credencial foi impressa, persistida ou rotacionada.
- Mesmo com autenticação, seria necessário publicar o SHA exato antes do evento sintético de release.
