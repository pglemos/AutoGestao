import { describe, expect, test } from 'bun:test'
import {
  emptyNewClientDraft,
  isValidCnpj,
  newClientSlug,
  pendingNewClientSteps,
  validateNewClientStep,
} from './newClientDraft'

describe('wizard de novo cliente — validação por passo', () => {
  test('passo 1 exige nome e rejeita a própria MX', () => {
    const draft = emptyNewClientDraft()
    expect(validateNewClientStep(1, draft)).toContain('Informe o nome do cliente.')
    draft.name = 'MX Performance'
    expect(validateNewClientStep(1, draft)).toContain('Não é possível cadastrar a própria MX como cliente.')
    draft.name = 'Concessionária Alfa'
    expect(validateNewClientStep(1, draft)).toEqual([])
  })

  test('passo 1 valida CNPJ apenas quando preenchido', () => {
    const draft = { ...emptyNewClientDraft(), name: 'Alfa' }
    expect(validateNewClientStep(1, draft)).toEqual([])
    expect(validateNewClientStep(1, { ...draft, cnpj: '11.222.333/0001-00' })).toContain('CNPJ inválido.')
    expect(validateNewClientStep(1, { ...draft, cnpj: '11.222.333/0001-81' })).toEqual([])
  })

  test('isValidCnpj rejeita repetição e tamanho errado', () => {
    expect(isValidCnpj('11111111111111')).toBe(false)
    expect(isValidCnpj('1122233300018')).toBe(false)
    expect(isValidCnpj('11222333000181')).toBe(true)
  })

  test('passo 2 exige loja e loja principal coerente com a estrutura', () => {
    const draft = emptyNewClientDraft()
    expect(validateNewClientStep(2, draft)).toContain('Cadastre ao menos uma loja.')
    draft.units = [{ name: 'Matriz', city: 'Goiânia', state: 'GO', is_primary: true }]
    expect(validateNewClientStep(2, draft)).toEqual([])
    draft.units.push({ name: 'Filial', city: 'Anápolis', state: 'GO', is_primary: false })
    expect(validateNewClientStep(2, draft)).toContain('Estrutura "Loja única" aceita apenas uma loja.')
    draft.structure_type = 'REDE'
    expect(validateNewClientStep(2, draft)).toEqual([])
  })

  test('passo 2 cobra loja principal quando nenhuma está marcada', () => {
    const draft = emptyNewClientDraft()
    draft.units = [{ name: 'Matriz', city: '', state: '', is_primary: false }]
    expect(validateNewClientStep(2, draft)).toContain('Defina a loja principal.')
  })

  test('passo 2 não permite vincular a mesma loja operacional duas vezes', () => {
    const draft = emptyNewClientDraft()
    draft.structure_type = 'REDE'
    draft.units = [
      { name: 'Matriz', city: '', state: '', is_primary: true, store_id: 'store-1' },
      { name: 'Filial', city: '', state: '', is_primary: false, store_id: 'store-1' },
    ]
    expect(validateNewClientStep(2, draft)).toContain('Cada unidade deve apontar para uma loja operacional diferente.')
  })

  test('passo 3 exige produto e recusa contrato invertido', () => {
    const draft = emptyNewClientDraft()
    expect(validateNewClientStep(3, draft)).toContain('Selecione o produto contratado.')
    draft.product_name = 'PMR Online'
    draft.contract_start_date = '2026-03-01'
    draft.contract_end_date = '2026-02-01'
    expect(validateNewClientStep(3, draft)).toContain('Fim do contrato anterior ao início.')
    draft.contract_end_date = '2027-03-01'
    expect(validateNewClientStep(3, draft)).toEqual([])
  })

  test('passo 4 exige responsável MX pela implantação', () => {
    const draft = emptyNewClientDraft()
    expect(validateNewClientStep(4, draft)).toContain('Defina o responsável MX pela implantação.')
    draft.implementation_owner_id = 'user-1'
    expect(validateNewClientStep(4, draft)).toEqual([])
  })

  test('passo 6 exige contato principal e valida e-mail', () => {
    const draft = emptyNewClientDraft()
    expect(validateNewClientStep(6, draft)).toContain('Informe o contato principal.')
    draft.contacts = [{ name: 'Ana', role: 'Dona', email: 'ana@', phone: '', is_primary: true }]
    expect(validateNewClientStep(6, draft)).toContain('E-mail inválido para Ana.')
    draft.contacts[0].email = 'ana@alfa.com.br'
    expect(validateNewClientStep(6, draft)).toEqual([])
  })

  test('resumo lista todos os passos pendentes', () => {
    expect(pendingNewClientSteps(emptyNewClientDraft())).toEqual([1, 2, 3, 4, 6])
  })

  test('slug remove acento e pontuação', () => {
    expect(newClientSlug('Concessionária Alfa & Cia.')).toBe('concessionaria-alfa-cia')
  })
})
