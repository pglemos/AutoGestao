# Validação Vercel e paridade de release — 2026-08-04

Estado: `TESTED_PRODUCTION` *(reconciliado pós-release; health endpoint e SHA confirmados em produção; env parity completa, logs e ignore-command não revalidados; evidência histórica da divergência pré-release preservada abaixo)*

Checkout publicado: `45889a0baabda8511859be6c18205b5b4aefea1e`

Reconciliação: 2026-08-04 (controller handoff; timestamp exato indisponível; pós-push direto de `main` para produção).

## Evidência pós-release

| Item | Evidência | Resultado |
|---|---|---|
| Deployment ID | `dpl_FGLfc8essmaub3BSLv4rGNGcV2pt` | READY |
| Alias de produção | `https://mxperformance.vercel.app` | ativo |
| `/api/health` do alias | `healthy`, `release=45889a0baabda8511859be6c18205b5b4aefea1e`, `environment=production` | confirmado |
| SHA publicado = SHA local | `45889a0b...` | confirmado |

## Conclusão permitida (pós-release)

- Deployment READY com SHA exato confirmado no alias de produção.
- Health endpoint retorna `environment=production` e `release` correspondente ao SHA publicado.
- Paridade SHA local/produção estabelecida neste corte.
- Env parity completa (variáveis de ambiente do deployment), logs do deployment e ignore-command: não revalidados nesta reconciliação; gap permanece explícito.

## Evidência histórica (pré-release — supersedida)

> Bloco abaixo registra o estado antes da release, quando `main` local estava `9` commits à frente de `origin/main` e o alias público servia um SHA diferente. Mantido como proveniência histórica; não relabelado como atual.

Estado anterior: `PASS_WITH_FINDINGS`

Checkout auditado anteriormente: `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` (`2026-08-04T07:12:57-03:00`)

### Proveniência histórica preservada

- Evidência anterior do mesmo dia registrou alias público em `release=1b99c0ab...` e um READY diferente em `release=11a9465f...`.
- Nesta consolidação a divergência foi revalidada no checkout `f7c36b98`; a prova antiga continua histórica, não "atualizada" retroativamente.

### Revalidação histórica (`f7c36b98`)

| Item | Evidência | Resultado |
|---|---|---|
| SHA local | `git rev-parse HEAD` | `f7c36b98dee1f133a7bd4d4c0e5e7db9189bb451` |
| SHA remoto | `git ls-remote origin refs/heads/main` | `11a9465f253ce8f96052db70c9171b14425e9d4e` |
| Divergência | `git rev-list --left-right --count origin/main...main` | `0 9` |
| Alias público | `curl -sS https://mxperformance.vercel.app/api/health` | `healthy`, `release=1b99c0ab82618038fa0826557e7b8762e6247b2b` |
| READY consultado | `curl -sS https://mxperformance-kjbp4sqkc-synvolt.vercel.app/api/health` | `healthy`, `release=7387fb325dd645aaa2f832895e341c541c1f1d60` |

### Status histórico por subitem

| Subitem | Estado | Observação |
|---|---|---|
| Alias público responde `/api/health` | `PASS` | serviço saudável |
| READY recente consultado responde `/api/health` | `PASS` | serviço saudável |
| SHA local = SHA remoto | `PASS_WITH_FINDINGS` | divergência `0 9` |
| SHA publicado = release runtime | `PASS_WITH_FINDINGS` | mismatch explícito |
| Warning fix provado em produção | `IN_PROGRESS` | sem deployment do SHA `f7c36b98` |
