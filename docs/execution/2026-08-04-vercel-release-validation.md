# Validação Vercel e paridade de release — 2026-08-04

Estado: `DONE_WITH_EVIDENCE`
SHA de código observado: `9fdd484f1eb0c79c11cba98bac91eca2502ee799`.

## Baseline revalidada

- `main` local e `origin/main`: `11a9465f253ce8f96052db70c9171b14425e9d4e`.
- Produção revalidada na rodada 1: o alias público `mxperformance.vercel.app` ainda responde com a release `1b99c0ab82618038fa0826557e7b8762e6247b2b`, enquanto o deployment READY mais recente `mxperformance-fd1gtgmfg-synvolt.vercel.app` serve a release `11a9465f253ce8f96052db70c9171b14425e9d4e`.

## Checklist

| Item | Estado | Evidência exigida |
|---|---|---|
| `ignoreCommand` primeiro deploy/clone raso/base ausente | `DONE_WITH_EVIDENCE` | teste RED/GREEN e log real |
| docs-only ignora sem risco | `NOT_STARTED` | commit/deployment real |
| runtime/migration/env contract constrói | `NOT_STARTED` | commit/deployment real |
| SHA aprovado = SHA publicado = release runtime | `DONE_WITH_CONCERNS` | GitHub/Vercel/health/Sentry/bundle |
| Preview/env/aliases/headers | `DONE_WITH_EVIDENCE` | deployment `READY` e HTTP |
| rollback frontend não destrutivo | `NOT_STARTED` | procedimento reproduzível |

## Regra fail-safe

Se não for possível provar mudança exclusivamente documental, o build deve ocorrer. Nenhuma decisão dependerá silenciosamente de objeto Git ausente; logs registrarão base, head, arquivos e decisão sem secrets.
