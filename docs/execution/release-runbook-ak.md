# Runbook AK 37.006-37.020 — Push, Deploy e Verificação Pós-Release

Data: 2026-08-15 · **Pronto para executar quando DS6 liberar a árvore limpa (37.001)**

> Pré-requisito: 37.001 (working tree limpa) + 37.002/004/005 já feitos.
> `FINAL_CANDIDATE_SHA = b083b6fb0c8bf63337db2d58b6a1f60307fc3cea` (atualizar se
> o freeze mudar o HEAD).

---

## 37.006 — Push normal de main para origin/main (sem force)

```bash
git push origin main
```

- **Verificar:** `git rev-parse origin/main` == `FINAL_CANDIDATE_SHA` pós-push.
- **Nunca:** `--force`, `--force-with-lease` sem necessidade, rebase em main.

## 37.007 — Tag de release no candidato

```bash
git tag v2026-08-15-final b083b6fb0c8bf63337db2d58b6a1f60307fc3cea
git push origin v2026-08-15-final
```

- Tag **annotated** (`-a -m "FASE AK final candidate"`).

## 37.008 — Confirmar GitHub main == candidato

```bash
git rev-parse origin/main | grep b083b6fb  # via gh/API
gh api repos/pglemos/MXGESTAOPREDITIVA/commits/main --jq .sha
```

- **Fail:** se divergir, PARAR — não deployar.

## 37.009 — Deploy Vercel para produção

```bash
vercel --prod --yes   # ou: vercel deploy --prod
vercel ls mxperformance --prod   # confirmar deployment mais recente
```

- **Verificar:** deployment URL == build do `FINAL_CANDIDATE_SHA` (git sha no
  build log).

## 37.010 — Health check produção

```bash
curl -s -o /dev/null -w "%{http_code}" https://www.mxperformance.com.br/login   # 200
curl -s -o /dev/null -w "%{http_code}" https://www.mxperformance.com.br/api/health.release  # 200
```

- **Verificar:** /login 200; /api/health.release 200 (release parity, 39.016).
- **Fail:** 500 em rota crítica → rollback imediato (38.003/38.004).

## 37.011 — Smoke autenticado por perfil (4 perfis)

Playwright autenticado contra produção:

```bash
npx playwright test src/test/seller-account-pages.playwright.ts      # vendedor
npx playwright test src/test/owner-base44-authenticated-visual.playwright.ts  # dono
npx playwright test src/test/manager-module.playwright.ts            # gerente
npx playwright test src/test/internal-mx-planning-pages.test.ts      # admin/consultor
```

- **Verificar:** `/home` renderiza `main#main-content` por perfil; sem console
  errors (harness `trackConsoleErrors`).

## 37.012 — Screenshots / matriz visual contra produção

```bash
E2E_BASE_URL=https://www.mxperformance.com.br npx playwright test src/test/visual-matrix-roles.playwright.ts
```

- Gera `visual-evidence/roles/{role}-{viewport}-matrix.json` + PNGs.
- **Comparar** com baseline local (31.016-019): classificar diffs intencionais
  vs regressão.

## 37.013 — E2E smoke pós-migração

```bash
npx playwright test src/test/ag-module-smokes.playwright.ts
npx playwright test src/test/navigation.playwright.ts
npx playwright test src/test/producao-aceite-fechamento.playwright.ts
```

- **Verificar:** 0 fail crítico; timeouts conhecidos reexecutados isolados.

## 37.014 — Logs Supabase delta pré/pós

```bash
supabase logs projects/fbhcmzzgwjdgkctlfvbo database --output json > logs-pos.json
cat logs-pos.json | node scripts/classify-supabase-events.mjs --run-id pos-2026-08-15-final --json > classify-pos.json
# comparar com classify-pre.json (34.001)
```

- **Verificar:** nenhuma categoria nova PRODUCTION_BUG sem justificativa.
- Requer `SUPABASE_ACCESS_TOKEN`.

## 37.015 — Web Vitals em produção

```bash
npx playwright test src/test/perf-smoke.playwright.ts   # contra E2E_BASE_URL prod
```

- **Verificar:** LCP/FCP/CLS dentro de tolerância; reportar `visual-evidence/perf/`.

## 37.016 — RLS matrix / capabilities pós-deploy

```bash
supabase db test -x supabase/tests/rls-matrix   # pgTAP no schema deployado (ou equivalente)
```

- **Verificar:** 16 arquivos pgTAP passam (clientes, lojas, vinculos_loja, grants_guard, etc.).

## 37.017 — Rollback dry-run final

```bash
node scripts/rollback-dry-run.mjs --sha b083b6fb
```

- **Verificar:** exit 0 (caminho reversível pronto). Se falhar, NÃO release.

## 37.018 — Verify db-types

```bash
npm run verify:db-types   # regenera + git diff --exit-code
```

- **Verificar:** exit 0 (types em sincronia com o schema).

## 37.019 — Review final do diff

- `docs/qa/session-diff-review.md` apontamentos: **2 migrations sem reversal
  devem ter rollbacks criados ANTES do release** (38.005).

## 37.020 — Spec coverage final

- `docs/qa/spec-coverage-audit.md`: re-rodar após fechar bloqueios:
  - FASEs I/L/U tracking (evidência existe, itens não marcados)
  - FASE AH 34.007-011 (Supabase bloqueado — sem bug confirmado)
- **Meta:** 100% dos 629 requisitos com evidência.

---

## Sequência de execução

1. **37.001** tree limpa (DS6 libera)
2. **37.006 → 37.008** push + tag + verificação (bloqueante: divergência = STOP)
3. **37.009 → 37.010** deploy + health (bloqueante: 500 = rollback)
4. **37.011 → 37.013** smokes por perfil (bloqueante: fail crítico = rollback)
5. **37.014 → 37.018** Supabase + perf + RLS + rollback dry-run + db-types
6. **37.019 → 37.020** review final + spec coverage

**Rollback a qualquer momento:** `git revert` (38.003) + `vercel rollback` (38.004)
+ reversal migrations (38.005).
