/**
 * Story 0.3 — Sentry para Edge Functions Deno
 *
 * Edge Functions Supabase usam Deno; Sentry tem SDK Deno via JSR.
 * Este helper centraliza init para reuso.
 *
 * Env vars necessárias (Supabase Dashboard → Functions → Secrets):
 *   SENTRY_DSN
 *   SENTRY_ENVIRONMENT (default: 'production')
 *   SENTRY_RELEASE (default: 'edge-dev')
 *
 * Uso em uma edge function:
 *
 *   import { initSentryForEdge, withSentry } from "../_shared/sentry.ts";
 *
 *   initSentryForEdge();
 *
 *   Deno.serve((req) => withSentry("nome-da-funcao", req, async () => {
 *     // ... handler logic
 *   }));
 */

import * as Sentry from "https://deno.land/x/sentry@7.94.1/index.mjs";

const env = (key: string): string | undefined => Deno.env.get(key);

let initialized = false;

export function initSentryForEdge(): void {
    if (initialized) return;

    const dsn = env("SENTRY_DSN");
    if (!dsn) {
        // No-op silencioso — DSN ausente é comum em dev local
        return;
    }

    Sentry.init({
        dsn,
        environment: env("SENTRY_ENVIRONMENT") ?? "production",
        release: env("SENTRY_RELEASE") ?? "edge-dev",
        // Coleta máxima dentro do plano gratuito: o volume das Edge Functions é
        // baixo comparado ao do frontend, e amostrar aqui esconderia exatamente
        // as falhas de integração que este instrumento existe para pegar.
        tracesSampleRate: 1,
        sendDefaultPii: false,
        beforeSend(event) {
            return sanitizeEdgeEvent(event);
        },
    });

    initialized = true;
}

/** Chaves cujo valor nunca pode sair da função. */
const SENSITIVE_KEY =
    /(authorization|cookie|apikey|api_key|access[_-]?token|refresh[_-]?token|session|secret|password|senha|service[_-]?role|bearer)/i;

const SENSITIVE_VALUE = [
    /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
    /\bsb[pk]_[A-Za-z0-9]{20,}/,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/,
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/,
];

function redact(value: unknown, depth = 0): unknown {
    if (depth > 5) return "[TRUNCATED]";
    if (value == null) return value;
    if (typeof value === "string") {
        let out = value;
        for (const pattern of SENSITIVE_VALUE) {
            out = out.replace(new RegExp(pattern.source, pattern.flags + "g"), "[REDACTED]");
        }
        return out;
    }
    if (typeof value === "number" || typeof value === "boolean") return value;
    if (Array.isArray(value)) return value.slice(0, 30).map((item) => redact(item, depth + 1));
    if (typeof value === "object") {
        const out: Record<string, unknown> = {};
        for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
            out[key] = SENSITIVE_KEY.test(key) ? "[REDACTED]" : redact(inner, depth + 1);
        }
        return out;
    }
    return undefined;
}

/** Sanitiza no próprio objeto e devolve o mesmo evento, preservando o tipo do SDK. */
function sanitizeEdgeEvent<T extends object>(event: T): T {
    const mutable = event as unknown as Record<string, unknown>;
    const request = mutable.request as Record<string, unknown> | undefined;
    if (request) {
        if (request.headers) request.headers = redact(request.headers);
        // Corpo pode conter payload de negócio com dado pessoal.
        delete request.data;
    }
    if (mutable.extra) mutable.extra = redact(mutable.extra);
    if (mutable.contexts) mutable.contexts = redact(mutable.contexts);
    return event;
}

/** Query string removida; só o path importa para agrupar. */
function safeUrl(rawUrl: string): string {
    try {
        const parsed = new URL(rawUrl);
        return parsed.origin + parsed.pathname;
    } catch {
        return "invalid-url";
    }
}

export interface EdgeObservabilityContext {
    functionName: string;
    correlationId: string;
    traceId: string;
    denoDeploymentId?: string;
    executionId?: string;
}

/** Resposta de erro sem SQLERRM, stack ou PII — Story 1.5 pattern. */
function internalErrorResponse(traceId: string): Response {
    return new Response(
        JSON.stringify({
            ok: false,
            error: `Erro interno na edge function. trace_id=${traceId}`,
            trace_id: traceId,
        }),
        {
            status: 500,
            headers: { "Content-Type": "application/json" },
        },
    );
}

/**
 * Wrapper que captura erros não tratados em handler Deno e propaga ao Sentry.
 *
 * Isolamento: as tags vão para um escopo próprio via `withScope`, não para o
 * escopo global. A versão anterior chamava `Sentry.setTag` diretamente — como o
 * mesmo isolate Deno atende várias requisições concorrentes, o correlation_id de
 * uma invocação acabava anexado ao evento de outra.
 *
 * O correlation_id recebido é devolvido no header da resposta, para que o
 * frontend consiga ligar a issue do Sentry à chamada que a originou.
 */
export async function withSentry(
    functionName: string,
    req: Request,
    handler: (context: EdgeObservabilityContext) => Promise<Response>,
): Promise<Response> {
    const correlationId = req.headers.get("x-correlation-id") ?? crypto.randomUUID();
    const traceId = crypto.randomUUID();
    const denoDeploymentId = env("DENO_DEPLOYMENT_ID");
    const executionId = env("SB_EXECUTION_ID");
    const startedAt = Date.now();

    const context: EdgeObservabilityContext = {
        functionName,
        correlationId,
        traceId,
        denoDeploymentId,
        executionId,
    };

    const withHeaders = (response: Response, status: "ok" | "error"): Response => {
        const headers = new Headers(response.headers);
        headers.set("x-correlation-id", correlationId);
        headers.set("x-trace-id", traceId);
        // Log estruturado — mesmas chaves usadas no frontend e nas tabelas de
        // telemetria, para que uma busca por correlation_id atravesse as três
        // camadas.
        console.log(
            JSON.stringify({
                level: status === "ok" ? "info" : "error",
                component: "edge",
                edge_function: functionName,
                correlation_id: correlationId,
                trace_id: traceId,
                deno_deployment_id: denoDeploymentId,
                sb_execution_id: executionId,
                status,
                http_status: response.status,
                duration_ms: Date.now() - startedAt,
            }),
        );
        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers,
        });
    };

    if (!initialized) {
        // Sem DSN: ainda assim propaga correlação e duração pelos logs do Supabase.
        try {
            return withHeaders(await handler(context), "ok");
        } catch (error) {
            console.error(
                JSON.stringify({
                    level: "error",
                    component: "edge",
                    edge_function: functionName,
                    correlation_id: correlationId,
                    trace_id: traceId,
                    error_code: error instanceof Error ? error.name : "unknown",
                }),
            );
            return withHeaders(internalErrorResponse(traceId), "error");
        }
    }

    return await Sentry.withScope(async (scope) => {
        scope.setTag("correlation_id", correlationId);
        scope.setTag("trace_id", traceId);
        scope.setTag("mx.edge_function", functionName);
        scope.setTag("deno_deployment_id", denoDeploymentId ?? "unknown");
        scope.setTag("sb_execution_id", executionId ?? "unknown");
        scope.setContext("request", { url: safeUrl(req.url), method: req.method });

        try {
            return withHeaders(await handler(context), "ok");
        } catch (error) {
            Sentry.captureException(error);
            // Edge Functions têm lifecycle curto — sem flush o evento se perde.
            await Sentry.flush(2000);
            console.error(`[edge-error] ${functionName} trace_id=${traceId}`, error);
            return withHeaders(internalErrorResponse(traceId), "error");
        }
    });
}

export { Sentry };
