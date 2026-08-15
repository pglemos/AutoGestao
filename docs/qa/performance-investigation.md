# Investigação de Performance — FASE AI (35.004/35.006/35.008/35.012)

Data: 2026-08-15

## 35.004 — Crescimento do bundle (>1% mesmo abaixo do cap)

| Métrica | Referência 2026-08-12 | Atual 2026-08-15 | Delta |
|---|---|---|---|
| Total gzip | 1812.06 KB | 1825.26 KB | **+13.2 KB (+0.73%)** |
| Cap total | 1860 KB | 1860 KB | — |

- **Crescimento +0.73%** — abaixo do teto de 1%, mas digno de nota.
- Chunks perto do teto (WARN):
  - `vendor-react` 137.88 / 145 KB (95.1%)
  - `vendor-charts` 132.16 / 145 KB (91.1%)
  - `vendor-ui` 67.03 / 70 KB (95.8%)
- **Veredito**: crescimento dentro da tolerância; `vendor-react` e `vendor-ui` são os que precisam de monitoramento (próximos de 95%). Se um PR subir react ou ui kit, estourarão. Nenhuma ação imediata; registrar no PR quando `vendor-react` passar de 140 KB.

## 35.006 — Tree shaking

- Todos os imports de libs de produção são **nomeados** (tree-shakeable):
  - `lucide-react` (505 imports nomeados) — vite resolve por nome
  - `recharts` (23 arquivos, imports nomeados: `LineChart, Line, XAxis, ...`)
  - `date-fns`, `@supabase/supabase-js`, `sonner`, `motion/react` — todos nomeados
- `import * as` restantes são de **teste** (`@testing-library/jest-dom`, `typescript`, `node:fs`) ou `React` (ESM-safe) — não bloqueiam tree-shaking de produção.
- **Veredito**: tree shaking OK; nenhum barrel de lib pesada impede a eliminação de código morto.

## 35.008 — Grids grandes / render excessivo

- Grids de dados usam **keys estáveis**:
  - `DataGrid.tsx`: `key={item.id}` (L149/186), `key={\`${item.id}-${col.key}\`}` (L162)
  - 289 usos de `key={...id/code}` em grids reais
- Os 64 `key={index}` restantes são em **skeletons** (estáticos, não reordenam) e listas pequenas — aceitável.
- **Sem virtualização** (react-window/tanstack-virtual ausente). Rankings e tabelas têm volume limitado (centenas de linhas), então render excessivo não é risco imediato.
- **Veredito**: OK para o volume atual; se um ranking/tabela passar de ~500 linhas, adicionar virtualização (tanstack-virtual).

## 35.012 — Web Vitals registrados

- `src/lib/observability/web-vitals.ts` já captura **LCP, INP, CLS, FCP, TTFB** via lib `web-vitals` e reporta ao **Sentry** (tag `web_vitals.{metric}` + breadcrumb com rating).
- Inicializado em `src/main.tsx` (`initWebVitals()`).
- **Veredito**: infraestrutura presente; métricas reais fluem para o Sentry em produção.
- Complemento: `src/test/perf-smoke.playwright.ts` (FASE AI 35.011) mede LCP/FCP/CLS por rota em CI (probe de evidência).
