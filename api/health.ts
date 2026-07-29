/**
 * GET /api/health — endpoint de saúde de produção.
 *
 * Verifica, nesta ordem: a própria Vercel Function, a API do Supabase, uma
 * consulta mínima ao banco e a idade da última execução dos crons críticos.
 *
 * Contrato de resposta:
 *   200 — status "healthy" ou "degraded" (operação segue possível)
 *   503 — status "unhealthy" (falha crítica)
 *
 * Nunca retorna secret, SQL, stack trace ou PII. Mensagens de erro são
 * normalizadas para um código curto.
 */

const TIMEOUT_MS = 8_000

/** Idade máxima tolerada para o cron crítico mais recente. */
const CRON_MAX_AGE_MS = 26 * 60 * 60 * 1000 // 26h — cobre janela diária + atraso

type CheckState = 'ok' | 'degraded' | 'fail' | 'unknown'

interface HealthChecks {
    vercel: CheckState
    supabase_api: CheckState
    database: CheckState
    critical_crons: CheckState
}

function getSupabaseConfig(): { url: string; anonKey: string } {
    const url =
        process.env.SUPABASE_URL ||
        process.env.VITE_SUPABASE_URL ||
        process.env.VITE_PUBLIC_SUPABASE_URL ||
        ''
    const anonKey =
        process.env.SUPABASE_ANON_KEY ||
        process.env.VITE_SUPABASE_ANON_KEY ||
        process.env.VITE_PUBLIC_SUPABASE_ANON_KEY ||
        ''
    return { url: url.replace(/\/$/, ''), anonKey }
}

function getRelease(): string {
    return (
        process.env.VITE_RELEASE ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        'unknown'
    )
}

function getEnvironment(): string {
    return process.env.SENTRY_ENVIRONMENT || process.env.VERCEL_ENV || 'development'
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
        return await fetch(url, { ...init, signal: controller.signal })
    } finally {
        clearTimeout(timer)
    }
}

/** Alcançabilidade da API do Supabase (não valida dados). */
async function checkSupabaseApi(url: string, anonKey: string): Promise<CheckState> {
    if (!url || !anonKey) return 'fail'
    try {
        const response = await fetchWithTimeout(`${url}/rest/v1/`, {
            method: 'GET',
            headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
        })
        return response.ok || response.status === 404 ? 'ok' : 'fail'
    } catch {
        return 'fail'
    }
}

/**
 * Consulta mínima ao banco: pede zero linhas de uma tabela pública e confere
 * apenas o código HTTP. Não expõe dado algum.
 */
async function checkDatabase(url: string, anonKey: string): Promise<CheckState> {
    if (!url || !anonKey) return 'fail'
    try {
        const response = await fetchWithTimeout(
            `${url}/rest/v1/system_health_log?select=id&limit=1`,
            {
                method: 'GET',
                headers: {
                    apikey: anonKey,
                    Authorization: `Bearer ${anonKey}`,
                    Prefer: 'count=none',
                },
            },
        )
        // 200 = consulta ok. 401/403 = RLS ativa e negando anon, o que também
        // prova que PostgREST e Postgres responderam.
        if (response.ok || response.status === 401 || response.status === 403) return 'ok'
        return 'fail'
    } catch {
        return 'fail'
    }
}

/**
 * Idade da última execução registrada de cron crítico. Depende da RPC
 * `mx_critical_cron_age_seconds`, que expõe apenas um número.
 */
async function checkCriticalCrons(url: string, anonKey: string): Promise<CheckState> {
    if (!url || !anonKey) return 'unknown'
    try {
        const response = await fetchWithTimeout(
            `${url}/rest/v1/rpc/mx_critical_cron_age_seconds`,
            {
                method: 'POST',
                headers: {
                    apikey: anonKey,
                    Authorization: `Bearer ${anonKey}`,
                    'Content-Type': 'application/json',
                },
                body: '{}',
            },
        )
        if (!response.ok) return 'unknown'
        const ageSeconds = Number(await response.json())
        if (!Number.isFinite(ageSeconds)) return 'unknown'
        return ageSeconds * 1000 <= CRON_MAX_AGE_MS ? 'ok' : 'degraded'
    } catch {
        return 'unknown'
    }
}

function overallStatus(checks: HealthChecks): { status: string; httpStatus: number } {
    const values = Object.values(checks)
    if (values.includes('fail')) return { status: 'unhealthy', httpStatus: 503 }
    if (values.includes('degraded')) return { status: 'degraded', httpStatus: 200 }
    return { status: 'healthy', httpStatus: 200 }
}

async function health(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-correlation-id',
                'Cache-Control': 'no-store',
            },
        })
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
        return Response.json(
            { status: 'error', error_code: 'method_not_allowed' },
            { status: 405, headers: { 'Cache-Control': 'no-store' } },
        )
    }

    const startedAt = Date.now()
    const { url, anonKey } = getSupabaseConfig()

    const [supabaseApi, database, criticalCrons] = await Promise.all([
        checkSupabaseApi(url, anonKey),
        checkDatabase(url, anonKey),
        checkCriticalCrons(url, anonKey),
    ])

    const checks: HealthChecks = {
        vercel: 'ok', // se este código executou, a Function está viva
        supabase_api: supabaseApi,
        database,
        critical_crons: criticalCrons,
    }

    const { status, httpStatus } = overallStatus(checks)

    return Response.json(
        {
            status,
            checks,
            release: getRelease(),
            environment: getEnvironment(),
            duration_ms: Date.now() - startedAt,
            correlation_id: request.headers.get('x-correlation-id') ?? undefined,
            timestamp: new Date().toISOString(),
        },
        {
            status: httpStatus,
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Content-Type': 'application/json; charset=utf-8',
            },
        },
    )
}

// Mesma assinatura das demais funções deste projeto (api/store-pre-registration.ts).
export default {
    fetch: health,
}
