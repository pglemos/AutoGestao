import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

import { inspectRouteLayoutMetadata } from '../../scripts/lint-route-layout-metadata.mjs'

const read = (rel: string) => readFileSync(rel, 'utf8')

const app = read('src/App.tsx')
const metadata = read('src/design-system/page/routeLayoutMetadata.ts')
const ledger = JSON.parse(read('artifacts/route-role-inventory/route-role-matrix.json'))
const inventory = JSON.parse(read('docs/reports/layout-route-inventory.json'))

// Ocorrências de `path=` (mesmo padrão do gate) e conjuntos derivados.
const occurrences = [...app.matchAll(/<Route\s+path\s*=\s*(?:"([^"]+)"|'([^']+)')/g)].map((m) => m[1] ?? m[2])
const uniquePaths = new Set(occurrences)
const excluded = [...uniquePaths].filter((p) => p === '*' || p === '/' || p.endsWith('/*'))
const ledgerUnique = new Set(ledger.rows.map((r: { path: string }) => r.path))
const inventoryUnique = new Set(inventory.routes.map((r: { path: string }) => r.path))

describe('paridade dos denominadores de route inventory (sem hardcode)', () => {
  test('gate resolve exatamente as rotas não-excluídas do App.tsx', () => {
    const gate = inspectRouteLayoutMetadata(app, metadata)
    expect(gate.routeCount).toBe(uniquePaths.size - excluded.length)
  })

  test('paths únicos do ledger == paths únicos declarados no App.tsx', () => {
    expect(ledgerUnique.size).toBe(uniquePaths.size)
  })

  test('inventory (layout-route-inventory) tem os mesmos paths únicos do ledger', () => {
    expect(inventoryUnique.size).toBe(ledgerUnique.size)
    for (const p of ledgerUnique) expect(inventoryUnique.has(p)).toBe(true)
    for (const p of inventoryUnique) expect(ledgerUnique.has(p)).toBe(true)
  })

  test('inventory.routeCount é coerente com inventory.routes.length', () => {
    expect(inventory.routeCount).toBe(inventory.routes.length)
  })

  test('ledger.summary.routesTotal é coerente com rows', () => {
    expect(ledger.summary.routesTotal).toBe(ledger.rows.length)
  })

  test('único path duplicado no App.tsx é o root "/"', () => {
    const dup = occurrences.filter((p) => p === '/').length
    expect(uniquePaths.size).toBe(occurrences.length - (dup - 1))
  })
})
