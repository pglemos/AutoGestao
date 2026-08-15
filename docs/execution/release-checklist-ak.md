# AK 37.006-37.020 — Checklist de Execução (push → deploy → verify)

**Owner:** DS6 (quando a árvore congelar)
**Status:** PRONTO PARA EXECUTAR (2026-08-15)
**Documentos de apoio:** `docs/execution/release-runbook-ak.md` (detalhes) · `docs/execution/release-candidate.md` (SHA/bundles)

---

## Passo 0 — Pré-condições (pelo operador)

- [ ] 37.001: `git status --porcelain` **vazio** (árvore congelada)
- [ ] Confirmar `FINAL_CANDIDATE_SHA` atual: `git rev-parse HEAD` → preencher abaixo
- [ ] Confirmar remoto sincronizado: `git rev-parse origin/main` == local

```
FINAL_CANDIDATE_SHA = ______________  (preencher no freeze; ref atual = 7beed636)
```

---

## Fase A — Push e tag (37.006-008)

### 37.006 — Push normal (sem force)
- [ ] `git push origin main`
- [ ] `git rev-parse origin/main` == FINAL_CANDIDATE_SHA → **GO / NO-GO**
  - NO-GO: se divergir, PARAR — investigar antes de continuar.

### 37.007 — Tag de release
- [ ] `git tag -a v2026-08-15-final -m "FASE AK final candidate" $FINAL_CANDIDATE_SHA`
- [ ] `git push origin v2026-08-15-final`

### 37.008 — Confirmar GitHub main == candidato
- [ ] `gh api repos/pglemos/MXGESTAOPREDITIVA/commits/main --jq .sha` == FINAL_CANDIDATE_SHA

**Gate A:** push OK + tag + GitHub == candidato → **GO**

---

## Fase B — Deploy e health (37.009-010)

### 37.009 — Deploy Vercel produção
- [ ] `vercel --prod --yes`
- [ ] `vercel ls mxperformance --prod` → deployment mais recente == build do SHA
- [ ] URL produção: `https://mxperformance-dl5qtyt87-synvolt.vercel.app` (ou domínio próprio)

### 37.010 — Health check
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://www.mxperformance.com.br/login` → **200**
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://www.mxperformance.com.br/api/health.release` → **200**
- [ ] `curl -s -o /dev/null -w "%{http_code}" https://www.mxperformance.com.br/home` → **200** (com auth, redirect ok)

**Gate B:** /login 200 + /api/health.release 200 → **GO**
**Rollback se 500:** `git revert` (38.003) + `vercel rollback` (38.004)

---

## Fase C — Smokes autenticados por perfil (37.011)

- [ ] **Vendedor:** `npx playwright test src/test/seller-account-pages.playwright.ts`
- [ ] **Dono:** `npx playwright test src/test/owner-base44-authenticated-visual.playwright.ts`
- [ ] **Gerente:** `npx playwright test src/test/manager-module.playwright.ts`
- [ ] **Admin/Consultor:** `npx playwright test src/test/internal-mx-planning-pages.test.ts`

**Verificar por perfil:** `/home` renderiza `main#main-content`; 0 console errors
(harness `trackConsoleErrors`).

**Gate C:** 4 perfis OK (0 fail crítico) → **GO**

---

## Fase D — Screenshots / matriz visual (37.012)

- [ ] `E2E_BASE_URL=https://www.mxperformance.com.br npx playwright test src/test/visual-matrix-roles.playwright.ts`
- [ ] Evidência em `visual-evidence/roles/{role}-{viewport}-matrix.json` + PNGs
- [ ] **Comparar com baseline local** (31.016-019): classificar diffs intencionais vs regressão
- [ ] Golden Dono: `npx playwright test e2e/visual/dono-home.spec.ts` → 3/3

**Gate D:** diffs classificados (sem regressão crítica) → **GO**

---

## Fase E — Supabase / Sentry / perf parity (37.013-015)

### 37.013 — E2E smoke pós-migração
- [ ] `npx playwright test src/test/ag-module-smokes.playwright.ts`
- [ ] `npx playwright test src/test/navigation.playwright.ts`
- [ ] `npx playwright test src/test/producao-aceite-fechamento.playwright.ts`

### 37.014 — Logs Supabase delta
- [ ] `supabase logs projects/fbhcmzzgwjdgkctlfvbo database --output json > logs-pos.json`
- [ ] `cat logs-pos.json | node scripts/classify-supabase-events.mjs --run-id pos-2026-08-15-final --json > classify-pos.json`
- [ ] Comparar com `classify-pre.json` (34.001): **nenhuma categoria PRODUCTION_BUG nova**

### 37.015 — Web Vitals produção
- [ ] `E2E_BASE_URL=https://www.mxperformance.com.br npx playwright test src/test/perf-smoke.playwright.ts`
- [ ] LCP/FCP/CLS dentro de tolerância; evidência em `visual-evidence/perf/`

### 37.016/37.017 — RLS matrix + rollback dry-run
- [ ] `node scripts/rollback-dry-run.mjs --sha $FINAL_CANDIDATE_SHA` → **exit 0**
- [ ] RLS matrix pgTAP (schema deployado ou equivalente)

**Gate E:** Supabase sem bug novo + rollback dry-run OK + RLS OK → **GO**

---

## Fase F — Fechamento (37.018-020)

- [ ] **37.018:** `npm run verify:db-types` → exit 0 (types == schema)
- [ ] **37.019:** `docs/qa/session-diff-review.md` — apontamentos resolvidos:
  - ⚠️ **2 migrations de 2026-08-15 sem reversal** → criar rollbacks ANTES de finalizar
- [ ] **37.020:** `docs/qa/spec-coverage-audit.md` — bloquinhos documentados (34.007-011, tracking I/L/U)

**Gate F:** db-types OK + review resolvido + spec coverage documentado → **RELEASE CONCLUÍDA**

---

## Rollback a qualquer momento

```bash
git revert --no-edit HEAD          # 38.003
vercel rollback <deployment-url>   # 38.004
# se DB mudou: reversal migration (38.005)
```

**Referências:** `docs/execution/rollback-runbook.md` (38.001-008) ·
`docs/qa/spec-coverage-audit.md` (36.020) · `docs/qa/session-diff-review.md` (36.019)
