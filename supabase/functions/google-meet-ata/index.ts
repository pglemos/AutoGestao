import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { requireAuthenticatedRole } from "../_shared/auth.ts";
import { isInternalTokenAuthorized } from "../_shared/internal-token.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";
import { getCentralGoogleAccessToken, CENTRAL_MEET_READ_SCOPE } from "../_shared/google.ts";

type SourceKind = "visit" | "schedule_event";

type ClaimedQuota = {
  selected_model: string;
  used_requests: number;
  daily_limit: number;
  quota_date: string;
  fallback_used: boolean;
};

type VisitSource = {
  id: string;
  client_id: string | null;
  scheduled_at: string;
  duration_hours: number | null;
  modality: string | null;
  objective: string | null;
  visit_reason: string | null;
  target_audience: string | null;
  product_name: string | null;
  google_meet_link: string | null;
  client?: { name?: string | null } | { name?: string | null }[] | null;
  consultant?: { name?: string | null } | { name?: string | null }[] | null;
};

type ScheduleEventSource = {
  id: string;
  event_type: string | null;
  title: string;
  topic: string | null;
  starts_at: string;
  duration_hours: number | null;
  modality: string | null;
  location: string | null;
  target_audience: string | null;
  visit_reason: string | null;
  product_name: string | null;
  responsible_name: string | null;
  google_meet_link: string | null;
};

type MeetTranscriptEntry = {
  text?: string;
  startTime?: string;
};

const provider = "openrouter";
const primaryModel = Deno.env.get("OPENROUTER_PRIMARY_MODEL") || "openrouter/free";
const fallbackModel = Deno.env.get("OPENROUTER_FALLBACK_MODEL") || "deepseek/deepseek-v4-flash:free";
const primaryDailyLimit = readPositiveIntEnv("OPENROUTER_PRIMARY_DAILY_LIMIT", 40);
const fallbackDailyLimit = readPositiveIntEnv("OPENROUTER_FALLBACK_DAILY_LIMIT", 5);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function readPositiveIntEnv(name: string, fallback: number) {
  const raw = Deno.env.get(name);
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function truncate(value: string | null | undefined, maxLength: number) {
  const text = (value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function transcriptExcerpt(transcriptText: string, maxLength = 50000) {
  const text = transcriptText.trim();
  if (text.length <= maxLength) return text;

  const firstLength = Math.floor(maxLength * 0.4);
  const middleLength = Math.floor(maxLength * 0.3);
  const endLength = maxLength - firstLength - middleLength;
  const middleStart = Math.max(0, Math.floor(text.length / 2) - Math.floor(middleLength / 2));

  return [
    text.slice(0, firstLength),
    "\n\n[... TRECHO CENTRAL DA TRANSCRICAO ...]\n\n",
    text.slice(middleStart, middleStart + middleLength),
    "\n\n[... TRECHO FINAL DA TRANSCRICAO ...]\n\n",
    text.slice(Math.max(0, text.length - endLength)),
  ].join("");
}

function relationName(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0]?.name === "string" ? value[0].name : null;
  return typeof (value as { name?: unknown } | null)?.name === "string" ? (value as { name: string }).name : null;
}

export function extractMeetCode(meetLink: string | null | undefined): string | null {
  if (!meetLink) return null;
  try {
    const url = new URL(meetLink);
    if (!url.hostname.endsWith("meet.google.com")) return null;
    const code = url.pathname.split("/").filter(Boolean)[0];
    return /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/i.test(code || "") ? code.toLowerCase() : null;
  } catch {
    const match = meetLink.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
    return match?.[1]?.toLowerCase() ?? null;
  }
}

function isOnline(value?: string | null) {
  return value?.trim().toLowerCase() === "online";
}

function isOnlineScheduleEvent(event: ScheduleEventSource) {
  return event.event_type === "evento_online" || isOnline(event.modality);
}

async function authorize(req: Request) {
  const cronSecret = Deno.env.get("MX_CRON_SECRET");
  if (isInternalTokenAuthorized(req.headers.get("x-mx-cron-secret"), cronSecret)) {
    return { ok: true, service: true };
  }

  const auth = await requireAuthenticatedRole(req, ["administrador_geral", "administrador_mx", "consultor_mx"]);
  if (auth.response) return { ok: false, response: auth.response };
  return { ok: true, service: false };
}

async function loadSource(adminClient: any, sourceKind: SourceKind, sourceId: string) {
  if (sourceKind === "visit") {
    const { data, error } = await adminClient
      .from("visitas_consultoria")
      .select(`
        id,
        client_id,
        scheduled_at,
        duration_hours,
        modality,
        objective,
        visit_reason,
        target_audience,
        product_name,
        google_meet_link,
        client:clientes_consultoria!client_id(name),
        consultant:usuarios!visitas_consultoria_consultor_id_fkey(name)
      `)
      .eq("id", sourceId)
      .maybeSingle();
    if (error) throw error;
    return data ? { sourceKind, source: data as VisitSource } : null;
  }

  const { data, error } = await adminClient
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
      visit_reason,
      product_name,
      responsible_name,
      google_meet_link
    `)
    .eq("id", sourceId)
    .maybeSingle();
  if (error) throw error;
  return data ? { sourceKind, source: data as ScheduleEventSource } : null;
}

async function loadDueSources(adminClient: any, limit: number) {
  const now = new Date().toISOString();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sources: { sourceKind: SourceKind; source: VisitSource | ScheduleEventSource }[] = [];

  const { data: visits, error: visitsError } = await adminClient
    .from("visitas_consultoria")
    .select(`
      id,
      client_id,
      scheduled_at,
      duration_hours,
      modality,
      objective,
      visit_reason,
      target_audience,
      product_name,
      google_meet_link,
      client:clientes_consultoria!client_id(name),
      consultant:usuarios!visitas_consultoria_consultor_id_fkey(name)
    `)
    .not("google_meet_link", "is", null)
    .eq("modality", "Online")
    .gte("scheduled_at", since)
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: false })
    .limit(limit);
  if (visitsError) throw visitsError;
  for (const visit of visits || []) sources.push({ sourceKind: "visit", source: visit as VisitSource });

  const remaining = Math.max(0, limit - sources.length);
  if (remaining > 0) {
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
        visit_reason,
        product_name,
        responsible_name,
        google_meet_link
      `)
      .not("google_meet_link", "is", null)
      .or("event_type.eq.evento_online,modality.eq.Online")
      .gte("starts_at", since)
      .lte("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(remaining);
    if (eventsError) throw eventsError;
    for (const event of events || []) sources.push({ sourceKind: "schedule_event", source: event as ScheduleEventSource });
  }

  if (sources.length === 0) return [];

  const keys = sources.map((item) => item.source.id);
  const { data: artifacts, error: artifactError } = await adminClient
    .from("reunioes_google_meet_atas")
    .select("source_kind, source_id, status")
    .in("source_id", keys);
  if (artifactError) throw artifactError;

  const processed = new Set(
    (artifacts || [])
      .filter((item: any) => item.status === "processed")
      .map((item: any) => `${item.source_kind}:${item.source_id}`),
  );

  return sources.filter((item) => !processed.has(`${item.sourceKind}:${item.source.id}`));
}

function sourceTitle(sourceKind: SourceKind, source: VisitSource | ScheduleEventSource) {
  if (sourceKind === "visit") {
    const visit = source as VisitSource;
    return `Visita tecnica - ${relationName(visit.client) || "Cliente nao informado"}`;
  }
  return (source as ScheduleEventSource).title;
}

function sourceDate(sourceKind: SourceKind, source: VisitSource | ScheduleEventSource) {
  return sourceKind === "visit" ? (source as VisitSource).scheduled_at : (source as ScheduleEventSource).starts_at;
}

async function meetApiRequest(accessToken: string, path: string) {
  const response = await fetch(`https://meet.googleapis.com/v2${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error?.message || `Google Meet API error (${response.status})`);
  return body;
}

async function listConferenceRecords(accessToken: string, meetingCode: string) {
  const params = new URLSearchParams({ pageSize: "10", filter: `space.meeting_code = "${meetingCode}"` });
  const data = await meetApiRequest(accessToken, `/conferenceRecords?${params.toString()}`);
  return Array.isArray(data?.conferenceRecords) ? data.conferenceRecords : [];
}

async function listTranscripts(accessToken: string, conferenceRecordName: string) {
  const data = await meetApiRequest(accessToken, `/${conferenceRecordName}/transcripts?pageSize=100`);
  return Array.isArray(data?.transcripts) ? data.transcripts : [];
}

async function listTranscriptEntries(accessToken: string, transcriptName: string): Promise<MeetTranscriptEntry[]> {
  const entries: MeetTranscriptEntry[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const data = await meetApiRequest(accessToken, `/${transcriptName}/entries?${params.toString()}`);
    entries.push(...(Array.isArray(data?.transcriptEntries) ? data.transcriptEntries : []));
    pageToken = typeof data?.nextPageToken === "string" ? data.nextPageToken : "";
  } while (pageToken);
  return entries;
}

function chooseClosestConference(records: any[], targetDate: string) {
  if (records.length === 0) return null;
  const target = Date.parse(targetDate);
  return [...records].sort((a, b) => {
    const aDiff = Math.abs(Date.parse(a.startTime || a.endTime || "") - target);
    const bDiff = Math.abs(Date.parse(b.startTime || b.endTime || "") - target);
    return aDiff - bDiff;
  })[0];
}

function formatTranscript(entries: MeetTranscriptEntry[]) {
  return entries
    .map((entry) => {
      const time = entry.startTime ? new Date(entry.startTime).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
      const text = (entry.text || "").trim();
      if (!text) return "";
      return `[${time}] ${text}`;
    })
    .filter(Boolean)
    .join("\n");
}

async function claimQuota(forceFallback = false) {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("claim_ai_model_daily_quota", {
    p_provider: provider,
    p_primary_model: primaryModel,
    p_primary_daily_limit: primaryDailyLimit,
    p_fallback_model: fallbackModel,
    p_fallback_daily_limit: fallbackDailyLimit,
    p_force_fallback: forceFallback,
  });
  if (error) throw new Error(`Quota check failed: ${error.message}`);
  const claimed = Array.isArray(data) ? data[0] : data;
  return claimed as ClaimedQuota | null;
}

function buildAtaPrompt(sourceKind: SourceKind, source: VisitSource | ScheduleEventSource, transcriptText: string) {
  const title = sourceTitle(sourceKind, source);
  const date = sourceDate(sourceKind, source);
  const modality = sourceKind === "visit" ? (source as VisitSource).modality : (source as ScheduleEventSource).modality;
  const company = sourceKind === "visit" ? relationName((source as VisitSource).client) : "Evento/Aula MX";
  const consultant = sourceKind === "visit" ? relationName((source as VisitSource).consultant) : (source as ScheduleEventSource).responsible_name;
  const objective = sourceKind === "visit" ? (source as VisitSource).objective : (source as ScheduleEventSource).topic;
  const reportTitle =
    sourceKind === "visit"
      ? "RELATORIO DE VISITA TECNICA - METODO MX (ONLINE)"
      : "RELATORIO DE REUNIAO ESTRATEGICA - METODO MX (ONLINE)";

  return [
    "Gere um relatorio executivo MX a partir da transcricao oficial do Google Meet.",
    "O resultado precisa seguir o padrao de relatorio consultivo da MX: objetivo, diagnostico profundo, decisoes claras, plano de acao e texto pronto para WhatsApp.",
    "Use portugues do Brasil, tom senior, direto, estrategico, consultivo e firme.",
    "Priorize o que foi discutido de forma concreta. Extraia contexto, diagnosticos, riscos, decisoes, pendencias e proximas acoes.",
    "Nao entregue resumo generico. Nao escreva frases vazias como 'foram discutidas melhorias' sem explicar quais melhorias.",
    "Nao invente dados, numeros, nomes, responsaveis ou prazos. Se a decisao estiver clara mas o responsavel/prazo nao estiver, registre isso no item.",
    "Nao crie datas futuras, cronogramas, SLAs, SSO, nomes de equipe ou responsaveis tecnicos se esses dados nao estiverem literalmente na transcricao.",
    "No plano de acao, use 'Responsavel: a definir' e 'Prazo: a definir' quando a conversa nao amarrar uma pessoa/data especifica.",
    "Em participantes, cite apenas quem falou ou foi claramente chamado para participar. Nao inclua autores, exemplos ou pessoas apenas citadas como referencia.",
    "Evite usar 'Nao informado' em decisoes quando houver alinhamentos explicitos na conversa. Use 'Ponto a validar' somente para lacunas reais.",
    "Se a reuniao for interna sobre produto/sistema, trate como Projeto MX Performance / Sistema de Consultoria.",
    "Inclua no minimo 5 secoes analiticas antes do texto de WhatsApp.",
    "Cada secao analitica deve ter bullets ricos, com fatos e implicacoes praticas. O plano de acao deve ser numerado.",
    "",
    "ESTRUTURA OBRIGATORIA:",
    reportTitle,
    "Empresa/Projeto: {empresa, cliente, evento ou projeto}",
    "Data da Reuniao: {data}",
    "Consultor/Responsavel: {consultor}",
    "Participantes identificados: {nomes citados ou identificaveis na transcricao}",
    "________________________________________",
    "OBJETIVO DA REUNIAO",
    "{um paragrafo objetivo, com o motivo real da reuniao e o resultado esperado}",
    "________________________________________",
    "1. CONTEXTO E DIRECAO ESTRATEGICA",
    "{bullets com a leitura de mercado, contexto do negocio, mudanca de direcao e principios definidos}",
    "________________________________________",
    "2. DIAGNOSTICO DO PROBLEMA ATUAL",
    "{bullets com gargalos, riscos, dores do cliente, limitacoes do sistema/processo atual e o impacto disso}",
    "________________________________________",
    "3. DEFINICOES DE PRODUTO, SISTEMA E EXPERIENCIA",
    "{bullets com abas, modulos, regras, integracoes, visoes de dono/gerente/vendedor e UX definida}",
    "________________________________________",
    "4. DECISOES TOMADAS",
    "{bullets com decisoes objetivas, sem marcar 'Nao informado' quando a transcricao demonstrar alinhamento}",
    "________________________________________",
    "5. PLANO DE ACAO URGENTE E INEGOCIAVEL",
    "{lista numerada com acao, responsavel quando existir, prazo quando existir, e finalidade de cada acao}",
    "________________________________________",
    "6. PENDENCIAS E PONTOS DE ATENCAO",
    "{bullets com riscos, dependencias externas, itens a validar e proximos alinhamentos}",
    "________________________________________",
    "Consultor MX {consultor}",
    "________________________________________",
    "TEXTO PARA ENVIAR NO GRUPO DE WHATSAPP",
    "Assunto: Relatorio de Reuniao MX - {empresa/projeto} ({data})",
    "{mensagem pronta, em tom executivo e motivador, com o cenario, decisoes e plano de acao em linguagem simples}",
    "",
    `Tipo: ${sourceKind === "visit" ? "Visita online" : "Aula/evento online"}`,
    `Titulo: ${truncate(title, 180)}`,
    `Empresa/Projeto: ${truncate(company, 180) || truncate(title, 180)}`,
    `Data: ${truncate(date, 80)}`,
    `Consultor/Responsavel: ${truncate(consultant, 180) || "Nao informado"}`,
    `Modalidade: ${truncate(modality, 80) || "Online"}`,
    `Objetivo/Tema: ${truncate(objective, 1000) || "Nao informado"}`,
    "",
    "TRANSCRICAO OFICIAL DO GOOGLE MEET:",
    transcriptExcerpt(transcriptText),
  ].join("\n");
}

async function callOpenRouter(model: string, prompt: string) {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY");

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": Deno.env.get("OPENROUTER_SITE_URL") || "https://mxperformance.vercel.app",
      "X-Title": Deno.env.get("OPENROUTER_APP_NAME") || "MX Performance",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: "Voce e um consultor senior da MX Performance. Responda somente com a ata solicitada, sem comentarios extras.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      top_p: 0.9,
      max_tokens: 6500,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || `OpenRouter request failed (${response.status})`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  const text = body?.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenRouter returned an empty response");
  return text;
}

function normalizeForQualityCheck(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
}

function generatedAtaQualityIssue(text: string, transcriptText: string, meetingDate: string) {
  const normalized = text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase();
  const normalizedTranscript = normalizeForQualityCheck(transcriptText);
  const meetingDatePtBr = Number.isFinite(Date.parse(meetingDate))
    ? new Date(meetingDate).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "";

  if (text.length < 4500) return "resposta curta demais para uma ata MX completa";
  if (!normalized.includes("RELATORIO")) return "titulo de relatorio ausente";
  if (!normalized.includes("OBJETIVO DA REUNIAO")) return "secao de objetivo ausente";
  if (!normalized.includes("DIAGNOSTICO")) return "secao de diagnostico ausente";
  if (!normalized.includes("DECISOES")) return "secao de decisoes ausente";
  if (!normalized.includes("PLANO DE ACAO")) return "secao de plano de acao ausente";
  if (!normalized.includes("WHATSAPP")) return "texto para WhatsApp ausente";

  const dates = [...text.matchAll(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g)].map((match) => match[0]);
  const inventedDate = dates.find((date) => date !== meetingDatePtBr && !transcriptText.includes(date));
  if (inventedDate) return `data ou prazo nao encontrado na transcricao: ${inventedDate}`;

  const guardedTerms = [
    { label: "SSO", pattern: /\bSSO\b/ },
    { label: "SLA", pattern: /\bSLA\b/ },
    { label: "EQUIPE DE BACKEND", pattern: /EQUIPE DE BACKEND/ },
    { label: "EQUIPE DE INTEGRACAO", pattern: /EQUIPE DE INTEGRACAO/ },
    { label: "EQUIPE DE DADOS", pattern: /EQUIPE DE DADOS/ },
  ];
  const inventedTerm = guardedTerms.find((term) => term.pattern.test(normalized) && !term.pattern.test(normalizedTranscript))?.label;
  if (inventedTerm) return `termo/responsavel nao encontrado na transcricao: ${inventedTerm}`;

  return null;
}

async function generateAta(sourceKind: SourceKind, source: VisitSource | ScheduleEventSource, transcriptText: string) {
  let quota = await claimQuota();
  if (!quota) throw new Error("Daily OpenRouter free quota exhausted");

  const prompt = buildAtaPrompt(sourceKind, source, transcriptText);
  try {
    let text = await callOpenRouter(quota.selected_model, prompt);
    let qualityIssue = generatedAtaQualityIssue(text, transcriptText, sourceDate(sourceKind, source));
    if (!qualityIssue) return { text, quota };

    if (quota.selected_model === fallbackModel) throw new Error(`Ata gerada fora do padrao MX: ${qualityIssue}`);

    const fallbackQuota = await claimQuota(true);
    if (!fallbackQuota || fallbackQuota.selected_model !== fallbackModel) throw new Error(`Ata gerada fora do padrao MX: ${qualityIssue}`);
    quota = fallbackQuota;
    text = await callOpenRouter(
      quota.selected_model,
      [
        prompt,
        "",
        "ATENCAO: A tentativa anterior gerou uma ata curta/generica e foi rejeitada.",
        `Motivo da rejeicao: ${qualityIssue}.`,
        "Agora gere a ata completa no padrao MX, com profundidade, secoes obrigatorias e plano de acao real.",
      ].join("\n"),
    );
    qualityIssue = generatedAtaQualityIssue(text, transcriptText, sourceDate(sourceKind, source));
    if (qualityIssue) throw new Error(`Ata gerada fora do padrao MX: ${qualityIssue}`);
    return { text, quota };
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (![429, 503].includes(status || 0) || quota?.selected_model === fallbackModel) throw error;
    const fallbackQuota = await claimQuota(true);
    if (!fallbackQuota || fallbackQuota.selected_model !== fallbackModel) throw error;
    quota = fallbackQuota;
    const text = await callOpenRouter(quota.selected_model, prompt);
    const qualityIssue = generatedAtaQualityIssue(text, transcriptText, sourceDate(sourceKind, source));
    if (qualityIssue) throw new Error(`Ata gerada fora do padrao MX: ${qualityIssue}`);
    return { text, quota };
  }
}

async function upsertArtifact(
  adminClient: any,
  sourceKind: SourceKind,
  source: VisitSource | ScheduleEventSource,
  values: Record<string, unknown>,
) {
  const payload = {
    source_kind: sourceKind,
    source_id: source.id,
    client_id: sourceKind === "visit" ? (source as VisitSource).client_id ?? null : null,
    title: sourceTitle(sourceKind, source),
    google_meet_link: source.google_meet_link ?? null,
    updated_at: new Date().toISOString(),
    ...values,
  };

  const { data, error } = await adminClient
    .from("reunioes_google_meet_atas")
    .upsert(payload, { onConflict: "source_kind,source_id" })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id as string | undefined;
}

async function attachVisitEvidence(adminClient: any, visitId: string, ataText: string, artifactId?: string) {
  const filename = `Ata Google Meet - ${visitId}.txt`;
  const storagePath = `atas-google-meet/${visitId}/${artifactId || crypto.randomUUID()}.txt`;
  const file = new Blob([ataText], { type: "text/plain;charset=utf-8" });
  const { error: uploadError } = await adminClient.storage
    .from("evidencias-consultoria")
    .upload(storagePath, file, { contentType: "text/plain;charset=utf-8", upsert: true });
  if (uploadError) throw uploadError;

  const { data: existing, error: lookupError } = await adminClient
    .from("evidencias_visita")
    .select("id")
    .eq("visita_id", visitId)
    .eq("tipo", "ata")
    .eq("nome_arquivo", filename)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const observacao = artifactId ? `${ataText}\n\nArtefato: ${artifactId}` : ataText;
  if (existing?.id) {
    const { error } = await adminClient
      .from("evidencias_visita")
      .update({ caminho_storage: storagePath, observacao, content_type: "text/plain", tamanho_bytes: file.size })
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await adminClient.from("evidencias_visita").insert({
    visita_id: visitId,
    tipo: "ata",
    nome_arquivo: filename,
    caminho_storage: storagePath,
    content_type: "text/plain",
    tamanho_bytes: file.size,
    observacao,
  });
  if (error) throw error;
}

async function processSource(adminClient: any, sourceKind: SourceKind, source: VisitSource | ScheduleEventSource) {
  if (sourceKind === "visit" && !isOnline((source as VisitSource).modality)) {
    await upsertArtifact(adminClient, sourceKind, source, { status: "no_meet", error_message: "Visita nao esta marcada como Online" });
    return { sourceKind, sourceId: source.id, status: "no_meet" };
  }
  if (sourceKind === "schedule_event" && !isOnlineScheduleEvent(source as ScheduleEventSource)) {
    await upsertArtifact(adminClient, sourceKind, source, { status: "no_meet", error_message: "Evento/aula nao esta marcado como online" });
    return { sourceKind, sourceId: source.id, status: "no_meet" };
  }

  const meetingCode = extractMeetCode(source.google_meet_link);
  if (!meetingCode) {
    await upsertArtifact(adminClient, sourceKind, source, { status: "no_meet", error_message: "Link do Google Meet ausente ou invalido" });
    return { sourceKind, sourceId: source.id, status: "no_meet" };
  }

  const accessToken = await getCentralGoogleAccessToken([CENTRAL_MEET_READ_SCOPE]);
  if (!accessToken) throw new Error("Agenda Central MX precisa ser reconectada com permissao de leitura do Google Meet");

  const records = await listConferenceRecords(accessToken, meetingCode);
  const conference = chooseClosestConference(records, sourceDate(sourceKind, source));
  if (!conference?.name) {
    await upsertArtifact(adminClient, sourceKind, source, {
      meeting_code: meetingCode,
      status: "no_conference_record",
      error_message: "Nenhum registro de conferencia encontrado para este link do Meet",
      processed_at: new Date().toISOString(),
    });
    return { sourceKind, sourceId: source.id, status: "no_conference_record" };
  }

  const transcripts = await listTranscripts(accessToken, conference.name);
  if (transcripts.length === 0) {
    await upsertArtifact(adminClient, sourceKind, source, {
      meeting_code: meetingCode,
      conference_record_name: conference.name,
      status: "no_transcript",
      error_message: "A reuniao existe, mas ainda nao ha transcricao do Google Meet",
      processed_at: new Date().toISOString(),
    });
    return { sourceKind, sourceId: source.id, status: "no_transcript" };
  }

  const transcript = [...transcripts].reverse().find((item) => item.state === "FILE_GENERATED") ?? transcripts[transcripts.length - 1];
  if (transcript.state !== "FILE_GENERATED") {
    await upsertArtifact(adminClient, sourceKind, source, {
      meeting_code: meetingCode,
      conference_record_name: conference.name,
      transcript_name: transcript.name,
      transcript_state: transcript.state,
      status: "transcript_not_ready",
      error_message: "A transcricao foi iniciada, mas o arquivo ainda nao esta pronto",
      processed_at: new Date().toISOString(),
    });
    return { sourceKind, sourceId: source.id, status: "transcript_not_ready" };
  }

  const entries = await listTranscriptEntries(accessToken, transcript.name);
  const transcriptText = formatTranscript(entries);
  if (!transcriptText.trim()) {
    await upsertArtifact(adminClient, sourceKind, source, {
      meeting_code: meetingCode,
      conference_record_name: conference.name,
      transcript_name: transcript.name,
      transcript_state: transcript.state,
      status: "no_transcript",
      error_message: "A transcricao existe, mas nao retornou falas estruturadas",
      processed_at: new Date().toISOString(),
    });
    return { sourceKind, sourceId: source.id, status: "no_transcript" };
  }

  const { text: ataText, quota } = await generateAta(sourceKind, source, transcriptText);
  const artifactId = await upsertArtifact(adminClient, sourceKind, source, {
    meeting_code: meetingCode,
    conference_record_name: conference.name,
    transcript_name: transcript.name,
    transcript_state: transcript.state,
    transcript_text: transcriptText,
    ata_text: ataText,
    status: "processed",
    error_message: null,
    processed_at: new Date().toISOString(),
  });

  if (sourceKind === "visit") await attachVisitEvidence(adminClient, source.id, ataText, artifactId);

  return {
    sourceKind,
    sourceId: source.id,
    status: "processed",
    artifactId,
    model: quota.selected_model,
    fallbackUsed: quota.fallback_used,
    dailyUsage: { used: quota.used_requests, limit: quota.daily_limit, date: quota.quota_date },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, error: "Method not allowed" }, 405);

  try {
    const auth = await authorize(req);
    if (!auth.ok) return auth.response!;

    const body = await req.json().catch(() => ({}));
    const adminClient = createServiceClient();
    const mode = body?.mode === "process_due" ? "process_due" : "single";
    const results = [];

    if (mode === "process_due") {
      const limit = Math.min(Math.max(Number(body?.limit) || 10, 1), 25);
      const dueSources = await loadDueSources(adminClient, limit);
      for (const item of dueSources) {
        try {
          results.push(await processSource(adminClient, item.sourceKind, item.source));
        } catch (error) {
          await upsertArtifact(adminClient, item.sourceKind, item.source, {
            status: "failed",
            error_message: error instanceof Error ? error.message : "Falha ao processar ata",
            processed_at: new Date().toISOString(),
          });
          results.push({ sourceKind: item.sourceKind, sourceId: item.source.id, status: "failed", error: error instanceof Error ? error.message : "Falha ao processar ata" });
        }
      }
      return jsonResponse({ success: true, mode, processed: results.length, results });
    }

    const sourceKind = body?.sourceKind === "schedule_event" ? "schedule_event" : "visit";
    const sourceId = typeof body?.sourceId === "string" ? body.sourceId : "";
    if (!sourceId) return jsonResponse({ success: false, error: "sourceId is required" }, 400);

    const loaded = await loadSource(adminClient, sourceKind, sourceId);
    if (!loaded) return jsonResponse({ success: false, error: "Source not found" }, 404);

    const result = await processSource(adminClient, loaded.sourceKind, loaded.source);
    return jsonResponse({ success: true, mode, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao gerar ata do Google Meet";
    return jsonResponse({ success: false, error: message }, 400);
  }
});
