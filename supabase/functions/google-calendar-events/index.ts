import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSupabaseSecretKey } from "../_shared/api-keys.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireEnv, encryptToken, decryptToken } from "../_shared/crypto.ts";
import { parseClientId, createSessionClient, assertClientAccess, refreshAccessToken } from "../_shared/google.ts";
import { parseStrictBody, calendarEventsSchema } from "../_shared/schemas.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const getSupabaseAdminKey = () => resolveSupabaseSecretKey(Deno.env.get);

async function fetchCalendarEvents(accessToken: string, calendarId: string, timeMin: string, timeMax: string, maxResults: number) {
  return fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}

async function refreshAndPersistToken(sessionClient: any, tokenRow: any) {
  const refreshToken = tokenRow.refresh_token ? await decryptToken(tokenRow.refresh_token) : null;
  if (!refreshToken) throw new Error("No refresh token available");
  const refreshed = await refreshAccessToken(refreshToken);
  const encryptedAccessToken = await encryptToken(refreshed.access_token);
  const { error } = await sessionClient
    .from("tokens_oauth_consultoria")
    .update({
      access_token: encryptedAccessToken,
      expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    })
    .eq("id", tokenRow.id);
  if (error) throw error;
  return refreshed.access_token;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const sessionClient = createSessionClient(req.headers.get("Authorization"));
    const { data: authData, error: authError } = await sessionClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await parseStrictBody(req, calendarEventsSchema);
    const requestedClientId = parseClientId(body.clientId);

    const maxResults = body.maxResults ?? 10;
    const timeMin = body.timeMin ?? new Date().toISOString();
    const timeMax = body.timeMax ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (requestedClientId) await assertClientAccess(sessionClient, requestedClientId);

    const adminClient = createClient(
      requireEnv("SUPABASE_URL", SUPABASE_URL),
      getSupabaseAdminKey(),
    );
    const { data: userProfile } = await adminClient
      .from("usuarios")
      .select("role")
      .eq("id", authData.user.id)
      .single();
    const isAdmin = userProfile?.role === 'administrador_geral' || userProfile?.role === 'administrador_mx' || userProfile?.role === 'consultor_mx';

    const { data: tokenRow, error: tokenError } = await sessionClient
      .from("tokens_oauth_consultoria")
      .select("id, access_token, refresh_token, expires_at")
      .eq("user_id", authData.user.id)
      .eq("provider", "google")
      .maybeSingle();
    if (tokenError) throw tokenError;
    if (!tokenRow) {
      return new Response(JSON.stringify({ error: "Google Calendar not connected" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: settingsRow, error: settingsError } = await sessionClient
      .from("configuracoes_calendario_consultoria")
      .select("id, client_id, google_calendar_id, sync_active, last_sync_at")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (settingsError) throw settingsError;

    let calendarSettings = settingsRow;
    if (!calendarSettings) {
      const { data: insertedSettings, error: insertSettingsError } = await sessionClient
        .from("configuracoes_calendario_consultoria")
        .insert({
          user_id: authData.user.id,
          google_calendar_id: "primary",
          sync_active: true,
          ...((requestedClientId && !isAdmin) ? { client_id: requestedClientId } : {}),
        })
        .select("id, client_id, google_calendar_id, sync_active, last_sync_at")
        .single();
      if (insertSettingsError) throw insertSettingsError;
      calendarSettings = insertedSettings;
    }

    if (requestedClientId && !isAdmin) {
      if (calendarSettings.client_id && calendarSettings.client_id !== requestedClientId) {
        return new Response(JSON.stringify({ error: "Calendar settings belong to a different client" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (!calendarSettings.client_id) {
        const { error: attachClientError } = await sessionClient.from("configuracoes_calendario_consultoria").update({ client_id: requestedClientId }).eq("id", calendarSettings.id);
        if (attachClientError) throw attachClientError;
        calendarSettings.client_id = requestedClientId;
      }
    }

    if (!calendarSettings.sync_active) {
      return new Response(JSON.stringify({ error: "Google Calendar sync is disabled for this account" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const calendarId = calendarSettings.google_calendar_id || "primary";
    const expiresAt = tokenRow.expires_at ? Date.parse(tokenRow.expires_at) : 0;
    let accessToken = await decryptToken(tokenRow.access_token);

    if (expiresAt && Date.now() >= expiresAt - 60_000) {
      if (!tokenRow.refresh_token) {
        return new Response(JSON.stringify({ error: "Google Calendar token expired and no refresh token is available" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      accessToken = await refreshAndPersistToken(sessionClient, tokenRow);
    }

    let calendarRes = await fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax, maxResults);

    if (calendarRes.status === 401) {
      if (!tokenRow.refresh_token) {
        return new Response(JSON.stringify({ error: "Google Calendar authorization expired" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      accessToken = await refreshAndPersistToken(sessionClient, tokenRow);
      calendarRes = await fetchCalendarEvents(accessToken, calendarId, timeMin, timeMax, maxResults);
    }

    const calendarData = await calendarRes.json();
    if (!calendarRes.ok) {
      throw new Error(calendarData.error?.message || calendarData.error || "Google Calendar API error");
    }

    const { error: syncError } = await sessionClient
      .from("configuracoes_calendario_consultoria")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", calendarSettings.id);
    if (syncError) throw syncError;

    return new Response(JSON.stringify({ events: calendarData.items || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
