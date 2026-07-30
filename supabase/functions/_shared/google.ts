import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSupabasePublishableKey, resolveSupabaseSecretKey } from "./api-keys.ts";
import { requireEnv, encryptToken, decryptToken } from "./crypto.ts";
import {
  getGoogleMeetCohostActions,
  getGoogleMeetSpaceName,
  type GoogleMeetMember,
} from "./google_meet_cohost_rules.ts";

export function parseClientId(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const normalized = value.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(normalized)) throw new Error("Invalid clientId");
  return normalized;
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID", Deno.env.get("GOOGLE_CLIENT_ID")),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET", Deno.env.get("GOOGLE_CLIENT_SECRET")),
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error_description || data.error}`);
  return { access_token: data.access_token, expires_in: data.expires_in };
}

export function createSessionClient(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Missing bearer token");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  return createClient(
    requireEnv("SUPABASE_URL", SUPABASE_URL),
    resolveSupabasePublishableKey(Deno.env.get),
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function assertClientAccess(sessionClient: any, clientId: string) {
  const { data, error } = await sessionClient
    .from("clientes_consultoria")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Client access denied");
}

const CENTRAL_PROVIDER = "google_central";

function hasRequiredScopes(savedScopes: unknown, requiredScopes: string[]): boolean {
  if (requiredScopes.length === 0) return true;
  if (!Array.isArray(savedScopes)) return false;
  const scopeSet = new Set(savedScopes.filter((scope): scope is string => typeof scope === "string"));
  return requiredScopes.every((scope) => scopeSet.has(scope));
}

function hasAnyRequiredScope(savedScopes: unknown, acceptedScopes: string[]): boolean {
  if (acceptedScopes.length === 0) return true;
  if (!Array.isArray(savedScopes)) return false;
  const scopeSet = new Set(savedScopes.filter((scope): scope is string => typeof scope === "string"));
  return acceptedScopes.some((scope) => scopeSet.has(scope));
}

/**
 * Returns access_token for central MX Google integrations (gestao@mxconsultoria.com.br).
 * Uses GOOGLE_CENTRAL_REFRESH_TOKEN when configured, otherwise falls back to
 * the encrypted google_central OAuth token saved by an admin connection.
 */
export async function getCentralGoogleAccessToken(requiredScopes: string[] = []): Promise<string | null> {
  const refreshToken = Deno.env.get("GOOGLE_CENTRAL_REFRESH_TOKEN");
  if (refreshToken) {
    try {
      const refreshed = await refreshAccessToken(refreshToken);
      return refreshed.access_token;
    } catch {
      return null;
    }
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const adminClient = createClient(
    requireEnv("SUPABASE_URL", SUPABASE_URL),
    resolveSupabaseSecretKey(Deno.env.get),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: tokenRow } = await adminClient
    .from("tokens_oauth_consultoria")
    .select("id, access_token, refresh_token, expires_at, scopes")
    .eq("provider", CENTRAL_PROVIDER)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow) return null;
  if (!hasRequiredScopes(tokenRow.scopes, requiredScopes)) return null;

  try {
    let accessToken = await decryptToken(tokenRow.access_token);
    const expiresAt = tokenRow.expires_at ? Date.parse(tokenRow.expires_at) : 0;
    if (expiresAt && Date.now() >= expiresAt - 60_000 && tokenRow.refresh_token) {
      const refreshTok = await decryptToken(tokenRow.refresh_token);
      const refreshed = await refreshAccessToken(refreshTok);
      const encrypted = await encryptToken(refreshed.access_token);
      await adminClient
        .from("tokens_oauth_consultoria")
        .update({ access_token: encrypted, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
        .eq("id", tokenRow.id);
      accessToken = refreshed.access_token;
    }
    return accessToken;
  } catch {
    return null;
  }
}

/**
 * Returns access_token for the central MX calendar (gestao@mxconsultoria.com.br).
 */
export async function getCentralCalendarAccessToken(): Promise<string | null> {
  return getCentralGoogleAccessToken();
}

export const CENTRAL_CALENDAR_ID = Deno.env.get("GOOGLE_CENTRAL_CALENDAR_ID") || "primary";
export const CENTRAL_CALENDAR_EMAIL = Deno.env.get("GOOGLE_CENTRAL_CALENDAR_EMAIL") || "gestao@mxconsultoria.com.br";
export const CENTRAL_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
export const CENTRAL_DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const CENTRAL_MEET_CREATED_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";
export const CENTRAL_MEET_READ_SCOPE = "https://www.googleapis.com/auth/meetings.space.readonly";
export const CENTRAL_DRIVE_ROOT_FOLDER_ID = Deno.env.get("GOOGLE_CENTRAL_DRIVE_ROOT_FOLDER_ID") || "";
export const CENTRAL_DRIVE_ROOT_FOLDER_NAME = Deno.env.get("GOOGLE_CENTRAL_DRIVE_ROOT_FOLDER_NAME") || "MX Performance - Clientes";

export async function getCentralDriveAccessToken(): Promise<string | null> {
  const token = await getCentralGoogleAccessToken([CENTRAL_DRIVE_SCOPE]);
  if (token) return token;

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const adminClient = createClient(
    requireEnv("SUPABASE_URL", SUPABASE_URL),
    resolveSupabaseSecretKey(Deno.env.get),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { data: tokenRow } = await adminClient
    .from("tokens_oauth_consultoria")
    .select("id, access_token, refresh_token, expires_at, scopes")
    .eq("provider", CENTRAL_PROVIDER)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!tokenRow || !hasAnyRequiredScope(tokenRow.scopes, [CENTRAL_DRIVE_SCOPE, CENTRAL_DRIVE_FILE_SCOPE])) return null;

  try {
    let accessToken = await decryptToken(tokenRow.access_token);
    const expiresAt = tokenRow.expires_at ? Date.parse(tokenRow.expires_at) : 0;
    if (expiresAt && Date.now() >= expiresAt - 60_000 && tokenRow.refresh_token) {
      const refreshTok = await decryptToken(tokenRow.refresh_token);
      const refreshed = await refreshAccessToken(refreshTok);
      const encrypted = await encryptToken(refreshed.access_token);
      await adminClient
        .from("tokens_oauth_consultoria")
        .update({ access_token: encrypted, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
        .eq("id", tokenRow.id);
      accessToken = refreshed.access_token;
    }
    return accessToken;
  } catch {
    return null;
  }
}

export async function googleApiRequest(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`https://www.googleapis.com${path}`, { ...init, headers });
}

export async function googleMeetApiRequest(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(`https://meet.googleapis.com${path}`, { ...init, headers });
}

export type GoogleMeetCohostSyncResult = {
  configuredEmails: string[];
  createdEmails: string[];
  replacedEmails: string[];
};

async function readGoogleMeetError(response: Response, fallback: string): Promise<string> {
  const data = await response.json().catch(() => ({}));
  return data?.error?.message || fallback;
}

async function listGoogleMeetMembers(accessToken: string, spaceName: string): Promise<GoogleMeetMember[]> {
  const members: GoogleMeetMember[] = [];
  let pageToken: string | null = null;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await googleMeetApiRequest(
      accessToken,
      `/v2beta/${spaceName}/members?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(await readGoogleMeetError(response, `Failed to list Google Meet members (${response.status})`));
    }
    const data = await response.json().catch(() => ({}));
    if (Array.isArray(data.members)) members.push(...data.members);
    pageToken = typeof data.nextPageToken === "string" && data.nextPageToken ? data.nextPageToken : null;
  } while (pageToken);
  return members;
}

async function createGoogleMeetCohost(accessToken: string, spaceName: string, email: string): Promise<void> {
  const response = await googleMeetApiRequest(accessToken, `/v2beta/${spaceName}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role: "COHOST" }),
  });
  if (!response.ok && response.status !== 409) {
    throw new Error(await readGoogleMeetError(response, `Failed to create Google Meet co-host (${response.status})`));
  }
}

export async function ensureGoogleMeetCohosts(
  accessToken: string,
  meetLink: string,
  cohostEmails: string[],
): Promise<GoogleMeetCohostSyncResult> {
  const spaceName = getGoogleMeetSpaceName(meetLink);
  if (!spaceName) throw new Error("Link do Google Meet invalido para configurar co-hosts");

  const members = await listGoogleMeetMembers(accessToken, spaceName);
  const actions = getGoogleMeetCohostActions(members, cohostEmails);

  for (const member of actions.replaceMembers) {
    const response = await googleMeetApiRequest(accessToken, `/v2beta/${member.name}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404 && response.status !== 410) {
      throw new Error(await readGoogleMeetError(response, `Failed to replace Google Meet member (${response.status})`));
    }
    await createGoogleMeetCohost(accessToken, spaceName, member.email);
  }
  for (const email of actions.createEmails) {
    await createGoogleMeetCohost(accessToken, spaceName, email);
  }

  return {
    configuredEmails: [...actions.configuredEmails, ...actions.replaceMembers.map((member) => member.email), ...actions.createEmails],
    createdEmails: actions.createEmails,
    replacedEmails: actions.replaceMembers.map((member) => member.email),
  };
}

export type GoogleEventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  attendees?: { email: string; displayName?: string }[];
  conferenceData?: {
    createRequest?: {
      requestId: string;
      conferenceSolutionKey: { type: "hangoutsMeet" };
    };
  };
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  reminders?: { useDefault?: boolean; overrides?: { method: string; minutes: number }[] };
};

export type GoogleEventResult = {
  id: string;
  htmlLink?: string | null;
  meetLink?: string | null;
};

function extractMeetLink(data: any): string | null {
  if (typeof data?.hangoutLink === "string" && data.hangoutLink) return data.hangoutLink;
  const entryPoints = Array.isArray(data?.conferenceData?.entryPoints) ? data.conferenceData.entryPoints : [];
  const videoEntry = entryPoints.find((entry: any) => entry?.entryPointType === "video" && typeof entry?.uri === "string");
  return videoEntry?.uri ?? null;
}

async function waitForMeetLink(accessToken: string, calendarId: string, eventId: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const res = await googleApiRequest(
      accessToken,
      `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const meetLink = extractMeetLink(data);
    if (meetLink) return meetLink;
  }
  return null;
}

export async function upsertGoogleEvent(
  accessToken: string,
  calendarId: string,
  payload: GoogleEventInput,
  existingEventId?: string | null,
): Promise<GoogleEventResult> {
  const basePath = existingEventId
    ? `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existingEventId)}`
    : `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
  const path = payload.conferenceData ? `${basePath}?conferenceDataVersion=1` : basePath;
  const method = existingEventId ? "PATCH" : "POST";
  const res = await googleApiRequest(accessToken, path, { method, body: JSON.stringify(payload) });
  const data = await res.json();
  if (existingEventId && (res.status === 404 || res.status === 410)) {
    return upsertGoogleEvent(accessToken, calendarId, payload, null);
  }
  if (!res.ok) {
    throw new Error(data?.error?.message || `Google API error (${res.status})`);
  }
  const meetLink = extractMeetLink(data) ?? (payload.conferenceData ? await waitForMeetLink(accessToken, calendarId, data.id) : null);
  return {
    id: data.id as string,
    htmlLink: data.htmlLink ?? null,
    meetLink,
  };
}

export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<void> {
  const res = await googleApiRequest(accessToken, `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 410 && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Failed to delete event (${res.status})`);
  }
}
