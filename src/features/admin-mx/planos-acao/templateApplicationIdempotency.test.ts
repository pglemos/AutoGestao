import { describe, expect, test } from 'bun:test'
import { buildTemplateApplicationRows } from './templateApplicationIdempotency'

const items = [
  { id: 'item-1', departamento: 'Comercial', indicador: 'sales_total', problema: 'Conversão baixa', acao: 'Treinar equipe', como: 'Roleplay semanal', prazo_dias: 30, prioridade: 'alta', evidencia_requerida: true },
  { id: 'item-2', departamento: '', indicador: '', problema: 'Estoque parado', acao: 'Revisar precificação', como: null, prazo_dias: 15, prioridade: 'media', evidencia_requerida: false },
] as never[]

const base = {
  items,
  versionId: 'versao-1',
  requestId: 'req-1',
  userId: 'user-1',
  appliedAt: new Date('2026-03-01T12:00:00Z'),
}

describe('buildTemplateApplicationRows', () => {
  test('materializa um plano por unidade, com os itens no checklist', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA', 'filialB'] })
    expect(rows).toHaveLength(3)
    expect(new Set(rows.map(row => row.scope_id))).toEqual(new Set(['matriz', 'filialA', 'filialB']))
    expect(rows[0].checklist).toHaveLength(2)
    expect(rows[0].transition_metadata.template_item_ids).toEqual(['item-1', 'item-2'])
    expect(rows[0].transition_metadata).not.toHaveProperty('template_item_id')
  })

  test('todas as unidades compartilham o mesmo request: é uma aplicação, não N', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA'] })
    const requestIds = new Set(rows.map(row => row.transition_metadata.template_application_request_id))
    expect(requestIds).toEqual(new Set(['req-1']))
  })

  test('cada linha permanece única por unidade', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA'] })
    const chaves = rows.map(row => row.scope_id)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  test('escopo continua store, porque o enum não tem valor de cliente', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz'] })
    expect(rows.every(row => row.scope_type === 'store')).toBe(true)
  })

  test('cliente de loja única gera exatamente um plano com todos os itens', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz'], title: 'Plano Conversão' })
    expect(rows).toHaveLength(1)
    expect(rows[0].acao).toBe('Plano Conversão')
    expect(rows[0].checklist.map(item => item.titulo)).toEqual(['Treinar equipe', 'Revisar precificação'])
  })

  test('prazo é calculado a partir da data de aplicação, igual em todas as unidades', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA'] })
    expect(new Set(rows.map(row => row.prazo)).size).toBe(1)
  })

  test('campos vazios do modelo caem em rótulo padrão em vez de vazio', () => {
    const rows = buildTemplateApplicationRows({
      ...base,
      items: [items[1]],
      storeIds: ['matriz'],
    })
    expect(rows[0]?.departamento).toBe('Geral')
    expect(rows[0]?.indicador).toBe('Não definido')
  })

  test('sem unidades, nada é materializado', () => {
    expect(buildTemplateApplicationRows({ ...base, storeIds: [] })).toEqual([])
  })

  test('responsável, indicador e prazo escolhidos no wizard valem em todas as unidades', () => {
    const rows = buildTemplateApplicationRows({
      ...base,
      storeIds: ['matriz', 'filialA'],
      responsibleId: 'consultor-1',
      indicator: 'Conversão de vendas',
      deadlineDays: 45,
    })

    expect(rows.every(row => row.responsavel_id === 'consultor-1')).toBe(true)
    expect(rows.every(row => row.indicador === 'Conversão de vendas')).toBe(true)
    expect(new Set(rows.map(row => row.prazo))).toEqual(new Set(['2026-04-15']))
  })

  test('checklist ponderado soma 10000 bp', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz'] })
    const total = rows[0].checklist.reduce((sum, item) => sum + item.peso_bp, 0)
    expect(total).toBe(10000)
  })
})
