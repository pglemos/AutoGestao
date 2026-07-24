// MX Performance — Send Web Push Notification
// Sprint 3 / S3-T5.
//
// POST body:
//   { userIds?: string[], lojaId?: string,
//     title, body?, url?, icon?, badge?, tag?, requireInteraction?, payload? }
//
// Carrega subscriptions ativas conforme filtro, envia VAPID/Web Push para cada,
// marca expiradas (410), audita em public.push_notifications_log.
//
// ENV requeridos:
//   • SUPABASE_URL
//   • SUPABASE_SERVICE_ROLE_KEY
//   • VAPID_PUBLIC_KEY
//   • VAPID_PRIVATE_KEY
//   • VAPID_SUBJECT (ex.: "mailto:gestao@mxconsultoria.com.br")
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "https://esm.sh/web-push@3.6.7";
import { corsHeaders } from "../_shared/cors.ts";
import { canManageStore, isAdminRole, requireAuthenticatedRole } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:gestao@mxconsultoria.com.br";

type RequestBody = {
  userIds?: string[];
  lojaId?: string;
  title?: string;
  body?: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  payload?: Record<string, unknown>;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({ error: "VAPID keys nao configuradas (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  try {
    // Achado crítico na auditoria de 2026-07-24: este endpoint não tinha
    // NENHUMA checagem de autenticação — qualquer chamador (repo é público
    // no GitHub, nome da function é descobrível) podia mandar push
    // notification arbitrário (título/corpo/URL) pra qualquer usuário ou
    // loja via userIds/lojaId, usando service_role por baixo. Vetor de
    // phishing direto pros usuários reais do app.
    const auth = await requireAuthenticatedRole(req, [
      "administrador_geral",
      "administrador_mx",
      "dono",
      "gerente",
    ]);
    if (auth.response) return auth.response;

    const body = (await req.json()) as RequestBody;
    if (!body.title || body.title.trim().length === 0) {
      return new Response(JSON.stringify({ error: "title obrigatorio" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dono/gerente só podem transmitir pra loja(s) que gerenciam, nunca por
    // userIds arbitrário (que poderia mirar qualquer usuário do sistema).
    if (!isAdminRole(auth.context!.role)) {
      if (body.userIds?.length || !body.lojaId) {
        return new Response(
          JSON.stringify({ error: "Informe lojaId (dono/gerente só podem notificar a própria loja)." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!(await canManageStore(auth.context!, body.lojaId))) {
        return new Response(
          JSON.stringify({ error: "Você não gerencia esta loja." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const admin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Carrega subscriptions ativas conforme filtro
    let query = admin
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("is_active", true);
    if (body.userIds && body.userIds.length) {
      query = query.in("user_id", body.userIds);
    } else if (body.lojaId) {
      query = query.eq("loja_id", body.lojaId);
    } else {
      return new Response(
        JSON.stringify({ error: "Informe userIds ou lojaId para definir destino." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    const subscriptions = (data ?? []) as SubscriptionRow[];
    if (subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, sent: 0, failed: 0, expired: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const notification = {
      title: body.title,
      body: body.body ?? "",
      url: body.url ?? "/notificacoes",
      icon: body.icon,
      badge: body.badge,
      tag: body.tag,
      requireInteraction: Boolean(body.requireInteraction),
      data: body.payload ?? null,
    };
    const payloadString = JSON.stringify(notification);

    let sent = 0;
    let failed = 0;
    let expired = 0;
    const expiredIds: string[] = [];
    const logRows: Array<Record<string, unknown>> = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payloadString,
            { TTL: 60 * 60 * 24 },
          );
          sent += 1;
          logRows.push({
            user_id: sub.user_id,
            subscription_id: sub.id,
            title: notification.title,
            body: notification.body,
            url: notification.url,
            status: "sent",
            payload: notification,
          });
        } catch (err) {
          const status = (err as { statusCode?: number }).statusCode;
          const message = err instanceof Error ? err.message : String(err);
          if (status === 404 || status === 410) {
            expired += 1;
            expiredIds.push(sub.id);
            logRows.push({
              user_id: sub.user_id,
              subscription_id: sub.id,
              title: notification.title,
              body: notification.body,
              url: notification.url,
              status: "expired",
              error: message,
              payload: notification,
            });
          } else {
            failed += 1;
            logRows.push({
              user_id: sub.user_id,
              subscription_id: sub.id,
              title: notification.title,
              body: notification.body,
              url: notification.url,
              status: "failed",
              error: message,
              payload: notification,
            });
          }
        }
      }),
    );

    if (expiredIds.length > 0) {
      await admin
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("id", expiredIds);
    }
    if (logRows.length > 0) {
      await admin.from("push_notifications_log").insert(logRows);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent,
        failed,
        expired,
        total: subscriptions.length,
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
