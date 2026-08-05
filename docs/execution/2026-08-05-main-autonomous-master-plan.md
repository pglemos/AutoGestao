# PLANO MESTRE DE EXECUÇÃO AUTÔNOMA NA MAIN — 2026-08-05

> **Projeto:** MX Gestão Preditiva / MX Performance  
> **Branch:** `main`  
> **Data-base:** 5 de agosto de 2026

## 1. OBJETIVO
Execução autônoma integral da suíte de 169 tarefas obrigatórias diretamente na branch `main`, sem worktree, sem rotação de credenciais, produzindo software corrigido, testado, publicado e validado.

## 2. FASES DE EXECUÇÃO
- **Fase 0:** Controle, Backup e Baseline (Tags, Bundles, Envs, Baseline)
- **Fase 1:** Auditoria Integral do Repositório (Arquitetura, Entrypoints, Rotas, Mocks)
- **Fase 2:** Git, PRs e Branches (Análise de branches obsoletas, PR #175)
- **Fase 3:** Pipeline Vercel e Paridade de SHA (ignoreCommand, Deployments, Rollback)
- **Fase 4:** Design System e Tokens (Eliminação de tokens legados, CI V3)
- **Fase 5:** App Shell, Containers e Safe Areas (PageCanvas canônico, Safe Areas)
- **Fase 6:** Biblioteca de Componentes (Primitives, Modais, Tabelas, Cards)
- **Fase 7:** Migração Completa de Rotas (Perfis Vendedor, Gerente, Dono, Admin, Consultor)
- **Fase 8:** UX, Responsividade e Estados (Density, Mobile, Tablet, Desktop, Empty States)
- **Fase 9:** Fluxos Funcionais e Dados (Auth, Carteira, Fechamento, Metas, PDI, Admin Lojas)
- **Fase 10:** Supabase: Inventário e Segurança (Migrations, RLS 0-policy, Security Definer, Storage, Auth, Edge Functions)
- **Fase 11:** Supabase: Performance e Confiabilidade (FKs sem índice, auth_rls_initplan, Crons, Restore)
- **Fase 12:** APIs e Integrações (RPCs, Edges, Idempotência, Timeouts, Rate Limit)
- **Fase 13:** Sentry e Observabilidade (Releases, Source Maps, Eventos Sintéticos, Alertas)
- **Fase 14:** Segurança e Dependências (Audits, Secrets, Headers CSP/HSTS)
- **Fase 15:** Acessibilidade (Axe, Teclado, Screen Readers, WCAG 2.2 AA)
- **Fase 16:** Performance (Bundle, CWV, React Renders, Network Waterfalls)
- **Fase 17:** Testes e CI (Unitários, E2E, Regressão Visual, Matrix)
- **Fase 18:** Release, Produção e Recuperação (Deploy Produção, SHA Parity, Smoke, Rollback, Relatório Final)

## 3. STATUS ATUAL
- Tag de Backup: `pre-main-autonomous-20260805-041655`
- Task C0.1: DONE (Design System audit passing 0 violations)
