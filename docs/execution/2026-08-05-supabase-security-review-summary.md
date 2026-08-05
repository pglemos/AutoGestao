# SUMÁRIO DE SECURITY DEFINER — GERADO VIA SCRIPT (CONSOLIDAÇÃO)

> **ATENÇÃO:** Este arquivo consolida o estado real. A matriz completa com 204 funções está em  
> `docs/execution/2026-08-05-supabase-security-review.md`

## Estatísticas Reais do Banco (2026-08-05T09:26:24.691Z)

| Métrica | Valor Real | Fonte |
|---|---|---|
| Total SECURITY DEFINER | **204** | `pg_proc WHERE prosecdef = true` |
| Executáveis por `anon` | **60** | `has_function_privilege('anon', oid, 'EXECUTE')` |
| Executáveis por `authenticated` | **148** | `has_function_privilege('authenticated', oid, 'EXECUTE')` |
| pg_net schema | **public** | `pg_extension WHERE extname = 'pg_net'` |
| SHA de referência | `5a6090b0` | `git rev-parse HEAD` |
| Timestamp da consulta | `2026-08-05T09:26:24.691Z` | Execução real |

## Estado Atual

- **C0.5 / T10.4:** `IN_PROGRESS — 204 FUNÇÕES CATALOGADAS, 60 ANON PENDENTES DE JUSTIFICATIVA`
- **pg_net:** `ABERTO — instalado em schema public (advisor: extension_in_public)`

> Este script NÃO inventa resultados de testes. Os dados acima vieram de consultas SQL reais ao banco `fbhcmzzgwjdgkctlfvbo`.
