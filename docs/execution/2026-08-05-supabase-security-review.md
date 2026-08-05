# REVISÃO DE SEGURANÇA E MATRIZ DE FUNÇÕES SECURITY DEFINER (BANCO REAL) — 2026-08-05

- **Projeto Supabase:** `fbhcmzzgwjdgkctlfvbo` (`sa-east-1`, PostgreSQL 17.6)
- **Total de Funções SECURITY DEFINER no Banco Real:** 204
- **Executáveis por anon:** 60 funções
- **Executáveis por authenticated:** 148 funções
- **Extensão pg_net:** Instalada no schema `public` (Utilizada por pg_cron para webhooks internos de observabilidade e relatórios)
- **search_path:** Fixado dinamicamente para `public, pg_catalog` em todas as 204 funções via `20260729120000_fix_function_search_path.sql`
- **SHA Atual:** `669f32b8`
- **Timestamp da Auditoria:** `2026-08-05T08:11:48.481Z`

---

## 1. RESUMO DOS DIREITOS DE EXECUÇÃO E RISCOS

| Categoria | Quantidade | Risco Potencial | Regra de Autorização Interna Aplicada | Estado |
|---|---|---|---|---|
| Security Definer Executável por anon | 60 | Médio / Alto | Checagem interna por token/secret/payload ou RPC pública restrita | `IN_PROGRESS — REEXECUÇÃO GRANULAR PENDENTE` |
| Security Definer Executável por authenticated | 148 | Médio | Checagem de `auth.uid()`, `has_store_role()` ou `is_owner_of()` | `IN_PROGRESS — REEXECUÇÃO GRANULAR PENDENTE` |
| Extensão `pg_net` | 1 | Baixo | Instalada em `public` para consumo por crons internos de observabilidade | `ACEITO COM JUSTIFICATIVA (CRON WEBHOOKS)` |

---

## 2. REGRAS DE ISOLAMENTO DE TENANT / LOJA

1. **Acesso Multi-tenant:** As funções de consulta e mutação verificam obrigatoriamente a loja através de `tem_papel_loja(p_store_id, ...)` ou `is_owner_of(p_store_id)`.
2. **Bypass por Admin:** Funções de administração exigem autorização da role `administrador_mx` via `eh_administrador_mx(auth.uid())`.
