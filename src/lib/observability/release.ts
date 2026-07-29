/**
 * Release resolution — a mesma release precisa aparecer em Vercel, Sentry FE,
 * Sentry Edge, /api/health e nos logs persistentes.
 *
 * Ordem de precedência:
 *   1. VITE_RELEASE                        — definido explicitamente no projeto
 *   2. VITE_VERCEL_GIT_COMMIT_SHA          — injetado automaticamente pela Vercel
 *   3. 'unknown'                           — nunca 'dev' em produção (§8.5)
 */

const RAW_ENV = import.meta.env as Record<string, string | undefined>

function firstDefined(...values: Array<string | undefined>): string | undefined {
    for (const value of values) {
        if (value && value.trim().length > 0) return value.trim()
    }
    return undefined
}

/** SHA completo do commit que gerou o bundle atual. */
export function getRelease(): string {
    const release = firstDefined(
        RAW_ENV.VITE_RELEASE,
        RAW_ENV.VITE_VERCEL_GIT_COMMIT_SHA,
    )
    if (release) return release
    // Em dev local não há SHA; em produção isso é um defeito de configuração.
    return RAW_ENV.PROD ? 'unknown' : 'local-dev'
}

/** Versão curta para exibição (7 caracteres, padrão git). */
export function getShortRelease(): string {
    const release = getRelease()
    return /^[0-9a-f]{40}$/i.test(release) ? release.slice(0, 7) : release
}

/** production | preview | development */
export function getEnvironment(): string {
    return (
        firstDefined(
            RAW_ENV.VITE_SENTRY_ENVIRONMENT,
            RAW_ENV.VITE_VERCEL_ENV,
            RAW_ENV.MODE,
        ) ?? 'development'
    )
}

/** Identificador do deployment Vercel, quando disponível. */
export function getDeploymentId(): string | undefined {
    return firstDefined(RAW_ENV.VITE_VERCEL_DEPLOYMENT_ID, RAW_ENV.VITE_VERCEL_URL)
}

/** Branch de origem do deployment, quando disponível. */
export function getBranch(): string | undefined {
    return firstDefined(RAW_ENV.VITE_VERCEL_GIT_COMMIT_REF)
}
