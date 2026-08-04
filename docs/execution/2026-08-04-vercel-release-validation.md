# Validação Vercel e paridade de release — 2026-08-04

Estado: `PASS_WITH_FINDINGS`
Checkout atual: `9abfc70a79da46c03ee156b49933310584f85a65`

## Proveniência preservada

- Evidência anterior do mesmo dia registrou alias público em `release=1b99c0ab...` e um READY diferente em `release=11a9465f...`.
- Nesta consolidação a divergência foi revalidada no checkout atual; a prova antiga continua histórica, não “atualizada” retroativamente.

## Revalidação atual

| Item | Evidência | Resultado |
|---|---|---|
| SHA local | `git rev-parse HEAD` | `9abfc70a79da46c03ee156b49933310584f85a65` |
| SHA remoto | `git ls-remote origin refs/heads/main` | `11a9465f253ce8f96052db70c9171b14425e9d4e` |
| Divergência | `git rev-list --left-right --count origin/main...main` | `0 6` |
| Alias público | `curl -sS https://mxperformance.vercel.app/api/health` | `healthy`, `release=1b99c0ab82618038fa0826557e7b8762e6247b2b` |
| READY consultado | `curl -sS https://mxperformance-kjbp4sqkc-synvolt.vercel.app/api/health` | `healthy`, `release=7387fb325dd645aaa2f832895e341c541c1f1d60` |

## Leitura permitida

- O alias público continua servindo uma release diferente do checkout atual.
- O deployment READY consultado também não corresponde ao checkout atual.
- Portanto continua sem prova de que o warning fix do Gerente esteja publicado no SHA `9abfc70a79da46c03ee156b49933310584f85a65`.

## Status por subitem

| Subitem | Estado | Observação |
|---|---|---|
| Alias público responde `/api/health` | `PASS` | serviço saudável |
| READY recente consultado responde `/api/health` | `PASS` | serviço saudável |
| SHA local = SHA remoto | `PASS_WITH_FINDINGS` | divergência `0 6` |
| SHA publicado = release runtime | `PASS_WITH_FINDINGS` | mismatch continua explícito |
| Warning fix provado em produção | `NOT_PROVEN` | sem deployment comprovado do SHA atual |
