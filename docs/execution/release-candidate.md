# Release Candidate — FASE AK (37.004/37.005)

Data: 2026-08-15 · Passos LOCAIS pré-push apenas

## 37.002 — Remoto verificado

- `git fetch origin main` → remoto em `3b76364e`; push realizado até `7678966e`.
- local HEAD = origin/main = `7678966ef16bd236e38d51572eed088fa1cf17f2` (0 behind, 0 ahead).

## 37.004 — FINAL_CANDIDATE_SHA

```
FINAL_CANDIDATE_SHA = 7678966ef16bd236e38d51572eed088fa1cf17f2
```

- **Commit:** `7678966e chore(inventory): regenera route-role-matrix (timestamp)`
- **FASEs entregues na janela:** B..AL (fases 100%)
- **Working tree:** LIMPA — 0 mudanças pendentes (exceto 5 ag-*.playwright.ts
  untracked segurados, aguardando GREEN do DS1); **37.001 FEITO**.

## 37.005 — Bundle do candidato final

| Bundle | Tamanho | Verificado |
|---|---|---|
| `artifacts/foundation-zero/release-backup/final-candidate-b083b6fb.bundle` (--all) | 231 MB | ✅ "complete history", sha1 |
| `artifacts/foundation-zero/release-backup/final-candidate-b083b6fb-main.bundle` (main) | 148 MB | ✅ "complete history", sha1 |

> `artifacts/foundation-zero/` é **untracked** (não vai para o repo) — bundle é
> backup local do candidato, reconstruível via `git archive`/`git clone` do bundle.

## Plano dos passos remotos (37.006–37.020) — para executar DEPOIS do freeze

| # | Passo | O que verifica | Quando |
|---|---|---|---|
| 37.001 | Working tree limpa | `git status --porcelain` vazio | após DS1/DS4 pousarem |
| 37.006 | Push do candidato | `git push origin main` (HEAD == FINAL_CANDIDATE_SHA) | freeze da árvore |
| 37.007 | Tag de release | `git tag v<data>-final` no SHA | após push |
| 37.008 | Verificar origin/main == candidato | `git rev-parse origin/main` == FINAL_CANDIDATE_SHA | pós-push |
| 37.009 | Deploy Vercel | `vercel --prod` aponta para o candidato | pós-push |
| 37.010 | Health check prod | `/home`, `/login` 200 sem console errors | pós-deploy |
| 37.011 | Golden Dono baseline | `dono-home.spec.ts` contra produção | pós-deploy |
| 37.012 | Matriz visual/DOM | `visual-matrix-roles` por role em prod | pós-deploy |
| 37.013 | E2E smoke pós-migração | `ag-module-smokes` + `manager-module` | pós-deploy |
| 37.014 | Logs Supabase delta | `classify-supabase-events --run-id` pré/pós | pós-deploy |
| 37.015 | Web Vitals | `perf-smoke` LCP/CLS em prod | pós-deploy |
| 37.016 | RLS matrix | pgTAP `rls-matrix` no schema deployado | pós-deploy |
| 37.017 | Rollback dry-run | `rollback-dry-run --sha` candidato | pré-freeze |
| 37.018 | Verify db-types | `npm run verify:db-types` (types == schema) | pré-push |
| 37.019 | Review final | `session-diff-review.md` apontamentos resolvidos | pré-freeze |
| 37.020 | Spec coverage 100% | `spec-coverage-audit.md` FASEs bloqueadas desbloqueadas | pré-freeze |

**Bloqueios conhecidos para 37.020 (100%):**
- 34.007-011 (Supabase) bloqueados por falta de bug de schema confirmado
- FASEs I/L/U dívida de tracking (evidência existe, itens não marcados)
- AK/AM são as próprias fases de release
