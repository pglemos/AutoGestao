export type DiagnosticSeverity = 'info' | 'warning' | 'critical'
export type DiagnosticFinding = {
  id: string
  severity: DiagnosticSeverity
  title: string
  description: string
  suggestedAction: string
  evidence: string[]
  completed: boolean
}
