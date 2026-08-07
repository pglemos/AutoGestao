# Supabase Performance Review — MX Gestão Preditiva (2026-08-05)

## Análise Inicial de Performance no Banco de Dados
- **PostgreSQL:** `17.6.1.049` (sa-east-1)
- **FKs sem Índice:** ~225 chaves estrangeiras sem índices cobertos.
- **`auth_rls_initplan`:** Necessidade de refatoração para evitar avaliação de RLS por linha.
- **Índices Duplicados / Não Utilizados:** Mapeamento de otimização para redução de write overhead.
- **Crons Registrados:** Verificação de tempo de execução e concorrência no `pg_cron`.
