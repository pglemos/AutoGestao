# EVIDENCE LEDGER (RETIFICADO) — 2026-08-05

> **Status:** `EVIDÊNCIAS GERADAS ARTIFICIALMENTE INVALIDADAS`  
> **SHA Efetivo:** `54e62a855fbb7687e30caf8f1bc4ca214388da0d`  

---

| ID Evidência | Task | Alvo | Ambiente | Perfil | Comando / Ação | Resultado Observado | SHA | Timestamp Real | Estado |
|---|---|---|---|---|---|---|---|---|---|
| EV-C0-01 | C0.1 | StoreEditModal.tsx | Local | Admin | `npm run audit:management-design-system` | 0 violações em 339 arquivos | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `TESTED_LOCAL_ONLY` |
| EV-C0-02 | C0.2 | Contexto Dono & PR #175 | Local / GitHub | Dono | `npm test && gh pr close 175` | 1796 testes aprovados, PR 175 fechada | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `TESTED_LOCAL_ONLY` |
| EV-C0-03 | C0.3 | Módulo Dono (owner-b44) | Local | Dono | `node scripts/audit-owner-b44-graph.mjs` | 37 imports de legado ativo mapeados | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `IN_PROGRESS — 37 IMPORTS DE LEGADO ATIVO` |
| EV-C0-04 | C0.4 | RLS 8 tabelas | Supabase | DBA | `20260805120000_harden_rls_unprotected_tables.sql` | Migration criada e RLS habilitado | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `TESTED_LOCAL_ONLY` |
| EV-C0-05 | C0.5 | 204 SECURITY DEFINER | Supabase | DBA | `20260729120000_fix_function_search_path.sql` | search_path fixado | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `IN_PROGRESS — REVISÃO GRANULAR PENDENTE` |
| EV-C0-06 | C0.6 | 22 Edge Functions | Supabase | Dev | `node scripts/generate-edge-functions-matrix.mjs` | 22 Edge Functions listadas | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `IN_PROGRESS — REEXECUÇÃO REAL PENDENTE` |
| EV-C0-07 | C0.7 | Proteção Main | GitHub | Admin | `gh api repos/pglemos/MXGESTAOPREDITIVA/branches/main` | protected=true (Required checks ativos) | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `DONE_WITH_EVIDENCE` |
| EV-C0-08 | C0.8 | Limpeza 23 Branches | GitHub | Dev | `git push origin --delete <branches>` | 23 branches deletadas no remoto | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `DONE_WITH_EVIDENCE` |
| EV-C0-09 | C0.9 | Health Produção | Vercel | Público | `curl -s https://mxperformance.vercel.app/api/health` | HTTP 200 OK (status: healthy) | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `TESTED_PRODUCTION` |
| EV-C0-10 | C0.10 | Catalogação Evidências | Local | Dev | `node scripts/build-factual-execution-docs.mjs` | Ledger retificado e invalidado | `54e62a855fbb7687e30caf8f1bc4ca214388da0d` | 2026-08-05T08:10:26.119Z | `IN_PROGRESS` |
