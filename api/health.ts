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

type CheckState = 'ok' | 'degraded' | 'fail' | 'unknown'

interface HealthChecks {
    vercel: CheckState
    supabase_api: CheckState
    database: CheckState
    critical_crons: CheckState
}

function getSupabaseConfig(): { url: string; anonKey: string; serverKey: string } {
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
    const serverKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    return { url: url.replace(/\/$/, ''), anonKey, serverKey }
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

/**
 * Alcançabilidade da API do Supabase.
 *
 * Usa /auth/v1/health, que é público e barato. A raiz /rest/v1/ não serve como
 * sonda: ela aceita apenas a service_role e responde 401 para a anon key, o que
 * pareceria uma falha de plataforma quando na verdade é o comportamento normal.
 */
async function checkSupabaseApi(url: string, anonKey: string): Promise<CheckState> {
    if (!url || !anonKey) return 'fail'
    try {
        const response = await fetchWithTimeout(`${url}/auth/v1/health`, {
            method: 'GET',
            headers: { apikey: anonKey },
        })
        return response.ok ? 'ok' : 'fail'
    } catch {
        return 'fail'
    }
}

/**
 * Sonda de liveness do banco via RPC `mx_database_health`, que retorna `true` e não
 * lê tabela alguma.
 *
 * A versão anterior consultava `system_health_log` com a chave anon e tratava
 * `401/403` como sinal de saúde. Isso tinha dois defeitos: gravava
 * `permission denied for table system_health_log` no Postgres a cada sondagem, e
 * transformava "negado" em "saudável" — depois do lockdown de telemetria a sonda
 * passaria a responder `ok` mesmo com o banco fora do ar.
 *
 * Aqui só um `200` com corpo `true` conta como saúde. Nada mais.
 */
async function checkDatabase(url: string, anonKey: string): Promise<CheckState> {
    if (!url || !anonKey) return 'fail'
    try {
        const response = await fetchWithTimeout(`${url}/rest/v1/rpc/mx_database_health`, {
            method: 'POST',
            headers: {
                apikey: anonKey,
                Authorization: `Bearer ${anonKey}`,
                'Content-Type': 'application/json',
            },
            body: '{}',
        })

        // 404/PGRST202 = PostgREST respondeu, mas a RPC ainda não existe neste
        // ambiente. O banco está de pé; falta a migration. Estado transitório de
        // rollout, não falha de plataforma.
        if (response.status === 404) return 'degraded'
        if (!response.ok) return 'fail'

        return (await response.json()) === true ? 'ok' : 'fail'
    } catch {
        return 'fail'
    }
}

/**
 * Saúde dos crons via `mx_critical_cron_status`, que avalia **cada job contra o
 * próprio schedule** e devolve o pior caso.
 *
 * A versão anterior usava `mx_critical_cron_age_seconds`, que era um
 * `max(finished_at)` sobre todos os jobs juntos, comparado a uma janela fixa de 26h.
 * Um único cron saudável zerava a idade global e mascarava todos os outros — foi
 * assim que `mx-google-meet-ata` falhou com 401 em toda execução sem nunca aparecer
 * como degradado.
 */
async function checkCriticalCrons(url: string, serverKey: string): Promise<CheckState> {
    // This RPC reads pg_cron metadata and is intentionally not executable by
    // anon. Keep the service key inside the serverless function; the browser
    // still uses the publishable key for the public liveness checks above.
    if (!url || !serverKey) return 'unknown'
    try {
        const response = await fetchWithTimeout(`${url}/rest/v1/rpc/mx_critical_cron_status`, {
            method: 'POST',
            headers: {
                apikey: serverKey,
                Authorization: `Bearer ${serverKey}`,
                'Content-Type': 'application/json',
            },
            body: '{}',
        })
        if (!response.ok) return 'unknown'

        const result = (await response.json()) as { status?: string; degraded?: number } | null
        if (!result || typeof result.status !== 'string') return 'unknown'

        return result.status === 'ok' ? 'ok' : 'degraded'
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
    const { url, anonKey, serverKey } = getSupabaseConfig()

    const [supabaseApi, database, criticalCrons] = await Promise.all([
        checkSupabaseApi(url, anonKey),
        checkDatabase(url, anonKey),
        checkCriticalCrons(url, serverKey),
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
