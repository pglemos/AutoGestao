import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveSupabaseSecretKey } from "../_shared/api-keys.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireEnv } from "../_shared/crypto.ts";
import {
  createSessionClient,
  getCentralDriveAccessToken,
  googleApiRequest,
  CENTRAL_DRIVE_ROOT_FOLDER_ID,
  CENTRAL_DRIVE_ROOT_FOLDER_NAME,
} from "../_shared/google.ts";

declare const EdgeRuntime: { waitUntil?: (promise: Promise<unknown>) => void } | undefined;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const getSupabaseAdminKey = () => resolveSupabaseSecretKey(Deno.env.get);
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const INTERNAL_ROLES = new Set(["administrador_geral", "administrador_mx", "consultor_mx"]);

const SUBFOLDER_TYPES = [
  { tipo: "pdi", name: "PDI" },
  { tipo: "feedback", name: "Feedback" },
  { tipo: "relatorios", name: "Relatórios" },
  { tipo: "plano_acao", name: "Plano de Ação" },
  { tipo: "dre_financeiro", name: "DRE e Financeiro" },
  { tipo: "visitas", name: "Relatórios de Visita" },
] as const;

type DriveAction = "ensure-folder" | "list" | "upload" | "delete" | "setup_client" | "setup_all" | "delete_client_folder";

type ConsultingClientRow = {
  id: string;
  name: string;
  slug?: string | null;
  primary_store_id?: string | null;
};

type DriveFolderRow = {
  id: string;
  client_id: string;
  store_id: string | null;
  parent_folder_id: string;
  google_drive_folder_id: string;
  google_drive_folder_url: string;
  status: string;
  cache_available?: boolean;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
};

type DriveFolder = { id: string; name: string; webViewLink: string };

type DriveShareTarget = {
  emailAddress: string;
};

type SupabaseEdgeClient = {
  auth: any;
  from: (table: string) => any;
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === "object" && "message" in err) {
    return new Error(String((err as { message: unknown }).message));
  }
  return new Error(String(err));
}

function parseUuid(value: unknown, label: string): string {
  if (typeof value !== "string") throw new Error(`${label} obrigatório`);
  const normalized = value.trim();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(normalized)) throw new Error(`${label} inválido`);
  return normalized;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function isServiceRoleBearer(authHeader: string): boolean {
  if (!authHeader.startsWith("Bearer ")) return false;
  return decodeJwtPayload(authHeader.slice("Bearer ".length))?.role === "service_role";
}

function normalizeFolderName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|#%{}~&]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140) || "Cliente MX";
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function folderUrl(folderId: string): string {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`;
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "PGRST205" ||
    candidate.code === "42P01" ||
    Boolean(candidate.message?.includes("Could not find the table")) ||
    Boolean(candidate.message?.includes("does not exist"));
}

async function driveJson(accessToken: string, path: string, init: RequestInit = {}) {
  const res = await googleApiRequest(accessToken, path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Google Drive API error (${res.status})`);
  return data;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

async function getMxDriveShareTargets(adminClient: SupabaseEdgeClient): Promise<DriveShareTarget[]> {
  const { data, error } = await adminClient
    .from("usuarios")
    .select("email")
    .eq("active", true)
    .in("role", Array.from(INTERNAL_ROLES));

  if (error) throw toError(error);

  const envEmails = (Deno.env.get("GOOGLE_DRIVE_SHARE_EMAILS") || "")
    .split(",")
    .map(normalizeEmail)
    .filter((email): email is string => Boolean(email));

  const emails = new Set<string>([
    ...envEmails,
    ...(data || []).map((row: { email?: string | null }) => normalizeEmail(row.email)).filter((email: string | null): email is string => Boolean(email)),
  ]);

  return Array.from(emails).map((emailAddress) => ({ emailAddress }));
}

async function grantDriveReaderPermission(
  accessToken: string,
  fileId: string,
  target: DriveShareTarget,
): Promise<void> {
  const res = await googleApiRequest(
    accessToken,
    `/drive/v3/files/${encodeURIComponent(fileId)}/permissions?sendNotificationEmail=false&supportsAllDrives=true`,
    {
      method: "POST",
      body: JSON.stringify({
        type: "user",
        role: "reader",
        emailAddress: target.emailAddress,
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
  adminClient: SupabaseEdgeClient,
  accessToken: string,
  fileIds: string[],
): Promise<void> {
  const uniqueFileIds = Array.from(new Set(fileIds.filter(Boolean)));
  if (uniqueFileIds.length === 0) return;

  const targets = await getMxDriveShareTargets(adminClient);
  if (targets.length === 0) return;

  const results = await Promise.allSettled(
    uniqueFileIds.flatMap((fileId) =>
      targets.map((target) => grantDriveReaderPermission(accessToken, fileId, target)),
    ),
  );

  const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  if (rejected.length > 0) {
    console.warn("Non-blocking Google Drive share permission failures", {
      failures: rejected.length,
      message: toError(rejected[0].reason).message,
    });
  }
}

async function createDriveFolder(accessToken: string, name: string, parentId?: string): Promise<DriveFolder> {
  const metadata: Record<string, unknown> = { name, mimeType: FOLDER_MIME_TYPE };
  if (parentId) metadata.parents = [parentId];
  const data = await driveJson(accessToken, "/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    body: JSON.stringify(metadata),
  });
  return {
    id: String(data.id),
    name: String(data.name || name),
    webViewLink: String(data.webViewLink || folderUrl(String(data.id))),
  };
}

async function findDriveFolder(accessToken: string, name: string, parentId: string): Promise<DriveFolder | null> {
  const query = [
    `mimeType='${FOLDER_MIME_TYPE}'`,
    `name='${escapeDriveQueryValue(name)}'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    "trashed=false",
  ].join(" and ");
  const data = await driveJson(
    accessToken,
    `/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=1&fields=files(id,name,webViewLink)`,
  );
  const file = Array.isArray(data.files) ? data.files[0] : null;
  return file
    ? {
        id: String(file.id),
        name: String(file.name || name),
        webViewLink: String(file.webViewLink || folderUrl(String(file.id))),
      }
    : null;
}

/** Finds ALL folders with the given name at the given parent (to detect duplicates). */
async function findAllDriveFolders(accessToken: string, name: string, parentId: string): Promise<DriveFolder[]> {
  const query = [
    `mimeType='${FOLDER_MIME_TYPE}'`,
    `name='${escapeDriveQueryValue(name)}'`,
    `'${escapeDriveQueryValue(parentId)}' in parents`,
    "trashed=false",
  ].join(" and ");
  const data = await driveJson(
    accessToken,
    `/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=20&fields=files(id,name,webViewLink)`,
  );
  return Array.isArray(data.files)
    ? data.files.map((f: Record<string, unknown>) => ({
        id: String(f.id),
        name: String(f.name || name),
        webViewLink: String(f.webViewLink || folderUrl(String(f.id))),
      }))
    : [];
}

/** Checks whether a Drive folder has any children (files or sub-folders). */
async function driveHasChildren(accessToken: string, folderId: string): Promise<boolean> {
  const data = await driveJson(
    accessToken,
    `/drive/v3/files?q=${encodeURIComponent(`'${escapeDriveQueryValue(folderId)}' in parents and trashed=false`)}&spaces=drive&pageSize=1&fields=files(id)`,
  );
  return Array.isArray(data.files) && data.files.length > 0;
}

/**
 * Returns (or creates) the single root folder "MX Performance - Clientes".
 * Stores the chosen folder ID in config_drive_central to prevent future duplicates.
 * If duplicates already exist, keeps the one with content and deletes the empty ones.
 */
async function getRootFolder(adminClient: any, accessToken: string): Promise<DriveFolder> {
  if (CENTRAL_DRIVE_ROOT_FOLDER_ID) {
    return { id: CENTRAL_DRIVE_ROOT_FOLDER_ID, name: CENTRAL_DRIVE_ROOT_FOLDER_NAME, webViewLink: folderUrl(CENTRAL_DRIVE_ROOT_FOLDER_ID) };
  }

  const { data: configRow } = await adminClient
    .from("config_drive_central")
    .select("value")
    .eq("key", "root_folder_id")
    .maybeSingle();
  if (configRow?.value) {
    return { id: configRow.value, name: CENTRAL_DRIVE_ROOT_FOLDER_NAME, webViewLink: folderUrl(configRow.value) };
  }

  const allRoots = await findAllDriveFolders(accessToken, CENTRAL_DRIVE_ROOT_FOLDER_NAME, "root");

  let root: DriveFolder;
  if (allRoots.length === 0) {
    root = await createDriveFolder(accessToken, CENTRAL_DRIVE_ROOT_FOLDER_NAME);
  } else if (allRoots.length === 1) {
    root = allRoots[0];
  } else {
    // Dedup: keep the folder with content, delete the empty ones
    let winner = allRoots[0];
    for (const candidate of allRoots) {
      if (await driveHasChildren(accessToken, candidate.id)) {
        winner = candidate;
        break;
      }
    }
    for (const candidate of allRoots) {
      if (candidate.id === winner.id) continue;
      await googleApiRequest(accessToken, `/drive/v3/files/${encodeURIComponent(candidate.id)}`, {
        method: "DELETE",
      }).catch(() => {});
    }
    root = winner;
  }

  await adminClient
    .from("config_drive_central")
    .upsert({ key: "root_folder_id", value: root.id, updated_at: new Date().toISOString() }, { onConflict: "key" });

  return root;
}

/** Ensures all document-type subfolders exist inside the client folder. */
async function ensureSubfolders(
  adminClient: any,
  accessToken: string,
  folder: DriveFolderRow,
  userId: string,
): Promise<Record<string, string>> {
  const { data: existing } = await adminClient
    .from("subpastas_drive_consultoria")
    .select("tipo,google_drive_folder_id,google_drive_folder_url")
    .eq("client_id", folder.client_id)
    .eq("status", "active");

  const existingMap = new Map<string, string>(
    (existing || []).map((r: { tipo: string; google_drive_folder_id: string }) => [r.tipo, r.google_drive_folder_id]),
  );

  const result: Record<string, string> = {};

  for (const { tipo, name } of SUBFOLDER_TYPES) {
    if (existingMap.has(tipo)) {
      const existingFolderId = existingMap.get(tipo)!;
      await ensureMxDriveAccess(adminClient, accessToken, [existingFolderId]);
      result[tipo] = folderUrl(existingFolderId);
      continue;
    }

    const found = await findDriveFolder(accessToken, name, folder.google_drive_folder_id);
    const driveFolder = found ?? await createDriveFolder(accessToken, name, folder.google_drive_folder_id);
    await ensureMxDriveAccess(adminClient, accessToken, [driveFolder.id]);

    await (async () => {
      await adminClient.from("subpastas_drive_consultoria").upsert({
        pasta_id: folder.id,
        client_id: folder.client_id,
        tipo,
        google_drive_folder_id: driveFolder.id,
        google_drive_folder_url: driveFolder.webViewLink || folderUrl(driveFolder.id),
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "client_id,tipo" });
    })().catch(() => {});

    result[tipo] = driveFolder.webViewLink || folderUrl(driveFolder.id);
  }

  return result;
}

async function ensureClientFolder(
  adminClient: any,
  accessToken: string,
  client: ConsultingClientRow,
  userId: string,
): Promise<DriveFolderRow> {
  const { data: existingData, error: existingError } = await adminClient
    .from("pastas_drive_consultoria")
    .select("*")
    .eq("client_id", client.id)
    .eq("status", "active")
    .maybeSingle();
  const existing = existingData as DriveFolderRow | null;
  const cacheAvailable = !isMissingTableError(existingError);
  if (existingError && cacheAvailable) throw toError(existingError);
  if (existing?.google_drive_folder_id) {
    await ensureMxDriveAccess(adminClient, accessToken, [
      existing.parent_folder_id,
      existing.google_drive_folder_id,
    ]);
    // Ensure config_drive_central knows the root folder (non-blocking)
    if (existing.parent_folder_id) {
      (async () => {
        await adminClient.from("config_drive_central").upsert(
          { key: "root_folder_id", value: existing.parent_folder_id, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      })().catch(() => {});
    }
    return { ...existing, cache_available: true } as DriveFolderRow;
  }

  const root = await getRootFolder(adminClient, accessToken);
  const folderName = normalizeFolderName(`${client.name} - ${client.slug || client.id.slice(0, 8)}`);
  const driveFolder = await findDriveFolder(accessToken, folderName, root.id) ??
    await createDriveFolder(accessToken, folderName, root.id);
  await ensureMxDriveAccess(adminClient, accessToken, [root.id, driveFolder.id]);
  const storeId = client.primary_store_id || null;

  if (!cacheAvailable) {
    return {
      id: crypto.randomUUID(),
      client_id: client.id,
      store_id: storeId,
      parent_folder_id: root.id,
      google_drive_folder_id: driveFolder.id,
      google_drive_folder_url: driveFolder.webViewLink || folderUrl(driveFolder.id),
      status: "active",
      cache_available: false,
    };
  }

  const { data: rowData, error: upsertError } = await adminClient
    .from("pastas_drive_consultoria")
    .upsert(
      {
        client_id: client.id,
        store_id: storeId,
        parent_folder_id: root.id,
        google_drive_folder_id: driveFolder.id,
        google_drive_folder_url: driveFolder.webViewLink || folderUrl(driveFolder.id),
        status: "active",
        created_by: userId || null,
        updated_by: userId || null,
      },
      { onConflict: "client_id" },
    )
    .select("*")
    .single();
  const row = rowData as DriveFolderRow | null;

  if (upsertError) {
    if (!isMissingTableError(upsertError)) throw toError(upsertError);
    return {
      id: crypto.randomUUID(),
      client_id: client.id,
      store_id: storeId,
      parent_folder_id: root.id,
      google_drive_folder_id: driveFolder.id,
      google_drive_folder_url: driveFolder.webViewLink || folderUrl(driveFolder.id),
      status: "active",
      cache_available: false,
    };
  }
  return { ...row, cache_available: true } as DriveFolderRow;
}

async function listDriveFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  const query = [
    `'${escapeDriveQueryValue(folderId)}' in parents`,
    "trashed=false",
    `mimeType!='${FOLDER_MIME_TYPE}'`,
  ].join(" and ");
  const data = await driveJson(
    accessToken,
    `/drive/v3/files?q=${encodeURIComponent(query)}&spaces=drive&pageSize=100&orderBy=modifiedTime desc&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime)`,
  );
  return Array.isArray(data.files) ? data.files as DriveFile[] : [];
}

async function listClientDriveFiles(
  adminClient: any,
  accessToken: string,
  folder: DriveFolderRow,
): Promise<DriveFile[]> {
  const { data: subfolders } = await adminClient
    .from("subpastas_drive_consultoria")
    .select("google_drive_folder_id")
    .eq("client_id", folder.client_id)
    .eq("status", "active");

  const folderIds = Array.from(new Set([
    folder.google_drive_folder_id,
    ...((subfolders || []) as Array<{ google_drive_folder_id?: string | null }>)
      .map((subfolder) => subfolder.google_drive_folder_id)
      .filter((folderId): folderId is string => Boolean(folderId)),
  ]));

  const results = await Promise.all(folderIds.map((folderId) => listDriveFiles(accessToken, folderId)));
  return results
    .flat()
    .sort((a, b) => Date.parse(b.modifiedTime || b.createdTime || "") - Date.parse(a.modifiedTime || a.createdTime || ""));
}

async function uploadDriveFile(accessToken: string, folderId: string, file: File): Promise<DriveFile> {
  if (file.size > MAX_FILE_SIZE_BYTES) throw new Error(`Arquivo ${file.name} excede o limite de 25 MB`);
  const metadata = { name: file.name, parents: [folderId] };
  const boundary = `mx-drive-${crypto.randomUUID()}`;
  const body = new Blob(
    [
      `--${boundary}\r\n`,
      "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      JSON.stringify(metadata),
      "\r\n",
      `--${boundary}\r\n`,
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
      await file.arrayBuffer(),
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
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime",
    { method: "POST", headers, body },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Upload falhou (${res.status})`);
  return data as DriveFile;
}

async function trashDriveFile(accessToken: string, fileId: string): Promise<void> {
  await driveJson(
    accessToken,
    `/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,trashed`,
    { method: "PATCH", body: JSON.stringify({ trashed: true }) },
  );
}

async function authenticate(req: Request): Promise<
  | { error: Response }
  | { sessionClient: SupabaseEdgeClient; adminClient: SupabaseEdgeClient; userId: string; role: string }
> {
  const sessionClient = createSessionClient(req.headers.get("Authorization")) as unknown as SupabaseEdgeClient;
  const { data: authData, error: authError } = await sessionClient.auth.getUser();
  if (authError || !authData.user) throw new Error("Sessão inválida ou expirada");

  const adminClient = createClient(
    requireEnv("SUPABASE_URL", SUPABASE_URL),
    getSupabaseAdminKey(),
  ) as unknown as SupabaseEdgeClient;
  const { data: profile, error: profileError } = await adminClient
    .from("usuarios")
    .select("role, active")
    .eq("id", authData.user.id)
    .single();
  if (profileError) throw toError(profileError);
  if (!profile?.active) throw new Error("Usuário inativo");
  if (!INTERNAL_ROLES.has(profile?.role)) {
    return {
      error: jsonResponse(
        { error: "Apenas perfis internos MX podem acessar arquivos da consultoria" },
        403,
      ),
    };
  }
  return { sessionClient, adminClient, userId: authData.user.id, role: profile.role as string };
}

async function getClient(adminClient: any, clientId: string): Promise<ConsultingClientRow> {
  const { data, error } = await adminClient
    .from("clientes_consultoria")
    .select("id,name,slug,primary_store_id")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw toError(error);
  if (!data) throw new Error("Cliente da consultoria não encontrado");
  return data as ConsultingClientRow;
}

async function assertClientAccess(sessionClient: SupabaseEdgeClient, role: string, clientId: string): Promise<void> {
  if (role === "administrador_geral" || role === "administrador_mx") return;

  const { data, error } = await sessionClient
    .from("clientes_consultoria")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw toError(error);
  if (!data) throw new Error("Cliente da consultoria fora do escopo da sessão");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const contentType = req.headers.get("Content-Type") || "";
    const isMultipart = contentType.toLowerCase().includes("multipart/form-data");
    let action: DriveAction;
    let clientId: string;
    let deleteFileId: string | null = null;
    let files: File[] = [];
    let body: Record<string, unknown> = {};

    if (isMultipart) {
      const form = await req.formData();
      action = "upload";
      clientId = parseUuid(form.get("clientId"), "clientId");
      files = form.getAll("files").filter((item): item is File => item instanceof File);
      if (files.length === 0) throw new Error("Nenhum arquivo enviado");
    } else {
      body = await req.json().catch(() => ({}));
      action = body?.action as DriveAction;
      if (!["ensure-folder", "list", "delete", "setup_client", "setup_all", "delete_client_folder"].includes(action)) {
        throw new Error("Ação inválida");
      }
      // setup_all does not require a clientId
      clientId = action === "setup_all" ? "" : parseUuid(body?.clientId, "clientId");
      deleteFileId = typeof body?.fileId === "string" ? body.fileId : null;
    }

    // setup_all accepts only the real service role bearer (for automated/CLI invocations)
    const authHeader = req.headers.get("Authorization") || "";
    const isServiceRole = isServiceRoleBearer(authHeader);

    let adminClient: SupabaseEdgeClient;
    let sessionClient: SupabaseEdgeClient | null = null;
    let userId: string;
    let role: string | null = null;

    if (isServiceRole) {
      adminClient = createClient(
        requireEnv("SUPABASE_URL", SUPABASE_URL),
        getSupabaseAdminKey(),
      ) as unknown as SupabaseEdgeClient;
      userId = ""; // service role — created_by will be null
    } else if (action === "setup_all") {
      return jsonResponse({ error: "setup_all requer service role JWT" }, 403);
    } else {
      const auth = await authenticate(req);
      if ("error" in auth) return auth.error;
      adminClient = auth.adminClient;
      sessionClient = auth.sessionClient;
      userId = auth.userId;
      role = auth.role;
    }

    if (action !== "setup_all" && sessionClient && role) {
      await assertClientAccess(sessionClient, role, clientId);
    }

    const accessToken = await getCentralDriveAccessToken();
    if (!accessToken) {
      return jsonResponse({
        error: "Reconecte a conta central gestao@mxconsultoria.com.br com permissão de Google Drive.",
        code: "DRIVE_NOT_CONNECTED",
      }, 409);
    }

    // ── setup_all: ensure Drive folders, subfolders and MX access for all clients ──
    if (action === "setup_all") {
      const { data: allClients } = await adminClient
        .from("clientes_consultoria")
        .select("id, name, slug, primary_store_id");
      const { data: existingFolders } = await adminClient
        .from("pastas_drive_consultoria")
        .select("client_id")
        .eq("status", "active");
      const existingSet = new Set((existingFolders || []).map((f: { client_id: string }) => f.client_id));
      const pending = (allClients || []).filter((c: { id: string }) => !existingSet.has(c.id));
      const results: Array<{ clientId: string; name: string; ok: boolean; created: boolean; error?: string }> = [];
      for (const c of allClients as ConsultingClientRow[]) {
        try {
          const f = await ensureClientFolder(adminClient, accessToken, c, userId);
          await ensureSubfolders(adminClient, accessToken, f, userId);
          results.push({ clientId: c.id, name: c.name, ok: true, created: !existingSet.has(c.id) });
        } catch (err) {
          results.push({ clientId: c.id, name: c.name, ok: false, created: !existingSet.has(c.id), error: toError(err).message });
        }
      }
      return jsonResponse({
        ok: true,
        ensured: results.filter(r => r.ok).length,
        created: results.filter(r => r.ok && r.created).length,
        total: (allClients || []).length,
        existing: existingSet.size,
        pending: pending.length,
        results,
      });
    }

    // ── setup_client: create Drive folder + subfolders for one client ─────────
    if (action === "setup_client") {
      const c = await getClient(adminClient, clientId);
      const f = await ensureClientFolder(adminClient, accessToken, c, userId);
      const subfolders = await ensureSubfolders(adminClient, accessToken, f, userId);
      return jsonResponse({ ok: true, folderUrl: f.google_drive_folder_url, subfolders });
    }

    const client = await getClient(adminClient, clientId);
    const folder = await ensureClientFolder(adminClient, accessToken, client, userId);

    // ── delete_client_folder: trash Drive folder and mark DB record trashed ───
    if (action === "delete_client_folder") {
      const { data: folderRow } = await adminClient
        .from("pastas_drive_consultoria")
        .select("id, google_drive_folder_id")
        .eq("client_id", clientId)
        .eq("status", "active")
        .maybeSingle();
      if (folderRow?.google_drive_folder_id) {
        await trashDriveFile(accessToken, folderRow.google_drive_folder_id).catch(() => {});
        await (async () => {
          await adminClient
            .from("pastas_drive_consultoria")
            .update({ status: "trashed", updated_at: new Date().toISOString() })
            .eq("id", folderRow.id);
        })().catch(() => {});
      }
      return jsonResponse({ ok: true });
    }

    if (action === "ensure-folder") {
      const subfolders = await ensureSubfolders(adminClient, accessToken, folder, userId);
      return jsonResponse({ folderUrl: folder.google_drive_folder_url, folder, subfolders });
    }

    if (action === "list") {
      const driveFiles = await listClientDriveFiles(adminClient, accessToken, folder);

      // Use EdgeRuntime.waitUntil so background tasks finish even after response is sent
      const bgTasks = (async () => {
        await Promise.allSettled([
          ensureSubfolders(adminClient, accessToken, folder, userId).catch(() => {}),
          (async () => {
            const { data: dedupRow } = await adminClient
              .from("config_drive_central").select("value").eq("key", "dedup_done").maybeSingle();
            if (dedupRow?.value === "true") return;
            const { data: rootRow } = await adminClient
              .from("config_drive_central").select("value").eq("key", "root_folder_id").maybeSingle();
            if (!rootRow?.value) return;
            const allRoots = await findAllDriveFolders(accessToken, CENTRAL_DRIVE_ROOT_FOLDER_NAME, "root");
            for (const candidate of allRoots) {
              if (candidate.id === rootRow.value) continue;
              const hasKids = await driveHasChildren(accessToken, candidate.id);
              if (!hasKids) {
                await googleApiRequest(accessToken, `/drive/v3/files/${encodeURIComponent(candidate.id)}`, {
                  method: "DELETE",
                }).catch(() => {});
              }
            }
            await adminClient.from("config_drive_central").upsert(
              { key: "dedup_done", value: "true", updated_at: new Date().toISOString() },
              { onConflict: "key" },
            );
          })().catch(() => {}),
        ]);
      })();

      try { EdgeRuntime?.waitUntil?.(bgTasks); } catch { bgTasks.catch(() => {}); }

      return jsonResponse({ folderUrl: folder.google_drive_folder_url, files: driveFiles });
    }

    if (action === "delete") {
      if (!deleteFileId) throw new Error("fileId obrigatório");
      const { data: fileRows, error: fileError } = await adminClient
        .from("arquivos_drive_consultoria")
        .select("id,google_drive_file_id,pasta_id,client_id")
        .eq("client_id", client.id)
        .eq("pasta_id", folder.id);
      if (fileError && !isMissingTableError(fileError)) throw toError(fileError);
      const fileRow = (fileRows || []).find(
        (row: { id: string; google_drive_file_id: string }) =>
          row.id === deleteFileId || row.google_drive_file_id === deleteFileId,
      );
      const driveFileId = fileRow?.google_drive_file_id || deleteFileId;

      const currentFiles = await listClientDriveFiles(adminClient, accessToken, folder);
      if (!currentFiles.some((f) => f.id === driveFileId)) throw new Error("Arquivo não encontrado para este cliente");

      await trashDriveFile(accessToken, driveFileId);
      if (fileRow?.id) {
        const { error: updateError } = await adminClient
          .from("arquivos_drive_consultoria")
          .update({ status: "trashed", deleted_by: userId || null, deleted_at: new Date().toISOString() })
          .eq("id", fileRow.id);
        if (updateError && !isMissingTableError(updateError)) throw toError(updateError);
      }

      const driveFiles = await listClientDriveFiles(adminClient, accessToken, folder);
      return jsonResponse({ folderUrl: folder.google_drive_folder_url, files: driveFiles });
    }

    // action === "upload"
    const uploaded: DriveFile[] = [];
    for (const file of files) {
      const driveFile = await uploadDriveFile(accessToken, folder.google_drive_folder_id, file);
      await ensureMxDriveAccess(adminClient, accessToken, [driveFile.id]);
      uploaded.push(driveFile);
      if (folder.cache_available === false) continue;
      const { error: upsertError } = await adminClient
        .from("arquivos_drive_consultoria")
        .upsert(
          {
            pasta_id: folder.id,
            client_id: client.id,
            store_id: folder.store_id,
            google_drive_file_id: driveFile.id,
            name: driveFile.name || file.name,
            mime_type: driveFile.mimeType || file.type || "application/octet-stream",
            size_bytes: Number(driveFile.size || file.size || 0),
            web_view_link: driveFile.webViewLink || null,
            web_content_link: driveFile.webContentLink || null,
            status: "active",
            uploaded_by: userId || null,
          },
          { onConflict: "google_drive_file_id" },
        );
      if (upsertError && !isMissingTableError(upsertError)) throw toError(upsertError);
    }

    const driveFiles = await listClientDriveFiles(adminClient, accessToken, folder);
    return jsonResponse({ folderUrl: folder.google_drive_folder_url, uploaded, files: driveFiles });
  } catch (err) {
    const error = toError(err);
    const status = error.message.includes("Sessão inválida") ? 401 : 400;
    return jsonResponse({ error: error.message }, status);
  }
});
