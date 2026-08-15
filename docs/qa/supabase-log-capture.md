# Captura de Logs Supabase pré/pós E2E — FASE AH (34.001/34.002)

Data: 2026-08-15

## 34.001 — Logs pré-E2E (baseline)

Baseline de logs de produção capturado da triagem anterior:
`docs/audit/2026-08-10-supabase-log-triaging-and-classification.md`.

Ocorrências classificadas (baseline pré-E2E):

| # | Evento | Categoria | Status |
|---|---|---|---|
| 1 | `permission denied for table usuarios` | SECURITY_EXPECTED_DENIAL | Correto por design |
| 2 | `Não autenticado.` (RPC de segurança com auth.uid() nulo) | SECURITY_EXPECTED_DENIAL | Comportamento validado |
| 3 | `column "email" does not exist` (consulta direta a public.usuarios) | MCP_ADMIN_TRAFFIC / STALE_EVENT | Código ativo usa view autorizada |
| 4 | `invalid column for filter recipient_id` (notificacoes pré-migration) | STALE_EVENT | Consolidado na migration `20260430230000` |
| — | `statement timeout` | PRODUCTION_BUG (a investigar, 34.007) | Sem ocorrência ativa confirmada |

**Veredito 34.001:** baseline pré-E2E = 0 PRODUCTION_BUG ativos em produção
(compatível com a triagem de 2026-08-10). Nenhum evento de segurança bloqueia o
E2E.

## 34.002 — E2E com run-id identificável

A ferramenta `scripts/classify-supabase-events.mjs` agora aceita `--run-id`:

```bash
# Pré-E2E (baseline)
supabase logs --output json > logs-pre.json
cat logs-pre.json | node scripts/classify-supabase-events.mjs --run-id pre-2026-08-15-main --json > classify-pre.json

# Pós-E2E (mesmo run-id, sufixo pos)
cat logs-pos.json | node scripts/classify-supabase-events.mjs --run-id pos-2026-08-15-main --json > classify-pos.json

# Delta
node scripts/compare-supabase-runs.mjs classify-pre.json classify-pos.json
```

Cada classificação é etiquetada com `runId` + timestamp (ISO), tornando o delta
pré/pós rastreável por run e por categoria. **Fixtures E2E usam UUID reais**
(34.003) — nenhuma string inválida em coluna UUID.

## Como capturar logs (comando real)

```bash
supabase logs projects/fbhcmzzgwjdgkctlfvbo database --output json > logs-pre.json
# ... executar E2E (playwright) ...
supabase logs projects/fbhcmzzgwjdgkctlfvbo database --output json > logs-pos.json
```

> Requer `SUPABASE_ACCESS_TOKEN` (acesso real ao projeto Supabase). Quando o
> token estiver disponível no ambiente CI, executar os comandos acima e gravar
> `classify-pre/pos.json` como evidência.
