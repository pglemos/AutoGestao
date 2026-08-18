import { describe, expect, test } from 'bun:test'
import { emptyProgramDraft, validateProgramDraft, type ProgramDraft } from './programMutations'

describe('programMutations — validação de dados do programa', () => {
  test('cria draft vazio', () => {
    const draft = emptyProgramDraft()
    expect(draft.product_name).toBe('')
    expect(draft.program_template_key).toBe('')
    expect(draft.responsible_consultant_id).toBe('')
    expect(draft.auxiliary_consultant_ids).toEqual([])
  })

  test('valida que produto é obrigatório', () => {
    const draft = emptyProgramDraft()
    const errors = validateProgramDraft(draft)
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toBe('Selecione o produto contratado.')
  })

  test('valida coerência de datas do contrato', () => {
    const draft: ProgramDraft = {
      product_name: 'PMR - 7 Visitas',
      program_template_key: 'pmr_7',
      modality: 'presencial',
      contract_start_date: '2026-12-10',
      contract_end_date: '2026-08-20',
      implementation_owner_id: 'user-1',
      responsible_consultant_id: 'user-1',
      auxiliary_consultant_ids: [],
    }
    const errors = validateProgramDraft(draft)
    expect(errors).toContain('Data de fim do contrato anterior ao início.')
  })

  test('draft válido não retorna erros', () => {
    const draft: ProgramDraft = {
      product_name: 'PMR - 7 Visitas',
      program_template_key: 'pmr_7',
      modality: 'presencial',
      contract_start_date: '2026-08-20',
      contract_end_date: '2026-12-10',
      implementation_owner_id: 'user-1',
      responsible_consultant_id: 'user-1',
      auxiliary_consultant_ids: ['user-2'],
    }
    const errors = validateProgramDraft(draft)
    expect(errors).toEqual([])
  })
})
