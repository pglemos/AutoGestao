import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSupabasePublishableKey, resolveSupabaseSecretKey } from "../_shared/api-keys.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireEnv, encryptToken } from "../_shared/crypto.ts";
import { parseClientId, assertClientAccess } from "../_shared/google.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const getSupabaseAdminKey = () => resolveSupabaseSecretKey(Deno.env.get);
const getSupabasePublicKey = () => resolveSupabasePublishableKey(Deno.env.get);

const GOOGLE_PERSONAL_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email";
const GOOGLE_CENTRAL_SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/meetings.space.readonly https://www.googleapis.com/auth/userinfo.email";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

function buildGoogleAuthUrl(state: string, scope: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID),
    redirect_uri: requireEnv("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI),
    response_type: "code",
    scope,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

function isExpired(expiresAt: string): boolean {
  return Date.parse(expiresAt) <= Date.now();
}

async function fetchGoogleEmail(accessToken: string): Promise<string | null> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return null;
  const data = await response.json().catch(() => ({}));
  return typeof data.email === "string" ? data.email : null;
}

async function invokeCalendarSync(body: Record<string, unknown>): Promise<boolean> {
  const internalToken = requireEnv(
    "GOOGLE_CALENDAR_SYNC_ADMIN_TOKEN",
    Deno.env.get("GOOGLE_CALENDAR_SYNC_ADMIN_TOKEN"),
  );
  const response = await fetch(`${requireEnv("SUPABASE_URL", SUPABASE_URL)}/functions/v1/google-calendar-sync`, {
    method: "POST",
    headers: {
      "x-google-calendar-sync-admin-token": internalToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return response.ok;
}

async function backfillPersonalCalendar(adminClient: any, userId: string): Promise<{ visits: number; events: number; failed: number }> {
  const now = new Date().toISOString();
  let visitsSynced = 0;
  let eventsSynced = 0;
  let failed = 0;

  const { data: visits, error: visitsError } = await adminClient
    .from("visitas_consultoria")
    .select(`
      id,
      client_id,
      consultant_id,
      auxiliary_consultant_id,
      scheduled_at,
      duration_hours,
      modality,
      status,
      objective,
      visit_reason,
      target_audience,
      product_name,
      google_event_id,
      google_event_id_central,
      consultant:usuarios!visitas_consultoria_consultor_id_fkey(email),
      client:clientes_consultoria!client_id(name)
    `)
    .or(`consultant_id.eq.${userId},auxiliary_consultant_id.eq.${userId}`)
    .gte("scheduled_at", now)
    .limit(50);
  if (visitsError) throw visitsError;

  for (const visit of visits || []) {
    const ok = await invokeCalendarSync({
      action: "upsert",
      visit: {
        id: visit.id,
        client_id: visit.client_id,
        client_name: visit.client?.name ?? null,
        client_address: null,
        scheduled_at: visit.scheduled_at,
        duration_hours: visit.duration_hours,
        modality: visit.modality,
        status: visit.status,
        objective: visit.objective,
        visit_reason: visit.visit_reason ?? null,
        target_audience: visit.target_audience ?? null,
        product_name: visit.product_name ?? null,
        consultant_email: visit.consultant?.email ?? null,
        consultant_id: visit.consultant_id ?? null,
        auxiliary_consultant_id: visit.auxiliary_consultant_id ?? null,
        google_event_id: visit.google_event_id ?? null,
        google_event_id_central: visit.google_event_id_central ?? null,
      },
    });
    if (ok) visitsSynced += 1;
    else failed += 1;
  }

  const { data: events, error: eventsError } = await adminClient
    .from("eventos_agenda_consultoria")
    .select(`
      id,
      event_type,
      title,
      topic,
      starts_at,
      duration_hours,
      modality,
      location,
      target_audience,
      audience_goal,
      responsible_name,
      responsible_user_id,
      ticket_price_text,
      visit_reason,
      product_name,
      google_event_id,
      google_event_id_personal,
      status,
      responsible:usuarios!eventos_agenda_consultoria_responsavel_usuario_id_fkey(email)
    `)
    .eq("responsible_user_id", userId)
    .gte("starts_at", now)
    .limit(50);
  if (eventsError) throw eventsError;

  for (const event of events || []) {
    const ok = await invokeCalendarSync({
      action: "upsert",
      event: {
        id: event.id,
        event_type: event.event_type,
        title: event.title,
        topic: event.topic ?? null,
        starts_at: event.starts_at,
        duration_hours: event.duration_hours,
        modality: event.modality,
        location: event.location ?? null,
        target_audience: event.target_audience ?? null,
        audience_goal: event.audience_goal ?? null,
        responsible_name: event.responsible_name ?? null,
        responsible_user_id: event.responsible_user_id ?? null,
        responsible_email: event.responsible?.email ?? null,
        ticket_price_text: event.ticket_price_text ?? null,
        visit_reason: event.visit_reason ?? null,
        product_name: event.product_name ?? null,
        google_event_id: event.google_event_id ?? null,
        google_event_id_personal: event.google_event_id_personal ?? null,
        status: event.status,
      },
    });
    if (ok) eventsSynced += 1;
    else failed += 1;
  }

  return { visits: visitsSynced, events: eventsSynced, failed };
}

async function backfillCentralMeetCohosts(adminClient: any): Promise<{ visits: number; events: number; failed: number }> {
  const now = new Date().toISOString();
  let visitsSynced = 0;
  let eventsSynced = 0;
  let failed = 0;

  const { data: visits, error: visitsError } = await adminClient
    .from("visitas_consultoria")
    .select(`
      id,
      client_id,
      consultant_id,
      auxiliary_consultant_id,
      scheduled_at,
      duration_hours,
      modality,
      status,
      objective,
      visit_reason,
      target_audience,
      product_name,
      google_event_id,
      google_event_id_central,
      google_meet_link,
      consultant:usuarios!visitas_consultoria_consultor_id_fkey(email),
      client:clientes_consultoria!client_id(name)
    `)
    .gte("scheduled_at", now)
    .neq("status", "cancelada")
    .ilike("modality", "online")
    .limit(200);
  if (visitsError) throw visitsError;

  for (const visit of visits || []) {
    const ok = await invokeCalendarSync({
      action: "upsert",
      visit: {
        id: visit.id,
        client_id: visit.client_id,
        client_name: visit.client?.name ?? null,
        client_address: null,
        scheduled_at: visit.scheduled_at,
        duration_hours: visit.duration_hours,
        modality: visit.modality,
        status: visit.status,
        objective: visit.objective,
        visit_reason: visit.visit_reason ?? null,
        target_audience: visit.target_audience ?? null,
        product_name: visit.product_name ?? null,
        consultant_email: visit.consultant?.email ?? null,
        consultant_id: visit.consultant_id ?? null,
        auxiliary_consultant_id: visit.auxiliary_consultant_id ?? null,
        google_event_id: visit.google_event_id ?? null,
        google_event_id_central: visit.google_event_id_central ?? null,
        google_meet_link: visit.google_meet_link ?? null,
      },
    });
    if (ok) visitsSynced += 1;
    else failed += 1;
  }

  const { data: events, error: eventsError } = await adminClient
    .from("eventos_agenda_consultoria")
    .select(`
      id,
      event_type,
      title,
      topic,
      starts_at,
      duration_hours,
      modality,
      location,
      target_audience,
      audience_goal,
      responsible_name,
      responsible_user_id,
      ticket_price_text,
      visit_reason,
      product_name,
      google_event_id,
      google_event_id_personal,
      google_meet_link,
      status,
      source_payload,
      responsible:usuarios!eventos_agenda_consultoria_responsavel_usuario_id_fkey(email)
    `)
    .gte("starts_at", now)
    .neq("status", "cancelado")
    .or("event_type.eq.evento_online,modality.ilike.online")
    .limit(200);
  if (eventsError) throw eventsError;

  for (const event of events || []) {
    const ok = await invokeCalendarSync({
      action: "upsert",
      event: {
        id: event.id,
        event_type: event.event_type,
        title: event.title,
        topic: event.topic ?? null,
        starts_at: event.starts_at,
        duration_hours: event.duration_hours,
        modality: event.modality,
        location: event.location ?? null,
        target_audience: event.target_audience ?? null,
        audience_goal: event.audience_goal ?? null,
        responsible_name: event.responsible_name ?? null,
        responsible_user_id: event.responsible_user_id ?? null,
        responsible_email: event.responsible?.email ?? null,
        ticket_price_text: event.ticket_price_text ?? null,
        visit_reason: event.visit_reason ?? null,
        product_name: event.product_name ?? null,
        google_event_id: event.google_event_id ?? null,
        google_event_id_personal: event.google_event_id_personal ?? null,
        google_meet_link: event.google_meet_link ?? null,
        status: event.status,
        source_payload: event.source_payload ?? null,
      },
    });
    if (ok) eventsSynced += 1;
    else failed += 1;
  }

  return { visits: visitsSynced, events: eventsSynced, failed };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      if (req.method !== "POST") {
        return new Response("OAuth handler ready", { headers: corsHeaders });
      }

      const user = await (async () => {
        if (!req.headers.get("Authorization")?.startsWith("Bearer ")) throw new Error("Missing bearer token");
        const sessionClient = createClient(
          requireEnv("SUPABASE_URL", SUPABASE_URL),
          getSupabasePublicKey(),
          { global: { headers: { Authorization: req.headers.get("Authorization")! } }, auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data, error } = await sessionClient.auth.getUser();
        if (error || !data.user) throw new Error("Invalid or expired session");
        return data.user;
      })();

      const body = await req.json().catch(() => ({}));
      const clientId = parseClientId(body.clientId);
      const isCentralConnection = body?.central === true || body?.purpose === "central";
      const adminClient = createClient(requireEnv("SUPABASE_URL", SUPABASE_URL), getSupabaseAdminKey());

      if (isCentralConnection) {
        const { data: roleCheck, error: roleError } = await adminClient
          .from("usuarios")
          .select("role")
          .eq("id", user.id)
          .single();
        if (roleError) throw roleError;
        if (!["administrador_geral", "administrador_mx"].includes(roleCheck?.role)) throw new Error("Apenas administradores MX podem conectar a agenda central");
      }

      if (clientId) {
        await assertClientAccess(
          createClient(requireEnv("SUPABASE_URL", SUPABASE_URL), getSupabasePublicKey(), {
            global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
            auth: { persistSession: false, autoRefreshToken: false },
          }),
          clientId,
        );
      }

      const generatedState = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();

      const { error: insertError } = await adminClient.from("estados_oauth_google_consultoria").insert({
        user_id: user.id,
        client_id: clientId,
        state: generatedState,
        purpose: isCentralConnection ? "central" : "personal",
        redirect_uri: requireEnv("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI),
        expires_at: expiresAt,
      });
      if (insertError) throw insertError;

      const scope = isCentralConnection ? GOOGLE_CENTRAL_SCOPE : GOOGLE_PERSONAL_SCOPE;
      return new Response(JSON.stringify({ authUrl: buildGoogleAuthUrl(generatedState, scope), state: generatedState, expiresAt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!state) throw new Error("Missing state");

    const adminClient = createClient(requireEnv("SUPABASE_URL", SUPABASE_URL), getSupabaseAdminKey());

    const { data: stateRow, error: stateError } = await adminClient
      .from("estados_oauth_google_consultoria")
      .select("id, user_id, client_id, redirect_uri, expires_at, consumed_at, purpose")
      .eq("state", state)
      .maybeSingle();
    if (stateError) throw stateError;
    if (!stateRow) throw new Error("Invalid OAuth state");
    if (stateRow.consumed_at) throw new Error("OAuth state already consumed");
    if (isExpired(stateRow.expires_at)) throw new Error("OAuth state expired");
    if (stateRow.redirect_uri !== requireEnv("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI)) throw new Error("OAuth redirect URI mismatch");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: requireEnv("GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID),
        client_secret: requireEnv("GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET),
        redirect_uri: requireEnv("GOOGLE_REDIRECT_URI", GOOGLE_REDIRECT_URI),
        grant_type: "authorization_code",
      }),
    });

    const tokens: GoogleTokens = await tokenResponse.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    const purpose = stateRow.purpose === "central" ? "central" : "personal";
    const googleEmail = await fetchGoogleEmail(tokens.access_token);
    if (purpose === "central") {
      const expectedEmail = (Deno.env.get("GOOGLE_CENTRAL_CALENDAR_EMAIL") || "gestao@mxconsultoria.com.br").toLowerCase();
      if ((googleEmail || "").toLowerCase() !== expectedEmail) {
        throw new Error(`A Agenda Central MX deve ser conectada com ${expectedEmail}`);
      }
    }

    const encryptedAccessToken = await encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token ? await encryptToken(tokens.refresh_token) : null;
    const provider = purpose === "central" ? "google_central" : "google";

    const { data: existingToken, error: tokenLookupError } = await adminClient
      .from("tokens_oauth_consultoria")
      .select("id")
      .eq("user_id", stateRow.user_id)
      .eq("provider", provider)
      .maybeSingle();
    if (tokenLookupError) throw tokenLookupError;

    const tokenPayload = {
      user_id: stateRow.user_id,
      provider,
      access_token: encryptedAccessToken,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      scopes: tokens.scope?.split(" ").filter(Boolean) ?? [],
      google_email: googleEmail,
    } as const;

    if (existingToken) {
      const updatePayload: Record<string, unknown> = {
        access_token: tokenPayload.access_token,
        expires_at: tokenPayload.expires_at,
        scopes: tokenPayload.scopes,
        google_email: tokenPayload.google_email,
      };
      if (encryptedRefreshToken) updatePayload.refresh_token = encryptedRefreshToken;
      const { error: updateError } = await adminClient.from("tokens_oauth_consultoria").update(updatePayload).eq("id", existingToken.id);
      if (updateError) throw updateError;
    } else {
      const { error: insertTokenError } = await adminClient.from("tokens_oauth_consultoria").insert({ ...tokenPayload, refresh_token: encryptedRefreshToken });
      if (insertTokenError) throw insertTokenError;
    }

    if (purpose === "personal") {
      const { data: existingSettings, error: settingsLookupError } = await adminClient
        .from("configuracoes_calendario_consultoria")
        .select("id, client_id")
        .eq("user_id", stateRow.user_id)
        .maybeSingle();
      if (settingsLookupError) throw settingsLookupError;

      const { data: roleCheck } = await adminClient
        .from("usuarios")
        .select("role")
        .eq("id", stateRow.user_id)
        .single();
      const isAdmin = roleCheck?.role === "administrador_geral" || roleCheck?.role === "administrador_mx" || roleCheck?.role === "consultor_mx";

      const shouldLinkClient = stateRow.client_id && !isAdmin;

      const settingsPayload = {
        user_id: stateRow.user_id,
        google_calendar_id: "primary",
        sync_active: true,
        ...(shouldLinkClient ? { client_id: stateRow.client_id } : {}),
      };

      if (existingSettings) {
        const updateSettings: Record<string, unknown> = {};
        if (!existingSettings.client_id && shouldLinkClient) updateSettings.client_id = stateRow.client_id;
        updateSettings.google_calendar_id = "primary";
        updateSettings.sync_active = true;
        const { error: updateSettingsError } = await adminClient.from("configuracoes_calendario_consultoria").update(updateSettings).eq("id", existingSettings.id);
        if (updateSettingsError) throw updateSettingsError;
      } else {
        const { error: insertSettingsError } = await adminClient.from("configuracoes_calendario_consultoria").insert(settingsPayload);
        if (insertSettingsError) throw insertSettingsError;
      }

      try {
        await backfillPersonalCalendar(adminClient, stateRow.user_id);
      } catch (error) {
        console.warn("Google Calendar personal backfill failed", error instanceof Error ? error.message : error);
      }
    } else {
      try {
        await backfillCentralMeetCohosts(adminClient);
      } catch (error) {
        console.warn("Google Meet central co-host backfill failed", error instanceof Error ? error.message : error);
      }
    }

    const { error: consumeError } = await adminClient.from("estados_oauth_google_consultoria").delete().eq("id", stateRow.id);
    if (consumeError) throw consumeError;

    const CANONICAL_APP_URL = "https://mxperformance.vercel.app";
    const redirectUrl = purpose === "central"
      ? `${CANONICAL_APP_URL}/agenda?google_connected=central`
      : stateRow.client_id
      ? `${CANONICAL_APP_URL}/consultoria/clientes/${stateRow.client_id}?tab=visits&google_connected=1`
      : `${CANONICAL_APP_URL}/consultoria?google_connected=1`;

    const title = purpose === "central" ? "Agenda Central MX conectada!" : "Agenda conectada!";
    const message = purpose === "central"
      ? "A agenda gestao@mxconsultoria.com.br foi vinculada como agenda central do sistema."
      : "Sua conta Google Calendar foi vinculada com sucesso.";
    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Google Calendar Conectado</title><style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0A0A0B;text-align:center}.box{padding:2rem;border-radius:1rem;background:white;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:400px}.icon{font-size:3rem;margin-bottom:1rem}h1{font-size:1.25rem;margin:0 0 .5rem}p{color:#475569;margin:0 0 1rem;font-size:.875rem}.btn{display:inline-block;padding:.5rem 1.5rem;background:#22C55E;color:white;border-radius:.5rem;text-decoration:none;font-weight:600}.btn:hover{background:#16a34a}</style></head><body><div class="box"><div class="icon">&#x2705;</div><h1>${title}</h1><p>${message}</p><a class="btn" href="${redirectUrl}">Voltar ao MX Performance</a><script>setTimeout(function(){window.location.href="${redirectUrl}"},3000)</script></div></body></html>`;
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "OAuth handler failed";
    const escaped = message.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    const CANONICAL_APP_URL = "https://mxperformance.vercel.app";
    const errorHtml = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>Erro na conexão</title><style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#0A0A0B;text-align:center}.box{padding:2rem;border-radius:1rem;background:white;box-shadow:0 1px 3px rgba(0,0,0,.1);max-width:400px}.icon{font-size:3rem;margin-bottom:1rem}h1{font-size:1.25rem;margin:0 0 .5rem;color:#ef4444}p{color:#475569;margin:0 0 1rem;font-size:.875rem}.btn{display:inline-block;padding:.5rem 1.5rem;background:#475569;color:white;border-radius:.5rem;text-decoration:none;font-weight:600}</style></head><body><div class="box"><div class="icon">&#x274C;</div><h1>Erro na conexão</h1><p>${escaped}</p><a class="btn" href="${CANONICAL_APP_URL}/consultoria">Voltar ao MX Performance</a></div></body></html>`;
    return new Response(errorHtml, {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
});
