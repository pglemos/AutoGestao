import { describe, expect, it } from 'bun:test'

import {
  getProgressOptions,
  normalizeActionPlanMode,
  normalizeResponsibleValue,
} from '../components/owner/actionplan/actionPlanFormUtils.js'

describe('formulários do Plano de Ação', () => {
  it('mantém o progresso persistido disponível no select', () => {
    expect(getProgressOptions(1)).toContain(1)
    expect(getProgressOptions(1)).toEqual([...getProgressOptions(1)].sort((a, b) => a - b))
  })

  it('não usa placeholders persistidos como responsáveis selecionados', () => {
    expect(normalizeResponsibleValue('Não definido')).toBe('')
    expect(normalizeResponsibleValue('Não informado')).toBe('')
    expect(normalizeResponsibleValue('Ana Costa')).toBe('Ana Costa')
  })

  it('abre o Plano de Ação na Tabela e converte o legado list', () => {
    expect(normalizeActionPlanMode('foco')).toBe('table')
    expect(normalizeActionPlanMode('list')).toBe('table')
    expect(normalizeActionPlanMode('valor-inválido')).toBe('table')
    expect(normalizeActionPlanMode(null)).toBe('table')
  })
})
