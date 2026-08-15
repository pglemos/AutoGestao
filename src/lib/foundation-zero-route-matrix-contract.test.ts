import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { describe, expect, test } from 'bun:test'

type RouteMatrix = {
  summary: {
    routesTotal: number
    routesProtected: number
    routesPublic: number
    routeRoleTotal: number
    ungoverned: number
    duplicatePaths: number
  }
  rows: Array<{ path: string; roleStatus: Record<string, string> }>
}

const artifactPath = 'artifacts/route-role-inventory/route-role-matrix.json'

describe('Foundation Zero route × role matrix', () => {
  test('is generated from the live route audit and contains no governance gap', () => {
    execFileSync('bun', ['scripts/generate_foundation_zero_route_matrix.ts'], { stdio: 'pipe' })
    const matrix = JSON.parse(readFileSync(artifactPath, 'utf8')) as RouteMatrix
    expect(matrix.summary.routesTotal).toBe(114)
    expect(matrix.summary.routesProtected).toBe(106)
    expect(matrix.summary.routesPublic).toBe(8)
    expect(matrix.summary.routeRoleTotal).toBeGreaterThan(0)
    expect(matrix.summary.ungoverned).toBe(0)
    expect(matrix.summary.duplicatePaths).toBe(0)
  }, 30000)

  test('does not silently lose route rows or role status columns', () => {
    const matrix = JSON.parse(readFileSync(artifactPath, 'utf8')) as RouteMatrix
    expect(matrix.rows).toHaveLength(114)
    for (const row of matrix.rows) {
      expect(Object.keys(row.roleStatus)).toEqual([
        'administrador_geral',
        'administrador_mx',
        'consultor_mx',
        'dono',
        'gerente',
        'vendedor',
      ])
    }
  }, 30000)

  test('classifies direct aliases separately from standard canvas routes', () => {
    execFileSync('bun', ['scripts/generate_foundation_zero_route_matrix.ts'], { stdio: 'pipe' })
    const matrix = JSON.parse(readFileSync(artifactPath, 'utf8')) as RouteMatrix & {
      rows: Array<{
        path: string
        surface: string
        roleStatus: Record<string, string>
      }>
    }

    for (const path of ['/team', '/consultor-ia']) {
      const row = matrix.rows.find(candidate => candidate.path === path)
      expect(row?.surface).toBe('REDIRECT')
      expect(Object.values(row?.roleStatus ?? {}).some(status => status.startsWith('REDIRECT_'))).toBe(true)
    }

    // /equipe é híbrida: admin MX abre a Equipe MX; os demais perfis seguem
    // redirecionados para a equipe da loja.
    const team = matrix.rows.find(candidate => candidate.path === '/equipe')
    expect(team?.surface).toBe('STANDARD_CANVAS')
    expect(team?.roleStatus.administrador_mx).toBe('RENDER_STANDARD_CANVAS')

    expect(matrix.rows.find(row => row.path === '/dono/*')?.surface).toBe('FULLSCREEN')
    expect(matrix.rows.find(row => row.path === '/treinamentos')?.surface).toBe('STANDARD_CANVAS')
    expect(matrix.rows.find(row => row.path === '/pdi')?.surface).toBe('STANDARD_CANVAS')

    const trainings = matrix.rows.find(row => row.path === '/treinamentos')
    const pdi = matrix.rows.find(row => row.path === '/pdi')
    expect(trainings?.roleStatus.vendedor).toBe('REDIRECT_ALLOWED')
    expect(pdi?.roleStatus.vendedor).toBe('REDIRECT_ALLOWED')
    expect(Object.values(trainings?.roleStatus ?? {}).filter(status => status.startsWith('RENDER_')).length).toBeGreaterThan(0)
    expect(Object.values(pdi?.roleStatus ?? {}).filter(status => status.startsWith('RENDER_')).length).toBeGreaterThan(0)
  }, 30000)
})
