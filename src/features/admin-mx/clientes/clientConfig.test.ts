import { describe, expect, test } from 'bun:test'
import {
  clientConfigSummary,
  emptyClientConfigDraft,
  validateClientConfigDraft,
} from './clientConfig'

describe('configuração do cliente — lógica pura', () => {
  test('padrão MX com tolerância 30, limite 10, retenção 90', () => {
    const draft = emptyClientConfigDraft()
    expect(draft.tolerancia_fechamento_min).toBe(30)
    expect(draft.limite_vendedores).toBe(10)
    expect(draft.retencao_snapshots_dias).toBe(90)
    expect(validateClientConfigDraft(draft)).toBeNull()
  })

  test('rejeita valores fora da faixa do banco', () => {
    expect(validateClientConfigDraft(emptyClientConfigDraft({ tolerancia_fechamento_min: 300 }))).toContain('Tolerância')
    expect(validateClientConfigDraft(emptyClientConfigDraft({ limite_vendedores: 0 }))).toContain('Limite')
    expect(validateClientConfigDraft(emptyClientConfigDraft({ canal_critico: 'sms' as never }))).toContain('canal')
  })

  test('resumo legível para exibição', () => {
    const summary = clientConfigSummary(emptyClientConfigDraft())
    expect(summary[0][1]).toBe('30 min')
    expect(summary[3][1]).toBe('WhatsApp')
  })
})
