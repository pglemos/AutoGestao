import { describe, expect, test } from 'bun:test'
import {
  WIZARD_STEPS,
  buildWizardDraft,
  emptyWizardDraft,
  isWizardCodeEditable,
  slugifyCode,
  validateWizardDraft,
  validateWizardStep,
} from './indicatorWizard'

describe('slugifyCode', () => {
  test('gera chave a partir do nome', () => {
    expect(slugifyCode('Vendas Internet Premium')).toBe('vendas_internet_premium')
    expect(slugifyCode('Ticket Médio')).toBe('ticket_medio')
    expect(slugifyCode('  Ticket   Médio  ')).toBe('ticket_medio')
  })
})

describe('hidratação do wizard', () => {
  test('preserva os dados editados e completa defaults ausentes', () => {
    const draft = buildWizardDraft({ name: 'Indicador editado', code: 'indicador_editado', area: 'Comercial' })
    expect(draft).toMatchObject({ name: 'Indicador editado', code: 'indicador_editado', area: 'Comercial' })
    expect(draft.frequencia).toBe('mensal')
    expect(draft.ano_final).toBeNull()
  })
})

describe('validação por passo', () => {
  test('identificação exige nome e área', () => {
    const draft = emptyWizardDraft()
    expect(validateWizardStep(0, draft)).toBe('Informe o nome do indicador.')
    expect(validateWizardStep(0, { ...draft, name: 'Vendas', area: 'Comercial' })).toBeNull()
  })

  test('vigência recusa ano final anterior ao inicial', () => {
    const draft = { ...emptyWizardDraft(), name: 'Vendas', area: 'Comercial', ano_inicial: 2026, ano_final: 2025 }
    expect(validateWizardStep(0, draft)).toBe('Ano final anterior ao inicial.')
  })

  test('formato recusa casas decimais fora de 0-4', () => {
    expect(validateWizardStep(1, { ...emptyWizardDraft(), casas_decimais: 5 })).toBe('Casas decimais deve ser um inteiro de 0 a 4.')
    expect(validateWizardStep(1, { ...emptyWizardDraft(), casas_decimais: 2 })).toBeNull()
  })

  test('fórmula exige expressão com IND ou PAR quando calculado', () => {
    const draft = { ...emptyWizardDraft(), target_calculation_mode: 'CALCULATED_LOCKED' as const }
    expect(validateWizardStep(3, draft)).toBe('Informe a fórmula mensal.')
    expect(validateWizardStep(3, { ...draft, formula_expression: 'IND("A") * 2' })).toBeNull()
    expect(validateWizardStep(3, { ...draft, formula_expression: 'A * 2' })).toBe('A fórmula precisa referenciar IND("CODIGO") ou PAR("CODIGO").')
  })

  test('posição before/after exige referência', () => {
    const draft = { ...emptyWizardDraft(), posicao: 'before' as const }
    expect(validateWizardStep(5, draft)).toBe('Selecione o indicador de referência da posição.')
    expect(validateWizardStep(5, { ...draft, posicao_ref: 'X' })).toBeNull()
  })

  test('modo manual não exige fórmula', () => {
    const draft = emptyWizardDraft()
    expect(validateWizardStep(3, draft)).toBeNull()
  })
})

describe('validação do draft completo', () => {
  test('draft completo válido', () => {
    const draft = {
      ...emptyWizardDraft(),
      name: 'Vendas',
      area: 'Comercial',
      code: 'vendas',
      target_calculation_mode: 'CALCULATED_LOCKED' as const,
      formula_expression: 'IND("A") * PAR("P")',
    }
    expect(validateWizardDraft(draft)).toBeNull()
  })

  test('chave com caracteres inválidos bloqueia', () => {
    const draft = { ...emptyWizardDraft(), name: 'Vendas', area: 'Comercial', code: 'Vendas!' }
    expect(validateWizardDraft(draft)).toBe('A chave aceita apenas minúsculas, números e underline.')
  })

  test('sete passos no fluxo do wizard', () => {
    expect(WIZARD_STEPS).toHaveLength(7)
  })

  test('código congelado após primeira gravação', () => {
    expect(isWizardCodeEditable(false)).toBe(true)
    expect(isWizardCodeEditable(true)).toBe(false)
  })
})
