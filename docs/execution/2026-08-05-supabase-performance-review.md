# Supabase Performance Review — MX Gestão Preditiva (2026-08-05)

> SUPERSEDED — histórico preservado; não é evidência da release atual.
> Consulte os snapshots e o relatório atuais em `docs/execution/2026-08-09-*.md`.


## Análise de Performance do Banco de Dados (Project ID: `fbhcmzzgwjdgkctlfvbo`)

### Infraestrutura
- **PostgreSQL Version:** `17.6.1.049` (sa-east-1, São Paulo)
- **Extensões Ativas:** `pg_cron`, `pg_stat_statements`, `pgcrypto`, `supabase_vault`

### Recomendações dos Advisors de Performance
- **Foreign Keys:** Chaves estrangeiras identificadas sem cobertura de índice composto em tabelas de transação de alta volumetria (`agendamentos`, `oportunidades`, `cadencia_estado_cliente`, `atendimentos`, `carteira_missao_itens`).
- **Otimização RLS:** Políticas de RLS em tabelas centrais (`oportunidades`, `lancamentos_diarios`) utilizando subconsultas com escopo de loja/usuário para garantir isolamento multi-tenant de alto desempenho.
