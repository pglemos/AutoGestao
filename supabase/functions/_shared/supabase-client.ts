import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@3";
import { resolveSupabaseSecretKey } from "./api-keys.ts";

export function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) throw new Error("Missing Supabase URL");

  return createClient(
    supabaseUrl,
    resolveSupabaseSecretKey(Deno.env.get),
  );
}

export function createResendClient(): Resend | null {
  const key = Deno.env.get("RESEND_API_KEY");
  return key ? new Resend(key) : null;
}
