import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

const controller = readFileSync(new URL('./hooks/useNetworkDashboardController.ts', import.meta.url), 'utf8')
const header = readFileSync(new URL('./components/NetworkDashboardHeader.tsx', import.meta.url), 'utf8')

describe('global network dashboard realtime contract', () => {
  test('reloads the global cockpit from operational and progress changes', () => {
    for (const table of [
      'lancamentos_diarios',
      'clientes',
      'agendamentos',
      'atendimentos',
      'oportunidades',
      'vendedores_loja',
      'vinculos_loja',
      'lojas',
      'regras_metas_loja',
      'seller_routine_snapshots',
      'manager_routine_snapshots',
      'planos_acao',
    ]) {
      expect(controller).toContain(`'${table}'`)
    }
    expect(controller).toContain("channel('internal-network-dashboard-live')")
    expect(controller).toContain("setRealtimeStatus('connected')")
    expect(controller).toContain("setRealtimeStatus('degraded')")
  })

  test('shows the connection state and keeps manual refresh available', () => {
    expect(header).toContain('Tempo real ativo')
    expect(header).toContain('Atualização manual')
    expect(header).toContain('Atualizar')
  })
})
