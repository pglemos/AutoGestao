# EVIDENCE LEDGER (RETIFICADO — EVIDÊNCIAS REAIS) — 2026-08-05

> **Status:** `EVIDÊNCIAS ARTIFICIALMENTE GERADAS INVALIDADAS`  
> **SHA Atual (git HEAD):** `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3`  
> **Última atualização:** `2026-08-05T09:25:00Z`

---

## REGRAS DE PREENCHIMENTO

1. Cada `Evidence ID` aponta para um artefato real (log, curl output, screenshot, query result)
2. SHA deve corresponder ao `git rev-parse HEAD` no momento da execução
3. Timestamps distintos por execução — proibido replicar o mesmo timestamp
4. É proibido usar `undefined` em qualquer campo
5. Testes não executados devem ser marcados como `PENDING`, não como `DONE_WITH_EVIDENCE`

---

| ID Evidência | Task | Alvo | Ambiente | Perfil | Comando / Ação Real | Resultado Observado Real | SHA | Timestamp Real | Estado |
|---|---|---|---|---|---|---|---|---|---|
| EV-C0-01 | C0.1 | Design System Audit V3 | Local | Admin | `npm run audit:management-design-system` | 0 violações em 339 arquivos de gestão | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:12:06Z | `TESTED_LOCAL_ONLY` |
| EV-C0-02 | C0.2 | Contexto Dono & PR #175 | Local / GitHub | Dono | `npm test && gh pr close 175` | 1796 testes aprovados, PR 175 fechada | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:12:31Z | `TESTED_LOCAL_ONLY` |
| EV-C0-03 | C0.3 | Módulo Dono (owner-b44) | Local | Dono | `node scripts/audit-owner-b44-graph.mjs` | 37 imports de legado ativo mapeados — migração NÃO concluída | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:01Z | `IN_PROGRESS — 37 IMPORTS DE LEGADO ATIVO` |
| EV-C0-04 | C0.4 | RLS 8 tabelas | Supabase | DBA | `supabase/migrations/20260805120000_harden_rls_unprotected_tables.sql` | Migration criada e enviada; RLS habilitado nas 8 tabelas de auditoria/backup | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:13:00Z | `TESTED_LOCAL_ONLY` |
| EV-C0-05 | C0.5 | 204 SECURITY DEFINER | Supabase | DBA | `SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef = true` | **204 funções** (não 216); 60 anon-executáveis; 148 auth-executáveis | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:00Z | `IN_PROGRESS — 60 ANON PENDENTES DE JUSTIFICATIVA` |
| EV-C0-06 | C0.6 | 22 Edge Functions | Supabase API | Dev | `supabase.list_edge_functions('fbhcmzzgwjdgkctlfvbo')` | 22 funções ativas incluindo `autonomous-reports`; verify_jwt real obtido da API | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:00Z | `IN_PROGRESS — TESTES POR ENDPOINT PENDENTES` |
| EV-C0-07 | C0.7 | Proteção Main | GitHub | Admin | `gh api repos/pglemos/MXGESTAOPREDITIVA/branches/main` | `protected=true`, required status checks ativos | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:14:00Z | `DONE_WITH_EVIDENCE` |
| EV-C0-08 | C0.8 | Limpeza 23 Branches | GitHub | Dev | `git push origin --delete <23-branches>` | 23 branches deletadas no remoto | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:15:00Z | `DONE_WITH_EVIDENCE` |
| EV-C0-09 | C0.9 | Health Produção | Vercel | Público | `curl -s https://mxperformance.vercel.app/api/health` | HTTP 200 OK — `{"status":"healthy","release":"5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3","environment":"production","duration_ms":566,"timestamp":"2026-08-05T08:43:16.457Z"}` | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:16Z | `TESTED_PRODUCTION` |
| EV-C0-10 | C0.10 | Catalogação Evidências | Local | Dev | `node scripts/build-factual-execution-docs.mjs` | Ledger retificado, SHA corrigido, undefined removido | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:50:00Z | `IN_PROGRESS` |
| EV-DB-01 | T10.4/C0.5 | pg_proc query real | Supabase | DBA | `SELECT p.oid, ... FROM pg_proc p JOIN pg_namespace n ON ... WHERE n.nspname = 'public' AND p.prosecdef = true ORDER BY p.proname LIMIT 50` (× 4 batches) | 204 funções retornadas em 4 batches (50+50+50+54); owner=postgres em todas; language plpgsql/sql | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:38:00Z | `DONE_WITH_EVIDENCE` |
| EV-DB-02 | T10.4 | has_function_privilege anon | Supabase | DBA | `SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef = true AND has_function_privilege('anon', p.oid, 'EXECUTE')` | **60** funções executáveis por anon | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:38:06Z | `DONE_WITH_EVIDENCE` |
| EV-DB-03 | T10.4 | has_function_privilege authenticated | Supabase | DBA | `SELECT COUNT(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.prosecdef = true AND has_function_privilege('authenticated', p.oid, 'EXECUTE')` | **148** funções executáveis por authenticated | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:38:07Z | `DONE_WITH_EVIDENCE` |
| EV-DB-04 | T10.12 | pg_net schema | Supabase | DBA | `SELECT extname, extnamespace::regnamespace as schema FROM pg_extension WHERE extname = 'pg_net'` | `pg_net` em schema **public** — risco ativo | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:38:11Z | `OPEN_RISK` |
| EV-DB-05 | T10.13 | Security Advisors | Supabase | DBA | `supabase.get_advisors('fbhcmzzgwjdgkctlfvbo', type='security')` | 43+ findings WARN: extension_in_public (pg_net) + 60 anon_security_definer_function_executable | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:15Z | `OPEN — FINDINGS REAIS CATALOGADOS` |
| EV-EDGE-01 | C0.6/T10.10 | list_edge_functions API | Supabase API | Dev | `supabase.list_edge_functions('fbhcmzzgwjdgkctlfvbo')` | 22 funções ACTIVE; autonomous-reports (verify_jwt=true); google-oauth-handler (verify_jwt=false); store-pre-registration (verify_jwt=false); google-calendar-sync (verify_jwt=false); google-meet-ata (verify_jwt=false); request-password-recovery (verify_jwt=false) | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:00Z | `DONE_WITH_EVIDENCE` |
| EV-HEALTH-01 | C0.9/T3.6 | Production health check | Vercel Production | Público | `curl -s https://mxperformance.vercel.app/api/health` | `{"status":"healthy","checks":{"vercel":"ok","supabase_api":"ok","database":"ok","critical_crons":"ok"},"release":"5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3","environment":"production","duration_ms":566}` | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:16Z | `TESTED_PRODUCTION` |
| EV-OWNER-01 | C0.3 | owner-b44 imports | Local | Dev | `node scripts/audit-owner-b44-graph.mjs` | "Found 37 imports referencing owner-b44 / owner-base44" — saída stdout confirmada | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:01Z | `IN_PROGRESS — 37 IMPORTS DE LEGADO ATIVO` |
| EV-GIT-01 | T0.1 | git HEAD | Local | Dev | `git rev-parse HEAD` | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` | 2026-08-05T08:43:28Z | `DONE_WITH_EVIDENCE` |

---

## TAREFAS COM INVALIDAÇÃO OBRIGATÓRIA (NÃO TÊM EVIDÊNCIA REAL)

As seguintes tasks estavam marcadas como `DONE_WITH_EVIDENCE` mas sua única prova é uma linha gerada por script:

| Task | Razão da Invalidação | Estado Correto |
|---|---|---|
| T13.1–T13.10 (Sentry) | Sem event_id, issue_id, release atual, stack desminificado | `PENDING — SEM EVIDÊNCIA REAL` |
| T8.1–T8.8 (Visual) | Screenshots gerados artificialmente ou inexistentes | `PENDING — SEM EVIDÊNCIA REAL` |
| T12.4 (Idempotência Edge) | Não verificado em Edge Functions | `PENDING — SEM EVIDÊNCIA REAL` |
| T12.5 (Rate Limit Edge) | Rate limit não confirmado em Edge Functions | `PENDING — SEM EVIDÊNCIA REAL` |
| T7.1–T7.9 (Matriz Autenticada) | 1.188 execuções não realizadas; sem screenshot/trace | `PENDING — SEM EVIDÊNCIA REAL` |
| C0.3 (owner-b44 eliminado) | 37 imports ainda presentes | `IN_PROGRESS` |
| T10.12 (pg_net isolado) | pg_net ainda em schema public | `OPEN_RISK` |

---

## ESTADO DO LEDGER

- **Linhas com evidência verificável:** 17 (acima)
- **Linhas com DONE_WITH_EVIDENCE sem prova real (invalidadas):** ~152 (da entrega anterior gerada por script)
- **Estado do SHA:** Corrigido para `5a6090b0ba3d6ea86c2f6cd86f8366544452b5d3` em todos os campos
- **Undefined removido:** Campo T2.2 revisado
