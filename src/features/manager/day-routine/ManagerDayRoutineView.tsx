import { useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  ListChecks,
  MessageSquare,
  Plus,
  RefreshCw,
  Target,
  UserPlus,
  Users,
} from 'lucide-react'

import { Modal } from '@/components/organisms/Modal'
import {
  MANAGER_ROUTINE_CATEGORY_LABELS,
  MANAGER_ROUTINE_ORIGIN_LABELS,
  MANAGER_ROUTINE_RESULT_LABELS,
  countManagerRoutinePendingToday,
  filterManagerRoutineTasks,
  groupManagerRoutineHistory,
  sortManagerRoutineTasks,
  type ManagerRoutineAction,
  type ManagerRoutineCategory,
  type ManagerRoutinePriority,
  type ManagerRoutineResult,
  type ManagerRoutineTask,
} from './manager-day-routine'
import type { ManagerRoutineNewTaskForm } from './manager-day-routine-adapter'

type ManagerRoutineFilter = 'todas' | ManagerRoutineCategory
type ManagerRoutineSort = 'prioridade' | 'horario' | 'origem'

export type ManagerDayRoutineViewProps = {
  returnLink?: React.ReactNode
  referenceDate: string
  storeName: string | null
  tasks: ManagerRoutineTask[]
  historyTasks: ManagerRoutineTask[]
  sellers: Array<{ id: string; name: string }>
  loading: boolean
  error: string | null
  refreshing: boolean
  initialFilter?: ManagerRoutineFilter
  initialSort?: ManagerRoutineSort
  onRefresh: () => void | Promise<void>
  onNavigate: (
    action: ManagerRoutineAction,
    task: ManagerRoutineTask,
    context: { filter: ManagerRoutineFilter; sort: ManagerRoutineSort },
  ) => void
  onCreate: (form: ManagerRoutineNewTaskForm) => void | Promise<void>
  onComplete: (
    task: ManagerRoutineTask,
    result: ManagerRoutineResult,
    observation: string,
  ) => void | Promise<void>
}

const FILTERS: Array<{ key: ManagerRoutineFilter; label: string }> = [
  { key: 'todas', label: 'Todas' },
  { key: 'resultado', label: 'Resultado' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'desenvolvimento', label: 'Desenvolvimento' },
  { key: 'operacao', label: 'Operação' },
]

const SORTS: Array<{ key: ManagerRoutineSort; label: string }> = [
  { key: 'prioridade', label: 'Prioridade' },
  { key: 'horario', label: 'Horário' },
  { key: 'origem', label: 'Origem' },
]

const CATEGORY_STYLE: Record<ManagerRoutineCategory, { color: string; background: string }> = {
  resultado: { color: 'text-purple-600', background: 'bg-purple-50' },
  equipe: { color: 'text-cyan-600', background: 'bg-cyan-50' },
  desenvolvimento: { color: 'text-emerald-600', background: 'bg-emerald-50' },
  operacao: { color: 'text-blue-600', background: 'bg-blue-50' },
}

const PRIORITY_STYLE: Record<ManagerRoutinePriority, {
  label: string
  color: string
  background: string
  border: string
  marker: string
}> = {
  vencida: {
    label: 'Vencida',
    color: 'text-red-800',
    background: 'bg-red-100',
    border: 'border-red-300',
    marker: 'bg-red-700',
  },
  critica: {
    label: 'Crítica',
    color: 'text-red-600',
    background: 'bg-red-50',
    border: 'border-red-200',
    marker: 'bg-red-500',
  },
  atencao: {
    label: 'Atenção',
    color: 'text-amber-600',
    background: 'bg-amber-50',
    border: 'border-amber-200',
    marker: 'bg-amber-500',
  },
  normal: {
    label: 'Normal',
    color: 'text-emerald-600',
    background: 'bg-emerald-50',
    border: 'border-emerald-200',
    marker: 'bg-emerald-500',
  },
  futura: {
    label: 'Agendada',
    color: 'text-muted-foreground',
    background: 'bg-gray-50',
    border: 'border-gray-200',
    marker: 'bg-gray-400',
  },
}

const ICONS = {
  ClipboardCheck,
  CalendarCheck,
  ListChecks,
  UserPlus,
  RefreshCw,
  Target,
  MessageSquare,
  FileText,
  Calendar,
  Users,
  Plus,
}

const FIELD_CLASS = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-foreground outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

export function ManagerDayRoutineView({
  returnLink,
  referenceDate,
  storeName,
  tasks,
  historyTasks,
  sellers,
  loading,
  error,
  refreshing,
  initialFilter = 'todas',
  initialSort = 'prioridade',
  onRefresh,
  onNavigate,
  onCreate,
  onComplete,
}: ManagerDayRoutineViewProps) {
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today')
  const [filter, setFilter] = useState<ManagerRoutineFilter>(initialFilter)
  const [sort, setSort] = useState<ManagerRoutineSort>(initialSort)
  const [showOverdue, setShowOverdue] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [taskToComplete, setTaskToComplete] = useState<ManagerRoutineTask | null>(null)

  const pendingToday = countManagerRoutinePendingToday(tasks)
  const overdueCount = tasks.filter(task => task.priority === 'vencida').length
  const visibleTasks = useMemo(
    () => sortManagerRoutineTasks(filterManagerRoutineTasks(tasks, filter, showOverdue), sort),
    [filter, showOverdue, sort, tasks],
  )
  const dateLabel = managerRoutineDateLabel(referenceDate)

  return (
    <div className="flex flex-col gap-5">
        {returnLink}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Rotina do Dia</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Alertas e ações essenciais para conduzir o dia com foco em resultado.
              </p>
            </div>
            <div className="flex items-center gap-3 self-end lg:self-auto">
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground">{dateLabel.weekday}</p>
                <p className="text-xs text-muted-foreground">{dateLabel.longDate}</p>
                {storeName && (
                  <p className="mt-0.5 text-xs font-medium text-emerald-600">{storeName}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void onRefresh()}
                disabled={refreshing}
                className="flex h-[36px] items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-foreground transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Atualizar
              </button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex border-b border-gray-100" role="tablist" aria-label="Rotina do Dia">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'today'}
              onClick={() => setActiveTab('today')}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === 'today'
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CalendarClock size={16} />
              Hoje
              {pendingToday > 0 && activeTab !== 'today' && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-caption text-muted-foreground">
                  {pendingToday}
                </span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Minha Rotina
            </button>
          </div>
        </section>

        {activeTab === 'today' ? (
          <TodayRoutine
            loading={loading}
            error={error}
            hasStore={Boolean(storeName)}
            overdueCount={overdueCount}
            pendingToday={pendingToday}
            showOverdue={showOverdue}
            setShowOverdue={setShowOverdue}
            filter={filter}
            setFilter={setFilter}
            sort={sort}
            setSort={setSort}
            tasks={visibleTasks}
            onAction={(action, task) => {
              if (action.action === 'concluir_manual') {
                setTaskToComplete(task)
                return
              }
              onNavigate(action, task, { filter, sort })
            }}
            onCreate={() => setCreateOpen(true)}
          />
        ) : (
          <HistoryRoutine
            referenceDate={referenceDate}
            loading={loading}
            error={error}
            tasks={historyTasks}
          />
        )}

      {createOpen && (
        <CreateActivityModal
          referenceDate={referenceDate}
          sellers={sellers}
          onClose={() => setCreateOpen(false)}
          onCreate={onCreate}
        />
      )}
      {taskToComplete && (
        <CompleteActivityModal
          task={taskToComplete}
          onClose={() => setTaskToComplete(null)}
          onComplete={onComplete}
        />
      )}
    </div>
  )
}

function TodayRoutine({
  loading,
  error,
  hasStore,
  overdueCount,
  pendingToday,
  showOverdue,
  setShowOverdue,
  filter,
  setFilter,
  sort,
  setSort,
  tasks,
  onAction,
  onCreate,
}: {
  loading: boolean
  error: string | null
  hasStore: boolean
  overdueCount: number
  pendingToday: number
  showOverdue: boolean
  setShowOverdue: (value: boolean) => void
  filter: ManagerRoutineFilter
  setFilter: (value: ManagerRoutineFilter) => void
  sort: ManagerRoutineSort
  setSort: (value: ManagerRoutineSort) => void
  tasks: ManagerRoutineTask[]
  onAction: (action: ManagerRoutineAction, task: ManagerRoutineTask) => void
  onCreate: () => void
}) {
  if (loading) return <LoadingRoutine />
  if (error) return <RoutineNotice tone="error" title="Não foi possível carregar a rotina." description={error} />
  if (!hasStore) {
    return (
      <RoutineNotice
        tone="neutral"
        title="Nenhuma unidade vinculada."
        description="Vincule uma unidade ao gerente para carregar a Rotina do Dia."
      />
    )
  }

  return (
    <div className="space-y-4">
      {!showOverdue && overdueCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-red-800">
                Você possui {overdueCount} pendência{overdueCount > 1 ? 's' : ''} de dias anteriores.
              </p>
              <p className="mt-0.5 text-xs text-red-600">
                Revise e regularize antes de seguir com o dia.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowOverdue(true)}
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Ver pendências
          </button>
        </div>
      )}

      {showOverdue && overdueCount > 0 && (
        <button
          type="button"
          onClick={() => setShowOverdue(false)}
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
        >
          ← Ver todas as tarefas
        </button>
      )}

      {!showOverdue && (
        <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {FILTERS.map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    filter === item.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'border border-gray-200 bg-white text-muted-foreground hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                  {item.key === 'todas' && pendingToday > 0 && (
                    <span className={`ml-1.5 rounded px-1.5 py-0.5 text-caption ${
                      filter === item.key ? 'bg-white/20' : 'bg-gray-100'
                    }`}
                    >
                      {pendingToday}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden lg:block">Ordenar:</span>
              <select
                aria-label="Ordenar"
                value={sort}
                onChange={event => setSort(event.target.value as ManagerRoutineSort)}
                className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {SORTS.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-bold text-foreground">
          {showOverdue ? 'Pendências de dias anteriores' : 'O que você não pode deixar de fazer hoje'}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {showOverdue
            ? 'Tarefas vencidas que ainda exigem atuação.'
            : 'Somente ações urgentes e pendentes do dia.'}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-300" />
          <p className="text-sm font-semibold text-muted-foreground">Nenhuma ação urgente no momento.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            O sistema continuará acompanhando a operação e avisará quando sua atuação for necessária.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map(task => (
            <RoutineTaskCard key={task.id} task={task} onAction={onAction} />
          ))}
        </div>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={onCreate}
          className="flex h-9 items-center gap-1 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50"
        >
          <Plus size={14} />
          Nova atividade
        </button>
      </div>
    </div>
  )
}

function RoutineTaskCard({
  task,
  onAction,
}: {
  task: ManagerRoutineTask
  onAction: (action: ManagerRoutineAction, task: ManagerRoutineTask) => void
}) {
  const category = CATEGORY_STYLE[task.category]
  const priority = PRIORITY_STYLE[task.priority]
  const Icon = ICONS[task.icon as keyof typeof ICONS] || Plus

  return (
    <article className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-all hover:shadow-md ${priority.border}`}>
      <div className="flex flex-wrap items-center gap-2 p-3 lg:flex-nowrap lg:gap-4 lg:px-4 lg:py-3">
        <div className="order-1 flex items-center gap-2 lg:order-none lg:w-16 lg:shrink-0 lg:flex-col lg:gap-0 lg:text-center">
          <Clock size={12} className="text-muted-foreground lg:hidden" />
          <span className={`text-sm font-bold ${priority.color}`}>{task.dueTime || '—'}</span>
          {task.daysLate > 0 && (
            <span className="text-caption font-medium text-red-600">{task.daysLate}d atraso</span>
          )}
        </div>
        <div className={`hidden h-12 w-1 shrink-0 rounded-full lg:block ${priority.marker}`} />
        <div className="order-3 flex w-full min-w-0 items-start gap-2 lg:order-none lg:flex-1 lg:items-center lg:gap-4">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg lg:h-9 lg:w-9 ${category.background}`}>
            <Icon size={18} className={category.color} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-foreground">{task.title}</h3>
              {!task.automatic && (
                <span className="hidden rounded bg-gray-100 px-1.5 py-0.5 text-caption font-medium text-muted-foreground lg:inline">
                  Manual
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground lg:line-clamp-1">{task.description}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 lg:mt-1">
              <span className={`rounded px-1.5 py-0.5 text-caption font-medium ${category.background} ${category.color}`}>
                {MANAGER_ROUTINE_CATEGORY_LABELS[task.category]}
              </span>
              {!task.automatic && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-caption font-medium text-muted-foreground lg:hidden">
                  Manual
                </span>
              )}
              <span className="hidden text-caption text-muted-foreground lg:inline">
                {MANAGER_ROUTINE_ORIGIN_LABELS[task.origin]}
              </span>
            </div>
          </div>
        </div>
        <span className={`order-2 ml-auto shrink-0 rounded-lg px-2 py-1 text-caption font-semibold lg:order-none lg:ml-0 ${priority.background} ${priority.color}`}>
          {priority.label}
        </span>
        {task.actions.length > 0 && (
          <div className="order-4 flex w-full gap-2 pt-1 lg:order-none lg:w-auto lg:shrink-0 lg:pt-0">
            {task.actions.map((action, index) => (
              <button
                key={`${action.label}-${index}`}
                type="button"
                onClick={() => onAction(action, task)}
                className={`h-9 flex-1 rounded-lg px-3 text-xs font-medium transition lg:h-8 lg:flex-none ${
                  action.kind === 'acao'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'border border-gray-200 bg-white text-foreground hover:bg-gray-50'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function HistoryRoutine({
  referenceDate,
  loading,
  error,
  tasks,
}: {
  referenceDate: string
  loading: boolean
  error: string | null
  tasks: ManagerRoutineTask[]
}) {
  const [period, setPeriod] = useState<7 | 15 | 30>(7)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const visibleTasks = useMemo(() => {
    if (startDate && endDate) {
      return tasks.filter(task => task.dueDate >= startDate && task.dueDate <= endDate)
    }
    const start = shiftIsoDate(referenceDate, -(period - 1))
    return tasks.filter(task => task.dueDate >= start && task.dueDate <= referenceDate)
  }, [endDate, period, referenceDate, startDate, tasks])
  const groups = groupManagerRoutineHistory(visibleTasks, referenceDate)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {([7, 15, 30] as const).map(value => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setPeriod(value)
                setStartDate('')
                setEndDate('')
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                period === value && !startDate
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-50 text-muted-foreground hover:bg-gray-100'
              }`}
            >
              {value} dias
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <input
              type="date"
              aria-label="Data inicial"
              value={startDate}
              onChange={event => setStartDate(event.target.value)}
              className="min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-xs text-muted-foreground">até</span>
            <input
              type="date"
              aria-label="Data final"
              value={endDate}
              onChange={event => setEndDate(event.target.value)}
              className="min-w-0 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-muted-foreground outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingRoutine compact />
      ) : error ? (
        <RoutineNotice tone="error" title="Não foi possível carregar o histórico." description={error} />
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada no período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => (
            <section key={group.date} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {formatShortDate(group.date)}
                  {group.isToday && <span className="ml-2 text-xs font-medium text-emerald-600">Hoje</span>}
                </h3>
                <div className="flex items-center gap-3 text-xs">
                  {group.completedCount > 0 && (
                    <span className="text-emerald-600">
                      {group.completedCount} concluída{group.completedCount > 1 ? 's' : ''}
                    </span>
                  )}
                  {group.overdueCount > 0 && (
                    <span className="text-red-600">
                      {group.overdueCount} vencida{group.overdueCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </header>
              <div className="divide-y divide-gray-50">
                {group.items.map(task => <HistoryTaskRow key={task.id} task={task} />)}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function HistoryTaskRow({ task }: { task: ManagerRoutineTask }) {
  const category = CATEGORY_STYLE[task.category]
  const status = historyStatusStyle(task.status)
  const label = MANAGER_ROUTINE_RESULT_LABELS[
    task.status in MANAGER_ROUTINE_RESULT_LABELS
      ? task.status as keyof typeof MANAGER_ROUTINE_RESULT_LABELS
      : 'pendente'
  ]

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{task.title}</p>
        {task.description && <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-caption font-medium ${category.background} ${category.color}`}>
            {MANAGER_ROUTINE_CATEGORY_LABELS[task.category]}
          </span>
          <span className={`rounded px-1.5 py-0.5 text-caption font-medium ${status.background} ${status.color}`}>
            {label}
          </span>
          {task.dueTime && <span className="text-caption text-muted-foreground">{task.dueTime}</span>}
          {task.observation && (
            <span className="truncate text-caption italic text-muted-foreground">&quot;{task.observation}&quot;</span>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateActivityModal({
  referenceDate,
  sellers,
  onClose,
  onCreate,
}: {
  referenceDate: string
  sellers: Array<{ id: string; name: string }>
  onClose: () => void
  onCreate: ManagerDayRoutineViewProps['onCreate']
}) {
  const [form, setForm] = useState<ManagerRoutineNewTaskForm>({
    title: '',
    date: referenceDate,
    time: '12:00',
    category: 'operacao',
    priority: 'normal',
    relatedSellerId: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const submit = async () => {
    if (!form.title.trim() || saving) return
    setSaving(true)
    try {
      await onCreate({ ...form, title: form.title.trim() })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Nova atividade"
      size="sm"
      referenceStyle
      onOpenAutoFocus={(event) => {
        event.preventDefault()
        titleInputRef.current?.focus()
      }}
      footer={(
        <>
          <button type="button" onClick={onClose} className="h-8 rounded-xl border border-gray-200 px-3 text-sm text-foreground hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!form.title.trim() || saving}
            onClick={() => void submit()}
            className="h-8 rounded-xl bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Criar atividade
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <Field label="Título *">
          <input
            ref={titleInputRef}
            value={form.title}
            onChange={event => setForm(current => ({ ...current, title: event.target.value }))}
            placeholder="Ex.: Reunião com vendedor"
            className={FIELD_CLASS}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input
              type="date"
              value={form.date}
              onChange={event => setForm(current => ({ ...current, date: event.target.value }))}
              className={FIELD_CLASS}
            />
          </Field>
          <Field label="Horário">
            <input
              type="time"
              value={form.time}
              onChange={event => setForm(current => ({ ...current, time: event.target.value }))}
              className={FIELD_CLASS}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <select
              value={form.category}
              onChange={event => setForm(current => ({ ...current, category: event.target.value as ManagerRoutineCategory }))}
              className={FIELD_CLASS}
            >
              {Object.entries(MANAGER_ROUTINE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Prioridade">
            <select
              value={form.priority}
              onChange={event => setForm(current => ({
                ...current,
                priority: event.target.value as ManagerRoutineNewTaskForm['priority'],
              }))}
              className={FIELD_CLASS}
            >
              <option value="normal">Normal</option>
              <option value="atencao">Atenção</option>
              <option value="critica">Crítica</option>
            </select>
          </Field>
        </div>
        {sellers.length > 0 && (
          <Field label="Vendedor relacionado (opcional)">
            <select
              value={form.relatedSellerId}
              onChange={event => setForm(current => ({ ...current, relatedSellerId: event.target.value }))}
              className={FIELD_CLASS}
            >
              <option value="">Nenhum</option>
              {sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Observação">
          <textarea
            value={form.notes}
            onChange={event => setForm(current => ({ ...current, notes: event.target.value }))}
            rows={2}
            placeholder="Detalhes da atividade..."
            className={`${FIELD_CLASS} resize-none`}
          />
        </Field>
      </div>
    </Modal>
  )
}

function CompleteActivityModal({
  task,
  onClose,
  onComplete,
}: {
  task: ManagerRoutineTask
  onClose: () => void
  onComplete: ManagerDayRoutineViewProps['onComplete']
}) {
  const [result, setResult] = useState<ManagerRoutineResult | null>(null)
  const [observation, setObservation] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!result || saving) return
    setSaving(true)
    try {
      await onComplete(task, result, observation)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Concluir atividade"
      size="sm"
      referenceStyle
      footer={(
        <>
          <button type="button" onClick={onClose} className="h-8 rounded-xl border border-gray-200 px-3 text-sm text-foreground hover:bg-gray-50">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!result || saving}
            onClick={() => void submit()}
            className="h-8 rounded-xl bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Confirmar
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="text-sm font-medium text-foreground">{task.title}</p>
          {task.description && <p className="mt-0.5 text-xs text-muted-foreground">{task.description}</p>}
        </div>
        <div>
          <span className="mb-2 block text-xs font-medium text-muted-foreground">Resultado</span>
          <div className="grid grid-cols-2 gap-2">
            {([
              ['concluida', 'Concluída', 'bg-emerald-600 hover:bg-emerald-700'],
              ['concluida_parcial', 'Concluída parcialmente', 'bg-amber-500 hover:bg-amber-600'],
              ['reagendada', 'Reagendada', 'bg-blue-500 hover:bg-blue-600'],
              ['nao_realizada', 'Não realizada', 'bg-gray-400 hover:bg-gray-500'],
            ] as const).map(([value, label, activeClass]) => (
              <button
                key={value}
                type="button"
                aria-pressed={result === value}
                onClick={() => setResult(value)}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  result === value
                    ? `${activeClass} text-white shadow-sm`
                    : 'bg-gray-50 text-muted-foreground hover:bg-gray-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <Field label="Observação (opcional)">
          <textarea
            value={observation}
            onChange={event => setObservation(event.target.value)}
            rows={2}
            placeholder="Registro da atividade..."
            className={`${FIELD_CLASS} resize-none`}
          />
        </Field>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  )
}

function LoadingRoutine({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex justify-center ${compact ? 'py-12' : 'py-16'}`} aria-label="Carregando rotina">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
    </div>
  )
}

function RoutineNotice({
  tone,
  title,
  description,
}: {
  tone: 'error' | 'neutral'
  title: string
  description: string
}) {
  return (
    <div className={`rounded-2xl border bg-white p-8 text-center shadow-sm ${tone === 'error' ? 'border-red-200' : 'border-gray-100'}`}>
      <p className={`text-sm font-semibold ${tone === 'error' ? 'text-red-700' : 'text-muted-foreground'}`}>{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function managerRoutineDateLabel(value: string): { weekday: string; longDate: string } {
  const date = new Date(`${value}T12:00:00-03:00`)
  const weekday = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    timeZone: 'America/Sao_Paulo',
  }).format(date)
  return {
    weekday: `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}`,
    longDate: new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    }).format(date),
  }
}

function formatShortDate(value: string): string {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

function shiftIsoDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function historyStatusStyle(status: string): { color: string; background: string } {
  if (status === 'concluida') return { color: 'text-emerald-600', background: 'bg-emerald-50' }
  if (status === 'concluida_parcial') return { color: 'text-amber-600', background: 'bg-amber-50' }
  if (status === 'reagendada') return { color: 'text-blue-600', background: 'bg-blue-50' }
  if (status === 'nao_realizada') return { color: 'text-muted-foreground', background: 'bg-gray-50' }
  return { color: 'text-muted-foreground', background: 'bg-gray-50' }
}

export default ManagerDayRoutineView
