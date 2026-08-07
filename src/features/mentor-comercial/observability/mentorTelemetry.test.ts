import { describe, expect, test } from 'bun:test'
import {
  sanitizeMentorPayload,
  sanitizeMentorExtra,
  captureMentorTelemetry,
  captureTransitionNotFound,
  captureOrphanRuleReference,
  captureInvalidRuleCatalog,
  captureActionIdempotencyConflict,
  captureCadenceInvariantViolation,
  captureMentorSyncFailure,
  captureDailyProcessorFailure,
  captureScoreInvariantViolation,
  type MentorTelemetryPayload,
} from './mentorTelemetry'

describe('mentorTelemetry', () => {
  test('prova que payload com PII (nome, telefone, texto de whatsapp, token) é sanitizado antes do envio', () => {
    const rawPayload: MentorTelemetryPayload = {
      eventType: 'mentor_sync_failure',
      message: 'Erro ao processar cliente João da Silva com telefone 11988887777',
      tags: {
        operation: 'applyMentorEvent',
        statusFamily: 'Prospecção',
        ruleVersion: 'v1',
      },
      extra: {
        opportunityId: 'opp-123',
        clientId: 'cli-456',
        clientName: 'João Carlos da Silva',
        phone: '(11) 98765-4321',
        telefone: '11987654321',
        whatsappMessage: 'Olá João, sua proposta de financiamento foi aprovada!',
        rawWhatsapp: 'Mensagem enviada com sucesso',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.secret',
        secret: 'my-super-secret-key',
      },
    }

    const sanitized = sanitizeMentorPayload(rawPayload)

    // IDs e tags técnicas devem ser preservados
    expect(sanitized.eventType).toBe('mentor_sync_failure')
    expect(sanitized.tags?.operation).toBe('applyMentorEvent')
    expect(sanitized.extra?.opportunityId).toBe('opp-123')
    expect(sanitized.extra?.clientId).toBe('cli-456')

    // PII e segredos devem ser totalmente sanitizados
    expect(sanitized.extra?.clientName).toBe('[REDACTED]')
    expect(sanitized.extra?.phone).toBe('[REDACTED]')
    expect(sanitized.extra?.telefone).toBe('[REDACTED]')
    expect(sanitized.extra?.whatsappMessage).toBe('[REDACTED]')
    expect(sanitized.extra?.rawWhatsapp).toBe('[REDACTED]')
    expect(sanitized.extra?.token).toBe('[REDACTED]')
    expect(sanitized.extra?.secret).toBe('[REDACTED]')

    // Telefone na mensagem de erro também deve ser sanitizado
    expect(sanitized.message).not.toContain('11988887777')
    expect(sanitized.message).toContain('[REDACTED]')
  })

  test('sanitizeMentorExtra remove PII mas mantêm métricas e IDs intactos', () => {
    const extra = {
      opportunityId: 'opp-999',
      score: 85,
      clientName: 'Maria Souza',
      phone: '11977776666',
    }
    const sanitized = sanitizeMentorExtra(extra)
    expect(sanitized.opportunityId).toBe('opp-999')
    expect(sanitized.score).toBe(85)
    expect(sanitized.clientName).toBe('[REDACTED]')
    expect(sanitized.phone).toBe('[REDACTED]')
  })

  test('captura os 8 eventos de telemetria sem lançar exceções', () => {
    const tags = {
      operation: 'unit_test',
      statusFamily: 'Negociação',
      transitionResult: 'sucesso',
      cadenceCode: 'CAD-01',
      actionType: 'whatsapp',
      ruleVersion: 'v1',
      ruleHash: 'hash-abc',
    }

    expect(() => captureTransitionNotFound(tags, { opportunityId: 'opp-1' })).not.toThrow()
    expect(() => captureOrphanRuleReference(tags, { opportunityId: 'opp-2' })).not.toThrow()
    expect(() => captureInvalidRuleCatalog(tags, { opportunityId: 'opp-3' })).not.toThrow()
    expect(() => captureActionIdempotencyConflict(tags, { opportunityId: 'opp-4' })).not.toThrow()
    expect(() => captureCadenceInvariantViolation(tags, { opportunityId: 'opp-5' })).not.toThrow()
    expect(() => captureMentorSyncFailure(tags, new Error('sync fail'), { opportunityId: 'opp-6' })).not.toThrow()
    expect(() => captureDailyProcessorFailure(tags, new Error('processor fail'), { storeId: 'store-1' })).not.toThrow()
    expect(() => captureScoreInvariantViolation(tags, { score: 150 })).not.toThrow()
  })
})
