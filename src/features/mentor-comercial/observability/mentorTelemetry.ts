/**
 * Observabilidade Sentry do Mentor Comercial (TASK 41).
 *
 * Integra com a infraestrutura existente em `src/lib/observability/sentry.ts`.
 * Anexa contexto técnico padronizado (sem PII) e sanitiza rigorosamente qualquer
 * payload extra antes do envio ao Sentry.
 */

import { Sentry } from '../../../lib/observability/sentry'
import { sanitizeValue } from '../../../lib/observability/sanitize'

/** Tipos de eventos monitorados no Sentry pelo Mentor Comercial. */
export type MentorTelemetryEventType =
  | 'transition_not_found'
  | 'orphan_rule_reference'
  | 'invalid_rule_catalog'
  | 'action_idempotency_conflict'
  | 'cadence_invariant_violation'
  | 'mentor_sync_failure'
  | 'daily_processor_failure'
  | 'score_invariant_violation'

/** Contexto técnico padronizado a anexar nas tags do Sentry (sem PII). */
export interface MentorTelemetryTags {
  operation?: string
  statusFamily?: string
  transitionResult?: string
  cadenceCode?: string
  actionType?: string
  ruleVersion?: string
  ruleHash?: string
}

/** Estrutura do payload de telemetria do Mentor Comercial. */
export interface MentorTelemetryPayload {
  eventType: MentorTelemetryEventType
  message?: string
  error?: Error | unknown
  tags?: MentorTelemetryTags
  extra?: Record<string, unknown>
}

const PII_OR_SENSITIVE_KEY = /(name|nome|phone|telefone|whatsapp|text|texto|message|body|token|secret|password|senha|email|cpf|cnpj)/i

const PHONE_PATTERN = /(\(?\d{2}\)?\s?\d{4,5}[-.\s]?\d{4}|\b\d{10,11}\b)/g

function redactPiiString(str: string): string {
  return str.replace(PHONE_PATTERN, '[REDACTED]')
}

/**
 * Sanitiza o payload de extra/dados do Mentor garantindo que nenhum PII ou dado sensível seja enviado.
 * Preserva IDs (opportunityId, clientId, storeId, sellerId, etc) e dados numéricos/técnicos.
 */
export function sanitizeMentorExtra(extra?: Record<string, unknown>): Record<string, unknown> {
  if (!extra || typeof extra !== 'object') return {}

  const sanitized = sanitizeValue(extra) as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const [key, val] of Object.entries(sanitized)) {
    if (PII_OR_SENSITIVE_KEY.test(key)) {
      result[key] = '[REDACTED]'
    } else if (typeof val === 'string') {
      result[key] = redactPiiString(val)
    } else {
      result[key] = val
    }
  }

  return result
}

/**
 * Sanitiza o payload completo de telemetria do Mentor Comercial.
 * Garante que a mensagem, as tags e o objeto extra fiquem totalmente isentos de PII.
 */
export function sanitizeMentorPayload(payload: MentorTelemetryPayload): MentorTelemetryPayload {
  const sanitizedMessage = payload.message ? redactPiiString(payload.message) : undefined
  const sanitizedExtra = sanitizeMentorExtra(payload.extra)

  return {
    eventType: payload.eventType,
    message: sanitizedMessage,
    error: payload.error,
    tags: payload.tags ? { ...payload.tags } : undefined,
    extra: sanitizedExtra,
  }
}

/**
 * Envia um evento de telemetria do Mentor Comercial ao Sentry com escopo e tags apropriados.
 */
export function captureMentorTelemetry(payload: MentorTelemetryPayload): void {
  const sanitized = sanitizeMentorPayload(payload)
  const tags = sanitized.tags ?? {}

  Sentry.withScope((scope) => {
    scope.setTag('mentor.event_type', sanitized.eventType)
    scope.setTag('mentor.operation', tags.operation ?? 'unknown')
    scope.setTag('mentor.status_family', tags.statusFamily ?? 'unknown')
    scope.setTag('mentor.transition_result', tags.transitionResult ?? 'unknown')
    scope.setTag('mentor.cadence_code', tags.cadenceCode ?? 'unknown')
    scope.setTag('mentor.action_type', tags.actionType ?? 'unknown')
    scope.setTag('mentor.rule_version', tags.ruleVersion ?? 'unknown')
    scope.setTag('mentor.rule_hash', tags.ruleHash ?? 'unknown')

    if (sanitized.extra && Object.keys(sanitized.extra).length > 0) {
      scope.setExtras(sanitized.extra)
    }

    const eventName = `[MentorTelemetry] ${sanitized.eventType}${sanitized.message ? `: ${sanitized.message}` : ''}`

    if (sanitized.error instanceof Error) {
      Sentry.captureException(sanitized.error)
    } else {
      Sentry.captureMessage(eventName, 'error')
    }
  })
}

// Helpers para cada um dos 8 eventos exigidos pelo Sentry:

export function captureTransitionNotFound(
  tags: MentorTelemetryTags,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'transition_not_found',
    message: 'Nenhuma regra de transição encontrada para o status e resultado informados',
    tags,
    extra,
  })
}

export function captureOrphanRuleReference(
  tags: MentorTelemetryTags,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'orphan_rule_reference',
    message: 'Referência orfã detectada no catálogo de regras',
    tags,
    extra,
  })
}

export function captureInvalidRuleCatalog(
  tags: MentorTelemetryTags,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'invalid_rule_catalog',
    message: 'Catálogo de regras inválido ou corrompido',
    tags,
    extra,
  })
}

export function captureActionIdempotencyConflict(
  tags: MentorTelemetryTags,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'action_idempotency_conflict',
    message: 'Conflito de idempotência ao tentar registrar ação da Central',
    tags,
    extra,
  })
}

export function captureCadenceInvariantViolation(
  tags: MentorTelemetryTags,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'cadence_invariant_violation',
    message: 'Violação de invariante no ciclo de vida da cadência',
    tags,
    extra,
  })
}

export function captureMentorSyncFailure(
  tags: MentorTelemetryTags,
  error?: unknown,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'mentor_sync_failure',
    message: 'Falha na sincronização ou persistência de dados do Mentor',
    error,
    tags,
    extra,
  })
}

export function captureDailyProcessorFailure(
  tags: MentorTelemetryTags,
  error?: unknown,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'daily_processor_failure',
    message: 'Falha na execução do processador diário do Mentor',
    error,
    tags,
    extra,
  })
}

export function captureScoreInvariantViolation(
  tags: MentorTelemetryTags,
  extra?: Record<string, unknown>,
): void {
  captureMentorTelemetry({
    eventType: 'score_invariant_violation',
    message: 'Violação de invariante na computação do Mentor Score',
    tags,
    extra,
  })
}
