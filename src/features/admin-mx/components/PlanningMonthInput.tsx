import { Input } from '@/components/atoms/Input'
import { formatEditableInput, type FormatConfig } from '../indicadores/indicatorFormulas'

export function planningCellDraftKey(field: 'meta' | 'realizado' | 'ano_anterior', code: string, month: number) {
  return `${field}:${code}:${month}`
}

/** Rascunho do valor único anual (cadastro rápido padrão — replica nos 12 meses ao salvar). */
export function planningYearDraftKey(field: 'meta' | 'realizado' | 'ano_anterior', code: string) {
  return `${field}:${code}:year`
}

export function PlanningMonthInput(props: {
  ariaLabel: string
  displayValue: number | null
  config: FormatConfig
  draft: string | undefined
  onDraft: (raw: string) => void
  onCommit: (raw: string) => void
}) {
  return (
    <Input
      className="w-20 text-right"
      value={props.draft ?? formatEditableInput(props.displayValue, props.config)}
      aria-label={props.ariaLabel}
      title="Vazio preserva o valor atual. 0 é zero. LIMPAR apaga a meta."
      onChange={event => props.onDraft(event.target.value)}
      onBlur={event => props.onCommit(event.currentTarget.value)}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
    />
  )
}
