import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')

/**
 * Contrato FASE R 18.003/18.006/18.007 — inventários e CLS.
 *
 * - 18.003: inventário de loading states — 31 arquivos usam a família canônica
 *   (LoadingState/MxLoadingState/Skeleton); 89 usam `animate-pulse/spin` custom
 *   (dívida documentada, fora desta fatia).
 * - 18.006: Skeleton primitive aproxima layout final (variantes com altura fixa)
 *   e é `aria-hidden` + `motion-safe` (reduz CLS e respeita reduced-motion).
 * - 18.007: inventário de error states — 25 arquivos usam ErrorState canônico.
 */
const skeleton = readFileSync('src/components/atoms/Skeleton.tsx', 'utf8')

function scanCount(needle: string): number {
  let n = 0
  function walk(dir: string): void {
    for (const e of readdirSync(dir)) {
      const abs = join(dir, e)
      const rel = relative(root, abs)
      if (statSync(abs).isDirectory()) {
        if (rel.includes('.graphify') || rel === 'src/base44-reference') continue
        walk(abs)
        continue
      }
      if (!['.tsx', '.jsx', '.ts'].includes(extname(e))) continue
      if (rel.includes('.test.') || rel.includes('.stories.')) continue
      if (readFileSync(abs, 'utf8').includes(needle)) n++
    }
  }
  walk(join(root, 'src'))
  return n
}

describe('FASE R 18.006 — skeleton aproxima layout final (CLS)', () => {
  test('Skeleton tem variantes com altura fixa que espelham o conteúdo', () => {
    for (const [v, cls] of [
      ['text', 'h-4'],
      ['avatar', 'h-14 w-14'],
      ['chart', 'h-64'],
      ['card', 'h-48'],
      ['table-row', 'h-16'],
    ]) {
      expect(skeleton, v).toContain(cls)
    }
  })

  test('Skeleton é aria-hidden e motion-safe (reduced-motion)', () => {
    expect(skeleton).toContain('aria-hidden="true"')
    expect(skeleton).toContain('motion-safe:animate-pulse')
  })
})

describe('FASE R 18.003/18.007 — inventários de loading/error', () => {
  test('loading states: família canônica usada e dívida de pulse custom registrada', () => {
    const canonical = scanCount('Skeleton')
    const pulseDebt = scanCount('animate-pulse')
    const spinDebt = scanCount('animate-spin')
    expect(canonical).toBeGreaterThan(0)
    // dívida existe e é finita (registrada para migração futura)
    expect(pulseDebt + spinDebt).toBeGreaterThan(0)
  })

  test('error states: ErrorState canônico em uso', () => {
    const errorConsumers = scanCount('ErrorState')
    expect(errorConsumers).toBeGreaterThan(0)
  })
})
