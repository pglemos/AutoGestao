import { describe, expect, it } from 'bun:test'
import { normalizeStoreManagementForm, resolveStoreManagementEdit } from './store-management-form'

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

describe('resolveStoreManagementEdit', () => {
  it('preserva o cadastro atual quando existe gerente ativo', () => {
    expect(resolveStoreManagementEdit({
      contextConfirmed: true,
      hasActiveManager: true,
      currentManagerEmail: ' ATUAL@LOJA.COM.BR ',
      mode: 'owner_managed',
      managerEmail: null,
    })).toEqual({ ok: true, managerEmail: 'atual@loja.com.br' })
  })

  it('preserva o cadastro atual quando a estrutura não pôde ser confirmada', () => {
    expect(resolveStoreManagementEdit({
      contextConfirmed: false,
      hasActiveManager: false,
      currentManagerEmail: 'gestor@loja.com.br',
      mode: 'owner_managed',
      managerEmail: null,
    })).toEqual({ ok: true, managerEmail: 'gestor@loja.com.br' })
  })

  it('aplica a escolha manual somente quando não existe gerente ativo', () => {
    expect(resolveStoreManagementEdit({
      contextConfirmed: true,
      hasActiveManager: false,
      currentManagerEmail: 'antigo@loja.com.br',
      mode: 'owner_managed',
      managerEmail: 'novo@loja.com.br',
    })).toEqual({ ok: true, managerEmail: null })
  })
})
