/**
 * Contrato de `/api/health`.
 *
 * A regressão que estes testes travam: a sonda de banco consultava
 * `system_health_log` com a chave anon e tratava `401/403` como saúde. Isso gerava
 * `permission denied` no Postgres a cada chamada e, depois do lockdown de telemetria,
 * teria passado a reportar `ok` com o banco inacessível.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import health from '../../api/health'

const SUPABASE_URL = 'https://project.supabase.co'
const originalFetch = globalThis.fetch

type RouteMap = Record<string, { status: number; body?: unknown }>

/** Responde por sufixo de rota; qualquer rota não mapeada explode o teste. */
function mockRoutes(routes: RouteMap) {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input instanceof Request ? input.url : input)
        const key = Object.keys(routes).find((route) => url.includes(route))
        if (!key) throw new Error(`rota não mapeada no teste: ${url}`)
        const { status, body } = routes[key]
        return new Response(body === undefined ? null : JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    }) as typeof fetch
}

const HEALTHY: RouteMap = {
    '/auth/v1/health': { status: 200, body: { healthy: true } },
    '/rpc/mx_database_health': { status: 200, body: true },
    '/rpc/mx_critical_cron_status': { status: 200, body: { status: 'ok', degraded: 0 } },
}

async function call(init?: RequestInit) {
    const response = await health.fetch(new Request('https://mx.test/api/health', init))
    return { response, body: await response.clone().json() }
}

beforeEach(() => {
    process.env.VITE_SUPABASE_URL = SUPABASE_URL
    process.env.VITE_SUPABASE_ANON_KEY = 'anon-key-de-teste'
})

afterEach(() => {
    globalThis.fetch = originalFetch
})

describe('/api/health — sonda de banco', () => {
    it('usa a RPC mx_database_health e nunca consulta system_health_log', async () => {
        const visited: string[] = []
        globalThis.fetch = (async (input: RequestInfo | URL) => {
            const url = String(input instanceof Request ? input.url : input)
            visited.push(url)
            const key = Object.keys(HEALTHY).find((route) => url.includes(route))!
            return new Response(JSON.stringify(HEALTHY[key].body), { status: 200 })
        }) as typeof fetch

        await call()

        expect(visited.some((url) => url.includes('/rpc/mx_database_health'))).toBe(true)
        // A regressão original vive aqui: qualquer volta a `system_health_log` reabre
        // o ruído de `permission denied` no Postgres.
        expect(visited.some((url) => url.includes('system_health_log'))).toBe(false)
    })

    it('trata 401 como falha, não como saúde', async () => {
        mockRoutes({
            ...HEALTHY,
            '/rpc/mx_database_health': { status: 401, body: { message: 'permission denied' } },
        })

        const { response, body } = await call()

        expect(body.checks.database).toBe('fail')
        expect(body.status).toBe('unhealthy')
        expect(response.status).toBe(503)
    })

    it('trata 403 como falha, não como saúde', async () => {
        mockRoutes({ ...HEALTHY, '/rpc/mx_database_health': { status: 403, body: {} } })

        const { body } = await call()

        expect(body.checks.database).toBe('fail')
    })

    it('marca degraded quando a RPC ainda não existe no ambiente (404)', async () => {
        mockRoutes({ ...HEALTHY, '/rpc/mx_database_health': { status: 404, body: {} } })

        const { response, body } = await call()

        expect(body.checks.database).toBe('degraded')
        expect(body.status).toBe('degraded')
        expect(response.status).toBe(200)
    })

    it('marca fail quando a RPC responde 200 com corpo inesperado', async () => {
        mockRoutes({ ...HEALTHY, '/rpc/mx_database_health': { status: 200, body: false } })

        const { body } = await call()

        expect(body.checks.database).toBe('fail')
    })
})

describe('/api/health — saúde de cron', () => {
    it('reporta ok quando nenhum job está atrasado', async () => {
        mockRoutes(HEALTHY)

        const { body } = await call()

        expect(body.checks.critical_crons).toBe('ok')
        expect(body.status).toBe('healthy')
    })

    it('reporta degraded quando ao menos um job está atrasado', async () => {
        mockRoutes({
            ...HEALTHY,
            '/rpc/mx_critical_cron_status': {
                status: 200,
                body: { status: 'degraded', degraded: 1, worst_job: 'mx-google-meet-ata' },
            },
        })

        const { response, body } = await call()

        expect(body.checks.critical_crons).toBe('degraded')
        expect(body.status).toBe('degraded')
        expect(response.status).toBe(200)
    })

    it('reporta unknown quando a RPC falha, sem derrubar o health', async () => {
        mockRoutes({ ...HEALTHY, '/rpc/mx_critical_cron_status': { status: 500, body: {} } })

        const { body } = await call()

        expect(body.checks.critical_crons).toBe('unknown')
        expect(body.status).toBe('healthy')
    })
})

describe('/api/health — contrato de resposta', () => {
    it('devolve o correlation id recebido e proíbe cache', async () => {
        mockRoutes(HEALTHY)

        const { response, body } = await call({ headers: { 'x-correlation-id': 'audit-e2e-1' } })

        expect(body.correlation_id).toBe('audit-e2e-1')
        expect(response.headers.get('Cache-Control')).toContain('no-store')
    })

    it('rejeita métodos não suportados', async () => {
        mockRoutes(HEALTHY)

        const { response, body } = await call({ method: 'POST' })

        expect(response.status).toBe(405)
        expect(body.error_code).toBe('method_not_allowed')
    })

    it('responde OPTIONS sem tocar no Supabase', async () => {
        globalThis.fetch = (() => {
            throw new Error('OPTIONS não deve fazer requisição alguma')
        }) as unknown as typeof fetch

        const response = await health.fetch(
            new Request('https://mx.test/api/health', { method: 'OPTIONS' }),
        )

        expect(response.status).toBe(204)
    })
})
