import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { collectAdoptedMetadata } from '../../scripts/lint-adopted-route-canvas.mjs'

const metadata = readFileSync('src/design-system/page/routeLayoutMetadata.ts', 'utf8')
const ledger = JSON.parse(readFileSync('artifacts/route-role-inventory/route-role-matrix.json', 'utf8'))
const inventory = JSON.parse(readFileSync('docs/reports/layout-route-inventory.json', 'utf8'))

const adopted = collectAdoptedMetadata(metadata)

describe('paridade adopted × ledger/inventory (adopted ⊆ STANDARD_CANVAS)', () => {
  test('existem rotas adotadas registradas', () => {
    expect(adopted.length).toBeGreaterThan(0)
  })

  test('toda rota adopted:true é STANDARD_CANVAS no route-role-matrix', () => {
    const byPath = new Map<string, { surface: string }>(
      ledger.rows.map((r: { path: string; surface: string }) => [r.path, r]),
    )
    for (const entry of adopted) {
      const row = byPath.get(`/${entry.route}`)
      expect(
        row,
        `rota adotada "${entry.route}" sem linha no ledger route-role-matrix`,
      ).toBeDefined()
      expect(
        row!.surface,
        `rota adotada "${entry.route}" com surface "${row?.surface}" (esperado STANDARD_CANVAS)`,
      ).toBe('STANDARD_CANVAS')
    }
  })

  test('toda rota adopted:true consta no layout-route-inventory', () => {
    const byPath = new Map(inventory.routes.map((r: { path: string }) => [r.path, r]))
    for (const entry of adopted) {
      expect(
        byPath.get(`/${entry.route}`),
        `rota adotada "${entry.route}" ausente no docs/reports/layout-route-inventory`,
      ).toBeDefined()
    }
  })
})
