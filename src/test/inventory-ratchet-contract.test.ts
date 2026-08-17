import { describe, expect, test } from 'bun:test'

import {
  BASELINE,
  INCREASE_ALLOWLIST,
  collectInventoryMetrics,
  runInventoryRatchet,
} from '../../scripts/lint-inventory-ratchet.mjs'

describe('contrato AC-29.017 — inventories como ratchet (só diminuem)', () => {
  test('baseline é um snapshot não-vazio com todas as métricas chave', () => {
    expect(Object.keys(BASELINE).length).toBeGreaterThan(0)
    expect(BASELINE['route-role-matrix.routesTotal']).toBeGreaterThan(0)
    expect(BASELINE['route-role-matrix.redirectTotal']).toBeGreaterThanOrEqual(0)
    expect(BASELINE['layout-route-inventory.routeCount']).toBeGreaterThan(0)
  })

  test('coleta todas as métricas do matrix + layout inventory', () => {
    const metrics = collectInventoryMetrics()
    expect(metrics['route-role-matrix.routesTotal']).toBeGreaterThan(0)
    expect(metrics['layout-route-inventory.routeCount']).toBeGreaterThan(0)
    // Todas as métricas do baseline estão presentes no inventory atual.
    for (const key of Object.keys(BASELINE)) {
      expect(metrics[key], `métrica ausente: ${key}`).toBeDefined()
    }
  })

  test('aumento de métrica SEM justificativa viola o ratchet', () => {
    const metrics = { ...collectInventoryMetrics(), 'route-role-matrix.fullscreenTotal': 99 }
    // Simula o gate com uma métrica inflada acima do baseline.
    const problems = []
    for (const [metric, baseline] of Object.entries(BASELINE)) {
      const current = metrics[metric]
      if (current > baseline && !(metric in INCREASE_ALLOWLIST)) {
        problems.push(metric)
      }
    }
    expect(problems).toContain('route-role-matrix.fullscreenTotal')
  })

  test('queda de métrica fecha o orçamento (não viola)', () => {
    const metrics = { ...collectInventoryMetrics(), 'route-role-matrix.redirectTotal': 10 }
    const problems = []
    for (const [metric, baseline] of Object.entries(BASELINE)) {
      const current = metrics[metric]
      if (current > baseline && !(metric in INCREASE_ALLOWLIST)) problems.push(metric)
    }
    expect(problems).toEqual([])
  })

  test('integração: árvore viva dentro do ratchet (pass)', () => {
    const { problems } = runInventoryRatchet()
    expect(problems, problems.join('\n')).toEqual([])
  })

  test('INCREASE_ALLOWLIST só contém métricas com aumento real atual', () => {
    const metrics = collectInventoryMetrics()
    for (const metric of Object.keys(INCREASE_ALLOWLIST)) {
      // toHaveProperty trataria o ponto da chave como caminho aninhado.
      expect(Object.keys(BASELINE), `métrica desconhecida: ${metric}`).toContain(metric)
      expect(metrics[metric], `sem aumento real: ${metric}`).toBeGreaterThan(BASELINE[metric])
    }
  })
})
