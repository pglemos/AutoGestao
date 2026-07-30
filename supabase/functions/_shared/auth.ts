import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSupabasePublishableKey, resolveSupabaseSecretKey } from "./api-keys.ts";
import { corsHeaders } from "./cors.ts";

export type MxRole = "administrador_geral" | "administrador_mx" | "consultor_mx" | "dono" | "gerente" | "vendedor";

export type AuthContext = {
  user: { id: string; email?: string };
  role: MxRole;
  adminClient: any;
  sessionClient: any;
};

const ADMIN_ROLES: MxRole[] = ["administrador_geral", "administrador_mx"];

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function forbidden(message = "Forbidden") {
  return jsonResponse({ success: false, error: message }, 403);
}

export function isAdminRole(role: string | null | undefined) {
  return role === "administrador_geral" || role === "administrador_mx";
}

export async function requireAuthenticatedRole(req: Request, allowedRoles: MxRole[]) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return { response: jsonResponse({ success: false, error: "Missing Authorization header" }, 401) };
  }

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const serviceKey = resolveSupabaseSecretKey(Deno.env.get);
  const anonKey = resolveSupabasePublishableKey(Deno.env.get);

  const sessionClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await sessionClient.auth.getUser();
  if (authError || !authData.user) {
    return { response: jsonResponse({ success: false, error: "Invalid session" }, 401) };
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from("usuarios")
    .select("role, active")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError || !profile?.role) {
    return { response: jsonResponse({ success: false, error: "Profile not found" }, 403) };
  }
  if (profile.active === false) {
    return { response: jsonResponse({ success: false, error: "Inactive user" }, 403) };
  }

  const role = profile.role as MxRole;
  if (!allowedRoles.includes(role)) {
    return { response: forbidden("Insufficient privileges") };
  }

  return {
    context: {
      user: { id: authData.user.id, email: authData.user.email },
      role,
      adminClient,
      sessionClient,
    } satisfies AuthContext,
  };
}

export async function authorizeReportRequest(req: Request) {
  const cronSecret = Deno.env.get("MX_CRON_SECRET");
  if (cronSecret && req.headers.get("x-mx-cron-secret") === cronSecret) {
    return { context: null, response: undefined };
  }
  return requireAuthenticatedRole(req, ADMIN_ROLES);
}

export async function canManageStore(context: AuthContext, storeId: string) {
  if (isAdminRole(context.role)) return true;
  const { data, error } = await context.adminClient
    .from("vinculos_loja")
    .select("id")
    .eq("user_id", context.user.id)
    .eq("store_id", storeId)
    .in("role", ["dono", "gerente"])
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function canSendVisitReport(context: AuthContext, visit: { client_id: string; consultant_id?: string | null; auxiliary_consultant_id?: string | null }) {
  if (isAdminRole(context.role)) return true;
  if (context.role !== "consultor_mx") return false;
  if (visit.consultant_id === context.user.id || visit.auxiliary_consultant_id === context.user.id) return true;

  const { data, error } = await context.adminClient
    .from("atribuicoes_consultoria")
    .select("id")
    .eq("client_id", visit.client_id)
    .eq("user_id", context.user.id)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
