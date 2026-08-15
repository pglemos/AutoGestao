# Release Candidate — FASE AK (37.004/37.005)

Data: 2026-08-15 · Passos LOCAIS pré-push apenas

## 37.002 — Remoto verificado

- `git fetch origin main` → **remoto NÃO avançou**.
- local HEAD = origin/main = `b083b6fb0c8bf63337db2d58b6a1f60307fc3cea` (0 behind, 0 ahead).

## 37.004 — FINAL_CANDIDATE_SHA

```
FINAL_CANDIDATE_SHA = b083b6fb0c8bf63337db2d58b6a1f60307fc3cea
```

- **Commit:** `b083b6fb fix(admin-mx): nome acessível nos selects do módulo`
- **Commits desde o último tag** (`pre-main-autonomous-20260809-184732`): 75
- **FASEs entregues na janela:** B..AL (22 fases 100%, 86.3% do spec total)
- **Working tree:** 131 mudanças pendentes (DS1/DS4 em voo) — **37.001 NÃO feito**
  (working tree NÃO está limpa; é esperado nesta janela).

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
