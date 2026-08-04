# Validação Vercel e paridade de release — 2026-08-04

Estado: `IN_PROGRESS`
SHA de código observado: `11a9465f253ce8f96052db70c9171b14425e9d4e`.

## Baseline revalidada

- `main` local e `origin/main`: `11a9465f253ce8f96052db70c9171b14425e9d4e`.
- Produção herdada do handoff: deployment `READY`, `/api/health` HTTP 200; deve ser reconsultada após qualquer runtime change.
- O runtime anterior reportado foi `1b99c0ab...`; essa diferença documental/runtime será reconciliada por endpoint, metadata e bundle antes do fechamento.

## Checklist

| Item | Estado | Evidência exigida |
|---|---|---|
| `ignoreCommand` primeiro deploy/clone raso/base ausente | `IN_PROGRESS` | teste RED/GREEN e log real |
| docs-only ignora sem risco | `NOT_STARTED` | commit/deployment real |
| runtime/migration/env contract constrói | `NOT_STARTED` | commit/deployment real |
| SHA aprovado = SHA publicado = release runtime | `IN_PROGRESS` | GitHub/Vercel/health/Sentry/bundle |
| Preview/env/aliases/headers | `NOT_STARTED` | deployment `READY` e HTTP |
| rollback frontend não destrutivo | `NOT_STARTED` | procedimento reproduzível |

## Regra fail-safe

Se não for possível provar mudança exclusivamente documental, o build deve ocorrer. Nenhuma decisão dependerá silenciosamente de objeto Git ausente; logs registrarão base, head, arquivos e decisão sem secrets.
