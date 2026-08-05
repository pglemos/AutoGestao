import { getManagerCalendarDate } from '@/features/manager/home/manager-home-parity'

export type ManagerRoutineCategory = 'resultado' | 'equipe' | 'desenvolvimento' | 'operacao'
export type ManagerRoutinePriority = 'vencida' | 'critica' | 'atencao' | 'normal' | 'futura'
export type ManagerRoutineResult = 'concluida' | 'concluida_parcial' | 'reagendada' | 'nao_realizada'

export type ManagerRoutineOrigin =
  | 'fechamento_diario'
  | 'rotina_equipe'
  | 'minha_equipe'
  | 'meta_loja'
  | 'desenvolvimento'
  | 'universidade_mx'
  | 'carteira_clientes'
  | 'manual'

export type ManagerRoutineAction = {
  label: string
  kind: 'consulta' | 'acao'
  path?: string
  params?: Record<string, string>
  action?: 'concluir_manual'
}

export type ManagerRoutineTask = {
  id: string
  rowId?: string
  title: string
  description: string
  category: ManagerRoutineCategory
  block: string
  origin: ManagerRoutineOrigin
  originRecordId?: string
  relatedSellerId?: string
  relatedSellerName?: string
  dueDate: string
  dueTime: string
  automatic: boolean
  icon: string
  actions: ManagerRoutineAction[]
  priority: ManagerRoutinePriority
  daysLate: number
  status: string
  countsForScore: boolean
  observation?: string
}

export type ManagerRoutineSourceData = {
  now: Date
  referenceDate: string
  store: { monthlyGoal: number | null; businessDays: number | null } | null
  sellers: Array<{ id: string; name: string }>
  todayClosings: Array<{ sellerId: string; date: string; status: string; sales: number }>
  yesterdayClosings: Array<{ sellerId: string; date: string; status: string; sales: number }>
  todayAppointments: Array<{ id: string; status: string }>
  todayRoutines: ManagerSellerRoutineSource[]
  feedbacks: Array<{ id: string; status: string; dueDate: string | null }>
  pdiActions: Array<{ id: string; status: string; dueDate: string | null }>
  pdiMeetings: Array<{
    id: string
    status: string
    date: string
    time: string | null
    summary?: string | null
  }>
  agendaItems: Array<{
    id: string
    status: string
    type: string
    date: string
    time: string | null
    description?: string | null
    relatedSellerId?: string | null
    relatedSellerName?: string | null
  }>
  manualTasks: ManagerRoutineManualSource[]
  resolvedAutomaticTaskIds: string[]
  salesToday: number
}

export type ManagerSellerRoutineSource = {
  sellerId: string
  eligible: boolean
  planStatus: string
  firstAccess: boolean
  firstAccessAt: string | null
  planPlanned: number
  planExecuted: number
  planPoints: number
  prospectingStatus: string
  prospectingPlanned: number
  qualifiedGenerated: number
  updateStatus: string
  updatesRequired: number
  updatesDone: number
}

export type ManagerRoutineManualSource = {
  id: string
  rowId?: string
  title: string
  description?: string | null
  category: ManagerRoutineCategory
  origin?: ManagerRoutineOrigin
  dueDate: string
  dueTime?: string | null
  automatic?: boolean
  status: string
  relatedSellerId?: string
  relatedSellerName?: string
  observation?: string
}

export const MANAGER_ROUTINE_CATEGORY_LABELS: Record<ManagerRoutineCategory, string> = {
  resultado: 'Resultado',
  equipe: 'Equipe',
  desenvolvimento: 'Desenvolvimento',
  operacao: 'Operação',
}

export const MANAGER_ROUTINE_ORIGIN_LABELS: Record<ManagerRoutineOrigin, string> = {
  fechamento_diario: 'Fechamento Diário',
  rotina_equipe: 'Rotina da Equipe',
  minha_equipe: 'Minha Equipe',
  meta_loja: 'Meta da Loja',
  desenvolvimento: 'Desenvolvimento',
  universidade_mx: 'Universidade MX',
  carteira_clientes: 'Carteira de Clientes',
  manual: 'Atividade manual',
}

export const MANAGER_ROUTINE_PRIORITY_ORDER: Record<ManagerRoutinePriority, number> = {
  vencida: 0,
  critica: 1,
  atencao: 2,
  normal: 3,
  futura: 4,
}

export const MANAGER_ROUTINE_RESULT_LABELS: Record<ManagerRoutineResult | 'pendente', string> = {
  concluida: 'Concluída',
  concluida_parcial: 'Concluída parcial',
  reagendada: 'Reagendada',
  nao_realizada: 'Não realizada',
  pendente: 'Pendente',
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

export function classifyManagerRoutineUrgency(
  dueDate: string,
  dueTime: string | null | undefined,
  now = new Date(),
): ManagerRoutinePriority {
  const today = getManagerCalendarDate(now)
  if (dueDate < today) return 'vencida'
  if (dueDate > today) return 'futura'

  const dueAt = new Date(`${dueDate}T${dueTime || '23:59'}:00-03:00`).getTime()
  if (dueAt < now.getTime()) return 'critica'
  if (dueAt < now.getTime() + 60 * 60 * 1000) return 'atencao'
  return 'normal'
}

export function calculateManagerRoutineDaysLate(dueDate: string, now = new Date()): number {
  const today = getManagerCalendarDate(now)
  const dueDay = Date.parse(`${dueDate}T12:00:00.000Z`)
  const currentDay = Date.parse(`${today}T12:00:00.000Z`)
  if (!Number.isFinite(dueDay) || !Number.isFinite(currentDay)) return 0
  return Math.max(0, Math.round((currentDay - dueDay) / DAY_IN_MS))
}

export function buildManagerRoutineTasks(input: ManagerRoutineSourceData): ManagerRoutineTask[] {
  const tasks: Array<Omit<ManagerRoutineTask, 'priority' | 'daysLate'>> = []
  const resolved = new Set(input.resolvedAutomaticTaskIds)
  const date = input.referenceDate
  const pushAutomatic = (task: Omit<ManagerRoutineTask, 'priority' | 'daysLate'>) => {
    if (!resolved.has(task.id)) tasks.push(task)
  }

  const waitingRegularization = input.sellers.filter((seller) => {
    const closing = input.todayClosings.find(item => item.sellerId === seller.id)
      || input.yesterdayClosings.find(item => item.sellerId === seller.id)
    return closing?.status === 'aguardando_aprovacao'
  })
  const pendingYesterday = input.sellers.filter((seller) => {
    const closing = input.yesterdayClosings.find(item => item.sellerId === seller.id)
    return closing?.status === 'pendente' && closing.date < date
  })
  const regularizationCount = waitingRegularization.length + pendingYesterday.length
  if (regularizationCount > 0) {
    pushAutomatic(automaticTask({
      id: `reg_fech_${date}`,
      title: 'Regularizar Fechamento Diário',
      description: `Existem ${regularizationCount} regularização${regularizationCount > 1 ? 'ões' : ''} pendente${regularizationCount > 1 ? 's' : ''} no fechamento da equipe.`,
      category: 'operacao',
      block: 'abertura_direcionamento',
      origin: 'fechamento_diario',
      dueDate: date,
      dueTime: '09:30',
      icon: 'ClipboardCheck',
      actions: [
        { label: 'Ver fechamento', path: '/fechamento-diario', params: { filtro: 'regularizacoes' }, kind: 'consulta' },
        { label: 'Regularizar', path: '/fechamento-diario', params: { filtro: 'regularizacoes', acao: 'regularizar' }, kind: 'acao' },
      ],
    }))
  }

  const pendingAppointments = input.todayAppointments.filter(item => (
    item.status === 'pendente' || item.status === 'agendado' || item.status === 'aguardando'
  ))
  if (pendingAppointments.length > 0) {
    pushAutomatic(automaticTask({
      id: `conf_agend_${date}`,
      title: 'Confirmar agendamentos do dia',
      description: `${pendingAppointments.length} agendamento${pendingAppointments.length > 1 ? 's' : ''} ainda precisa${pendingAppointments.length > 1 ? 'm' : ''} de confirmação para hoje.`,
      category: 'resultado',
      block: 'abertura_direcionamento',
      origin: 'carteira_clientes',
      dueDate: date,
      dueTime: '10:30',
      icon: 'CalendarCheck',
      actions: [
        { label: 'Ver agenda', path: '/fechamento-diario', params: { agenda: 'hoje' }, kind: 'consulta' },
        { label: 'Confirmar', path: '/fechamento-diario', params: { agenda: 'hoje', acao: 'confirmar' }, kind: 'acao' },
      ],
    }))
  }

  const pendingPlans = input.todayRoutines.filter((routine) => {
    if (!routine.eligible || routine.planStatus === 'ERRO_GERACAO') return false
    const didNotOpen = !routine.firstAccess || !routine.firstAccessAt
    const didNotExecute = routine.planPlanned > 0 && routine.planExecuted === 0
    const criticalScore = routine.planStatus === 'CALCULAVEL' && routine.planPoints < 50
    return didNotOpen || didNotExecute || criticalScore
  })
  if (pendingPlans.length > 0) {
    pushAutomatic(automaticTask({
      id: `conf_plano_${date}`,
      title: 'Conferir execução do Plano de Ataque',
      description: `${pendingPlans.length} vendedor${pendingPlans.length > 1 ? 'es' : ''} ainda precisa${pendingPlans.length > 1 ? 'm' : ''} de acompanhamento no Plano de Ataque.`,
      category: 'equipe',
      block: 'acompanhamento_execucao',
      origin: 'rotina_equipe',
      dueDate: date,
      dueTime: '11:00',
      icon: 'ListChecks',
      actions: [
        { label: 'Ver rotina', path: '/rotina-equipe', params: { data: date, filtro: 'plano_ataque' }, kind: 'consulta' },
        { label: 'Cobrar', path: '/rotina-equipe', params: { data: date, acao: 'cobrar' }, kind: 'acao' },
      ],
    }))
  }

  const belowProspecting = input.todayRoutines.filter((routine) => {
    if (!routine.eligible || routine.prospectingStatus === 'NAO_APLICAVEL') return false
    if (routine.prospectingStatus === 'SEM_PLANEJAMENTO') return true
    return routine.prospectingPlanned > 0 && routine.qualifiedGenerated < routine.prospectingPlanned
  })
  if (belowProspecting.length > 0) {
    const totalQualified = input.todayRoutines.reduce((sum, item) => sum + item.qualifiedGenerated, 0)
    const totalPlanned = input.todayRoutines.reduce((sum, item) => sum + item.prospectingPlanned, 0)
    pushAutomatic(automaticTask({
      id: `conf_prosp_${date}`,
      title: 'Conferir prospecção',
      description: totalQualified < totalPlanned
        ? `Foram cadastrados ${totalQualified} clientes Qualificados. A necessidade prevista é ${totalPlanned}.`
        : `${belowProspecting.length} vendedor${belowProspecting.length > 1 ? 'es' : ''} está${belowProspecting.length > 1 ? 'o' : 'a'} abaixo da necessidade de clientes Qualificados.`,
      category: 'resultado',
      block: 'gestao_resultado',
      origin: 'rotina_equipe',
      dueDate: date,
      dueTime: '12:00',
      icon: 'UserPlus',
      actions: [
        { label: 'Ver prospecção', path: '/rotina-equipe', params: { data: date, filtro: 'prospeccao' }, kind: 'consulta' },
        { label: 'Acompanhar', path: '/rotina-equipe', params: { data: date, acao: 'acompanhar' }, kind: 'acao' },
      ],
    }))
  }

  const pendingUpdates = input.todayRoutines.filter((routine) => (
    routine.eligible
      && routine.updateStatus !== 'NAO_APLICAVEL'
      && routine.updatesDone < routine.updatesRequired
  ))
  if (pendingUpdates.length > 0) {
    pushAutomatic(automaticTask({
      id: `conf_atu_${date}`,
      title: 'Conferir atualização dos clientes',
      description: `${pendingUpdates.length} vendedor${pendingUpdates.length > 1 ? 'es' : ''} ainda possui${pendingUpdates.length > 1 ? 'em' : 'i'} atualização pendente no Plano de Ataque.`,
      category: 'equipe',
      block: 'acompanhamento_execucao',
      origin: 'rotina_equipe',
      dueDate: date,
      dueTime: '16:00',
      icon: 'RefreshCw',
      actions: [
        { label: 'Ver plano', path: '/rotina-equipe', params: { data: date, filtro: 'atualizacao' }, kind: 'consulta' },
        { label: 'Cobrar', path: '/rotina-equipe', params: { data: date, acao: 'cobrar_atualizacao' }, kind: 'acao' },
      ],
    }))
  }

  if (input.store?.monthlyGoal && input.store.monthlyGoal > 0) {
    const dailyGoal = input.store.monthlyGoal / (input.store.businessDays || 22)
    if (input.salesToday < Math.ceil(dailyGoal)) {
      const missing = Math.ceil(dailyGoal) - input.salesToday
      pushAutomatic(automaticTask({
        id: `meta_hoje_${date}`,
        title: 'Acompanhar oportunidades da meta de hoje',
        description: `Faltam ${missing} venda${missing > 1 ? 's' : ''} para atingir a necessidade do dia.`,
        category: 'resultado',
        block: 'gestao_resultado',
        origin: 'meta_loja',
        dueDate: date,
        dueTime: '18:00',
        icon: 'Target',
        actions: [
          { label: 'Ver Meta da Loja', path: '/meta-loja', kind: 'consulta' },
          { label: 'Acompanhar', path: '/meta-loja', params: { acao: 'acompanhar' }, kind: 'acao' },
        ],
      }))
    }
  }

  const pendingFeedbacks = input.feedbacks.filter(item => (
    item.status !== 'concluido'
      && item.status !== 'cancelado'
      && Boolean(item.dueDate)
      && item.dueDate! <= date
  ))
  if (pendingFeedbacks.length > 0) {
    pushAutomatic(automaticTask({
      id: `fb_pendente_${date}`,
      title: 'Atualizar feedback pendente',
      description: `${pendingFeedbacks.length} feedback${pendingFeedbacks.length > 1 ? 's' : ''} precisa${pendingFeedbacks.length > 1 ? 'm' : ''} de acompanhamento no módulo Desenvolvimento.`,
      category: 'desenvolvimento',
      block: 'pessoas_processos',
      origin: 'desenvolvimento',
      dueDate: date,
      dueTime: '17:00',
      icon: 'MessageSquare',
      actions: [
        { label: 'Abrir feedback', path: '/feedbacks-pdis', kind: 'consulta' },
        { label: 'Atualizar', path: '/feedbacks-pdis', params: { acao: 'atualizar' }, kind: 'acao' },
      ],
    }))
  }

  const duePdiActions = input.pdiActions.filter(item => (
    item.status !== 'concluida'
      && item.status !== 'cancelada'
      && Boolean(item.dueDate)
      && item.dueDate! <= date
  ))
  if (duePdiActions.length > 0) {
    pushAutomatic(automaticTask({
      id: `pdi_prazo_${date}`,
      title: 'Conferir entrega do PDI',
      description: `Existe${duePdiActions.length > 1 ? 'm' : ''} ${duePdiActions.length} ação${duePdiActions.length > 1 ? 'ões' : ''} de PDI vencendo hoje.`,
      category: 'desenvolvimento',
      block: 'pessoas_processos',
      origin: 'desenvolvimento',
      dueDate: date,
      dueTime: '17:00',
      icon: 'FileText',
      actions: [
        { label: 'Abrir PDI', path: '/feedbacks-pdis', params: { tab: 'pdi' }, kind: 'consulta' },
        { label: 'Acompanhar', path: '/feedbacks-pdis', params: { tab: 'pdi', acao: 'acompanhar' }, kind: 'acao' },
      ],
    }))
  }

  input.pdiMeetings.filter(item => item.status === 'agendada').forEach((meeting) => {
    pushAutomatic(automaticTask({
      id: `pdi_reuniao_${meeting.id}`,
      title: `Reunião de PDI${meeting.summary ? `: ${meeting.summary}` : ''}`,
      description: meeting.time ? `Agendada para ${meeting.time}` : 'Reunião de PDI agendada para hoje.',
      category: 'desenvolvimento',
      block: 'pessoas_processos',
      origin: 'desenvolvimento',
      originRecordId: meeting.id,
      dueDate: meeting.date,
      dueTime: meeting.time || '10:00',
      icon: 'Users',
      actions: [
        { label: 'Abrir PDI', path: '/feedbacks-pdis', params: { tab: 'pdi' }, kind: 'consulta' },
      ],
    }))
  })

  input.agendaItems.filter(item => (
    (item.status === 'pendente' || item.status === 'agendado' || item.status === 'aguardando')
      && (item.type === 'compromisso' || item.type === 'reuniao' || item.type === 'conferencia')
  )).forEach((item) => {
    pushAutomatic(automaticTask({
      id: `agenda_${item.id}`,
      title: item.description || 'Compromisso gerencial',
      description: item.relatedSellerName ? `Com ${item.relatedSellerName}` : 'Compromisso da agenda gerencial.',
      category: item.type === 'feedback' || item.type === 'pdi' ? 'desenvolvimento' : 'operacao',
      block: item.type === 'feedback' || item.type === 'pdi' ? 'pessoas_processos' : 'encerramento_preparacao',
      origin: 'carteira_clientes',
      originRecordId: item.id,
      relatedSellerId: item.relatedSellerId || undefined,
      relatedSellerName: item.relatedSellerName || undefined,
      dueDate: item.date,
      dueTime: item.time || '12:00',
      icon: 'Calendar',
      actions: [
        { label: 'Ver agenda', path: '/fechamento-diario', params: { agenda: 'hoje' }, kind: 'consulta' },
        { label: 'Concluir', action: 'concluir_manual', kind: 'acao' },
      ],
    }))
  })

  input.manualTasks.filter(item => item.status === 'pendente' || item.status === 'reagendada').forEach((item) => {
    tasks.push({
      id: item.id,
      rowId: item.rowId || item.id,
      title: item.title,
      description: item.description || '',
      category: item.category,
      block: 'pessoas_processos',
      origin: item.origin || 'manual',
      relatedSellerId: item.relatedSellerId,
      relatedSellerName: item.relatedSellerName,
      dueDate: item.dueDate,
      dueTime: item.dueTime || '',
      automatic: false,
      icon: 'Plus',
      actions: [{ label: 'Concluir', action: 'concluir_manual', kind: 'acao' }],
      status: item.status,
      countsForScore: false,
      observation: item.observation,
    })
  })

  return tasks.map(task => ({
    ...task,
    priority: classifyManagerRoutineUrgency(task.dueDate, task.dueTime, input.now),
    daysLate: calculateManagerRoutineDaysLate(task.dueDate, input.now),
  }))
}

function automaticTask(
  input: Omit<ManagerRoutineTask, 'automatic' | 'priority' | 'daysLate' | 'status' | 'countsForScore'>,
): Omit<ManagerRoutineTask, 'priority' | 'daysLate'> {
  return {
    ...input,
    automatic: true,
    status: 'pendente',
    countsForScore: true,
  }
}

export function filterManagerRoutineTasks(
  tasks: ManagerRoutineTask[],
  category: 'todas' | ManagerRoutineCategory,
  showOverdue: boolean,
): ManagerRoutineTask[] {
  return tasks.filter(task => (
    (!showOverdue || task.priority === 'vencida')
      && (category === 'todas' || task.category === category)
  ))
}

export function sortManagerRoutineTasks(
  tasks: ManagerRoutineTask[],
  sort: 'prioridade' | 'horario' | 'origem',
): ManagerRoutineTask[] {
  const sorted = [...tasks]
  if (sort === 'horario') {
    return sorted.sort((left, right) => (
      `${left.dueDate} ${left.dueTime || '23:59'}`.localeCompare(`${right.dueDate} ${right.dueTime || '23:59'}`)
    ))
  }
  if (sort === 'origem') {
    return sorted.sort((left, right) => (
      MANAGER_ROUTINE_ORIGIN_LABELS[left.origin].localeCompare(
        MANAGER_ROUTINE_ORIGIN_LABELS[right.origin],
        'pt-BR',
      )
    ))
  }
  return sorted.sort((left, right) => (
    MANAGER_ROUTINE_PRIORITY_ORDER[left.priority] - MANAGER_ROUTINE_PRIORITY_ORDER[right.priority]
      || (left.dueTime || '').localeCompare(right.dueTime || '')
  ))
}

export function countManagerRoutinePendingToday(tasks: ManagerRoutineTask[]): number {
  return tasks.filter(task => task.priority !== 'vencida' && task.priority !== 'futura').length
}

export function managerRoutineDbStatusForResult(result: ManagerRoutineResult): string {
  if (result === 'concluida') return 'concluida'
  if (result === 'concluida_parcial') return 'justificada'
  if (result === 'reagendada') return 'em_andamento'
  return 'cancelada'
}

export function resolveManagerRoutineResult(
  status: string,
  metadata: Record<string, unknown>,
): ManagerRoutineResult | 'pendente' {
  const stored = metadata.manager_result
  if (
    stored === 'concluida'
      || stored === 'concluida_parcial'
      || stored === 'reagendada'
      || stored === 'nao_realizada'
  ) return stored
  if (status === 'concluida') return 'concluida'
  if (status === 'justificada') return 'concluida_parcial'
  if (status === 'em_andamento') return 'reagendada'
  if (status === 'cancelada') return 'nao_realizada'
  return 'pendente'
}

export type ManagerRoutineHistoryGroup = {
  date: string
  isToday: boolean
  completedCount: number
  overdueCount: number
  items: ManagerRoutineTask[]
}

export function groupManagerRoutineHistory(
  tasks: ManagerRoutineTask[],
  today: string,
): ManagerRoutineHistoryGroup[] {
  const byDate = new Map<string, ManagerRoutineTask[]>()
  tasks.forEach((task) => {
    const items = byDate.get(task.dueDate) || []
    items.push(task)
    byDate.set(task.dueDate, items)
  })
  return [...byDate.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, items]) => ({
      date,
      isToday: date === today,
      completedCount: items.filter(item => item.status === 'concluida' || item.status === 'concluida_parcial').length,
      overdueCount: items.filter(item => item.status === 'pendente' && item.dueDate < today).length,
      items,
    }))
}

export function buildManagerRoutineNavigationPath(action: ManagerRoutineAction): string {
  const path = action.path || '/rotina'
  const search = new URLSearchParams(action.params || {}).toString()
  return search ? `${path}?${search}` : path
}
