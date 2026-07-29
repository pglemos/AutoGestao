/**
 * Logger estruturado do frontend.
 *
 * Emite sempre o mesmo envelope de campos, para que uma busca por
 * correlation_id no Sentry, na Vercel e no Supabase retorne a mesma operação.
 *
 * Nunca registra payload bruto — apenas metadados de execução.
 */

import { getObservabilityContext } from './context'
import { getActiveCorrelationId } from './correlation'
import { sanitizeValue } from './sanitize'

export type LogLevel = 'debug' | 'info' | 'warning' | 'error'

export interface LogFields {
    module?: string
    route?: string
    operation?: string
    status?: 'success' | 'failure' | 'skipped'
    duration_ms?: number
    error_code?: string
    http_status?: number
    request_id?: string
    trace_id?: string
    /** Metadados adicionais, sempre saneados. */
    metadata?: Record<string, unknown>
}

export interface LogEnvelope extends LogFields {
    timestamp: string
    level: LogLevel
    message: string
    environment?: string
    release?: string
    correlation_id?: string
    user_role?: string
    store_id?: string
}

type SentryLike = {
    addBreadcrumb?: (breadcrumb: Record<string, unknown>) => void
    captureMessage?: (message: string, options?: Record<string, unknown>) => void
    logger?: Record<string, (message: string, attributes?: Record<string, unknown>) => void>
}

function sentry(): SentryLike | undefined {
    return (globalThis as unknown as { Sentry?: SentryLike }).Sentry
}

/** Monta o envelope canônico sem emitir nada. Exportado para testes. */
export function buildEnvelope(level: LogLevel, message: string, fields: LogFields = {}): LogEnvelope {
    const context = getObservabilityContext()
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        environment: context.environment,
        release: context.release,
        correlation_id: getActiveCorrelationId(),
        user_role: context.user_role,
        store_id: context.store_id,
        module: fields.module ?? context.module,
        route: fields.route ?? context.route,
        operation: fields.operation ?? context.operation,
        status: fields.status,
        duration_ms: fields.duration_ms,
        error_code: fields.error_code,
        http_status: fields.http_status,
        request_id: fields.request_id,
        trace_id: fields.trace_id,
        metadata: fields.metadata
            ? (sanitizeValue(fields.metadata) as Record<string, unknown>)
            : undefined,
    }
}

function emit(level: LogLevel, message: string, fields: LogFields = {}): LogEnvelope {
    const envelope = buildEnvelope(level, message, fields)
    const client = sentry()

    // Sentry Logs quando disponível no SDK instalado; breadcrumb sempre.
    try {
        const structuredLogger = client?.logger
        const method = structuredLogger?.[level === 'warning' ? 'warn' : level]
        if (typeof method === 'function') {
            method(message, envelope as unknown as Record<string, unknown>)
        }
        client?.addBreadcrumb?.({
            category: 'mx',
            level,
            message,
            data: envelope as unknown as Record<string, unknown>,
        })
        if (level === 'error') {
            client?.captureMessage?.(message, { level, extra: envelope })
        }
    } catch {
        // Observabilidade nunca pode derrubar a aplicação.
    }

    if (import.meta.env.DEV) {
        const consoleMethod = level === 'warning' ? 'warn' : level === 'debug' ? 'debug' : level
        ;(console as unknown as Record<string, (...args: unknown[]) => void>)[consoleMethod]?.(
            `[mx:${level}] ${message}`,
            envelope,
        )
    }

    return envelope
}

export const logger = {
    debug: (message: string, fields?: LogFields) => emit('debug', message, fields),
    info: (message: string, fields?: LogFields) => emit('info', message, fields),
    warn: (message: string, fields?: LogFields) => emit('warning', message, fields),
    error: (message: string, fields?: LogFields) => emit('error', message, fields),
}

/**
 * Envolve uma operação assíncrona registrando duração e desfecho.
 * Repassa a exceção original — não engole erro.
 */
export async function logOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    fields: LogFields = {},
): Promise<T> {
    const startedAt = performance.now()
    try {
        const result = await fn()
        logger.info(operation, {
            ...fields,
            operation,
            status: 'success',
            duration_ms: Math.round(performance.now() - startedAt),
        })
        return result
    } catch (error) {
        logger.error(operation, {
            ...fields,
            operation,
            status: 'failure',
            duration_ms: Math.round(performance.now() - startedAt),
            error_code: error instanceof Error ? error.name : 'unknown',
        })
        throw error
    }
}
