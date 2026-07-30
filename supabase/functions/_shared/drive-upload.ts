import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSupabaseSecretKey } from "./api-keys.ts";
import { requireEnv } from "./crypto.ts";
import { getCentralDriveAccessToken } from "./google.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const INTERNAL_ROLES = ["administrador_geral", "administrador_mx", "consultor_mx"];

export type DriveDocTipo = "pdi" | "feedback" | "relatorios" | "plano_acao" | "dre_financeiro" | "visitas";

type SupabaseAdminClient = {
  from: (table: string) => any;
}

function makeAdminClient() {
  return createClient(
    requireEnv("SUPABASE_URL", SUPABASE_URL),
    resolveSupabaseSecretKey(Deno.env.get),
    { auth: { persistSession: false, autoRefreshToken: false } },
  ) as unknown as SupabaseAdminClient;
}

async function driveUploadMultipart(
  accessToken: string,
  folderId: string,
  fileName: string,
  content: Uint8Array,
  mimeType: string,
): Promise<{ fileId: string; fileUrl: string } | null> {
  const metadata = { name: fileName, parents: [folderId] };
  const boundary = `mx-drive-${crypto.randomUUID()}`;
  const body = new Blob(
    [
      `--${boundary}\r\n`,
      "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      JSON.stringify(metadata),
      "\r\n",
      `--${boundary}\r\n`,
      `Content-Type: ${mimeType}\r\n\r\n`,
      content as unknown as BlobPart,
      "\r\n",
      `--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` },
  );
  const headers = new Headers({
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": `multipart/related; boundary=${boundary}`,
  });
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    { method: "POST", headers, body },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return null;
  return {
    fileId: String(data.id),
    fileUrl: String(data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`),
  };
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

async function getMxDriveShareEmails(adminClient: any): Promise<string[]> {
  const { data, error } = await adminClient
    .from("usuarios")
    .select("email")
    .eq("active", true)
    .in("role", INTERNAL_ROLES);

  if (error) throw error;

  const envEmails = (Deno.env.get("GOOGLE_DRIVE_SHARE_EMAILS") || "")
    .split(",")
    .map(normalizeEmail)
    .filter((email): email is string => Boolean(email));

  return Array.from(new Set([
    ...envEmails,
    ...(data || []).map((row: { email?: string | null }) => normalizeEmail(row.email)).filter((email: string | null): email is string => Boolean(email)),
  ]));
}

async function grantDriveReaderPermission(accessToken: string, fileId: string, emailAddress: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?sendNotificationEmail=false&supportsAllDrives=true`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "user",
        role: "reader",
        emailAddress,
      }),
    },
  );

  if (res.ok) return;

  const data = await res.json().catch(() => ({}));
  const reason = data?.error?.errors?.[0]?.reason;
  const message = String(data?.error?.message || "");
  const lowerMessage = message.toLowerCase();
  if (
    res.status === 409 ||
    reason === "alreadyExists" ||
    reason === "cannotShareWithOwner" ||
    lowerMessage.includes("already exists") ||
    lowerMessage.includes("owner")
  ) return;
  throw new Error(data?.error?.message || `Falha ao liberar acesso no Drive (${res.status})`);
}

async function ensureMxDriveAccess(
  adminClient: any,
  accessToken: string,
  fileId: string,
): Promise<void> {
  const emails = await getMxDriveShareEmails(adminClient);
  if (emails.length === 0) return;

  const results = await Promise.allSettled(
    emails.map((email) => grantDriveReaderPermission(accessToken, fileId, email)),
  );
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  if (rejected) throw rejected.reason;
}

/**
 * Uploads a document to the correct Drive subfolder of a consultoria client.
 * Finds the client by storeId (primary_store_id), then looks up the subfolder for the given tipo.
 * Returns null silently if no client, no subfolder, or Drive is not connected — never throws.
 */
export async function uploadDocumentToStore(
  storeId: string,
  tipo: DriveDocTipo,
  fileName: string,
  content: Uint8Array | ArrayBuffer,
  mimeType: string,
): Promise<{ fileId: string; fileUrl: string } | null> {
  try {
    const adminClient = makeAdminClient();

    const { data: client } = await adminClient
      .from("clientes_consultoria")
      .select("id")
      .eq("primary_store_id", storeId)
      .maybeSingle();
    if (!client) return null;

    const { data: subfolder } = await adminClient
      .from("subpastas_drive_consultoria")
      .select("google_drive_folder_id")
      .eq("client_id", client.id)
      .eq("tipo", tipo)
      .eq("status", "active")
      .maybeSingle();
    if (!subfolder) return null;

    const accessToken = await getCentralDriveAccessToken();
    if (!accessToken) return null;

    const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
    const uploaded = await driveUploadMultipart(
      accessToken,
      subfolder.google_drive_folder_id,
      fileName,
      bytes,
      mimeType,
    );
    if (uploaded) await ensureMxDriveAccess(adminClient, accessToken, uploaded.fileId);
    return uploaded;
  } catch {
    return null;
  }
}

/**
 * Same as uploadDocumentToStore but accepts clientId directly.
 */
export async function uploadDocumentToClient(
  clientId: string,
  tipo: DriveDocTipo,
  fileName: string,
  content: Uint8Array | ArrayBuffer,
  mimeType: string,
): Promise<{ fileId: string; fileUrl: string } | null> {
  try {
    const adminClient = makeAdminClient();

    const { data: subfolder } = await adminClient
      .from("subpastas_drive_consultoria")
      .select("google_drive_folder_id")
      .eq("client_id", clientId)
      .eq("tipo", tipo)
      .eq("status", "active")
      .maybeSingle();
    if (!subfolder) return null;

    const accessToken = await getCentralDriveAccessToken();
    if (!accessToken) return null;

    const bytes = content instanceof ArrayBuffer ? new Uint8Array(content) : content;
    const uploaded = await driveUploadMultipart(
      accessToken,
      subfolder.google_drive_folder_id,
      fileName,
      bytes,
      mimeType,
    );
    if (uploaded) await ensureMxDriveAccess(adminClient, accessToken, uploaded.fileId);
    return uploaded;
  } catch {
    return null;
  }
}
