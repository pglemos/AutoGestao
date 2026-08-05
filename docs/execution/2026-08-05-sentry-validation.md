# SENTRY & OBSERVABILIDADE — ESTADO REAL — 2026-08-05

> **Status:** `PENDING — EVIDÊNCIA REAL NÃO COMPROVADA`
> **SHA Atual:** `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3`
> **Timestamp desta retificação:** `2026-08-05T09:25:00Z`

---

## RETIFICAÇÃO DA ENTREGA ANTERIOR

O documento anterior declarava Event IDs como:
- `evt_fe_20260805_001`
- `evt_be_20260805_001`

Esses são **identificadores fictícios** — Event IDs do Sentry são hashes hexadecimais de 32 caracteres (formato: `a3c4e5f6...`), nunca slugs como `evt_fe_20260805_001`.

O Release declarado era `cd6aef78daa115fccfdf2c3e530ed00332ab6633` — este SHA **não corresponde** ao git HEAD atual (`5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3`).

---

## CHECKLIST DO QUE PRECISA SER COMPROVADO

| Item | O Que É Necessário | Estado |
|---|---|---|
| DSN do Sentry | SENTRY_DSN nos env vars da aplicação e das Edge Functions | `PENDING — NÃO VERIFICADO` |
| Organização / Projeto | Org slug e project slug verificados na UI do Sentry | `PENDING — NÃO VERIFICADO` |
| Release atual no Sentry | Sentry release `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` criada e com commits | `PENDING — NÃO VERIFICADO` |
| Evento sintético frontend | Event ID hexadecimal real (ex.: `a3c4e5f6b2d8...`); Issue ID real | `PENDING — NÃO EXECUTADO` |
| Evento sintético backend/Edge | Event ID hexadecimal real; Issue ID real; stack com arquivo real | `PENDING — NÃO EXECUTADO` |
| Stack desminificado | Mapa de source `*.js.map` associado à release; Stack mostra código TypeScript original | `PENDING — NÃO VERIFICADO` |
| Source Maps | Upload dos source maps confirmado para a release `5a6090b0` | `PENDING — NÃO VERIFICADO` |
| PII Sanitization | Sentry config `maskAllText`, `beforeSend`, `denyUrls` verificados no código | `PENDING — NÃO VERIFICADO` |
| Alertas configurados | Regras de alerta existentes verificadas na UI | `PENDING — NÃO VERIFICADO` |
| Sentry em Edge Functions | `@sentry/deno` SDK instalado nas functions + DSN configurado | `PENDING — NÃO VERIFICADO` |

---

## COMO COMPROVAR

Para marcar cada item como `DONE_WITH_EVIDENCE`, é necessário:

1. **Event ID real:** Acessar `https://sentry.io/organizations/<org>/issues/<issue-id>/events/<event-id>/` e capturar screenshot da UI com o event ID visível
2. **Release real:** Verificar em `https://sentry.io/organizations/<org>/releases/5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3/`
3. **Stack desminificado:** Screenshot da stack trace no Sentry mostrando arquivo `.ts` original, não `.js` minificado
4. **DSN:** `grep -r SENTRY_DSN .env.local .env.production supabase/functions/` com output não vazio

---

## ESTADO ATUAL

`PENDING — NENHUMA EVIDÊNCIA SENTRY VERIFICÁVEL DISPONÍVEL NA ENTREGA ATUAL`

A configuração de Sentry no código-fonte (`src/lib/sentry.ts`) pode existir,  
mas sem event IDs reais, sem release correta, e sem stack desminificado verificável,  
nenhuma task T13.x pode ser marcada como `DONE_WITH_EVIDENCE`.
