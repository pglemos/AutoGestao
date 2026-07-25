import type { DiagnosticSeverity } from '../types'
export function normalizeDiagnosticSeverity(value: string | null | undefined): DiagnosticSeverity {
  const normalized = String(value || '').toLowerCase()
  if (['critical', 'critico', 'crítico', 'danger', 'error'].includes(normalized)) return 'critical'
  if (['warning', 'alert', 'alerta', 'attention'].includes(normalized)) return 'warning'
  return 'info'
}
export function diagnosticSeverityLabel(value: DiagnosticSeverity): string {
  return value === 'critical' ? 'Crítico' : value === 'warning' ? 'Atenção' : 'Informativo'
}
