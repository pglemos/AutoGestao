import { RESPONSIBLE_ROLE_OPTIONS, type ActionPlanTemplate } from './actionPlanTemplates'
import { deriveTemplateStatus } from './templateFilterLogic'

export const TEMPLATE_STATUS_LABEL: Record<ReturnType<typeof deriveTemplateStatus>, string> = {
  publicada: 'Publicado',
  rascunho: 'Rascunho',
  inativo: 'Inativo',
  arquivado: 'Arquivado',
}

/** Labels Base44: CRITICA / ATENCAO / EVOLUCAO (valores MX: critica / media|alta / baixa). */
const PRIORITY_LABEL: Record<string, string> = {
  critica: 'Crítica',
  alta: 'Atenção',
  media: 'Atenção',
  baixa: 'Evolução',
}

function responsibleRoleLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return RESPONSIBLE_ROLE_OPTIONS.find(option => option.value === value)?.label ?? value
}

export type TemplateTableSummary = {
  actions: number
  priority: string
  responsibleRole: string
  version: number | null
  status: ReturnType<typeof deriveTemplateStatus>
  statusLabel: string
  applications: number
  suggestion: string
}

export function summarizeTemplate(template: ActionPlanTemplate): TemplateTableSummary {
  const version = template.versions.find(item => item.status === 'publicada')
    ?? template.versions.find(item => item.status === 'rascunho')
    ?? template.versions[0]
    ?? null
  const items = version?.itens ?? []
  // Deduplicar depois do rótulo: códigos diferentes ('media' e 'atencao') caem
  // no mesmo texto e a coluna mostrava "Atenção, Atenção".
  const priorities = [...new Set(items
    .map(item => item.prioridade)
    .filter(Boolean)
    .map(priority => PRIORITY_LABEL[priority] ?? priority))]
  const responsibleRole = responsibleRoleLabel(template.default_responsible_role
    ?? version?.default_responsible_role
    ?? items.find(item => item.recommended_responsible_role)?.recommended_responsible_role
    ?? null)
  const status = deriveTemplateStatus(template)

  return {
    actions: items.length,
    priority: priorities.length ? priorities.join(', ') : '—',
    responsibleRole,
    version: version?.versao ?? null,
    status,
    statusLabel: TEMPLATE_STATUS_LABEL[status],
    applications: template.application_count ?? 0,
    suggestion: template.owner_suggestion_enabled ? 'Ativo' : '—',
  }
}
