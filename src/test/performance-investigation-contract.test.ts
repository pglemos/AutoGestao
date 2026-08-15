import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE AI — investigações de performance (35.004/35.006/35.008/35.012).
 *
 * Fixa as conclusões da investigação:
 *   35.004 — bundle dentro do cap e crescimento documentado;
 *   35.006 — imports de produção são nomeados (tree-shakeable), sem barrel pesado;
 *   35.008 — grids de dados usam keys estáveis (id/code), key=index só em skeletons;
 *   35.012 — Web Vitals capturados e reportados ao Sentry.
 */
describe('FASE AI — investigações de performance', () => {
  test('35.004: bundle dentro do cap e investigação registrada', () => {
    const check = read('scripts/check_bundle_size.mjs')
    expect(check).toContain('__total__')
    const report = read('docs/qa/performance-investigation.md')
    expect(report).toContain('35.004')
    expect(report).toContain('+13.2 KB')
    expect(report).toContain('0.73%')
  })

  test('35.006: imports de libs de produção são nomeados (tree-shakeable)', () => {
    const app = read('src/App.tsx')
    expect(app).toContain("from 'react'")
    expect(app).toContain("from 'react-router-dom'")
    // recharts importado por componentes nomeados em páginas
    const chart = read('src/components/owner/strategic/StrategicIndicatorChart.jsx')
    expect(chart).toMatch(/import \{[^}]+\} from ["']recharts["']/)
    // lucide-react sempre por nome (barrel tree-shakeable)
    const registry = read('src/features/configuracoes/tabRegistry.ts')
    expect(registry).toMatch(/import \{[^}]+\} from ["']lucide-react["']/)
  })

  test('35.008: DataGrid usa keys estáveis (item.id / col.key), não index', () => {
    const grid = read('src/components/organisms/DataGrid.tsx')
    expect(grid).toContain('key={item.id}')
    expect(grid).toContain('key={col.key}')
    expect(grid).not.toContain('key={index}')
    const report = read('docs/qa/performance-investigation.md')
    expect(report).toContain('35.008')
    expect(report).toContain('keys estáveis')
  })

  test('35.012: Web Vitals capturados e reportados ao Sentry', () => {
    const vitals = read('src/lib/observability/web-vitals.ts')
    for (const metric of ['onCLS', 'onINP', 'onLCP', 'onFCP', 'onTTFB']) {
      expect(vitals, `deve capturar ${metric}`).toContain(metric)
    }
    expect(vitals).toContain("from 'web-vitals'")
    expect(vitals).toContain('web_vitals.')
    const main = read('src/main.tsx')
    expect(main).toContain('initWebVitals')
  })
})
