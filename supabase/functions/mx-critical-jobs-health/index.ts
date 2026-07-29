/**
 * mx-critical-jobs-health
 *
 * Executa o agregador `public.mx_critical_jobs_health()` e publica o resultado
 * como check-in no Cron Monitor homônimo do Sentry.
 *
 * Por que o check-in não sai direto do Postgres: o protocolo de check-in do
 * Sentry usa envelope — corpo de texto delimitado por linha — e pg_net só envia
 * corpo JSON. Esta função faz a tradução.
 *
 * Invocada de hora em hora pelo pg_cron, autenticada com a service role key
 * lida do Vault. Não é um endpoint público.
 */

import { corsHeaders } from '../_shared/cors.ts'
import { initSentryForEdge, withSentry } from '../_shared/sentry.ts'

const env = (key: string): string | undefined => Deno.env.get(key)

const SENTRY_ENVELOPE_CONTENT_TYPE = 'application/x-sentry-envelope'
const MONITOR_SLUG = 'mx-critical-jobs-health'

interface AggregatorResult {
    status: 'ok' | 'error'
    correlation_id: string
    total: number
    degraded: number
    duration_ms: number
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
}

/** Extrai org id, project id e chave pública do DSN configurado. */
function parseDsn(dsn: string): { org: string; project: string; key: string } | null {
    // https://<key>@o<org>.ingest.<region>.sentry.io/<project>
    const match = dsn.match(/^https:\/\/([0-9a-f]+)@(o\d+)\.ingest\.([a-z0-9.]+)\/(\d+)$/i)
    if (!match) return null
    return { key: match[1], org: `${match[2]}.ingest.${match[3]}`, project: match[4] }
}

/**
 * Publica um check-in. Falha aqui nunca derruba o job: o resultado já está
 * gravado em cron_execution_log, e perder o check-in é menos grave do que
 * transformar a telemetria na causa de um incidente.
 */
async function sendCheckIn(
    status: 'in_progress' | 'ok' | 'error',
    options: { checkInId?: string; durationMs?: number; correlationId?: string } = {},
): Promise<string | null> {
    // O check-in precisa ir para o projeto que hospeda o monitor
    // (mx-performance-health). SENTRY_DSN aponta para mx-performance-edge, que é
    // onde os erros desta função devem cair — são coisas diferentes, e usar o
    // DSN errado faz o check-in ser aceito e descartado silenciosamente.
    const dsn = env('SENTRY_CRON_DSN') ?? env('SENTRY_DSN')
    if (!dsn) return null

    const parsed = parseDsn(dsn)
    if (!parsed) {
        console.warn('[cron-health] SENTRY_DSN em formato inesperado; check-in ignorado')
        return null
    }

    const checkInId = options.checkInId ?? crypto.randomUUID().replace(/-/g, '')
    const url = `https://${parsed.org}/api/${parsed.project}/envelope/?sentry_key=${parsed.key}&sentry_version=7`

    const envelope = [
        JSON.stringify({ event_id: checkInId, sent_at: new Date().toISOString() }),
        JSON.stringify({ type: 'check_in' }),
        JSON.stringify({
            check_in_id: checkInId,
            monitor_slug: MONITOR_SLUG,
            status,
            environment: env('SENTRY_ENVIRONMENT') ?? 'production',
            release: env('SENTRY_RELEASE') ?? 'unknown',
            ...(options.durationMs != null ? { duration: options.durationMs } : {}),
        }),
    ].join('\n') + '\n'

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': SENTRY_ENVELOPE_CONTENT_TYPE },
            body: envelope,
        })
        if (!response.ok) {
            console.warn(`[cron-health] check-in ${status} recusado: HTTP ${response.status}`)
            return null
        }
        return checkInId
    } catch (error) {
        console.warn('[cron-health] check-in falhou:', error instanceof Error ? error.name : 'unknown')
        return null
    }
}

/** Confere se o portador é a service role, aceitando ambos os formatos de chave. */
function isServiceRole(authorization: string | null, serviceRoleKey: string): boolean {
    if (!authorization?.startsWith('Bearer ')) return false
    const token = authorization.slice('Bearer '.length).trim()
    if (!token) return false
    if (serviceRoleKey && token === serviceRoleKey) return true

    const segments = token.split('.')
    if (segments.length !== 3) return false
    try {
        const padded = segments[1].replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')))
        return payload?.role === 'service_role'
    } catch {
        return false
    }
}

initSentryForEdge()

Deno.serve((req) => withSentry(MONITOR_SLUG, req, async () => {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
    if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'Method not allowed' }, 405)

    const supabaseUrl = env('SUPABASE_URL') ?? ''
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceRoleKey) {
        return jsonResponse({ ok: false, error: 'Configuração ausente' }, 500)
    }

    // Só a service role dispara o agregador.
    //
    // A verificação é pelo claim `role` do token, não por igualdade literal com
    // SUPABASE_SERVICE_ROLE_KEY: o projeto tem chaves no formato legado (JWT) e
    // no novo (sb_secret_), e comparar strings rejeitaria o chamador legítimo
    // sempre que o secret e o token em uso fossem de formatos diferentes.
    // O gateway do Supabase já valida a assinatura antes de chegar aqui.
    if (!isServiceRole(req.headers.get('Authorization'), serviceRoleKey)) {
        return jsonResponse({ ok: false, error: 'Unauthorized' }, 401)
    }

    const startedAt = Date.now()
    const checkInId = await sendCheckIn('in_progress')

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/mx_critical_jobs_health`, {
        method: 'POST',
        headers: {
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
        },
        body: '{}',
    })

    if (!rpcResponse.ok) {
        await sendCheckIn('error', { checkInId: checkInId ?? undefined, durationMs: Date.now() - startedAt })
        console.error(`[cron-health] agregador falhou: HTTP ${rpcResponse.status}`)
        return jsonResponse({ ok: false, error: 'Falha ao executar o agregador' }, 502)
    }

    const result = (await rpcResponse.json()) as AggregatorResult
    await sendCheckIn(result.status === 'ok' ? 'ok' : 'error', {
        checkInId: checkInId ?? undefined,
        durationMs: Date.now() - startedAt,
        correlationId: result.correlation_id,
    })

    return jsonResponse({
        ok: true,
        status: result.status,
        total: result.total,
        degraded: result.degraded,
        correlation_id: result.correlation_id,
    })
}))
