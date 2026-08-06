import { logger } from '@/lib/observability/logger'
import type { AutosaveState } from './checkin-autosave.types'

/**
 * Sinais do fechamento diário.
 *
 * Nomes fixos porque são a chave de busca em incidente: "o vendedor diz que
 * preencheu e o gerente não recebeu" precisa ser respondível sem reproduzir.
 */
export const CHECKIN_TELEMETRY = {
  autosaveStarted: 'checkin_autosave_started',
  autosaveSucceeded: 'checkin_autosave_succeeded',
  autosaveFailed: 'checkin_autosave_failed',
  autosaveConflict: 'checkin_autosave_conflict',
  autosaveOffline: 'checkin_autosave_offline',
  finalizationStarted: 'checkin_finalization_started',
  finalizationSucceeded: 'checkin_finalization_succeeded',
  finalizationFailed: 'checkin_finalization_failed',
  commercialEventTransactionFailed: 'commercial_event_transaction_failed',
  realtimeChannelFailed: 'realtime_channel_failed',
  realtimeFallbackEnabled: 'realtime_fallback_enabled',
} as const

export type CheckinTelemetryEvent = (typeof CHECKIN_TELEMETRY)[keyof typeof CHECKIN_TELEMETRY]

/**
 * Sucesso de autosave é amostrado: uma sessão de preenchimento gera dezenas de
 * gravações e o volume afogaria o sinal que interessa. Falha sempre passa.
 */
const SUCCESS_SAMPLE_RATE = 0.1

export interface AutosaveTelemetryContext {
  referenceDate: string
  /** Nunca inclui PII: só o que identifica o fechamento no banco. */
  checkinId?: string | null
}

function shouldSampleSuccess(random: () => number) {
  return random() < SUCCESS_SAMPLE_RATE
}

/**
 * Traduz uma transição de estado do autosave em sinal. Recebe o estado
 * anterior para não repetir evento em re-render — o React chama onStateChange
 * a cada mudança, inclusive as que não mudam a natureza do estado.
 */
export function emitAutosaveTelemetry(
  previous: AutosaveState | null,
  next: AutosaveState,
  context: AutosaveTelemetryContext,
  random: () => number = Math.random,
): CheckinTelemetryEvent | null {
  if (previous?.status === next.status) return null

  const fields = {
    module: 'checkin/autosave',
    operation: 'autosave',
    metadata: {
      reference_date: context.referenceDate,
      checkin_id: context.checkinId ?? null,
      revision: next.revision,
    },
  }

  switch (next.status) {
    case 'saving':
      logger.debug(CHECKIN_TELEMETRY.autosaveStarted, { ...fields, status: 'skipped' })
      return CHECKIN_TELEMETRY.autosaveStarted
    case 'saved':
      if (!shouldSampleSuccess(random)) return null
      logger.info(CHECKIN_TELEMETRY.autosaveSucceeded, { ...fields, status: 'success' })
      return CHECKIN_TELEMETRY.autosaveSucceeded
    case 'conflict':
      logger.warn(CHECKIN_TELEMETRY.autosaveConflict, {
        ...fields,
        status: 'failure',
        error_code: 'DRAFT_VERSION_CONFLICT',
        metadata: { ...fields.metadata, server_revision: next.serverRevision },
      })
      return CHECKIN_TELEMETRY.autosaveConflict
    case 'offline':
      logger.warn(CHECKIN_TELEMETRY.autosaveOffline, { ...fields, status: 'skipped' })
      return CHECKIN_TELEMETRY.autosaveOffline
    case 'error':
      logger.error(CHECKIN_TELEMETRY.autosaveFailed, {
        ...fields,
        status: 'failure',
        // A mensagem do servidor entra como error_code, não como texto livre
        // com dado do usuário.
        error_code: next.error ?? 'unknown',
      })
      return CHECKIN_TELEMETRY.autosaveFailed
    default:
      return null
  }
}

export function emitRealtimeTelemetry(status: string, table: string): CheckinTelemetryEvent | null {
  if (status === 'SUBSCRIBED') return null
  logger.warn(CHECKIN_TELEMETRY.realtimeChannelFailed, {
    module: 'realtime',
    operation: 'subscribe',
    status: 'failure',
    error_code: status,
    metadata: { table },
  })
  return CHECKIN_TELEMETRY.realtimeChannelFailed
}
