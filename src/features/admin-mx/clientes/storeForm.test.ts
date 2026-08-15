import { describe, expect, test } from 'bun:test'
import { emptyStoreDraft, maskStoreCnpj, validateStoreDraft } from './storeForm'

describe('cadastro de loja — lógica pura', () => {
  test('exige nome e valida CNPJ com 14 dígitos', () => {
    const draft = emptyStoreDraft('filial')
    expect(validateStoreDraft(draft)).toContain('Informe o nome da loja.')
    draft.name = 'Filial Centro'
    draft.cnpj = '11.222.333/0001-8'
    expect(validateStoreDraft(draft)).toContain('CNPJ da loja deve ter 14 dígitos.')
    draft.cnpj = '11.222.333/0001-81'
    expect(validateStoreDraft(draft)).toEqual([])
  })

  test('rejeita UF inválida', () => {
    const draft = emptyStoreDraft('matriz')
    draft.name = 'Matriz'
    draft.address_state = 'XX'
    expect(validateStoreDraft(draft)).toContain('UF inválida.')
    draft.address_state = 'go'
    expect(validateStoreDraft(draft)).toEqual([])
  })

  test('máscara de CNPJ formata progressivamente', () => {
    expect(maskStoreCnpj('112')).toBe('11.2')
    expect(maskStoreCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })
})
