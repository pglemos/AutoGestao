import { describe, expect, test } from 'bun:test'
import { PLANNING_REALTIME_TABLES } from './usePlanningRealtime'

describe('fontes Realtime de planejamento', () => {
  test('usa apenas fontes canônicas e cobre a jornada consultiva completa', () => {
    expect(PLANNING_REALTIME_TABLES.strategic).toEqual([
      'catalogo_indicadores_planejamento',
      'valores_indicadores_planejamento',
      'regras_metas_loja',
      'planos_acao',
      'historico_valores_indicadores_planejamento',
    ])
    expect(PLANNING_REALTIME_TABLES.action).toEqual([
      'planos_acao',
      'historico_planos_acao',
      'evidencias_planos_acao',
    ])
    expect(PLANNING_REALTIME_TABLES.consulting).toEqual([
      'clientes_consultoria',
      'visitas_consultoria',
      'evidencias_visita',
      'eventos_agenda_consultoria',
      'solicitacoes_consultoria',
      'consultoria_progresso_aula',
      'consultoria_itens_entrega',
      'consultoria_participantes_encontro',
      'consultoria_solicitacoes_antecipacao',
      'consultoria_historico_antecipacao',
    ])
  })
})
