import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'bun:test'

const source = readFileSync('src/features/network-dashboard/hooks/useNetworkDashboardController.ts', 'utf8')

describe('controller do cockpit de rede', () => {
  test('preserva reconciliação single-flight e debounce', () => {
    expect(source).toContain('REALTIME_DEBOUNCE_MS = 450')
    expect(source).toContain('REALTIME_MAX_WAIT_MS = 2_000')
    expect(source).toContain('snapshotInFlight')
    expect(source).toContain('reloadQueued')
    expect(source).toContain('networkCockpitRepository.load(range)')
  })

  test('escuta planejamento, ações e consultoria', () => {
    for (const table of [
      'valores_indicadores_planejamento',
      'historico_planos_acao',
      'consultoria_progresso_aula',
      'consultoria_itens_entrega',
      'consultoria_participantes_encontro',
      'consultoria_solicitacoes_antecipacao',
    ]) expect(source).toContain(`'${table}'`)
  })
})
