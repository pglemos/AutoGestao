import { describe, expect, test } from 'bun:test'
import {
  APROVACAO_PAPEIS,
  INSCRICAO_STATUS_LABELS,
  INSCRICAO_STATUSES,
  INSCRICAO_VISOES_PADRAO,
  emptyAprovacaoDraft,
  existingApprovedByEmail,
  validateAprovacaoDraft,
} from './inscricaoAutocadastro'

describe('inscricao de autocadastro — lógica pura', () => {
  test('estados cobrem o fluxo de validação MX', () => {
    expect(INSCRICAO_STATUSES).toEqual(['aguardando', 'aprovado', 'devolvido', 'rejeitado', 'mesclado'])
    expect(INSCRICAO_STATUS_LABELS.aguardando).toBe('Aguardando validação MX')
    expect(INSCRICAO_STATUS_LABELS.aprovado).toBe('Aprovado')
  })

  test('aprovação exige loja e ao menos um papel', () => {
    expect(validateAprovacaoDraft(emptyAprovacaoDraft())).toContain('loja')
    const draft = { ...emptyAprovacaoDraft(), loja_aprovada_id: 'loja-1' }
    expect(validateAprovacaoDraft(draft)).toContain('papel')
    const ok = { ...draft, papeis_aprovados: ['VENDEDOR'] }
    expect(validateAprovacaoDraft(ok)).toBeNull()
  })

  test('papéis e visões padrão contemplam Dono e demais perfis', () => {
    const values = APROVACAO_PAPEIS.map(p => p.value)
    expect(values).toContain('DONO')
    expect(values).toContain('VENDEDOR')
    expect(INSCRICAO_VISOES_PADRAO).toContain('DONO')
    expect(INSCRICAO_VISOES_PADRAO).toContain('GERENCIAL')
  })

  test('dedupe por e-mail normaliza caixa e espaço', () => {
    const persons = [{ email: 'Foo@MX.com ' }, { email: 'outro@x.com' }]
    expect(existingApprovedByEmail(persons, 'foo@mx.com')).toHaveLength(1)
    expect(existingApprovedByEmail(persons, 'nao-existe@x.com')).toHaveLength(0)
  })
})