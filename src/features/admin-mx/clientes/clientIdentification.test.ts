import { describe, expect, test } from 'bun:test'
import {
  buildClientIdentificationDraft,
  clientBusinessPhaseLabel,
  clientStructureDisplay,
  emptyClientIdentificationDraft,
  resolveClientShortName,
  resolveIdentificationUnit,
  validateClientIdentificationDraft,
} from './clientIdentification'

describe('identificação do cliente', () => {
  test('exige razão social, CNPJ, cidade e UF', () => {
    const draft = emptyClientIdentificationDraft()
    expect(validateClientIdentificationDraft(draft)).toEqual([
      'Informe a razão social.',
      'Informe o CNPJ.',
      'Informe a cidade.',
      'Informe a UF.',
    ])
  })

  test('rejeita CNPJ e UF inválidos e aceita CNPJ válido com UF minúscula', () => {
    const draft = emptyClientIdentificationDraft()
    draft.legalName = 'Weber Motors Ltda.'
    draft.cnpj = '00.000.000/0000-00'
    draft.city = 'Curitiba'
    draft.state = 'XX'
    expect(validateClientIdentificationDraft(draft)).toContain('CNPJ inválido.')
    expect(validateClientIdentificationDraft(draft)).toContain('UF inválida.')
    draft.cnpj = '11.222.333/0001-81'
    draft.state = 'pr'
    expect(validateClientIdentificationDraft(draft)).toEqual([])
  })

  test('nome resumido vazio cai na razão social', () => {
    const draft = emptyClientIdentificationDraft()
    draft.legalName = 'Weber Motors Ltda.'
    expect(resolveClientShortName(draft)).toBe('Weber Motors Ltda.')
    draft.shortName = 'Weber'
    expect(resolveClientShortName(draft)).toBe('Weber')
  })

  test('na ficha existente, cidade e UF são opcionais se o CNPJ for válido', () => {
    const draft = emptyClientIdentificationDraft()
    draft.legalName = 'ACERTT'
    draft.cnpj = '11.222.333/0001-81'
    expect(validateClientIdentificationDraft(draft, { requireAddress: false })).toEqual([])
  })

  test('mostra Loja Única, Grupo e Rede', () => {
    expect(clientStructureDisplay('LOJA_UNICA')).toBe('Loja Única')
    expect(clientStructureDisplay('GRUPO')).toBe('Grupo')
    expect(clientStructureDisplay('REDE')).toBe('Rede')
    expect(clientStructureDisplay(null)).toBe('—')
  })

  test('fase vazia comunica ausência de configuração', () => {
    expect(clientBusinessPhaseLabel(null)).toBe('Não configurada')
    expect(clientBusinessPhaseLabel('CRESCIMENTO')).toBe('Crescimento')
  })

  test('grava cidade e UF na unidade persistida, não na sintética', () => {
    const unit = resolveIdentificationUnit([
      { id: 'synth', is_primary: true, store_type: 'matriz', synthetic: true },
      { id: 'real-filial', is_primary: false, store_type: 'filial' },
      { id: 'real-matriz', is_primary: true, store_type: 'matriz' },
    ])
    expect(unit?.id).toBe('real-matriz')
  })

  test('monta o rascunho com CNPJ mascarado e estrutura do cliente', () => {
    const draft = buildClientIdentificationDraft({
      name: 'Weber',
      legalName: 'Weber Motors Ltda.',
      cnpj: '11222333000181',
      notes: 'Grupo regional',
      structureType: 'GRUPO',
      city: 'Curitiba',
      state: 'pr',
      businessPhase: 'CRESCIMENTO',
      contractEndDate: '2027-04-30',
    })
    expect(draft).toMatchObject({
      legalName: 'Weber Motors Ltda.',
      cnpj: '11.222.333/0001-81',
      shortName: 'Weber',
      city: 'Curitiba',
      state: 'PR',
      structureType: 'GRUPO',
      notes: 'Grupo regional',
      businessPhase: 'CRESCIMENTO',
      contractEndDate: '2027-04-30',
    })
  })
})
