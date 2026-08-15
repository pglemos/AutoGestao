import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * FASE AI — performance e qualidade de render (35.005/35.007/35.009/35.010).
 *
 * Garantias auditáveis estaticamente (sem browser):
 *   35.005 — nenhuma abstração canônica duplica libs de terceiros (uma fonte por lib).
 *   35.007 — skeletons canônicos existem e são usados nos loading states.
 *   35.009 — motion usa a escala canônica (lint-motion) e não adiciona lib duplicada.
 *   35.010 — todas as rotas críticas são lazy (code-split).
 */
describe('FASE AI — performance estática', () => {
  test('35.005: nenhuma lib de terceiros duplicada entre fontes', () => {
    const pkg = read('package.json')
    expect(pkg).toContain('"motion"')
    expect(pkg).not.toContain('"framer-motion"')
    expect(pkg).toContain('"recharts"')
    expect(pkg).not.toContain('"chart.js"')
    expect(pkg).toContain('"@supabase/supabase-js"')
    expect(pkg).toContain('"date-fns"')
    expect(pkg).not.toContain('"dayjs"')
  })

  test('35.007: skeletons canônicos existem e loading states são usados', () => {
    for (const file of [
      'src/components/atoms/skeletons/SkeletonCard.tsx',
      'src/components/atoms/skeletons/SkeletonList.tsx',
      'src/components/atoms/skeletons/SkeletonTable.tsx',
      'src/components/atoms/skeletons/SkeletonChart.tsx',
      'src/components/atoms/skeletons/SkeletonStats.tsx',
    ]) {
      expect(read(file), `${file} deve existir`).toBeTruthy()
    }
    // fallback de lazy usa Spinner no App; páginas usam Skeleton
    const app = read('src/App.tsx')
    expect(app).toContain('Spinner')
    expect(app).toContain('fallback={<Spinner />}')
    // skeletons usados em páginas reais (CLS evitado)
    const morning = read('src/features/morning-report/LegacyMorningReportPage.tsx')
    expect(morning).toContain('Skeleton')
  })

  test('35.009: motion usa motion/react (não framer-motion) e lint-motion vigora', () => {
    const app = read('src/App.tsx')
    expect(app).not.toContain('framer-motion')
    const lintMotion = read('scripts/lint-motion.mjs')
    expect(lintMotion).toContain('DURATION_MS')
    expect(lintMotion).toContain('--mx-duration-')
    expect(lintMotion).toContain('transition: { duration')
  })

  test('35.010: todas as rotas críticas são lazy (code-split)', () => {
    const app = read('src/App.tsx')
    for (const route of ['VendedorHome', 'DashboardLoja', 'Login', 'Ranking', 'CarteiraClientes']) {
      expect(app, `${route} deve ser lazy`).toContain(`const ${route} = lazy(`)
    }
    expect(app).not.toContain("import VendedorHome from")
    expect(app).not.toContain("import DashboardLoja from")
  })

  test('35.003: budget de bundle está fixado (cap total)', () => {
    const check = read('scripts/check_bundle_size.mjs')
    expect(check).toContain('__total__')
    expect(check).toContain('process.exit(1)')
    const pkg = read('package.json')
    expect(pkg).toContain('check:bundle-size')
  })
})
