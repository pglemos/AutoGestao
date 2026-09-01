import { AlertCircle, CheckCircle2, FileText } from 'lucide-react'
import { MxProgress } from '@/components/module/MxModuleVisualPrimitives'
import { buildProgramSummary, type ProgramSummary } from './programSummary'
import { programModalityLabel } from './programMutations'
import type { VisitVolumeRule } from './visitVolumeRule'

function formatDate(value: string | null, fallback = 'Data não registrada') {
  if (!value) return fallback
  const trimmed = String(value).trim()
  const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnly) return `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleDateString('pt-BR')
}

export function ProgramCard(props: { summary: ProgramSummary; visitRule?: VisitVolumeRule | null; onEditProgram: () => void }) {
  const summary = props.summary
  const statusLabel = summary.configured
    ? summary.progress >= 100
      ? 'Concluído'
      : summary.progress > 0
        ? 'Em execução'
        : 'Configurado'
    : 'Não configurado'

  if (!summary.configured) {
    return (
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-muted-foreground" />
          <h4 className="text-sm font-semibold text-foreground">Programa Contratado</h4>
        </div>
        <div className="mt-2 flex flex-col items-start gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <AlertCircle size={14} className="text-status-error-text" />
          <span>Nenhum programa contratado. Configure o produto na Etapa 3 do onboarding.</span>
          <button type="button" onClick={props.onEditProgram} className="shrink-0 font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
            Configurar programa
          </button>
        </div>
      </div>
    )
  }

  const modality = programModalityLabel(summary.modality)
  const info: Array<[string, string]> = [
    ['Produto', summary.product_name ?? summary.program_template_key ?? 'Produto não configurado'],
    ['Modalidade', modality === '—' ? 'Modalidade não definida' : modality],
    ['Início', formatDate(summary.contract_start_date, 'Início não definido')],
    ['Fim', summary.contract_end_date
      ? formatDate(summary.contract_end_date)
      : summary.contract_start_date
        ? 'Sem prazo'
        : 'Fim não definido'],
        ['Encontros', summary.overdue_visits > 0
          ? `${summary.completed_visits} concluídos de ${summary.visits} · ${summary.overdue_visits} atrasada(s)`
          : `${summary.completed_visits} concluídos de ${summary.visits}`],
        ['Onboarding', `${summary.onboarding_visits} encontro(s)`],
        ['Consultor responsável', summary.responsible_consultant ?? 'Responsável não atribuído'],
  ]

  return (
    <div className="rounded-xl border border-border p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Programa Contratado</h4>
        </div>
        <span className="rounded-full bg-surface-alt px-2 py-0.5 text-xs font-medium text-foreground">{statusLabel}</span>
      </div>

      {props.visitRule ? (
        <div className="mt-4 rounded-lg border border-border bg-surface-alt p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regra de visitas presenciais</div>
          <div className="mt-1 text-sm font-semibold text-foreground">{props.visitRule.label}</div>
          <p className="mt-1 text-xs text-muted-foreground">{props.visitRule.detail}</p>
        </div>
      ) : null}

      <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        {info.map(([label, value]) => (
          <div key={label}>
            <div className="text-muted-foreground">{label}</div>
            <div className="font-medium text-foreground">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle2 size={12} className="text-status-success-text" />
          Jornada vinculada: {summary.visits} encontro(s)
        </div>
        <MxProgress value={summary.progress} label={`${summary.progress}% concluído`} />
      </div>

      <div className="mt-4 border-t border-border pt-3">
        <button type="button" onClick={props.onEditProgram} className="text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none">
          Editar programa
        </button>
      </div>
    </div>
  )
}
