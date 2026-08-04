import { describe, expect, it } from 'bun:test'
import { normalizeStoreManagementForm } from './store-management-form'

describe('normalizeStoreManagementForm', () => {
  it('limpa o e-mail quando o dono acumula a gestão', () => {
    expect(normalizeStoreManagementForm({
      mode: 'owner_managed',
      managerEmail: 'gerente@loja.com.br',
    })).toEqual({ ok: true, managerEmail: null })
  })

  it('normaliza o e-mail quando o gerente ainda será cadastrado', () => {
    expect(normalizeStoreManagementForm({
      mode: 'manager_pending',
      managerEmail: '  GERENTE@LOJA.COM.BR ',
    })).toEqual({ ok: true, managerEmail: 'gerente@loja.com.br' })
  })

  it('rejeita gerente pendente sem e-mail', () => {
    expect(normalizeStoreManagementForm({
      mode: 'manager_pending',
      managerEmail: ' ',
    })).toEqual({
      ok: false,
      error: 'Informe o e-mail do gerente que será cadastrado.',
    })
  })

  it('rejeita e-mail inválido no modo gerente pendente', () => {
    expect(normalizeStoreManagementForm({
      mode: 'manager_pending',
      managerEmail: 'gerente-sem-dominio',
    })).toEqual({
      ok: false,
      error: 'Informe um e-mail válido para o gerente.',
    })
  })
})
