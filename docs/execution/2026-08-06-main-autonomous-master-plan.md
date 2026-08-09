# Master Plan - Execução Autônoma MX Gestão Preditiva

> SUPERSEDED — histórico preservado; não é evidência da release atual.
> Consulte os snapshots e o relatório atuais em `docs/execution/2026-08-09-*.md`.

## Data: 2026-08-06 | SHA Inicial: 9b7b5374 | SHA Health Production: 8c5cfbf7

## Estado Real vs Documentado
- SHA documentado (6fd6bfa6) != SHA real (9b7b5374) - repositório evoluiu
- PR #175 já merged (fechada) - correções de tokens do StoreEditModal já aplicadas
- PRs abertas: #176 (WhatsApp log), #177 (QR log) - code health apenas
- Health production rodando SHA 8c5cfbf7 (diferente do HEAD)
- 22+ branches remotas (herdadas)

## Prioridades (baseadas no estado real)
1. P0: Backup + Arquivos de controle
2. P0: Revalidar CI/workflows no SHA atual
3. P0: Portar correções de branches não mergeadas (owner-base44, etc.)
4. P0: Supabase RLS, SECURITY DEFINER, Edge Functions
5. P1: Matriz autenticada perfil × rota
6. P1: Remover scopes legados
7. P2: Performance, branches, PRs, limpeza

## Arquivos de Controle
- `live-progress.md` - Progresso ao vivo
- `evidence-ledger.md` - Ledger de evidências
- `route-matrix.md` - Matriz de rotas
- `supabase-security-review.md` - Revisão de segurança Supabase
- `supabase-performance-review.md` - Revisão de performance Supabase
- `sentry-validation.md` - Validação Sentry
- `vercel-release-validation.md` - Validação Vercel
- `final-report.md` - Relatório final
