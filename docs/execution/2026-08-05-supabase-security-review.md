# Supabase Security Review — MX Gestão Preditiva (2026-08-05)

> SUPERSEDED — histórico preservado; não é evidência da release atual.
> Consulte os snapshots e o relatório atuais em `docs/execution/2026-08-09-*.md`.


## Inventário Auditado de Segurança (Project ID: `fbhcmzzgwjdgkctlfvbo`)

### Tabelas e Row Level Security (RLS)
- **Total de tabelas no schema `public`:** 158 tabelas
- **Status RLS:** 100% com Row Level Security ativo (`rowsecurity = true`)
- **Tabelas de backup isoladas:** `backup_is_venda_loja_20260805` sem grants públicos, acessível exclusivamente via service_role/psql por design.

### Revisão de Funções e RPCs
- **Grants Públicos Removidos:** 0 funções executáveis pela role `anon` via PostgREST RPC
- **Distribuição de Privilégios:** 179 acessíveis por `{authenticated, service_role}`, 34 exclusivas de `{service_role}`, 17 restritas ao `{postgres}`
- **Defaults de Privilégios:** `DEFAULT PRIVILEGES` configurados para não conceder permissão pública/anônima a novas funções no schema `public`.

### Edge Functions
- **Total ativas:** 22 Edge Functions
- **Com `verify_jwt = true`:** 17 funções
- **Com autenticação customizada / rate limiting (sem JWT direto):** 5 funções auditadas (`request-password-recovery`, `store-pre-registration`, `google-oauth-handler`, `google-calendar-sync`, `google-meet-ata`).
