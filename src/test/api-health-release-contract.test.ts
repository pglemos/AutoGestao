/**
 * Contrato de `/api/health.release`.
 *
 * O endpoint precisa expor exatamente a release server-side que também é
 * usada por `/api/health`, sem cair no rewrite da SPA e sem revelar outras
 * variáveis de ambiente.
 */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'

import healthRelease from '../../api/health.release'

const RELEASE_SHA = '506314042e93f4364e2f85487754d717a48fc290'
const FALLBACK_SHA = 'ade4cbb418d3e57774fea069be88279f28d72e17'
const RELEASE_ENV_KEYS = ['VITE_RELEASE', 'VERCEL_GIT_COMMIT_SHA'] as const
const originalEnvironment = Object.fromEntries(
    RELEASE_ENV_KEYS.map((key) => [key, process.env[key]]),
)

beforeEach(() => {
    process.env.VITE_RELEASE = RELEASE_SHA
    process.env.VERCEL_GIT_COMMIT_SHA = FALLBACK_SHA
})

afterEach(() => {
    for (const key of RELEASE_ENV_KEYS) {
        const value = originalEnvironment[key]
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
    }
})

describe('/api/health.release', () => {
    it('devolve somente o SHA efetivo, sem cache, com header de release', async () => {
        const response = await healthRelease.fetch(
            new Request('https://mx.test/api/health.release'),
        )

        expect(response.status).toBe(200)
        expect(await response.text()).toBe(RELEASE_SHA)
        expect(response.headers.get('Content-Type')).toContain('text/plain')
        expect(response.headers.get('Cache-Control')).toContain('no-store')
        expect(response.headers.get('X-Release')).toBe(RELEASE_SHA)
    })

    it('usa o SHA da Vercel quando VITE_RELEASE está ausente', async () => {
        delete process.env.VITE_RELEASE

        const response = await healthRelease.fetch(
            new Request('https://mx.test/api/health.release'),
        )

        expect(await response.text()).toBe(FALLBACK_SHA)
    })

    it('responde OPTIONS sem corpo e rejeita métodos não suportados', async () => {
        const options = await healthRelease.fetch(
            new Request('https://mx.test/api/health.release', { method: 'OPTIONS' }),
        )
        expect(options.status).toBe(204)

        const post = await healthRelease.fetch(
            new Request('https://mx.test/api/health.release', { method: 'POST' }),
        )
        expect(post.status).toBe(405)
        expect(post.headers.get('Content-Type')).toContain('application/json')
        expect((await post.json()).error_code).toBe('method_not_allowed')
    })
})
