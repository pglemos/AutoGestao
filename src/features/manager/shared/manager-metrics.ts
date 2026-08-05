import type { CheckinWithTotals } from '@/types/database'
import { isDraftClosing } from '@/features/checkin/lib/closing-operational-state'

export type ManagerClosingStatus =
  | 'Finalizado'
  | 'Em andamento'
  | 'Pendente'
  | 'Fora do horário'
  | 'Aguardando aprovação'

export type AppointmentCoverageLabel = 'Ruim' | 'Regular' | 'Bom' | 'Excelente'

export function getClosingStatus(checkin: CheckinWithTotals | undefined, pendingRegularization = false): ManagerClosingStatus {
  if (pendingRegularization) return 'Aguardando aprovação'
  if (!checkin) return 'Pendente'
  // Com autosave, existir linha deixou de significar fechamento entregue: o
  // rascunho é uma linha real com submission_status='draft'.
  if (isDraftClosing(checkin)) return 'Em andamento'
  if (checkin.submitted_late || checkin.finalizado_apos_prazo || checkin.submission_status === 'late') return 'Fora do horário'
  return 'Finalizado'
}

export function classifyDiscipline(value: number) {
  if (value >= 90) return 'Excelente'
  if (value >= 70) return 'Boa'
  if (value >= 40) return 'Baixa'
  return 'Crítica'
}

/** Classificação oficial da cobertura de agendamentos do dia. */
export function classifyAppointmentCoverage(
  actual: number | null | undefined,
  required: number | null | undefined,
): AppointmentCoverageLabel | null {
  if (
    actual === null || actual === undefined || !Number.isFinite(actual) ||
    required === null || required === undefined || !Number.isFinite(required) || required <= 0
  ) return null

  const coverage = (actual / required) * 100
  if (coverage <= 50) return 'Ruim'
  if (coverage < 100) return 'Regular'
  if (coverage <= 150) return 'Bom'
  return 'Excelente'
}

export function classifyRoutine(value: number) {
  if (value >= 75) return 'Em dia'
  if (value >= 50) return 'Atenção'
  return 'Crítico'
}

export function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}
