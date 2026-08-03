import {
  classifyManagerRoutineUrgency,
  calculateManagerRoutineDaysLate,
  managerRoutineDbStatusForResult,
  resolveManagerRoutineResult,
  type ManagerRoutineCategory,
  type ManagerRoutineManualSource,
  type ManagerRoutineOrigin,
  type ManagerRoutinePriority,
  type ManagerRoutineResult,
  type ManagerRoutineTask,
} from './manager-day-routine'

export type ManagerRoutineExecutionActionRow = {
  id: string
  title: string
  description: string | null
  due_at: string
  status: string
  priority: string
  created_at: string
  completed_at: string | null
  justificativa: string | null
  metadata: unknown
}

export type ManagerRoutineNewTaskForm = {
  title: string
  date: string
  time: string
  category: ManagerRoutineCategory
  priority: 'normal' | 'atencao' | 'critica'
  relatedSellerId: string
  notes: string
}

export function executionActionToManualSource(
  row: ManagerRoutineExecutionActionRow,
): ManagerRoutineManualSource {
  const metadata = readManagerRoutineMetadata(row.metadata)
  const due = managerRoutineDateTimeParts(row.due_at)
  return {
    id: row.id,
    rowId: row.id,
    title: row.title,
    description: row.description,
    category: isManagerRoutineCategory(metadata.category) ? metadata.category : 'operacao',
    origin: isManagerRoutineOrigin(metadata.origin) ? metadata.origin : 'manual',
    dueDate: due.date,
    dueTime: due.time,
    automatic: false,
    status: resolveManagerRoutineResult(row.status, metadata),
    relatedSellerId: stringValue(metadata.related_seller_id),
    relatedSellerName: stringValue(metadata.related_seller_name),
    observation: row.justificativa || stringValue(metadata.observation),
  }
}

export function executionActionToHistoryTask(
  row: ManagerRoutineExecutionActionRow,
  now = new Date(),
): ManagerRoutineTask {
  const metadata = readManagerRoutineMetadata(row.metadata)
  const due = managerRoutineDateTimeParts(row.due_at)
  const automaticKey = stringValue(metadata.automatic_key)
  const origin = isManagerRoutineOrigin(metadata.origin) ? metadata.origin : 'manual'
  const category = isManagerRoutineCategory(metadata.category) ? metadata.category : 'operacao'
  const status = resolveManagerRoutineResult(row.status, metadata)
  return {
    id: row.id,
    rowId: row.id,
    title: row.title,
    description: row.description || '',
    category,
    block: stringValue(metadata.block) || 'pessoas_processos',
    origin,
    originRecordId: stringValue(metadata.origin_record_id),
    relatedSellerId: stringValue(metadata.related_seller_id),
    relatedSellerName: stringValue(metadata.related_seller_name),
    dueDate: due.date,
    dueTime: due.time,
    automatic: Boolean(automaticKey),
    icon: stringValue(metadata.icon) || (automaticKey ? 'ClipboardCheck' : 'Plus'),
    // A mesma linha alimenta a lista de pendentes e o histórico. Sem ação, o
    // card pendente renderiza sem botão algum e a atividade criada pelo "Nova
    // atividade" não pode ser concluída pela tela que a criou — reproduzido em
    // src/test/manager-day-routine.playwright.ts, que expirava esperando
    // "Concluir" depois do reload. No histórico não há o que concluir.
    actions: status === 'pendente'
      ? [{ label: 'Concluir', kind: 'acao' as const, action: 'concluir_manual' as const }]
      : [],
    priority: classifyManagerRoutineUrgency(due.date, due.time, now),
    daysLate: calculateManagerRoutineDaysLate(due.date, now),
    status,
    countsForScore: Boolean(automaticKey),
    observation: row.justificativa || stringValue(metadata.observation),
  }
}

export function buildManagerRoutineCreatePayload(
  form: ManagerRoutineNewTaskForm,
  context: { managerId: string; storeId: string; relatedSellerName?: string },
) {
  return {
    store_id: context.storeId,
    seller_id: context.managerId,
    source_type: 'manual' as const,
    title: form.title.trim(),
    description: form.notes.trim() || null,
    due_at: `${form.date}T${form.time || '12:00'}:00-03:00`,
    status: 'pendente',
    priority: dbPriority(form.priority),
    alert_tone: form.priority === 'critica' ? 'error' : form.priority === 'atencao' ? 'warning' : 'info',
    created_by: context.managerId,
    metadata: {
      manager_daily: true,
      category: form.category,
      related_seller_id: form.relatedSellerId || null,
      related_seller_name: context.relatedSellerName || null,
      selected_priority: form.priority,
    },
  }
}

export function buildManagerRoutineCompletionUpdate(input: {
  result: ManagerRoutineResult
  observation: string
  managerId: string
  completedAt: string
  metadata: Record<string, unknown>
}) {
  return {
    status: managerRoutineDbStatusForResult(input.result),
    completed_at: input.completedAt,
    completed_by: input.managerId,
    updated_at: input.completedAt,
    updated_by: input.managerId,
    justificativa: input.observation.trim() || null,
    metadata: {
      ...input.metadata,
      manager_result: input.result,
      observation: input.observation.trim() || null,
    },
  }
}

export function buildManagerRoutineAutomaticCompletionPayload(input: {
  task: ManagerRoutineTask
  result: ManagerRoutineResult
  observation: string
  managerId: string
  storeId: string
  completedAt: string
}) {
  const observation = input.observation.trim()
  return {
    store_id: input.storeId,
    seller_id: input.managerId,
    source_type: 'manual' as const,
    title: input.task.title,
    description: input.task.description || null,
    due_at: `${input.task.dueDate}T${input.task.dueTime || '12:00'}:00-03:00`,
    status: managerRoutineDbStatusForResult(input.result),
    priority: dbPriorityFromTask(input.task.priority),
    alert_tone: taskAlertTone(input.task.priority),
    created_by: input.managerId,
    completed_at: input.completedAt,
    completed_by: input.managerId,
    justificativa: observation || null,
    metadata: {
      manager_daily: true,
      automatic_key: input.task.id,
      category: input.task.category,
      block: input.task.block,
      origin: input.task.origin,
      origin_record_id: input.task.originRecordId || null,
      related_seller_id: input.task.relatedSellerId || null,
      related_seller_name: input.task.relatedSellerName || null,
      icon: input.task.icon,
      manager_result: input.result,
      observation: observation || null,
    },
  }
}

export function extractResolvedAutomaticTaskIds(rows: ManagerRoutineExecutionActionRow[]): string[] {
  return rows.flatMap((row) => {
    const metadata = readManagerRoutineMetadata(row.metadata)
    const automaticKey = stringValue(metadata.automatic_key)
    if (!automaticKey || resolveManagerRoutineResult(row.status, metadata) === 'pendente') return []
    return [automaticKey]
  })
}

export function readManagerRoutineMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export function managerRoutineDateTimeParts(value: string): { date: string; time: string } {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: value.slice(0, 10), time: value.slice(11, 16) }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value || ''
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  }
}

function dbPriority(value: ManagerRoutineNewTaskForm['priority']): string {
  if (value === 'critica') return 'urgent'
  if (value === 'atencao') return 'high'
  return 'medium'
}

function dbPriorityFromTask(value: ManagerRoutinePriority): string {
  if (value === 'vencida' || value === 'critica') return 'urgent'
  if (value === 'atencao') return 'high'
  return 'medium'
}

function taskAlertTone(value: ManagerRoutinePriority): string {
  if (value === 'vencida' || value === 'critica') return 'error'
  if (value === 'atencao') return 'warning'
  return 'info'
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function isManagerRoutineCategory(value: unknown): value is ManagerRoutineCategory {
  return value === 'resultado' || value === 'equipe' || value === 'desenvolvimento' || value === 'operacao'
}

function isManagerRoutineOrigin(value: unknown): value is ManagerRoutineOrigin {
  return value === 'fechamento_diario'
    || value === 'rotina_equipe'
    || value === 'minha_equipe'
    || value === 'meta_loja'
    || value === 'desenvolvimento'
    || value === 'universidade_mx'
    || value === 'carteira_clientes'
    || value === 'manual'
}

export function managerRoutinePriorityFromDb(value: string): ManagerRoutinePriority {
  if (value === 'urgent') return 'critica'
  if (value === 'high') return 'atencao'
  return 'normal'
}
