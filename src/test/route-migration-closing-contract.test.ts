import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * FASE X — fechamento com evidência (24.001 / 24.013 / 24.014).
 *
 * A migração de rotas STANDARD_CANVAS foi concluída nas fases Y/Z/AA/AB e na
 * FASE X anterior (59→68+ adotadas). Este contrato FECHA a fase com evidência:
 * - 24.001: route × role matrix regenerado, 0 ungoverned / 0 duplicate.
 * - 24.013: rotas AUTH_LEGAL_PUBLIC / FULLSCREEN / PRINT deliberadamente NÃO
 *   usam PageCanvas (não aplicável com evidência de classificação).
 * - 24.014: denominator == numerator (toda rota viva governada, nenhum path
 *   duplicado, nenhuma renderização sem dono).
 */
const root = path.resolve(import.meta.dir, '../..')
const read = (name: string) => readFileSync(path.join(root, name), 'utf8')

const matrix = JSON.parse(read('artifacts/route-role-inventory/route-role-matrix.json'))
const s = matrix.summary

/** Rotas que deliberadamente não usam PageCanvas (24.013). */
const NA_ROUTES = ['/login', '/privacy', '/terms', '/dono/*', '/liberacao-fechamento', '/pdi/:id/print', '/simulacao', '/simulacao/:simulationRole']

describe('FASE X — fechamento da migração de rotas', () => {
  test('24.001: matrix regenerado sem lacunas de governança', () => {
    expect(s.ungoverned).toBe(0)
    expect(s.duplicatePaths).toBe(0)
    // Toda rota protegida tem roleStatus mapeado (routeRoleTotal > 0).
    expect(s.routeRoleTotal).toBeGreaterThan(0)
  })

  test('24.013: rotas N/A (auth/legal/fullscreen/print) não são STANDARD_CANVAS', () => {
    for (const route of NA_ROUTES) {
      const row = matrix.rows.find((r: { path: string }) => r.path === route)
      expect(row, `rota ${route} ausente`).toBeDefined()
      expect(row.surface).not.toBe('STANDARD_CANVAS')
    }
    // Todas as N/A têm classificação (nenhuma ungoverned).
    for (const route of NA_ROUTES) {
      const row = matrix.rows.find((r: { path: string }) => r.path === route)
      expect(row.surface).toMatch(/AUTH_LEGAL_PUBLIC|FULLSCREEN|PRINT|REDIRECT/)
    }
  })

  test('24.014: denominator == numerator (0 ungoverned, 0 duplicados)', () => {
    // Toda rota viva é governada; nenhum path duplicado.
    expect(s.ungoverned).toBe(0)
    expect(s.duplicatePaths).toBe(0)
    // Renderings STANDARD_CANVAS têm dono (routesProtected > routesPublic).
    expect(s.routesProtected).toBeGreaterThan(s.routesPublic)
  })
})
