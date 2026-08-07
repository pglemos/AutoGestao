import { describe, expect, it } from 'bun:test'

import { mapCarteiraOportunidadeToOpportunityData } from './MentorCarteiraSection'
import type { CarteiraOportunidade } from './OportunidadeCard'

/**
 * Esta seção é uma camada de APRESENTAÇÃO. Ela exibe o que o motor já decidiu e
 * persistiu. Estes testes existem para impedir que ela volte a decidir por conta
 * própria — que foi exatamente o defeito encontrado na primeira versão, onde a UI
 * montava uma MentorDecision inteira, com script inventado e score 100 por padrão.
 */

const base: CarteiraOportunidade = {
  id: 'op-123',
  cliente_id: 'cli-456',
  cliente_nome: 'Carlos Eduardo',
  cliente_telefone: '11999998888',
  current_status_code: 'CAR-C01',
  status_label: 'Cliente sem contato recente',
  current_responsible: 'Vendedor',
  current_objective: 'Reabrir conversa',
  current_next_step: 'Enviar mensagem de reativação',
  potential: 'Alto',
  mentor_score: 95,
  mentor_score_class: 'Excelente',
  priority_index: 85,
  priority_class: 'Alta',
}

describe('mapeamento da oportunidade persistida', () => {
  it('repassa os campos persistidos sem recalcular nada', () => {
    const data = mapCarteiraOportunidadeToOpportunityData(base, 'loja-1', 'vend-1')
    expect(data).not.toBeNull()
    expect(data?.opportunityId).toBe('op-123')
    expect(data?.clientId).toBe('cli-456')
    expect(data?.clientName).toBe('Carlos Eduardo')
    expect(data?.statusCode).toBe('CAR-C01')
    expect(data?.statusLabel).toBe('Cliente sem contato recente')
    expect(data?.potential).toBe('Alto')
    expect(data?.priorityIndex).toBe(85)
    expect(data?.priorityClass).toBe('Alta')
  })

  it('sem status persistido não há o que executar', () => {
    const semStatus = { ...base, current_status_code: null }
    expect(mapCarteiraOportunidadeToOpportunityData(semStatus, 'loja-1', 'vend-1')).toBeNull()
  })

  it('campo ausente não vira valor de domínio inventado', () => {
    const incompleta: CarteiraOportunidade = {
      id: 'op-1',
      cliente_id: 'cli-1',
      cliente_nome: 'Sem Dados',
      current_status_code: 'CAR-C01',
    }
    const data = mapCarteiraOportunidadeToOpportunityData(incompleta, 'loja-1', 'vend-1')
    expect(data?.objective).toBe('Não informado')
    expect(data?.responsible).toBe('Não informado')
    // Campos de decisão ausentes permanecem ausentes — nunca um número otimista.
    expect(data?.priorityIndex).toBeNull()
    expect(data?.priorityClass).toBeNull()
    expect(data?.potential).toBeNull()
  })

  it('não produz script nem template de script', () => {
    const data = mapCarteiraOportunidadeToOpportunityData(base, 'loja-1', 'vend-1')
    // A UI não conhece texto comercial. O script vem do catálogo, via motor.
    expect(data?.scriptTemplate).toBeUndefined()
    expect(data?.scriptRef).toBeUndefined()
  })

  it('não carrega decisão pré-montada', () => {
    const data = mapCarteiraOportunidadeToOpportunityData(base, 'loja-1', 'vend-1')
    expect(data?.decision).toBeUndefined()
  })

  it('prefere WhatsApp ao telefone quando ambos existem', () => {
    const comWhatsapp = { ...base, cliente_whatsapp: '11911112222' }
    const data = mapCarteiraOportunidadeToOpportunityData(comWhatsapp, 'loja-1', 'vend-1')
    expect(data?.clientPhone).toBe('11911112222')
  })
})
