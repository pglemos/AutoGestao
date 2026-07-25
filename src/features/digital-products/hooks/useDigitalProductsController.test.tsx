import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'src/features/digital-products/hooks/useDigitalProductsController.ts'), 'utf8')

describe('digital products controller contract', () => {
  test('guards every write path and preserves form on failure', () => {
    expect(source.match(/guardManage\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(source).toContain('finally {\n      setSaving(false)')
    expect(source).not.toContain('setShowForm(false)\n      } catch')
  })

  test('uses confirmation for archive and default catalog creation', () => {
    expect(source).toContain("key: `archive-product:${product.id}`")
    expect(source).toContain("key: 'create-default-products'")
  })
})
