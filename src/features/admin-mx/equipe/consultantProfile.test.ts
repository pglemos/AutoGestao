import { describe, expect, test } from 'bun:test'
import {
  canBeScheduled,
  emptyConsultantProfile,
  resolveEncounterScope,
  summarizeCapacity,
  validateConsultantProfile,
  type ProductQualification,
} from './consultantProfile'

function qualification(overrides: Partial<ProductQualification> = {}): ProductQualification {
  return { program_key: 'pmr_7', name: 'PMR 7', total_visits: 7, enabled: true, encounters: [], ...overrides }
}

describe('perfil do consultor', () => {
  test('perfil padrão é válido', () => {
    expect(validateConsultantProfile(emptyConsultantProfile('user-1'))).toBeNull()
  })

  test('recusa papel e situação fora do CHECK do banco', () => {
    const base = emptyConsultantProfile('user-1')
    expect(validateConsultantProfile({ ...base, papel_interno: 'vendedor' as never })).toBe('Selecione um papel interno válido.')
    expect(validateConsultantProfile({ ...base, situacao: 'sabatico' as never })).toBe('Selecione uma situação válida.')
  })

  test('recusa capacidade negativa', () => {
    const base = emptyConsultantProfile('user-1')
    expect(validateConsultantProfile({ ...base, capacidade_online: -1 })).toBe('Capacidade online não pode ser negativa.')
    expect(validateConsultantProfile({ ...base, capacidade_presencial: -2 })).toBe('Capacidade presencial não pode ser negativa.')
  })

  test('capacidade soma online e presencial, tratando nulo como zero', () => {
    expect(summarizeCapacity({ ...emptyConsultantProfile('u'), capacidade_online: 20, capacidade_presencial: 12 })).toEqual({ online: 20, presencial: 12, total: 32 })
    expect(summarizeCapacity(emptyConsultantProfile('u'))).toEqual({ online: 0, presencial: 0, total: 0 })
  })
})

describe('escala e especialidade por encontro', () => {
  test('só entra na escala quem está ativo e habilitado no produto', () => {
    const ativo = emptyConsultantProfile('u')
    expect(canBeScheduled(ativo, qualification())).toBe(true)
    expect(canBeScheduled(ativo, qualification({ enabled: false }))).toBe(false)
    expect(canBeScheduled({ ...ativo, situacao: 'ferias' }, qualification())).toBe(false)
    expect(canBeScheduled({ ...ativo, situacao: 'afastado' }, qualification())).toBe(false)
  })

  test('sem encontro marcado, o consultor conduz o produto inteiro', () => {
    expect(resolveEncounterScope(qualification({ total_visits: 3 }))).toEqual([1, 2, 3])
  })

  test('com encontros marcados, conduz apenas eles, em ordem', () => {
    expect(resolveEncounterScope(qualification({ encounters: [5, 2] }))).toEqual([2, 5])
  })

  test('produto desabilitado não gera escopo', () => {
    expect(resolveEncounterScope(qualification({ enabled: false, encounters: [1, 2] }))).toEqual([])
  })
})
