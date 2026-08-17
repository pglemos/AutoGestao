import { describe, expect, test } from 'bun:test'
import {
  CLIENT_LIFECYCLE_LABELS,
  clientActionsFor,
  resolveClientLifecycle,
  type ClientLifecycleRow,
} from './clientLifecycle'

function row(overrides: Partial<ClientLifecycleRow> = {}): ClientLifecycleRow {
  return { status: 'inativo', onboarding_completed: false, onboarding_step: 1, suspended_at: null, activated_at: null, scheduled_activation_at: null, ...overrides }
}

describe('lifecycle do cliente — lógica pura', () => {
  test('resolve estados derivados', () => {
    expect(resolveClientLifecycle(row())).toBe('em_configuracao')
    expect(resolveClientLifecycle(row({ onboarding_completed: true }))).toBe('pronto_para_ativar')
    expect(resolveClientLifecycle(row({ scheduled_activation_at: '2026-09-01' }))).toBe('ativacao_programada')
    expect(resolveClientLifecycle(row({ status: 'ativo' }))).toBe('ativo')
    expect(resolveClientLifecycle(row({ suspended_at: '2026-08-16T10:00:00Z' }))).toBe('suspenso')
    expect(resolveClientLifecycle(row({ status: 'arquivado' }))).toBe('arquivado')
  })

  test('labels cobrem todos os estados', () => {
    expect(CLIENT_LIFECYCLE_LABELS.suspenso).toBe('Suspenso')
    expect(CLIENT_LIFECYCLE_LABELS.ativacao_programada).toBe('Ativação programada')
  })

  test('ações: continuar onboarding só sem onboarding concluído', () => {
    const actions = clientActionsFor(row())
    expect(actions).toContain('continuar_onboarding')
    expect(clientActionsFor(row({ onboarding_completed: true }))).not.toContain('continuar_onboarding')
  })

  test('ações: programar ativação só em pronto/config; suspender só em ativo', () => {
    expect(clientActionsFor(row({ onboarding_completed: true }))).toContain('programar_ativacao')
    expect(clientActionsFor(row({ status: 'ativo' }))).toContain('suspender')
    expect(clientActionsFor(row({ status: 'ativo' }))).not.toContain('programar_ativacao')
    expect(clientActionsFor(row({ suspended_at: '2026-08-16T10:00:00Z' }))).not.toContain('suspender')
    expect(clientActionsFor(row({ status: 'arquivado' }))).not.toContain('suspender')
  })

  test('ações base sempre presentes', () => {
    const actions = clientActionsFor(row())
    for (const action of ['abrir_visao360', 'gerar_link_autocadastro', 'adicionar_pessoa', 'abrir_jornada', 'abrir_auditoria']) {
      expect(actions).toContain(action)
    }
  })
})