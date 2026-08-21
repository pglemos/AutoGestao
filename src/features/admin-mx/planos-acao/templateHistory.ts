import { supabase } from '@/lib/supabase'
import { fetchApplications } from './actionPlanApplications'
import { fetchActionPlanSuggestions, SUGGESTION_STATUS_LABEL } from './actionPlanSuggestions'

export type TemplateHistoryEvent = {
  id: string
  label: string
  detail: string | null
  at: string
}

type VersionRow = {
  id: string
  versao: number
  status: string
  created_at: string
  published_at: string | null
  updated_at: string
  planos_acao_templates: { nome: string } | { nome: string }[] | null
}

function templateName(row: VersionRow): string {
  const relation = row.planos_acao_templates
  if (!relation) return 'Template'
  return Array.isArray(relation) ? (relation[0]?.nome ?? 'Template') : relation.nome
}

/**
 * Histórico de operações na biblioteca de templates, montado a partir do que
 * já existe (sem tabela de audit log dedicada): eventos de versão (criação,
 * publicação, arquivamento), aplicações a clientes e sugestões ao Dono.
 */
export async function fetchTemplateHistory(): Promise<{ rows: TemplateHistoryEvent[]; error: string | null }> {
  const [versionsResult, applicationsResult, suggestionsResult] = await Promise.all([
    supabase
      .from('planos_acao_template_versoes')
      .select('id, versao, status, created_at, published_at, updated_at, planos_acao_templates(nome)')
      .order('created_at', { ascending: false })
      .limit(200),
    fetchApplications({ limit: 200 }),
    fetchActionPlanSuggestions(),
  ])

  const events: TemplateHistoryEvent[] = []

  for (const row of (versionsResult.data ?? []) as VersionRow[]) {
    const nome = templateName(row)
    events.push({
      id: `${row.id}:criacao`,
      label: row.versao === 1 ? 'Template criado' : 'Nova versão criada',
      detail: `${nome} · v${row.versao}`,
      at: row.created_at,
    })
    if (row.published_at) {
      events.push({ id: `${row.id}:publicacao`, label: 'Template publicado', detail: `${nome} · v${row.versao}`, at: row.published_at })
    }
    if (row.status === 'arquivada') {
      events.push({ id: `${row.id}:arquivamento`, label: 'Template arquivado', detail: `${nome} · v${row.versao}`, at: row.updated_at })
    }
  }

  for (const application of applicationsResult.rows) {
    events.push({
      id: `${application.id}:aplicacao`,
      label: 'Plano aplicado ao cliente',
      detail: [application.codigo, application.clientName ?? application.storeName].filter(Boolean).join(' · ') || null,
      at: application.createdAt,
    })
  }

  for (const suggestion of suggestionsResult.rows) {
    events.push({
      id: `${suggestion.id}:sugestao`,
      label: SUGGESTION_STATUS_LABEL[suggestion.status] ?? suggestion.status,
      detail: suggestion.recommendation ?? suggestion.problem,
      at: suggestion.created_at,
    })
  }

  events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))

  const error = versionsResult.error?.message ?? applicationsResult.error ?? suggestionsResult.error
  return { rows: events, error: error ?? null }
}
