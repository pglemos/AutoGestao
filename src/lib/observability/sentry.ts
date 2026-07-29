/**
 * Story 0.3 — Sentry init (FE)
 * Integra com Story 0.9 correlation_id via tag automática.
 *
 * Env vars (configurar no Vercel Dashboard, Production e Preview):
 *   VITE_SENTRY_DSN                — DSN público do projeto mx-performance-frontend
 *   VITE_SENTRY_ENVIRONMENT        — production | preview | development
 *   VITE_SENTRY_TRACES_SAMPLE_RATE — 0.0-1.0 (default 1 — coleta máxima gratuita)
 *   VITE_RELEASE                   — SHA do commit; cai para VITE_VERCEL_GIT_COMMIT_SHA
 *
 * Se VITE_SENTRY_DSN não estiver definido, init vira no-op (dev local).
 */

import * as Sentry from '@sentry/react'
import { getEnvironment, getRelease, getBranch, getDeploymentId } from './release'
import { sanitizeSentryEvent, sanitizeUrl } from './sanitize'

export interface SentryConfig {
    dsn?: string
    environment?: string
    release?: string
    tracesSampleRate?: number
}

let initialized = false

/** Rotas cuja navegação é sempre amostrada a 100% (§10.5). */
const CRITICAL_ROUTE = /^\/(login|home|meu-dia|terminal-mx|carteira|funil|relatorios|gerente|dono|admin)(\/|$)/

function numberFromEnv(value: string | undefined, fallback: number): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback
}

export function initSentry(config?: SentryConfig): void {
    if (initialized) return

    const dsn = config?.dsn ?? import.meta.env.VITE_SENTRY_DSN
    if (!dsn) {
        if (import.meta.env.PROD) {
            console.warn('[sentry] VITE_SENTRY_DSN ausente em produção — observabilidade DESABILITADA (SYS-017)')
        }
        return
    }

    const environment = config?.environment ?? getEnvironment()
    const release = config?.release ?? getRelease()
    const tracesSampleRate =
        config?.tracesSampleRate ??
        numberFromEnv(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE, 1)

    // Replay de sessão: mantido baixo por causa da franquia gratuita; toda sessão
    // que gera erro é capturada integralmente.
    const replaysSessionSampleRate = numberFromEnv(
        import.meta.env.VITE_SENTRY_REPLAY_SESSION_SAMPLE_RATE,
        0.05,
    )

    Sentry.init({
        dsn,
        environment,
        release,
        sendDefaultPii: false,
        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
                maskAllText: true,
                maskAllInputs: true,
                blockAllMedia: true,
                // Só libera o que é comprovadamente livre de PII.
                unmask: ['.mx-replay-safe'],
                networkDetailAllowUrls: [],
            }),
        ],
        tracesSampleRate,
        tracesSampler(samplingContext) {
            const name = String(samplingContext.name ?? '')
            if (CRITICAL_ROUTE.test(name)) return 1
            return tracesSampleRate
        },
        replaysSessionSampleRate,
        replaysOnErrorSampleRate: 1,
        // Sentry Logs (SDK v10). Ignorado silenciosamente em versões que não suportam.
        enableLogs: true,
        // Propaga trace para o backend Supabase e para as próprias funções da Vercel.
        tracePropagationTargets: [
            /^\//,
            /^https:\/\/[a-z0-9-]+\.supabase\.co/,
            /^https:\/\/(www\.)?mxperformance\.com\.br/,
        ],
        ignoreErrors: [
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
            'Network request failed', // ofuscado por design — problema real vem das RPCs
            'AbortError',
        ],
        beforeSend(event) {
            return sanitizeSentryEvent(event as never) as typeof event
        },
        beforeBreadcrumb(breadcrumb) {
            if (breadcrumb.category === 'console' && breadcrumb.level === 'debug') return null
            if (typeof breadcrumb.data?.url === 'string') {
                breadcrumb.data.url = sanitizeUrl(breadcrumb.data.url)
            }
            return breadcrumb
        },
    })

    Sentry.setTags({
        'mx.branch': getBranch() ?? 'unknown',
        'mx.deployment_id': getDeploymentId() ?? 'unknown',
    })

    // Expõe globalmente para correlation.ts / logger.ts / metrics.ts integrarem
    // sem criar dependência circular de import.
    if (typeof globalThis !== 'undefined') {
        ;(globalThis as unknown as { Sentry: typeof Sentry }).Sentry = Sentry
    }

    initialized = true
}

export function isSentryInitialized(): boolean {
    return initialized
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
    if (!initialized) return
    Sentry.captureException(error, { extra: context })
}

export function setCorrelationTag(correlationId: string): void {
    if (!initialized) return
    Sentry.setTag('correlation_id', correlationId)
}

export { Sentry }
