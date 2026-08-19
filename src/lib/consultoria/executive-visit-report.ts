import { getPmrVisitDisplayLabel } from './pmr-visit-rules'
import { formatVisitAnalysisPeriodLabel } from './visit-analysis-period'

type ChecklistItem = {
  task: string
  completed: boolean
}

type AttachmentItem = {
  filename?: string | null
}

type BuildExecutiveVisitReportInput = {
  clientName?: string | null
  visitNumber: number
  totalVisits?: number | null
  objective?: string | null
  consultantName?: string | null
  visitDate?: string | null
  analysisPeriodPreset?: string | null
  analysisPeriodStart?: string | null
  analysisPeriodEnd?: string | null
  monthlyGoal?: string | null
  projection?: string | null
  leads?: string | null
  inventory?: string | null
  executiveSummary?: string | null
  feedbackClient?: string | null
  nextCycleGoal?: string | null
  checklist?: ChecklistItem[]
  attachments?: AttachmentItem[]
}

const cleanText = (value?: string | null) => value?.trim() || ''

const formatDate = (date?: string | null) => {
  if (!date) return 'Data não informada'
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('pt-BR')
}

const appendTextSection = (lines: string[], title: string, content?: string | null, fallback = 'Não informado') => {
  lines.push(`--- ${title} ---`)
  lines.push(cleanText(content) || fallback)
  lines.push('')
}

const appendListSection = (lines: string[], title: string, items: string[], fallback = 'Nenhum item registrado') => {
  lines.push(`--- ${title} ---`)
  if (items.length) {
    for (const item of items) lines.push(`- ${item}`)
  } else {
    lines.push(fallback)
  }
  lines.push('')
}

export function buildExecutiveVisitReport(input: BuildExecutiveVisitReportInput) {
  const completedTasks = input.checklist?.filter(item => item.completed).map(item => item.task) || []
  const pendingTasks = input.checklist?.filter(item => !item.completed).map(item => item.task) || []
  const attachments = input.attachments?.map(item => cleanText(item.filename)).filter(Boolean) || []
  const period = formatVisitAnalysisPeriodLabel({
    preset: input.analysisPeriodPreset,
    start: input.analysisPeriodStart,
    end: input.analysisPeriodEnd,
  })

  const lines = [
    `RELATÓRIO EXECUTIVO MX - ${getPmrVisitDisplayLabel(input.visitNumber, input.totalVisits).toUpperCase()}`,
    input.objective ? `Objetivo: ${input.objective}` : 'Objetivo: Não informado',
    `Cliente: ${input.clientName || 'Cliente não informado'}`,
    `Consultor: ${input.consultantName || 'Consultor MX'}`,
    `Data: ${formatDate(input.visitDate)}`,
    `Período analisado: ${period}`,
    '',
    '--- RESULTADO DO PERÍODO ---',
    `Meta: ${input.monthlyGoal || '0'} | Projeção: ${input.projection || '0'} | Leads: ${input.leads || '0'} | Estoque: ${input.inventory || '0'}`,
    '',
  ]

  appendTextSection(lines, 'PONTOS POSITIVOS E ALINHAMENTOS', input.executiveSummary, 'Resumo executivo ainda não preenchido')
  appendTextSection(lines, 'PONTOS A MELHORAR', input.feedbackClient, 'Devolutiva ao cliente ainda não preenchida')
  appendListSection(lines, 'TAREFAS CONCLUÍDAS', completedTasks)
  appendListSection(lines, 'TAREFAS E PRÓXIMOS PASSOS', pendingTasks)
  appendTextSection(lines, 'FOCO DO PRÓXIMO CICLO', input.nextCycleGoal, 'A definir')
  appendListSection(lines, 'ANEXOS E EVIDÊNCIAS', attachments)

  lines.push('Gerado via MX PERFORMANCE')

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
