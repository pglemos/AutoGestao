/**
 * Sanitização de eventos antes do envio ao Sentry.
 *
 * Regra: nenhum secret, token ou PII sai do navegador. Aplicado a headers,
 * query strings, breadcrumbs, contexts e extras.
 */

const REDACTED = '[REDACTED]'

/** Chaves cujo valor nunca pode ser transmitido. */
const SENSITIVE_KEY = /(authorization|cookie|set-cookie|apikey|api_key|access[_-]?token|refresh[_-]?token|id[_-]?token|session|secret|password|senha|service[_-]?role|bearer|x-supabase|sb-[a-z0-9-]+-auth-token)/i

/** Chaves com dado pessoal identificável. */
const PII_KEY = /(^|_)(email|e-mail|cpf|cnpj|telefone|phone|whatsapp|celular|nome_completo|full_name|birth|nascimento|endereco|address)(_|$)/i

/** Padrões de valor que denunciam credencial mesmo em chave inocente. */
const SENSITIVE_VALUE = [
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, // JWT
    /\bsb[pk]_[A-Za-z0-9]{20,}/, // Supabase tokens
    /\bgh[pousr]_[A-Za-z0-9]{20,}/, // GitHub tokens
    /\bsntry[a-z]*_[A-Za-z0-9]{20,}/, // Sentry tokens
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/, // e-mail
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/, // CPF
]

function redactString(value: string): string {
    let out = value
    for (const pattern of SENSITIVE_VALUE) {
        out = out.replace(new RegExp(pattern.source, pattern.flags + 'g'), REDACTED)
    }
    return out
}

function shouldRedactKey(key: string): boolean {
    return SENSITIVE_KEY.test(key) || PII_KEY.test(key)
}

/** Percorre estrutura arbitrária redigindo chaves e valores sensíveis. */
export function sanitizeValue(input: unknown, depth = 0): unknown {
    if (depth > 6) return '[TRUNCATED]'
    if (input == null) return input
    if (typeof input === 'string') return redactString(input)
    if (typeof input === 'number' || typeof input === 'boolean') return input
    if (Array.isArray(input)) return input.slice(0, 50).map((item) => sanitizeValue(item, depth + 1))
    if (typeof input === 'object') {
        const out: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
            out[key] = shouldRedactKey(key) ? REDACTED : sanitizeValue(value, depth + 1)
        }
        return out
    }
    return undefined
}

/** Remove querystring sensível preservando o path para agrupamento. */
export function sanitizeUrl(url: string | undefined): string | undefined {
    if (!url) return url
    try {
        const parsed = new URL(url, 'https://placeholder.invalid')
        for (const key of Array.from(parsed.searchParams.keys())) {
            if (shouldRedactKey(key)) parsed.searchParams.set(key, REDACTED)
        }
        const rendered = parsed.origin === 'https://placeholder.invalid'
            ? parsed.pathname + parsed.search
            : parsed.toString()
        return redactString(rendered)
    } catch {
        return redactString(url)
    }
}

interface SentryLikeEvent {
    request?: { headers?: Record<string, unknown>; url?: string; query_string?: unknown; data?: unknown }
    breadcrumbs?: Array<{ data?: unknown; message?: string }>
    contexts?: Record<string, unknown>
    extra?: Record<string, unknown>
    user?: Record<string, unknown>
    tags?: Record<string, unknown>
}

/**
 * beforeSend do Sentry. Retorna o evento saneado; nunca descarta silenciosamente
 * (descartar esconderia incidentes reais).
 */
export function sanitizeSentryEvent<T extends SentryLikeEvent>(event: T): T {
    // Um beforeSend que lança faz o Sentry descartar o evento: o incidente real
    // some e o relatado passa a ser a falha da sanitização. Foi o que aconteceu
    // em /login (issue 7639492646), com o evento chegando sem corpo.
    if (!event || typeof event !== 'object') return event

    if (event.request) {
        if (event.request.headers) {
            event.request.headers = sanitizeValue(event.request.headers) as Record<string, unknown>
        }
        event.request.url = sanitizeUrl(event.request.url)
        if (event.request.query_string) {
            event.request.query_string = sanitizeValue(event.request.query_string) as never
        }
        // Corpo de request nunca é enviado — pode conter payload de negócio com PII.
        delete event.request.data
    }

    if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => ({
            ...crumb,
            message: crumb.message ? redactString(crumb.message) : crumb.message,
            data: crumb.data ? (sanitizeValue(crumb.data) as never) : crumb.data,
        }))
    }

    if (event.extra) event.extra = sanitizeValue(event.extra) as Record<string, unknown>
    if (event.contexts) event.contexts = sanitizeValue(event.contexts) as Record<string, unknown>

    // user: apenas id/role/escopo. E-mail, nome e IP são removidos.
    if (event.user) {
        const { id, role, store_id, company_id } = event.user as Record<string, unknown>
        event.user = { id, role, store_id, company_id }
    }

    return event
}
