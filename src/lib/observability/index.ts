export {
    newCorrelationId,
    withCorrelation,
    withCorrelationHeaders,
    callWithCorrelation,
    getActiveCorrelationId,
    traced,
    CORRELATION_HEADER,
} from './correlation'

export {
    initSentry,
    isSentryInitialized,
    captureError,
    setCorrelationTag,
    Sentry,
} from './sentry'

export { initWebVitals } from './web-vitals'

export {
    getRelease,
    getShortRelease,
    getEnvironment,
    getBranch,
    getDeploymentId,
} from './release'

export { sanitizeSentryEvent, sanitizeValue, sanitizeUrl } from './sanitize'

export {
    setUserScope,
    clearUserScope,
    setOperationScope,
    getUserScope,
    getOperationScope,
    getObservabilityContext,
} from './context'
export type { UserScope, OperationScope } from './context'

export { logger, logOperation, buildEnvelope } from './logger'
export type { LogLevel, LogFields, LogEnvelope } from './logger'

export { MX_METRICS, increment, distribution, gauge, measure } from './metrics'
export type { MxMetricName, MetricTags } from './metrics'

export { VercelObservability } from './vercel'
