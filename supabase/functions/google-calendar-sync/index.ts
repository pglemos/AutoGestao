// Sync MX agenda records → Google Calendar (personal + central MX)
// POST { action: 'upsert' | 'delete', visit?: {...}, event?: {...} }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSupabaseSecretKey } from "../_shared/api-keys.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireEnv, encryptToken, decryptToken } from "../_shared/crypto.ts";
import {
  createSessionClient,
  refreshAccessToken,
  upsertGoogleEvent,
  deleteGoogleEvent,
  googleApiRequest,
  ensureGoogleMeetCohosts,
  getCentralCalendarAccessToken,
  getCentralGoogleAccessToken,
  CENTRAL_CALENDAR_ID,
  CENTRAL_CALENDAR_EMAIL,
  CENTRAL_MEET_CREATED_SCOPE,
  type GoogleEventInput,
} from "../_shared/google.ts";
import { buildRelatedUserIds } from "../_shared/google_calendar_privacy.ts";
import { getGoogleMeetCohostEmails } from "../_shared/google_meet_cohost_rules.ts";
import {
  filterCentralAttendeesForPersonalMirrors,
  filterPersonalMirrorCandidates,
  getDuplicateGoogleEventIds,
  getEffectiveCalendarAction,
  getStaleMirrorRows,
  shouldInviteScheduleEventCreator,
  uniqueMirrorCandidates,
  type ExistingMirrorRow,
} from "../_shared/google_calendar_sync_rules.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_JWT = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const getSupabaseAdminKey = () => resolveSupabaseSecretKey(Deno.env.get);
const TIMEZONE = "America/Sao_Paulo";
// Full system visibility is handled by google_calendar_privacy.ts/RLS.
// Personal mirrors are narrower: global mirrors go only to this allowlist,
// while consultants/responsibles still receive events directly related to them.
const DEFAULT_PERSONAL_MIRROR_ADMIN_EMAILS = ["gestao@mxconsultoria.com.br"];

type VisitInput = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_address?: string | null;
  scheduled_at: string;
  duration_hours?: number | null;
  modality?: string | null;
  status?: string | null;
  objective?: string | null;
  visit_reason?: string | null;
  target_audience?: string | null;
  product_name?: string | null;
  consultant_email?: string | null;
  consultant_id?: string | null;
  auxiliary_consultant_id?: string | null;
  google_event_id?: string | null;
  google_event_id_central?: string | null;
  google_meet_link?: string | null;
};

type ScheduleEventInput = {
  id: string;
  event_type?: "aula" | "evento_online" | "evento_presencial" | "bloqueio" | string | null;
  title: string;
  topic?: string | null;
  starts_at: string;
  duration_hours?: number | null;
  modality?: string | null;
  location?: string | null;
  target_audience?: string | null;
  audience_goal?: number | null;
  responsible_name?: string | null;
  responsible_email?: string | null;
  responsible_user_id?: string | null;
  creator_name?: string | null;
  creator_email?: string | null;
  created_by?: string | null;
  ticket_price_text?: string | null;
  visit_reason?: string | null;
  product_name?: string | null;
  google_event_id?: string | null;
  google_event_id_personal?: string | null;
  google_meet_link?: string | null;
  status?: string | null;
  source_payload?: Record<string, unknown> | null;
};

type GoogleAttendee = { email: string; displayName?: string };

const VISIT_SYNC_SELECT = [
  "id",
  "client_id",
  "scheduled_at",
  "duration_hours",
  "modality",
  "status",
  "objective",
  "visit_reason",
  "target_audience",
  "product_name",
  "consultant_id",
  "auxiliary_consultant_id",
  "google_event_id",
  "google_event_id_central",
  "google_meet_link",
  "client:clientes_consultoria!client_id(name)",
].join(",");

const SCHEDULE_EVENT_SYNC_SELECT = [
  "id",
  "event_type",
  "title",
  "topic",
  "starts_at",
  "duration_hours",
  "modality",
  "location",
  "target_audience",
  "audience_goal",
  "responsible_name",
  "responsible_user_id",
  "created_by",
  "ticket_price_text",
  "visit_reason",
  "product_name",
  "google_event_id",
  "google_event_id_personal",
  "google_meet_link",
  "status",
  "source_payload",
  "creator:usuarios!consulting_schedule_events_created_by_fkey(name,email)",
].join(",");

function relationName(row: any, relation: string): string | null {
  const value = row?.[relation];
  if (Array.isArray(value)) return value[0]?.name ?? null;
  return value?.name ?? null;
}

function relationEmail(row: any, relation: string): string | null {
  const value = row?.[relation];
  if (Array.isArray(value)) return value[0]?.email ?? null;
  return value?.email ?? null;
}

async function loadAuthorizedVisit(sessionClient: any, visitId: string): Promise<VisitInput> {
  const { data, error } = await sessionClient
    .from("visitas_consultoria")
    .select(VISIT_SYNC_SELECT)
    .eq("id", visitId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado a esta visita de consultoria");

  return {
    id: data.id,
    client_id: data.client_id ?? null,
    client_name: relationName(data, "client"),
    scheduled_at: data.scheduled_at,
    duration_hours: data.duration_hours ?? null,
    modality: data.modality ?? null,
    status: data.status ?? null,
    objective: data.objective ?? null,
    visit_reason: data.visit_reason ?? null,
    target_audience: data.target_audience ?? null,
    product_name: data.product_name ?? null,
    consultant_id: data.consultant_id ?? null,
    auxiliary_consultant_id: data.auxiliary_consultant_id ?? null,
    google_event_id: data.google_event_id ?? null,
    google_event_id_central: data.google_event_id_central ?? null,
    google_meet_link: data.google_meet_link ?? null,
  };
}

async function loadAuthorizedScheduleEvent(sessionClient: any, eventId: string): Promise<ScheduleEventInput> {
  const { data, error } = await sessionClient
    .from("eventos_agenda_consultoria")
    .select(SCHEDULE_EVENT_SYNC_SELECT)
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado a este evento de agenda");

  return {
    id: data.id,
    event_type: data.event_type ?? null,
    title: data.title,
    topic: data.topic ?? null,
    starts_at: data.starts_at,
    duration_hours: data.duration_hours ?? null,
    modality: data.modality ?? null,
    location: data.location ?? null,
    target_audience: data.target_audience ?? null,
    audience_goal: data.audience_goal ?? null,
    responsible_name: data.responsible_name ?? null,
    responsible_user_id: data.responsible_user_id ?? null,
    creator_name: relationName(data, "creator"),
    creator_email: relationEmail(data, "creator"),
    created_by: data.created_by ?? null,
    ticket_price_text: data.ticket_price_text ?? null,
    visit_reason: data.visit_reason ?? null,
    product_name: data.product_name ?? null,
    google_event_id: data.google_event_id ?? null,
    google_event_id_personal: data.google_event_id_personal ?? null,
    google_meet_link: data.google_meet_link ?? null,
    status: data.status ?? null,
    source_payload: data.source_payload ?? null,
  };
}

function getPersonalMirrorAdminEmails(): Set<string> {
  const configured = (Deno.env.get("GOOGLE_CALENDAR_PERSONAL_MIRROR_ADMIN_EMAILS") || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return new Set(configured.length > 0 ? configured : DEFAULT_PERSONAL_MIRROR_ADMIN_EMAILS);
}

function isPersonalMirrorAdminEmail(email?: string | null): boolean {
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && getPersonalMirrorAdminEmails().has(normalized));
}

function normalizeAttendees(attendees: (GoogleAttendee | null | undefined)[]): GoogleAttendee[] {
  const seen = new Set<string>();
  const normalized: GoogleAttendee[] = [];
  for (const attendee of attendees) {
    const email = attendee?.email?.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    normalized.push({ email, displayName: attendee?.displayName });
  }
  return normalized;
}

function getBearerJwtRole(authHeader?: string | null): string | null {
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const payloadPart = token?.split(".")[1];
  if (!payloadPart) return null;

  try {
    const normalized = payloadPart.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(atob(padded));
    return typeof payload?.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

function isServiceRoleRequest(authHeader: string | null, serviceRoleBearer: string): boolean {
  if (authHeader === serviceRoleBearer) return true;
  // google-calendar-sync keeps Supabase JWT verification enabled; this only
  // accepts a service_role JWT after the platform has validated the signature.
  return getBearerJwtRole(authHeader) === "service_role";
}

function isOnlineModality(value?: string | null): boolean {
  return value?.trim().toLowerCase() === "online";
}

function shouldCreateMeetForVisit(visit: VisitInput): boolean {
  return isOnlineModality(visit.modality);
}

function shouldCreateMeetForScheduleEvent(event: ScheduleEventInput): boolean {
  return event.event_type === "evento_online" || isOnlineModality(event.modality);
}

function buildMeetConferenceData(sourceKind: "visit" | "schedule_event", sourceId: string): GoogleEventInput["conferenceData"] {
  const requestKind = sourceKind === "schedule_event" ? "schedule-event" : "visit";
  return {
    createRequest: {
      requestId: `mx-${requestKind}-${sourceId}`,
      conferenceSolutionKey: { type: "hangoutsMeet" },
    },
  };
}

function getScheduleEventAdditionalAttendees(event: ScheduleEventInput): GoogleAttendee[] {
  const payload = event.source_payload;
  const rawAttendees = Array.isArray(payload?.google_attendees)
    ? payload.google_attendees
    : Array.isArray(payload?.associated_admins)
    ? payload.associated_admins
    : [];

  return rawAttendees
    .map((item): GoogleAttendee | null => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const email = typeof record.email === "string" ? record.email.trim() : "";
      if (!email) return null;
      return {
        email,
        displayName: typeof record.name === "string" ? record.name : undefined,
      };
    })
    .filter((item): item is GoogleAttendee => Boolean(item));
}

function getScheduleEventCreatorAttendee(event: ScheduleEventInput): GoogleAttendee | null {
  const email = event.creator_email?.trim();
  if (!email) return null;
  return { email, displayName: event.creator_name ?? undefined };
}

function buildEventPayload(visit: VisitInput, attendees: GoogleAttendee[] = []): GoogleEventInput {
  const start = new Date(visit.scheduled_at);
  const durationMs = Math.max(0.5, Number(visit.duration_hours ?? 3)) * 60 * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  const summary = `MX • Visita${visit.client_name ? ` — ${visit.client_name}` : ""}`;
  const lines = [
    visit.visit_reason ? `Motivo da visita: ${visit.visit_reason}` : null,
    visit.target_audience ? `Alvo: ${visit.target_audience}` : null,
    visit.product_name ? `Produto: ${visit.product_name}` : null,
    visit.objective ? `Objetivo: ${visit.objective}` : null,
    visit.modality ? `Modalidade: ${visit.modality}` : null,
    visit.status ? `Status: ${visit.status}` : null,
    `Origem: MX Performance (visit ${visit.id})`,
  ].filter(Boolean);
  return {
    summary,
    description: lines.join("\n"),
    location: visit.client_address ?? undefined,
    start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
    attendees: attendees.length > 0 ? attendees : undefined,
    conferenceData: shouldCreateMeetForVisit(visit) ? buildMeetConferenceData("visit", visit.id) : undefined,
    extendedProperties: {
      private: {
        mx_source_kind: "visit",
        mx_source_id: visit.id,
        mx_related_user_ids: buildRelatedUserIds([visit.consultant_id, visit.auxiliary_consultant_id]),
      },
    },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }, { method: "email", minutes: 60 }] },
  };
}

function getScheduleTypeLabel(type?: string | null) {
  switch (type) {
    case "aula":
      return "Aula";
    case "evento_online":
      return "Evento online";
    case "evento_presencial":
      return "Evento presencial";
    case "bloqueio":
      return "Bloqueio de agenda";
    default:
      return "Evento";
  }
}

function buildScheduleEventPayload(event: ScheduleEventInput, attendees: GoogleAttendee[] = []): GoogleEventInput {
  const start = new Date(event.starts_at);
  const durationMs = Math.max(0.5, Number(event.duration_hours ?? 1)) * 60 * 60 * 1000;
  const end = new Date(start.getTime() + durationMs);
  const lines = [
    event.topic ? `Tema: ${event.topic}` : null,
    event.visit_reason ? `Motivo: ${event.visit_reason}` : null,
    event.target_audience ? `Publico: ${event.target_audience}` : null,
    event.audience_goal ? `Meta de publico: ${event.audience_goal}` : null,
    event.product_name ? `Produto: ${event.product_name}` : null,
    event.responsible_name ? `Responsavel: ${event.responsible_name}` : null,
    event.modality ? `Modalidade: ${event.modality}` : null,
    event.ticket_price_text ? `Ingresso: ${event.ticket_price_text}` : null,
    event.status ? `Status: ${event.status}` : null,
    `Origem: MX Performance (schedule event ${event.id})`,
  ].filter(Boolean);

  return {
    summary: `MX • ${getScheduleTypeLabel(event.event_type)} — ${event.title}`,
    description: lines.join("\n"),
    location: event.location ?? undefined,
    start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
    attendees: attendees.length > 0 ? attendees : undefined,
    conferenceData: shouldCreateMeetForScheduleEvent(event) ? buildMeetConferenceData("schedule_event", event.id) : undefined,
    extendedProperties: {
      private: {
        mx_source_kind: "schedule_event",
        mx_source_id: event.id,
        mx_related_user_ids: buildRelatedUserIds([event.responsible_user_id]),
      },
    },
    reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 30 }, { method: "email", minutes: 60 }] },
  };
}

type UserGoogleToken = {
  token: string | null;
  googleEmail?: string | null;
  tokenRowId?: string;
};

type AdminMasterGoogleToken = UserGoogleToken & {
  userId: string;
  name?: string | null;
};

type UserMirrorToken = UserGoogleToken & {
  userId: string;
  name?: string | null;
  profileEmail?: string | null;
  role?: string | null;
};

async function dedupeGoogleEventsBySource(
  accessToken: string,
  calendarId: string,
  sourceKind: "visit" | "schedule_event",
  sourceId: string,
  preferredEventId: string | null,
): Promise<number> {
  const params = new URLSearchParams({ maxResults: "20", singleEvents: "true" });
  params.append("privateExtendedProperty", `mx_source_kind=${sourceKind}`);
  params.append("privateExtendedProperty", `mx_source_id=${sourceId}`);
  const res = await googleApiRequest(
    accessToken,
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
  );
  if (!res.ok) return 0;
  const data = await res.json().catch(() => ({}));
  const events = Array.isArray(data.items) ? data.items : [];
  const duplicateIds = getDuplicateGoogleEventIds(events, new Set([preferredEventId].filter((id): id is string => Boolean(id))));
  for (const duplicateId of duplicateIds) {
    await deleteGoogleEvent(accessToken, calendarId, duplicateId);
  }
  return duplicateIds.length;
}

async function deleteGoogleEventIfPresent(
  accessToken: string,
  calendarId: string,
  eventId: string,
): Promise<"deleted" | "missing"> {
  const res = await googleApiRequest(
    accessToken,
    `/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  if (res.status === 404 || res.status === 410) return "missing";
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Failed to delete event (${res.status})`);
  }
  return "deleted";
}

async function getUserAccessToken(dbClient: any, userId: string): Promise<UserGoogleToken> {
  const { data: tokenRow, error } = await dbClient
    .from("tokens_oauth_consultoria")
    .select("id, access_token, refresh_token, expires_at, google_email")
    .eq("user_id", userId)
    .eq("provider", "google")
    .maybeSingle();
  if (error) throw error;
  if (!tokenRow) return { token: null };

  const expiresAt = tokenRow.expires_at ? Date.parse(tokenRow.expires_at) : 0;
  let accessToken = await decryptToken(tokenRow.access_token);
  if (expiresAt && Date.now() >= expiresAt - 60_000 && tokenRow.refresh_token) {
    const refreshTok = await decryptToken(tokenRow.refresh_token);
    const refreshed = await refreshAccessToken(refreshTok);
    const encrypted = await encryptToken(refreshed.access_token);
    await dbClient
      .from("tokens_oauth_consultoria")
      .update({ access_token: encrypted, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
      .eq("id", tokenRow.id);
    accessToken = refreshed.access_token;
  }
  return { token: accessToken, googleEmail: tokenRow.google_email ?? null, tokenRowId: tokenRow.id };
}

async function getPersonalMirrorAdminTokens(adminClient: any): Promise<AdminMasterGoogleToken[]> {
  const { data: users, error } = await adminClient
    .from("usuarios")
    .select("id, name, email")
    .eq("role", "administrador_geral")
    .eq("active", true);
  if (error) throw error;

  const tokens: AdminMasterGoogleToken[] = [];
  for (const user of users || []) {
    const userToken = await getUserAccessToken(adminClient, user.id);
    if (!userToken.token) continue;
    if (!isPersonalMirrorAdminEmail(userToken.googleEmail) && !isPersonalMirrorAdminEmail(user.email)) continue;
    tokens.push({
      ...userToken,
      userId: user.id,
      name: user.name ?? null,
    });
  }
  return tokens;
}

function getRelatedUserIds(syncKind: "visit" | "schedule_event", visit: VisitInput | null, scheduleEvent: ScheduleEventInput | null): string[] {
  const ids = syncKind === "schedule_event"
    ? [scheduleEvent?.responsible_user_id]
    : [visit?.consultant_id, visit?.auxiliary_consultant_id];
  return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

async function getRelatedUserPersonalTokens(adminClient: any, userIds: string[]): Promise<UserMirrorToken[]> {
  if (userIds.length === 0) return [];

  const { data: users, error } = await adminClient
    .from("usuarios")
    .select("id, name, email, role")
    .in("id", userIds)
    .eq("active", true);
  if (error) throw error;

  const tokens: UserMirrorToken[] = [];
  for (const user of users || []) {
    const userToken = await getUserAccessToken(adminClient, user.id);
    if (!userToken.token) continue;
    tokens.push({
      ...userToken,
      userId: user.id,
      name: user.name ?? null,
      profileEmail: user.email ?? null,
      role: user.role ?? null,
    });
  }
  return filterPersonalMirrorCandidates(tokens, Deno.env.get("GOOGLE_CALENDAR_ADMIN_MASTER_EMAILS")) as UserMirrorToken[];
}

async function deleteLegacyPersonalEventFromConnectedCalendars(
  adminClient: any,
  eventId: string,
  preferredUserId?: string | null,
): Promise<{ deleted: boolean; attempted: number; message?: string }> {
  const { data: tokenOwners, error } = await adminClient
    .from("tokens_oauth_consultoria")
    .select("user_id")
    .eq("provider", "google")
    .not("user_id", "is", null);
  if (error) throw error;

  const orderedUserIds = Array.from(new Set([
    preferredUserId,
    ...((tokenOwners || []).map((row: { user_id?: string | null }) => row.user_id)),
  ].filter((id): id is string => Boolean(id))));

  let attempted = 0;
  let lastMessage: string | undefined;
  for (const userId of orderedUserIds) {
    try {
      const userToken = await getUserAccessToken(adminClient, userId);
      if (!userToken.token) continue;
      attempted += 1;
      const result = await deleteGoogleEventIfPresent(userToken.token, "primary", eventId);
      if (result === "deleted") return { deleted: true, attempted };
    } catch (e) {
      lastMessage = e instanceof Error ? e.message : "Falha ao remover evento pessoal legado";
    }
  }

  return { deleted: false, attempted, message: lastMessage };
}

function uniqueMirrorTokens(tokens: UserMirrorToken[]): UserMirrorToken[] {
  return uniqueMirrorCandidates(tokens) as UserMirrorToken[];
}

async function mirrorToUserCalendars(
  adminClient: any,
  tokens: UserMirrorToken[],
  sourceKind: "visit" | "schedule_event",
  sourceId: string,
  payload: GoogleEventInput,
  action: "upsert" | "delete",
  excludedUserId?: string | null,
): Promise<{ userId: string; ok: boolean; googleEventId?: string | null; dedupedEvents?: number; message?: string }[]> {
  const results: { userId: string; ok: boolean; googleEventId?: string | null; dedupedEvents?: number; message?: string }[] = [];

  for (const userToken of tokens) {
    if (excludedUserId && userToken.userId === excludedUserId) continue;
    try {
      const { data: mirrorRow, error: mirrorLookupError } = await adminClient
        .from("espelhos_agenda_google_usuario")
        .select("id, google_event_id")
        .eq("user_id", userToken.userId)
        .eq("source_kind", sourceKind)
        .eq("source_id", sourceId)
        .maybeSingle();
      if (mirrorLookupError) throw mirrorLookupError;

      if (action === "delete") {
        if (mirrorRow?.google_event_id && userToken.token) {
          await deleteGoogleEvent(userToken.token, "primary", mirrorRow.google_event_id);
        }
        await adminClient
          .from("espelhos_agenda_google_usuario")
          .upsert({
            user_id: userToken.userId,
            source_kind: sourceKind,
            source_id: sourceId,
            google_event_id: null,
            synced_at: new Date().toISOString(),
            sync_error: null,
          }, { onConflict: "user_id,source_kind,source_id" });
        results.push({ userId: userToken.userId, ok: true, googleEventId: null });
        continue;
      }

      if (!userToken.token) throw new Error("Google pessoal nao conectado");
      const googleEvent = await upsertGoogleEvent(userToken.token, "primary", payload, mirrorRow?.google_event_id ?? null);
      const dedupedEvents = await dedupeGoogleEventsBySource(userToken.token, "primary", sourceKind, sourceId, googleEvent.id);
      await adminClient
        .from("espelhos_agenda_google_usuario")
        .upsert({
          user_id: userToken.userId,
          source_kind: sourceKind,
          source_id: sourceId,
          google_event_id: googleEvent.id,
          synced_at: new Date().toISOString(),
          sync_error: null,
        }, { onConflict: "user_id,source_kind,source_id" });
      results.push({ userId: userToken.userId, ok: true, googleEventId: googleEvent.id, dedupedEvents });
    } catch (e) {
      const message = e instanceof Error ? e.message : "mirror failed";
      await adminClient
        .from("espelhos_agenda_google_usuario")
        .upsert({
          user_id: userToken.userId,
          source_kind: sourceKind,
          source_id: sourceId,
          google_event_id: null,
          synced_at: null,
          sync_error: message,
        }, { onConflict: "user_id,source_kind,source_id" });
      results.push({ userId: userToken.userId, ok: false, message });
    }
  }

  return results;
}

async function loadMirrorRowsForSource(
  adminClient: any,
  sourceKind: "visit" | "schedule_event",
  sourceId: string,
): Promise<ExistingMirrorRow[]> {
  const { data, error } = await adminClient
    .from("espelhos_agenda_google_usuario")
    .select("user_id, google_event_id")
    .eq("source_kind", sourceKind)
    .eq("source_id", sourceId);
  if (error) throw error;
  return (data || []) as ExistingMirrorRow[];
}

async function deleteMirrorRows(
  adminClient: any,
  rows: ExistingMirrorRow[],
  sourceKind: "visit" | "schedule_event",
  sourceId: string,
): Promise<{ deleted: number; warnings: string[] }> {
  let deleted = 0;
  const warnings: string[] = [];

  for (const row of rows) {
    try {
      const userToken = await getUserAccessToken(adminClient, row.user_id);
      if (row.google_event_id && userToken.token) {
        await deleteGoogleEvent(userToken.token, "primary", row.google_event_id);
      } else if (row.google_event_id) {
        warnings.push(`Espelho sem token ativo para usuario ${row.user_id}`);
      }
      const { error } = await adminClient
        .from("espelhos_agenda_google_usuario")
        .delete()
        .eq("user_id", row.user_id)
        .eq("source_kind", sourceKind)
        .eq("source_id", sourceId);
      if (error) throw error;
      deleted += 1;
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : "Falha ao remover espelho antigo");
    }
  }

  return { deleted, warnings };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleBearer = `Bearer ${requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_JWT)}`;
    const adminSyncToken = Deno.env.get("GOOGLE_CALENDAR_SYNC_ADMIN_TOKEN");
    const adminSyncHeader = req.headers.get("x-google-calendar-sync-admin-token");
    const isServiceRoleCall = isServiceRoleRequest(authHeader, serviceRoleBearer) || (adminSyncToken ? adminSyncHeader === adminSyncToken : false);
    let sessionClient: any = null;
    let authUserId: string | null = null;

    if (!isServiceRoleCall) {
      sessionClient = createSessionClient(authHeader);
      const { data: authData, error: authError } = await sessionClient.auth.getUser();
      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      authUserId = authData.user.id;
    }

    const body = await req.json();
    const requestedAction: "upsert" | "delete" = body?.action === "delete" ? "delete" : "upsert";
    const mirrorOnly = body?.mirrorOnly === true;
    let visit: VisitInput | null = body?.visit ?? null;
    let scheduleEvent: ScheduleEventInput | null = body?.event ?? body?.scheduleEvent ?? null;
    const syncKind = scheduleEvent ? "schedule_event" : "visit";

    if (syncKind === "visit" && (!visit?.id || !visit?.scheduled_at)) {
      return new Response(JSON.stringify({ error: "visit.id and visit.scheduled_at are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (syncKind === "schedule_event" && (!scheduleEvent?.id || !scheduleEvent?.starts_at || !scheduleEvent?.title)) {
      return new Response(JSON.stringify({ error: "event.id, event.title and event.starts_at are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!isServiceRoleCall && sessionClient) {
      if (syncKind === "visit" && visit?.id) {
        visit = await loadAuthorizedVisit(sessionClient, visit.id);
      } else if (syncKind === "schedule_event" && scheduleEvent?.id) {
        scheduleEvent = await loadAuthorizedScheduleEvent(sessionClient, scheduleEvent.id);
      }
    }
    const sourceStatus = syncKind === "schedule_event" ? scheduleEvent?.status ?? null : visit?.status ?? null;
    const action = getEffectiveCalendarAction(requestedAction, syncKind, sourceStatus);

    const adminClient = createClient(
      requireEnv("SUPABASE_URL", SUPABASE_URL),
      getSupabaseAdminKey(),
    );

    const personalOwnerUserId = syncKind === "schedule_event"
      ? scheduleEvent?.responsible_user_id ?? authUserId
      : visit?.consultant_id ?? authUserId;
    const personalToken: UserGoogleToken = personalOwnerUserId
      ? await getUserAccessToken(adminClient, personalOwnerUserId)
      : { token: null };
    const centralToken = await getCentralCalendarAccessToken();
    const meetCohostEmails = getGoogleMeetCohostEmails(Deno.env.get("GOOGLE_MEET_COHOST_EMAILS"));
    const centralMeetToken = await getCentralGoogleAccessToken([CENTRAL_MEET_CREATED_SCOPE]);
    const relatedUserPersonalTokens = await getRelatedUserPersonalTokens(adminClient, getRelatedUserIds(syncKind, visit, scheduleEvent));
    const mirrorTokens = uniqueMirrorTokens(relatedUserPersonalTokens);
    const sourceId = syncKind === "schedule_event" ? scheduleEvent!.id : visit!.id;

    let personalEventId = syncKind === "schedule_event"
      ? scheduleEvent?.google_event_id_personal ?? null
      : visit?.google_event_id ?? null;
    let centralEventId = syncKind === "schedule_event"
      ? scheduleEvent?.google_event_id ?? null
      : visit?.google_event_id_central ?? null;
    const shouldHaveMeet = syncKind === "schedule_event" && scheduleEvent
      ? shouldCreateMeetForScheduleEvent(scheduleEvent)
      : visit
      ? shouldCreateMeetForVisit(visit)
      : false;
    let googleMeetLink = shouldHaveMeet
      ? (syncKind === "schedule_event" ? scheduleEvent?.google_meet_link ?? null : visit?.google_meet_link ?? null)
      : null;
    const errors: { calendar: "personal" | "central"; message: string }[] = [];
    let userMirrors: { userId: string; ok: boolean; googleEventId?: string | null; dedupedEvents?: number; message?: string }[] = [];
    let dedupedEvents = 0;
    let staleMirrorsDeleted = 0;
    let meetCohostsConfigured: string[] = [];
    const reconcileWarnings: string[] = [];

    if (action === "delete") {
      if (!mirrorOnly && personalEventId) {
        try {
          const legacyDelete = await deleteLegacyPersonalEventFromConnectedCalendars(adminClient, personalEventId, personalOwnerUserId);
          if (legacyDelete.deleted || legacyDelete.attempted > 0) {
            personalEventId = null;
            googleMeetLink = null;
            if (!legacyDelete.deleted) {
              reconcileWarnings.push("Evento pessoal legado nao encontrado em contas conectadas; ID local limpo como orfao");
            }
          } else {
            reconcileWarnings.push(legacyDelete.message || "Evento pessoal legado nao encontrado em contas conectadas");
          }
        } catch (e) {
          errors.push({ calendar: "personal", message: e instanceof Error ? e.message : "delete failed" });
        }
      }
      if (!mirrorOnly && centralToken && centralEventId) {
        try {
          await deleteGoogleEvent(centralToken, CENTRAL_CALENDAR_ID, centralEventId);
          centralEventId = null;
          googleMeetLink = null;
        } catch (e) {
          errors.push({ calendar: "central", message: e instanceof Error ? e.message : "delete failed" });
        }
      } else if (!mirrorOnly && !centralToken && centralEventId) {
        errors.push({ calendar: "central", message: "Agenda Central MX nao conectada" });
      }

      const mirrorPayload = syncKind === "schedule_event" && scheduleEvent
        ? buildScheduleEventPayload(scheduleEvent)
        : visit
        ? buildEventPayload(visit)
        : null;
      if (mirrorPayload) {
        const allMirrorRows = await loadMirrorRowsForSource(adminClient, syncKind, sourceId);
        const mirrorDelete = await deleteMirrorRows(adminClient, allMirrorRows, syncKind, sourceId);
        staleMirrorsDeleted += mirrorDelete.deleted;
        reconcileWarnings.push(...mirrorDelete.warnings);
        userMirrors = allMirrorRows.map((row) => ({ userId: row.user_id, ok: true, googleEventId: null }));
      }
    } else {
      if (!mirrorOnly && personalEventId) {
        try {
          const legacyDelete = await deleteLegacyPersonalEventFromConnectedCalendars(adminClient, personalEventId, personalOwnerUserId);
          if (legacyDelete.deleted || legacyDelete.attempted > 0) {
            personalEventId = null;
            if (!legacyDelete.deleted) {
              reconcileWarnings.push("Evento pessoal legado nao encontrado em contas conectadas; ID local limpo como orfao");
            }
          } else {
            reconcileWarnings.push(legacyDelete.message || "Evento pessoal legado nao encontrado em contas conectadas");
          }
        } catch (e) {
          reconcileWarnings.push(e instanceof Error ? e.message : "Falha ao limpar evento pessoal legado");
        }
      }
      if (!mirrorOnly && centralToken) {
        try {
          const rawCentralAttendees = scheduleEvent
            ? normalizeAttendees([
              {
                email: personalToken.googleEmail ?? scheduleEvent.responsible_email ?? "",
                displayName: scheduleEvent.responsible_name ?? undefined,
              },
              ...(shouldInviteScheduleEventCreator(scheduleEvent.event_type)
                ? [
                  getScheduleEventCreatorAttendee(scheduleEvent),
                  ...getScheduleEventAdditionalAttendees(scheduleEvent),
                ]
                : []),
            ])
            : normalizeAttendees([
              { email: personalToken.googleEmail ?? visit?.consultant_email ?? CENTRAL_CALENDAR_EMAIL },
            ]);
          const centralAttendees = filterCentralAttendeesForPersonalMirrors(rawCentralAttendees, mirrorTokens);
          const centralPayload = scheduleEvent
            ? buildScheduleEventPayload(scheduleEvent, centralAttendees)
            : buildEventPayload(visit!, centralAttendees);
          centralPayload.attendees = centralAttendees;
          const centralEvent = await upsertGoogleEvent(centralToken, CENTRAL_CALENDAR_ID, centralPayload, centralEventId);
          centralEventId = centralEvent.id;
          googleMeetLink = centralEvent.meetLink ?? googleMeetLink;
          dedupedEvents += await dedupeGoogleEventsBySource(centralToken, CENTRAL_CALENDAR_ID, syncKind, sourceId, centralEvent.id);
          if (shouldHaveMeet && googleMeetLink) {
            if (centralMeetToken) {
              try {
                const cohostResult = await ensureGoogleMeetCohosts(centralMeetToken, googleMeetLink, meetCohostEmails);
                meetCohostsConfigured = cohostResult.configuredEmails;
              } catch (e) {
                reconcileWarnings.push(`Google Meet co-hosts nao configurados: ${e instanceof Error ? e.message : "falha desconhecida"}`);
              }
            } else {
              reconcileWarnings.push("Agenda Central MX precisa ser reconectada para autorizar co-hosts do Google Meet");
            }
          }
        } catch (e) {
          errors.push({ calendar: "central", message: e instanceof Error ? e.message : "upsert failed" });
        }
      } else if (!mirrorOnly) {
        errors.push({ calendar: "central", message: "Agenda Central MX nao conectada" });
      }

      const mirrorPayload = syncKind === "schedule_event" && scheduleEvent
        ? buildScheduleEventPayload(scheduleEvent)
        : visit
        ? buildEventPayload(visit)
        : null;
      if (mirrorPayload) {
        const existingMirrorRows = await loadMirrorRowsForSource(adminClient, syncKind, sourceId);
        const staleRows = getStaleMirrorRows(existingMirrorRows, mirrorTokens.map((token) => token.userId));
        const staleDelete = await deleteMirrorRows(adminClient, staleRows, syncKind, sourceId);
        staleMirrorsDeleted += staleDelete.deleted;
        reconcileWarnings.push(...staleDelete.warnings);
        userMirrors = await mirrorToUserCalendars(
          adminClient,
          mirrorTokens,
          syncKind,
          sourceId,
          mirrorPayload,
          "upsert",
          null,
        );
        dedupedEvents += userMirrors.reduce((total, mirror) => total + (mirror.dedupedEvents ?? 0), 0);
      }
    }

    const centralError = errors.find((item) => item.calendar === "central");
    if (syncKind === "schedule_event" && scheduleEvent) {
      const { error: eventUpdateError } = await adminClient
        .from("eventos_agenda_consultoria")
        .update({
          google_event_id: centralEventId,
          google_event_id_personal: null,
          google_meet_link: googleMeetLink,
          google_synced_at: centralError ? null : new Date().toISOString(),
          google_sync_error: centralError?.message ?? null,
        })
        .eq("id", scheduleEvent.id);
      if (eventUpdateError) {
        await adminClient
          .from("eventos_agenda_consultoria")
          .update({ google_event_id: centralEventId })
          .eq("id", scheduleEvent.id);
      }
    } else if (visit) {
      // Persist event IDs back into visitas_consultoria
      const { error: updateError } = await adminClient
        .from("visitas_consultoria")
        .update({
          google_event_id: personalEventId,
          google_event_id_central: centralEventId,
          google_meet_link: googleMeetLink,
          google_synced_at: centralError ? null : new Date().toISOString(),
        })
        .eq("id", visit.id);
      if (updateError && updateError.code !== "PGRST204") {
        // Column google_event_id_central may not exist yet — fall back to legacy update
        await adminClient
          .from("visitas_consultoria")
          .update({ google_event_id: personalEventId })
          .eq("id", visit.id);
      }
    }

    return new Response(
      JSON.stringify({
        ok: errors.length === 0,
        kind: syncKind,
        personalEventId,
        centralEventId,
        googleMeetLink,
        errors,
        userConnected: Boolean(personalToken.token),
        personalOwnerUserId,
        centralConnected: Boolean(centralToken),
        userMirrors,
        adminMasterMirrors: userMirrors,
        dedupedEvents,
        staleMirrorsDeleted,
        meetCohostsConfigured,
        reconcileWarnings,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "sync failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
