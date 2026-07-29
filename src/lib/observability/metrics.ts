/**
 * Métricas de aplicação MX.
 *
 * Cardinalidade é controlada de propósito: tags aceitam apenas papel, módulo,
 * resultado e nome de operação. UUIDs (usuário, loja, registro) nunca viram tag.
 */

import { getObservabilityContext } from './context'
import { logger } from './logger'

export const MX_METRICS = {
    loginSuccess: 'mx.login.success',
    loginFailure: 'mx.login.failure',
    dailyClosingSuccess: 'mx.daily_closing.success',
    dailyClosingFailure: 'mx.daily_closing.failure',
    saleSuccess: 'mx.sale.success',
    saleFailure: 'mx.sale.failure',
    followupSuccess: 'mx.followup.success',
    followupFailure: 'mx.followup.failure',
    appointmentSuccess: 'mx.appointment.success',
    appointmentFailure: 'mx.appointment.failure',
    rpcDuration: 'mx.rpc.duration',
    rpcFailure: 'mx.rpc.failure',
    edgeDuration: 'mx.edge.duration',
    edgeFailure: 'mx.edge.failure',
    snapshotAge: 'mx.snapshot.age',
    realtimeDisconnect: 'mx.realtime.disconnect',
    calendarSyncSuccess: 'mx.calendar.sync.success',
    calendarSyncFailure: 'mx.calendar.sync.failure',
    notificationSuccess: 'mx.notification.success',
    notificationFailure: 'mx.notification.failure',
    reportDuration: 'mx.report.duration',
    reportFailure: 'mx.report.failure',
    aiRequestDuration: 'mx.ai.request.duration',
    aiRequestFailure: 'mx.ai.request.failure',
    healthStatus: 'mx.health.status',
    cronStatus: 'mx.cron.status',
} as const

export type MxMetricName = (typeof MX_METRICS)[keyof typeof MX_METRICS]

/** Tags permitidas — lista fechada para conter cardinalidade. */
export interface MetricTags {
    module?: string
    operation?: string
    result?: 'success' | 'failure' | 'timeout' | 'degraded'
    user_role?: string
    rpc_name?: string
    edge_function?: string
    http_status?: string
}

type SentryLike = {
    metrics?: {
        increment?: (name: string, value?: number, options?: Record<string, unknown>) => void
        distribution?: (name: string, value: number, options?: Record<string, unknown>) => void
        gauge?: (name: string, value: number, options?: Record<string, unknown>) => void
    }
    setMeasurement?: (name: string, value: number, unit?: string) => void
}

function sentry(): SentryLike | undefined {
    return (globalThis as unknown as { Sentry?: SentryLike }).Sentry
}

function baseTags(tags: MetricTags = {}): Record<string, string> {
    const context = getObservabilityContext()
    const merged: Record<string, string | undefined> = {
        environment: context.environment,
        release: context.release,
        module: tags.module ?? context.module,
        operation: tags.operation ?? context.operation,
        user_role: tags.user_role ?? context.user_role,
        result: tags.result,
        rpc_name: tags.rpc_name,
        edge_function: tags.edge_function,
        http_status: tags.http_status,
    }
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(merged)) {
        if (value != null && value !== '') out[key] = String(value)
    }
    return out
}

/** Contador. Usado para sucesso/falha de operações de negócio. */
export function increment(name: MxMetricName | string, value = 1, tags?: MetricTags): void {
    const resolvedTags = baseTags(tags)
    try {
        sentry()?.metrics?.increment?.(name, value, { tags: resolvedTags })
    } catch {
        // no-op
    }
    logger.debug(`metric:${name}`, { metadata: { value, ...resolvedTags } })
}

/** Distribuição. Usado para latência (ms). */
export function distribution(name: MxMetricName | string, value: number, tags?: MetricTags): void {
    const resolvedTags = baseTags(tags)
    try {
        const client = sentry()
        if (client?.metrics?.distribution) {
            client.metrics.distribution(name, value, { unit: 'millisecond', tags: resolvedTags })
        } else {
            client?.setMeasurement?.(name, value, 'millisecond')
        }
    } catch {
        // no-op
    }
    logger.debug(`metric:${name}`, { metadata: { value, ...resolvedTags } })
}

/** Gauge. Usado para idade de snapshot e status de health/cron. */
export function gauge(name: MxMetricName | string, value: number, tags?: MetricTags): void {
    const resolvedTags = baseTags(tags)
    try {
        const client = sentry()
        if (client?.metrics?.gauge) {
            client.metrics.gauge(name, value, { tags: resolvedTags })
        } else {
            client?.metrics?.distribution?.(name, value, { tags: resolvedTags })
        }
    } catch {
        // no-op
    }
    logger.debug(`metric:${name}`, { metadata: { value, ...resolvedTags } })
}

/**
 * Mede uma operação: emite duração sempre e um contador de sucesso/falha.
 * Repassa a exceção original.
 */
export async function measure<T>(
    durationMetric: MxMetricName | string,
    failureMetric: MxMetricName | string,
    fn: () => Promise<T>,
    tags?: MetricTags,
): Promise<T> {
    const startedAt = performance.now()
    try {
        const result = await fn()
        distribution(durationMetric, Math.round(performance.now() - startedAt), {
            ...tags,
            result: 'success',
        })
        return result
    } catch (error) {
        distribution(durationMetric, Math.round(performance.now() - startedAt), {
            ...tags,
            result: 'failure',
        })
        increment(failureMetric, 1, { ...tags, result: 'failure' })
        throw error
    }
}
