import { describe, expect, test, afterEach } from 'bun:test'
import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import {
  MentorCarteiraSection,
  mapCarteiraOportunidadeToOpportunityData,
  buildDecisionAndFactsFromCarteiraOportunidade,
} from './MentorCarteiraSection'
import type { CarteiraOportunidade } from './OportunidadeCard'

describe('MentorCarteiraSection', () => {
  afterEach(cleanup)
  const sampleOp: CarteiraOportunidade = {
    id: 'op-123',
    cliente_id: 'cli-456',
    cliente_nome: 'Carlos Eduardo',
    cliente_telefone: '11999998888',
    cliente_whatsapp: '11999998888',
    canal: 'Carteira',
    channel_entry: 'Carteira',
    detailed_origin: 'Reativação de Carteira',
    veiculo_interesse: 'Corolla 2.0 Flex',
    placa_veiculo: 'ABC1D23',
    current_status_code: 'CAR-C01',
    status_label: 'Cadência Inicial',
    current_responsible: 'Vendedor João',
    temperature: 'Quente',
    current_objective: 'Confirmar horário da visita',
    current_next_step: 'Ligar para confirmar presença',
    next_action_at: '2026-08-07T14:00:00Z',
    current_cadence_step: 1,
    mentor_score: 95,
    mentor_score_class: 'Excelente',
    priority_index: 85,
    priority_class: 'Alta',
    potential: 'Alto',
    needs_mentor_classification: false,
    etapa: 'qualificacao',
  }

  test('mapCarteiraOportunidadeToOpportunityData mapeia os campos corretamente', () => {
    const data = mapCarteiraOportunidadeToOpportunityData(sampleOp)
    expect(data.opportunityId).toBe('op-123')
    expect(data.clientId).toBe('cli-456')
    expect(data.clientName).toBe('Carlos Eduardo')
    expect(data.statusCode).toBe('CAR-C01')
    expect(data.statusLabel).toBe('Cadência Inicial')
    expect(data.responsible).toBe('Vendedor João')
    expect(data.potential).toBe('Alto')
  })

  test('buildDecisionAndFactsFromCarteiraOportunidade mapeia decisão e fatos determinísticos', () => {
    const { decision, facts } = buildDecisionAndFactsFromCarteiraOportunidade(sampleOp)
    expect(decision.statusCode).toBe('CAR-C01')
    expect(decision.score.total).toBe(95)
    expect(decision.score.classification).toBe('Excelente')
    expect(decision.priority.index).toBe(85)
    expect(decision.priority.classification).toBe('Alta')
    expect(facts.statusCode).toBe('CAR-C01')
  })

  test('renderiza componente com estado de carregamento', () => {
    render(<MentorCarteiraSection loading={true} />)
    expect(screen.getByText('Carregando oportunidades da carteira ativa...')).not.toBeNull()
  })

  test('renderiza componente com oportunidades ativas', () => {
    render(<MentorCarteiraSection oportunidades={[sampleOp]} />)
    expect(screen.getByText('Carlos Eduardo')).not.toBeNull()
    expect(screen.getByText('Carteira Ativa')).not.toBeNull()
  })
})
