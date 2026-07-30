export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  // Sentry injects `baggage` and `sentry-trace` into browser requests. Keep
  // tracing headers in the preflight contract so observability cannot block
  // authenticated Edge Function calls from the production UI.
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, baggage, sentry-trace, traceparent",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;
