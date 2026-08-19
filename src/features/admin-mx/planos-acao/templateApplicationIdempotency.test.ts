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
  test('materializa os itens em cada unidade do cliente', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA', 'filialB'] })
    expect(rows).toHaveLength(6)
    expect(new Set(rows.map(row => row.scope_id))).toEqual(new Set(['matriz', 'filialA', 'filialB']))
    expect(rows.filter(row => row.scope_id === 'filialA')).toHaveLength(2)
  })

  test('todas as unidades compartilham o mesmo request: é uma aplicação, não N', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA'] })
    const requestIds = new Set(rows.map(row => row.transition_metadata.template_application_request_id))
    expect(requestIds).toEqual(new Set(['req-1']))
  })

  test('cada linha permanece única por unidade e item', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA'] })
    const chaves = rows.map(row => `${row.scope_id}|${row.transition_metadata.template_item_id}`)
    expect(new Set(chaves).size).toBe(chaves.length)
  })

  test('escopo continua store, porque o enum não tem valor de cliente', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz'] })
    expect(rows.every(row => row.scope_type === 'store')).toBe(true)
  })

  test('cliente de loja única gera exatamente os itens do modelo', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz'] })
    expect(rows).toHaveLength(2)
  })

  test('prazo é calculado a partir da data de aplicação, igual em todas as unidades', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz', 'filialA'] })
    const porItem = rows.filter(row => row.transition_metadata.template_item_id === 'item-1')
    expect(new Set(porItem.map(row => row.prazo)).size).toBe(1)
  })

  test('campos vazios do modelo caem em rótulo padrão em vez de vazio', () => {
    const rows = buildTemplateApplicationRows({ ...base, storeIds: ['matriz'] })
    const semDepartamento = rows.find(row => row.transition_metadata.template_item_id === 'item-2')
    expect(semDepartamento?.departamento).toBe('Geral')
    expect(semDepartamento?.indicador).toBe('Não definido')
  })

  test('sem unidades, nada é materializado', () => {
    expect(buildTemplateApplicationRows({ ...base, storeIds: [] })).toEqual([])
  })
})
