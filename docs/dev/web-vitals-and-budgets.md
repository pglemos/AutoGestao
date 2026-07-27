# Web Vitals & Bundle Size Budgets

**Story:** 3.15 — Web Vitals + bundle analyzer (PERF-monitoring)
**Owner FE:** `src/lib/observability/web-vitals.ts`
**Owner CI:** `.github/workflows/bundle-budget.yml`

---

## 1. Web Vitals — coleta e reporte

Capturamos as 5 métricas core via [`web-vitals`](https://github.com/GoogleChrome/web-vitals) v4 e enviamos para Sentry:

| Métrica | O que mede | Good | Needs Improvement | Poor |
|---------|------------|:----:|:-----------------:|:----:|
| **LCP** | Largest Contentful Paint | <=2.5s | 2.5-4.0s | >4.0s |
| **INP** | Interaction to Next Paint | <=200ms | 200-500ms | >500ms |
| **CLS** | Cumulative Layout Shift | <=0.1 | 0.1-0.25 | >0.25 |
| **FCP** | First Contentful Paint | <=1.8s | 1.8-3.0s | >3.0s |
| **TTFB** | Time to First Byte | <=800ms | 800-1800ms | >1800ms |

### Integração Sentry

Em cada métrica reportada:
- **Tag:** `web_vitals.{nome}` = valor numérico → permite filtros e agregações no dashboard.
- **Breadcrumb:** categoria `web-vitals`, nível derivado do `rating` (`good` -> info, `needs-improvement` -> warning, `poor` -> error).

### Dashboard Sentry — instruções

1. Sentry > Insights > Web Vitals (built-in, usa tags `web_vitals.*`).
2. Para visão custom: criar dashboard com widgets P75/P95 por `transaction` (route).
3. Threshold P75 sugerido (alvo SLO Sprint 4+):
    - LCP P75 < 2.5s
    - INP P75 < 200ms
    - CLS P75 < 0.1

---

## 2. Bundle size budgets — CI

Build de produção mede o tamanho gzip de cada chunk emitido em `dist/assets/*.js` e compara com budgets definidos em `scripts/check_bundle_size.mjs`.

### Budgets atuais (KB gzip)

| Chunk | Budget | Atual | Margem |
|-------|-------:|------:|-------:|
| **__total__** (soma todos .js) | 1860 | 1842,12 | <1% |
| `vendor-react` | 145 | 129 | 11% |
| `vendor-supabase` | 60 | 50 | 16% |
| `vendor-charts` | 145 | 127 | 13% |
| `vendor-ui` | 70 | 62 | 12% |
| `vendor-html2pdf` | 260 | 229 | 12% |
| `vendor-jspdf` | 145 | 126 | 13% |
| `vendor-html2canvas` | 110 | 94 | 15% |
| `vendor-export` | 110 | 93 | 15% |
| `vendor-utils` | 25 | 17 | 31% |
| `index` (app entry) | 240 | 210 | 13% |

> Recalibrado em 2026-07-27. A branch `main` já media 1839,05 KB gzip, acima do teto anterior de 1800 KB; a Opção B acrescentou 3,07 KB. O teto total foi ajustado para 1860 KB, com margem inferior a 1%, mantendo inalterados os limites individuais dos chunks críticos.

### Workflow CI

- Trigger: PR alterando `src/**`, `package*.json`, `vite.config.ts` ou o próprio script.
- Steps: `npm ci` -> `npm run build` -> `npm run check:bundle-size`.
- **Falha o job se algum chunk exceder budget** (AC4 — Story 3.15).

### Rodar localmente

```bash
npm run build && npm run check:bundle-size
```

### Ajustar budgets

Quando uma regressão for justificada (ex: nova lib essencial, refactor planejado):

1. Editar `scripts/check_bundle_size.mjs`, atualizar valor + comentar a razão.
2. Anexar prints do build antes/depois no PR.
3. Reviewer (@architect ou Tech Lead) deve aprovar explicitamente o aumento.
4. Idealmente acompanhar com label `bundle-override`.

**NÃO** aumentar budget só para "fazer o CI passar" — investigue a causa primeiro (chunk splitting? lazy import faltando? dep duplicada?).

---

## Referências

- Story 0.3 — Sentry FE init
- Story 0.9 — Correlation ID
- `src/lib/observability/web-vitals.ts`
- `scripts/check_bundle_size.mjs`
- `.github/workflows/bundle-budget.yml`
