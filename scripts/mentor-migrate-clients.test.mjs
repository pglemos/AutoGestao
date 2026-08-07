import { describe, expect, test } from 'bun:test'
import {
  isOppActive,
  mapChannelEntry,
  planMigration,
  verifyMigrationIntegrity,
} from './mentor-migrate-clients.mjs'

describe('Mentor Migrate Clients Script (TAREFA C04)', () => {
  const sampleClientes = [
    { id: 'c1', nome: 'Cliente 1', canal_origem: 'internet', loja_id: 'l1', seller_user_id: 's1' },
    { id: 'c2', nome: 'Cliente 2', canal_origem: 'showroom', loja_id: 'l1', seller_user_id: 's1' },
    { id: 'c3', nome: 'Cliente 3', canal_origem: 'carteira', loja_id: 'l2', seller_user_id: 's2' },
    { id: 'c4', nome: 'Cliente 4', canal_origem: 'sem canal', loja_id: 'l1', seller_user_id: 's1' },
    { id: 'c5', nome: 'Cliente 5', canal_origem: '(sem canal)', loja_id: 'l1', seller_user_id: 's1' },
    { id: 'c6', nome: 'Cliente 6', canal_origem: null, loja_id: 'l1', seller_user_id: 's1' },
    { id: 'c7', nome: 'Cliente 7 Sem Ativa', canal_origem: 'showroom', loja_id: 'l1', seller_user_id: 's1' },
  ]

  const sampleOportunidades = [
    {
      id: 'op1',
      cliente_id: 'c1',
      etapa: 'prospeccao',
      canal: 'internet',
      channel_entry: null,
      needs_mentor_classification: null,
      closed_at: null,
      cancelada_em: null,
      created_at: '2026-01-01T00:00:00Z',
    },
    {
      id: 'op2',
      cliente_id: 'c2',
      etapa: 'visita_agendada',
      canal: 'showroom',
      channel_entry: null,
      needs_mentor_classification: null,
      closed_at: null,
      cancelada_em: null,
      created_at: '2026-01-02T00:00:00Z',
    },
    {
      id: 'op3',
      cliente_id: 'c3',
      etapa: 'negociacao',
      canal: 'carteira',
      channel_entry: null,
      needs_mentor_classification: null,
      closed_at: null,
      cancelada_em: null,
      created_at: '2026-01-03T00:00:00Z',
    },
    {
      id: 'op4',
      cliente_id: 'c4',
      etapa: 'prospeccao',
      canal: 'sem canal',
      channel_entry: null,
      needs_mentor_classification: null,
      closed_at: null,
      cancelada_em: null,
      created_at: '2026-01-04T00:00:00Z',
    },
    {
      id: 'op5',
      cliente_id: 'c5',
      etapa: 'prospeccao',
      canal: '(sem canal)',
      channel_entry: null,
      needs_mentor_classification: null,
      closed_at: null,
      cancelada_em: null,
      created_at: '2026-01-05T00:00:00Z',
    },
    {
      id: 'op6',
      cliente_id: 'c6',
      etapa: 'prospeccao',
      canal: null,
      channel_entry: null,
      needs_mentor_classification: null,
      closed_at: null,
      cancelada_em: null,
      created_at: '2026-01-06T00:00:00Z',
    },
    {
      id: 'op7_closed',
      cliente_id: 'c7',
      etapa: 'ganho',
      canal: 'showroom',
      channel_entry: 'Porta',
      needs_mentor_classification: false,
      closed_at: '2026-01-10T00:00:00Z',
      cancelada_em: null,
      created_at: '2026-01-07T00:00:00Z',
    },
  ]

  test('1. DRY-RUN gera plano de migração sem escritas no banco ou rede', () => {
    const plan = planMigration(sampleClientes, sampleOportunidades)
    expect(plan.clientesComAtivaExistente).toBe(6)
    expect(plan.clientesSemAtivaNovaCriada).toBe(1)
    expect(plan.oppUpdates.length).toBe(6)
    expect(plan.newOpps.length).toBe(1)
  })

  test('4. Reutiliza oportunidade ativa existente e só cria nova se cliente não possuir ativa', () => {
    const plan = planMigration(sampleClientes, sampleOportunidades)

    const updatedOppIds = plan.oppUpdates.map((u) => u.id)
    expect(updatedOppIds).toContain('op1')
    expect(updatedOppIds).toContain('op2')
    expect(updatedOppIds).toContain('op3')
    expect(updatedOppIds).not.toContain('op7_closed')

    expect(plan.newOpps.length).toBe(1)
    expect(plan.newOpps[0].cliente_id).toBe('c7')
    expect(plan.newOpps[0].etapa).toBe('prospeccao')
  })

  test('5. Mantém needs_mentor_classification=true e NÃO inventa score', () => {
    const plan = planMigration(sampleClientes, sampleOportunidades)

    for (const update of plan.oppUpdates) {
      expect(update.payload.needs_mentor_classification).toBe(true)
      expect(update.payload).not.toHaveProperty('mentor_score')
    }

    for (const newOpp of plan.newOpps) {
      expect(newOpp.needs_mentor_classification).toBe(true)
      expect(newOpp).not.toHaveProperty('mentor_score')
    }
  })

  test('6. showroom -> Porta apenas em channel_entry; coluna legada canal fica intocada', () => {
    expect(mapChannelEntry('showroom')).toBe('Porta')
    expect(mapChannelEntry('porta')).toBe('Porta')
    expect(mapChannelEntry('internet')).toBe('Internet')
    expect(mapChannelEntry('carteira')).toBe('Carteira')

    const plan = planMigration(sampleClientes, sampleOportunidades)
    const op2Update = plan.oppUpdates.find((u) => u.id === 'op2')
    expect(op2Update?.payload.channel_entry).toBe('Porta')
    expect(op2Update?.payload).not.toHaveProperty('canal')
  })

  test('7. "sem canal" é tratado explicitamente, não presumido', () => {
    expect(mapChannelEntry('sem canal')).toBe('Carteira')
    expect(mapChannelEntry('(sem canal)')).toBe('Carteira')
    expect(mapChannelEntry('sem_canal')).toBe('Carteira')
    expect(mapChannelEntry('')).toBe('Carteira')
    expect(mapChannelEntry(null)).toBe('Carteira')

    const plan = planMigration(sampleClientes, sampleOportunidades)
    const op4Update = plan.oppUpdates.find((u) => u.id === 'op4')
    expect(op4Update?.payload.channel_entry).toBe('Carteira')
  })

  test('8. Idempotente: rodar duas vezes não altera nada na segunda rodada', () => {
    const nowIso = '2026-08-07T12:00:00.000Z'
    const firstPlan = planMigration(sampleClientes, sampleOportunidades, nowIso)

    const oppsStateAfterRun1 = sampleOportunidades.map((op) => {
      const update = firstPlan.oppUpdates.find((u) => u.id === op.id)
      if (update) {
        return { ...op, ...update.payload }
      }
      return op
    })

    firstPlan.newOpps.forEach((newOpp, index) => {
      oppsStateAfterRun1.push({
        ...newOpp,
        id: `created_op_${index}`,
        closed_at: null,
        cancelada_em: null,
      })
    })

    const secondPlan = planMigration(sampleClientes, oppsStateAfterRun1, nowIso)

    expect(secondPlan.clientesComAtivaExistente).toBe(7)
    expect(secondPlan.clientesSemAtivaNovaCriada).toBe(0)
    expect(secondPlan.newOpps.length).toBe(0)
    expect(secondPlan.oppUpdates.length).toBe(0)
  })

  test('2. Aborta se contagem de clientes ou oportunidades diminuir', () => {
    const res1 = verifyMigrationIntegrity(sampleClientes, sampleOportunidades, sampleClientes, sampleOportunidades)
    expect(res1.ok).toBe(true)

    const clientesLess = sampleClientes.slice(1)
    const res2 = verifyMigrationIntegrity(sampleClientes, sampleOportunidades, clientesLess, sampleOportunidades)
    expect(res2.ok).toBe(false)
    expect(res2.errors[0]).toContain('Contagem de clientes diminuiu')

    const oppsMutated = sampleOportunidades.map((o) => (o.id === 'op1' ? { ...o, id: 'op1_changed' } : o))
    const res3 = verifyMigrationIntegrity(sampleClientes, sampleOportunidades, sampleClientes, oppsMutated)
    expect(res3.ok).toBe(false)
    expect(res3.errors[0]).toContain('Oportunidade existente foi removida')
  })
})
