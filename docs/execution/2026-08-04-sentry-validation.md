# Validação Sentry — 2026-08-04

Estado: `IN_PROGRESS`
SHA de código observado: `11a9465f253ce8f96052db70c9171b14425e9d4e`.

## Critérios

- organização/projeto descobertos sem imprimir token;
- release e source maps correspondentes ao SHA publicado;
- evento frontend e backend controlados com `synthetic_test=true`;
- stack desminificado com arquivo/função/linha originais;
- environment, rota, perfil, loja mascarada, breadcrumbs e correlation ID;
- ausência de senha, token, CPF, telefone, conteúdo de cliente ou PII indevida;
- performance, Replay e alertas revisados conforme habilitação real;
- evento sintético removido/desabilitado se não for capacidade permanente útil.

## Ledger

| ID | Evidência | Resultado | Estado |
|---|---|---|---|
| SE-001 | destino/configuração | ainda não revalidado | `IN_PROGRESS` |
| SE-002 | release/source maps do SHA final | pendente | `NOT_STARTED` |
| SE-003 | evento frontend | pendente | `NOT_STARTED` |
| SE-004 | evento backend/Edge Function | pendente | `NOT_STARTED` |
| SE-005 | alerta, privacy e Replay/performance | pendente | `NOT_STARTED` |

Nenhum token ou link de evento será salvo neste arquivo.
