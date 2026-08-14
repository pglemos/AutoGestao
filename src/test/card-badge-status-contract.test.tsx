import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { Activity } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/molecules/Card'
import { StatCard } from '@/components/molecules/StatCard'
import { Badge } from '@/components/atoms/Badge'
import { StatusBadge } from '@/components/molecules/StatusBadge'

const root = resolve(import.meta.dir, '../..')

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

/** Varre `src` e devolve arquivos runtime que referenciam legados. */
function scanRuntimeImportingLegacy(): string[] {
  const hits: string[] = []
  const RUNTIME_EXT = new Set(['.ts', '.tsx', '.js', '.jsx'])
  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry)
      const rel = relative(root, abs)
      if (statSync(abs).isDirectory()) {
        if (rel.includes('.graphify') || rel === 'src/base44-reference') continue
        walk(abs)
        continue
      }
      if (!RUNTIME_EXT.has(extname(entry))) continue
      if (rel.includes('.test.') || rel.includes('.stories.') || rel.includes('ui-primitives.d.ts')) continue
      const src = readFileSync(abs, 'utf8')
      if (src.includes('@/components/ui/badge') || src.includes('@/components/ui/StatCard')) {
        hits.push(rel)
      }
    }
  }
  walk(join(root, 'src'))
  return hits
}

/**
 * Contrato FASE M — Card family canônica + Badge/StatCard semânticos (13.001-13.013).
 *
 * 1. A família Card consome tokens de geometria (radius/shadow/border/padding).
 * 2. O Badge atômico expõe os status semânticos canônicos.
 * 3. O StatusBadge mapeia success/warning/error/info/neutral/pending.
 * 4. StatCard compõe Card (mesma geometria, sem duplicar padding/radius).
 * 5. Os legados `ui/badge.jsx` e `ui/StatCard.jsx` foram eliminados (13.013).
 */
describe('contrato FASE M — Card family, Badge e StatCard', () => {
  test('CardHeader/CardContent/CardFooter usam --mx-card-padding (não p-5 cru)', () => {
    const src = read('src/components/molecules/Card.tsx')
    expect(src).toContain('var(--mx-card-padding)')
    expect(src.includes('p-5')).toBe(false)
    for (const part of ['CardHeader', 'CardContent', 'CardFooter']) {
      expect(src.includes(`const ${part} =`), part).toBe(true)
    }
  })

  test('Card root usa tokens de geometria canônica', () => {
    const html = renderToStaticMarkup(
      <Card>
        <CardHeader>Header</CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    )
    expect(html).toContain('data-mx-card=""')
    expect(html).toContain('data-mx-card-header=""')
    expect(html).toContain('data-mx-card-content=""')
    expect(html).toContain('data-mx-card-footer=""')
    expect(html).toContain('rounded-[var(--mx-card-radius)]')
    expect(html).toContain('shadow-[var(--mx-card-shadow)]')
    expect(html).toContain('border-border-subtle')
  })

  test('StatCard compõe Card e usa --mx-card-padding, sem p-5/rounded-2xl cru', () => {
    const src = read('src/components/molecules/StatCard.tsx')
    expect(src).toContain("from './Card'")
    expect(src).toContain('var(--mx-card-padding)')
    expect(src.includes('p-5')).toBe(false)
    expect(src.includes('rounded-2xl')).toBe(false)

    const html = renderToStaticMarkup(
      <StatCard label="Clientes" value="12" tone="blue" icon={<Activity />} />,
    )
    expect(html).toContain('data-mx-card=""')
  })

  test('Badge atômico expõe status semânticos success/warning/info/danger', () => {
    const src = read('src/components/atoms/Badge.tsx')
    for (const status of ['success', 'warning', 'info', 'danger']) {
      expect(src.includes(`${status}:`), status).toBe(true)
    }
    for (const status of ['success', 'warning', 'info', 'danger']) {
      const html = renderToStaticMarkup(<Badge variant={status as never}>{status}</Badge>)
      expect(html, status).toContain('bg-status-')
    }
  })

  test('StatusBadge mapeia success/warning/error/info/neutral/pending', () => {
    for (const status of ['success', 'warning', 'error', 'info', 'pending']) {
      const html = renderToStaticMarkup(<StatusBadge status={status as never} label={status} />)
      expect(html, status).toMatch(/border-status-(success|warning|error|info)/)
    }
    const neutral = renderToStaticMarkup(<StatusBadge status="neutral" label="neutral" />)
    expect(neutral).toMatch(/border-border/)
  })

  test('legados ui/badge e ui/StatCard eliminados — nenhum consumer runtime os importa', () => {
    expect(scanRuntimeImportingLegacy()).toEqual([])
  })
})
