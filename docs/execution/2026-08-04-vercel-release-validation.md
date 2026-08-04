# Validação Vercel e paridade de release — 2026-08-04

Estado: `PASS_WITH_FINDINGS`
Checkout atual auditado: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` (`2026-08-04T07:12:57-03:00`).

## Proveniência preservada

- Evidência anterior do mesmo dia registrou alias público em `release=1b99c0ab...` e um READY diferente em `release=11a9465f...`.
- Nesta consolidação a divergência foi revalidada no checkout atual; a prova antiga continua histórica, não “atualizada” retroativamente.

## Revalidação atual

| Item | Evidência | Resultado |
|---|---|---|
| SHA local | `git rev-parse HEAD` | `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` |
| SHA remoto | `git ls-remote origin refs/heads/main` | `11a9465f253ce8f96052db70c9171b14425e9d4e` |
| Divergência | `git rev-list --left-right --count origin/main...main` | `0 9` |
| Alias público | `curl -sS https://mxperformance.vercel.app/api/health` | `healthy`, `release=1b99c0ab82618038fa0826557e7b8762e6247b2b` |
| READY consultado | `curl -sS https://mxperformance-kjbp4sqkc-synvolt.vercel.app/api/health` | `healthy`, `release=7387fb325dd645aaa2f832895e341c541c1f1d60` |

## Leitura permitida

- O alias público continua servindo uma release diferente do checkout atual.
- O deployment READY consultado também não corresponde ao checkout atual.
- Portanto continua sem prova de que o warning fix do Gerente esteja publicado no SHA `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451`.

## Status por subitem

| Subitem | Estado | Observação |
|---|---|---|
| Alias público responde `/api/health` | `PASS` | serviço saudável |
| READY recente consultado responde `/api/health` | `PASS` | serviço saudável |
| SHA local = SHA remoto | `PASS_WITH_FINDINGS` | divergência `0 9` |
| SHA publicado = release runtime | `PASS_WITH_FINDINGS` | mismatch continua explícito |
| Warning fix provado em produção | `IN_PROGRESS` | sem deployment comprovado do SHA atual |
