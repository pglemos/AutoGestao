# Validação Sentry — 2026-08-04

Estado: `DONE_WITH_EVIDENCE` *(reconciliado pós-release; evidência histórica `BLOCKED_EXTERNAL` preservada abaixo; source maps e evento sintético confirmados para o SHA publicado)*

Checkout publicado: `45889a0baabda8511859be6c18205b5b4aefea1e`

Reconciliação: 2026-08-04 (controller handoff; timestamp exato indisponível; pós-push direto de `main` para produção; SHA `45889a0b...` live).

## Evidência pós-release

| Item | Valor verificado |
|---|---|
| Organização Sentry | `synvolt` |
| Projeto Sentry | `mx-performance-frontend` |
| Release Sentry | `45889a0baabda8511859be6c18205b5b4aefea1e` (SHA exato) |
| Ambiente | `production` |
| Evento de prova de source map | `e62e61e0b9524078b192e0b9ec63c646` |
| Arquivos resolvidos pelo evento | `src/lib/observability/sentry.ts`, `src/lib/observability/sanitize.ts` |
| Envelope | `environment=production`, `release` exact, `synthetic_test=true`, branch e deployment metadata presentes |
| sentry-vite-plugin | build autenticado; upload aceito |
| `.map` no dist | removidos (source maps não expostos publicamente no artefato) |

## Conclusão permitida

- Source maps confirmados para o SHA publicado (`45889a0b...`).
- Evento sintético resolveu para módulos de observabilidade esperados (`sentry.ts`, `sanitize.ts`).
- Nenhuma credencial foi impressa, persistida ou rotacionada.
- Alertas, Replay e performance via Sentry não foram verificados nesta reconciliação; permanecem como gap não coberto.

## Evidência histórica (pré-release — supersedida)

> Bloco abaixo registra tentativa anterior antes da release autorizada, quando o SHA candidato era `f7c36b98...` e a autenticação Sentry estava ausente no ambiente de execução. Mantido como proveniência histórica; não relabelado como atual.

Estado anterior: `BLOCKED_EXTERNAL`

Checkout auditado anteriormente: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` (`2026-08-04T07:12:57-03:00`)

| Comando / ação | Resultado observado | Estado |
|---|---|---|
| `npx --yes @sentry/cli --version` | `sentry-cli 2.58.5` | ferramenta disponível |
| presença de `SENTRY_AUTH_TOKEN` (somente booleano) | ausente | `BLOCKED_EXTERNAL` |
| `npx --yes @sentry/cli info` | `Auth token is required` | `BLOCKED_EXTERNAL` |
| comparação de SHAs/runtime | alias `1b99c0ab...`, READY `7387fb32...`, candidato `f7c36b98...` | `IN_PROGRESS` |

Conclusão histórica: blocker era ausência de autenticação, não falta de binário. Supersedida pela evidência pós-release acima.
