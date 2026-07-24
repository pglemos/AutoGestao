// Executive Agenda <-> Google Calendar bidirectional sync
//
// Sprint 3 (Orion) — Blitz 48h follow-up.
//
// Faz upsert/delete de eventos do `public.eventos_agenda_executiva` no
// Google Calendar central da MX. Quando o evento da loja precisa aparecer
// nos calendarios pessoais autorizados, a logica reutiliza
// `_shared/google.ts` (mesmos helpers do google-calendar-sync existente).
//
// POST body:
//   { action: 'upsert' | 'delete', eventId: uuid }
//
// O caller (UI ou cron) só precisa passar o eventId — todo o restante
// (token central, payload, atualizacao da linha) é resolvido aqui dentro.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedRole } from "../_shared/auth.ts";
import { requireEnv } from "../_shared/crypto.ts";
import {
  CENTRAL_CALENDAR_ID,
  CENTRAL_CALENDAR_EMAIL,
  getCentralCalendarAccessToken,
  upsertGoogleEvent,
  deleteGoogleEvent,
  type GoogleEventInput,
} from "../_shared/google.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TIMEZONE = "America/Sao_Paulo";

type ExecutiveAgendaRow = {
  id: string;
  loja_id: string;
  kind: string;
  title: string;
  public_summary: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  source: string;
  integration_status: string;
  google_event_id: string | null;
};

function isoOrNull(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function buildPayload(row: ExecutiveAgendaRow): GoogleEventInput {
  const startsAt = isoOrNull(row.starts_at) ?? row.starts_at;
  const endsAt =
    isoOrNull(row.ends_at) ??
    isoOrNull(
      new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString(),
    ) ??
    startsAt;
  return {
    summary: row.title,
    description: row.public_summary ?? undefined,
    start: { dateTime: startsAt, timeZone: TIMEZONE },
    end: { dateTime: endsAt, timeZone: TIMEZONE },
    attendees: CENTRAL_CALENDAR_EMAIL
      ? [{ email: CENTRAL_CALENDAR_EMAIL }]
      : undefined,
    extendedProperties: {
      private: {
        mx_kind: "executive_agenda",
        mx_event_id: row.id,
        mx_store_id: row.loja_id,
      },
    },
    reminders: { useDefault: true },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    // Achado na auditoria de 2026-07-24: endpoint sem nenhuma checagem de
    // autenticação (comentário do topo do arquivo já assumia "UI ou cron"
    // sem nunca validar nenhum). Chamado por OwnerExecutiveCockpit.tsx (dono),
    // por isso o gate cobre os papéis internos MX + dono/gerente, não só admin.
    const auth = await requireAuthenticatedRole(req, [
      "administrador_geral",
      "administrador_mx",
      "consultor_mx",
      "dono",
      "gerente",
    ]);
    if (auth.response) return auth.response;

    const body = (await req.json()) as { action?: string; eventId?: string };
    const action: "upsert" | "delete" = body.action === "delete" ? "delete" : "upsert";
    const eventId = body.eventId;
    if (!eventId) {
      return new Response(JSON.stringify({ error: "eventId obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      requireEnv("SUPABASE_URL", SUPABASE_URL),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_SERVICE_ROLE_KEY),
    );

    const { data: row, error: loadError } = await adminClient
      .from("eventos_agenda_executiva")
      .select(
        "id, loja_id, kind, title, public_summary, starts_at, ends_at, all_day, source, integration_status, google_event_id",
      )
      .eq("id", eventId)
      .maybeSingle();
    if (loadError) throw loadError;
    if (!row) {
      return new Response(JSON.stringify({ error: "evento nao encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const event = row as ExecutiveAgendaRow;
    const accessToken = await getCentralCalendarAccessToken();
    if (!accessToken) {
      await adminClient
        .from("eventos_agenda_executiva")
        .update({
          integration_status: "erro",
          integration_error:
            "Token do Google Calendar central indisponivel — verifique configuracao.",
        })
        .eq("id", event.id);
      return new Response(
        JSON.stringify({ error: "Token central indisponivel" }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (action === "delete") {
      if (event.google_event_id) {
        await deleteGoogleEvent(
          accessToken,
          CENTRAL_CALENDAR_ID,
          event.google_event_id,
        );
      }
      await adminClient
        .from("eventos_agenda_executiva")
        .update({
          integration_status: "desconectado",
          integration_error: null,
          google_event_id: null,
        })
        .eq("id", event.id);
      return new Response(
        JSON.stringify({ ok: true, deleted: true, eventId: event.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // upsert
    const payload = buildPayload(event);
    const result = await upsertGoogleEvent(
      accessToken,
      CENTRAL_CALENDAR_ID,
      payload,
      event.google_event_id ?? null,
    );

    await adminClient
      .from("eventos_agenda_executiva")
      .update({
        integration_status: "sincronizado",
        integration_error: null,
        google_event_id: result.id,
      })
      .eq("id", event.id);

    return new Response(
      JSON.stringify({
        ok: true,
        eventId: event.id,
        googleEventId: result.id,
        htmlLink: result.htmlLink,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
