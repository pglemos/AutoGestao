import type { DateFilter } from '@/hooks/agenda'

export const dateFilters: { key: DateFilter; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'proxima_semana', label: 'Próx. Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'todos', label: 'Todos' },
]

export const statusFilters = [
  { key: 'todos', label: 'Todos' },
  { key: 'agendada', label: 'Agendadas' },
  { key: 'em_andamento', label: 'Em Andamento' },
  { key: 'concluida', label: 'Concluídas' },
  { key: 'cancelada', label: 'Canceladas' },
] as const

export const metricCards = [
  { key: 'total', label: 'Total', valueKey: 'total', className: '' },
  { key: 'agendadas', label: 'Agendadas', valueKey: 'agendadas', className: 'text-brand-primary' },
  { key: 'andamento', label: 'Em andamento', valueKey: 'emAndamento', className: 'text-status-info-text' },
  { key: 'concluidas', label: 'Concluídas', valueKey: 'concluidas', className: 'text-status-success-text' },
  { key: 'canceladas', label: 'Canceladas', valueKey: 'canceladas', className: 'text-status-error-text' },
] as const
