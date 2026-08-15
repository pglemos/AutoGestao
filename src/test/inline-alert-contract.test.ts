import { describe, expect, test } from 'bun:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'

const root = resolve(import.meta.dir, '../..')

/**
 * Contrato FASE Q 17.008/17.009 — alerts e banners inline canônicos.
 *
 * Alerts inline com role=alert usam o padrão de status semântico
 * (border-status-*, bg-status-*-surface, text-status-*-text) ou o
 * AlertMessage canônico — nunca o destructive cru do shadcn
 * (border-destructive/30, text-destructive, bg-destructive), que
 * não tem contraste semântico garantido.
 */
function scanRuntimeFiles(): string[] {
  const out: string[] = []
  const EXT = new Set(['.tsx', '.jsx'])
  function walk(dir: string): void {
    for (const e of readdirSync(dir)) {
      const abs = join(dir, e)
      const rel = relative(root, abs)
      if (statSync(abs).isDirectory()) {
        if (rel.includes('.graphify') || rel === 'src/base44-reference') continue
        walk(abs)
        continue
      }
      if (!EXT.has(extname(e))) continue
      if (rel.includes('.test.') || rel.includes('.stories.') || rel.includes('ErrorBoundary')) continue
      if (rel === 'src/components/ui/alert.jsx') continue // primitive shadcn legado (variante), não inline alert
      const src = readFileSync(abs, 'utf8')
      if (src.includes('role="alert"') && /(border-destructive|text-destructive|bg-destructive)/.test(src)) {
        out.push(rel)
      }
    }
  }
  walk(join(root, 'src'))
  return out
}

describe('FASE Q 17.008 — inline alerts sem destructive cru', () => {
  test('nenhum alert inline usa destructive (sem contraste semântico)', () => {
    expect(scanRuntimeFiles()).toEqual([])
  })
})
