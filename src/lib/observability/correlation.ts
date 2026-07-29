/**
 * Story 0.9 — Correlation ID FE → RPC → logs_auditoria
 * X-8 / GAP-09 observability
 *
 * Gera UUID v4 por operação e injeta como header `x-correlation-id`. Backend lê
 * via PostgREST `current_setting('request.headers', true)` → `get_correlation_id()`.
 *
 * Uso:
 *   const { result, correlationId } = await traced(() => supabase.rpc('foo', {...}))
 *   // ou, com id já conhecido:
 *   await withCorrelation(correlationId, () => supabase.rpc('foo', {...}))
 *
 * Implementação — por que não trocar `globalThis.fetch` por chamada:
 * a versão anterior salvava `originalFetch`, substituía o global e restaurava no
 * `finally`. Com duas chamadas concorrentes, a segunda captura o fetch já
 * instrumentado pela primeira, e o `finally` da primeira restaura o global por
 * cima do da segunda — o header vaza para requisições alheias e, no pior caso,
 * o wrapper fica instalado permanentemente. Aqui há um único interceptador,
 * instalado uma vez, que lê o correlation_id de uma pilha de escopo. O fetch
 * original nunca é perdido e chamadas concorrentes não se sobrescrevem.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const CORRELATION_HEADER = 'x-correlation-id'

/** Gera um UUID v4 (Web Crypto API; fallback Math.random para ambientes sem crypto) */
export function newCorrelationId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }
    // Fallback (apenas dev/test; produção SEMPRE tem crypto.randomUUID)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/** Tenta marcar tag Sentry sem falhar se Sentry não estiver inicializado */
function tagSentry(correlationId: string): void {
    try {
        const sentry = (globalThis as unknown as { Sentry?: { setTag?: (k: string, v: string) => void } }).Sentry
        if (sentry && typeof sentry.setTag === 'function') {
            sentry.setTag('correlation_id', correlationId)
        }
    } catch {
        // No-op — Sentry pode não estar inicializado ainda.
    }
}

/**
 * Pilha de escopos ativos. O topo é o correlation_id aplicado às requisições
 * disparadas de forma síncrona dentro do escopo corrente.
 *
 * Limitação conhecida e aceita: o JavaScript de navegador não tem
 * AsyncLocalStorage, então o escopo vale para o fetch iniciado sincronamente
 * dentro do callback. Chamadas realmente paralelas (Promise.all de escopos
 * distintos) devem usar `withCorrelationHeaders` para anexar o header
 * explicitamente. O importante é que, mesmo nesse caso, nada é corrompido:
 * cada requisição recebe um id válido ou nenhum, nunca o fetch de outra pilha.
 */
const scopeStack: string[] = []

let interceptorInstalled = false

/** Instala o único interceptador de fetch. Idempotente. */
function ensureInterceptor(): void {
    if (interceptorInstalled) return
    if (typeof globalThis.fetch !== 'function') return

    const originalFetch = globalThis.fetch.bind(globalThis)

    const instrumented = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const correlationId = scopeStack[scopeStack.length - 1]
        if (!correlationId) return originalFetch(input, init)

        // Request como primeiro argumento já carrega os próprios headers.
        if (typeof Request !== 'undefined' && input instanceof Request && !init?.headers) {
            if (input.headers.has(CORRELATION_HEADER)) return originalFetch(input, init)
            const headers = new Headers(input.headers)
            headers.set(CORRELATION_HEADER, correlationId)
            return originalFetch(new Request(input, { headers }), init)
        }

        const headers = new Headers(init?.headers)
        if (!headers.has(CORRELATION_HEADER)) {
            headers.set(CORRELATION_HEADER, correlationId)
        }
        return originalFetch(input, { ...init, headers })
    }) as typeof fetch

    globalThis.fetch = instrumented
    interceptorInstalled = true
}

/** correlation_id do escopo ativo, se houver. Usado por logger e métricas. */
export function getActiveCorrelationId(): string | undefined {
    return scopeStack[scopeStack.length - 1]
}

/**
 * Headers prontos para anexar manualmente quando o escopo implícito não serve
 * (por exemplo, requisições realmente paralelas com ids distintos).
 */
export function withCorrelationHeaders(
    correlationId: string,
    headers?: HeadersInit,
): Headers {
    const merged = new Headers(headers)
    merged.set(CORRELATION_HEADER, correlationId)
    return merged
}

/**
 * Executa `fn` com o correlation_id ativo. As requisições disparadas dentro do
 * escopo recebem o header automaticamente.
 */
export async function withCorrelation<T>(
    correlationId: string,
    fn: () => Promise<T>,
): Promise<T> {
    ensureInterceptor()
    tagSentry(correlationId)
    scopeStack.push(correlationId)
    try {
        return await fn()
    } finally {
        // Remove a própria entrada, não necessariamente o topo — assim escopos
        // que terminam fora de ordem não descartam o id de outro escopo.
        const index = scopeStack.lastIndexOf(correlationId)
        if (index !== -1) scopeStack.splice(index, 1)
    }
}

/** Variante que recebe o SupabaseClient para composição explícita. */
export async function callWithCorrelation<T>(
    client: SupabaseClient,
    correlationId: string,
    fn: (c: SupabaseClient) => Promise<T>,
): Promise<T> {
    return withCorrelation(correlationId, () => fn(client))
}

/**
 * Atalho: gera um correlation_id novo + executa.
 * Retorna { result, correlationId } para uso em logs FE / Sentry breadcrumbs.
 */
export async function traced<T>(
    fn: () => Promise<T>,
): Promise<{ result: T; correlationId: string }> {
    const correlationId = newCorrelationId()
    const result = await withCorrelation(correlationId, fn)
    return { result, correlationId }
}

export { CORRELATION_HEADER }
