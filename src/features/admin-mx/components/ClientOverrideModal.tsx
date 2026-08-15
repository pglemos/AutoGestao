import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { MONTH_LABELS, evaluateFormula, buildDependentsMap, type FormulaEngineIndicator } from '../indicadores/indicatorFormulas'
import {
  OVERRIDE_SCOPE_LABEL,
  previewParameterImpact,
  validateOverrideDraft,
  type ClientParameterOverride,
  type OverrideDraft,
  type OverrideScope,
  type ParameterDefinition,
} from '../indicadores/parameterCatalog'

export function ClientOverrideModal(props: {
  open: boolean
  clientId: string
  referenceYear: number
  param: ParameterDefinition
  existingOverrides: ClientParameterOverride[]
  indicators: FormulaEngineIndicator[]
  valueMap: Record<string, Record<number, number | null>>
  submitting: boolean
  onSave: (draft: OverrideDraft) => void
  onRestore: () => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<OverrideDraft>({
    parameter_code: props.param.code,
    reference_year: props.referenceYear,
    scope: 'ANO_INTEIRO',
    months: [],
    new_value: props.param.default_value,
    reason: '',
  })
  const [preview, setPreview] = useState<ReturnType<typeof previewParameterImpact> | null>(null)

  const dependents = useMemo(() => {
    const dependentsMap = buildDependentsMap(props.indicators)
    const codes = dependentsMap[props.param.code] ?? []
    return codes
      .map(code => {
        const indicator = props.indicators.find(item => item.code === code)
        return indicator ? { code, name: indicator.code, formula_expression: indicator.formula_expression ?? '' } : null
      })
      .filter((item): item is { code: string; name: string; formula_expression: string } => Boolean(item))
  }, [props.indicators, props.param.code])

  const error = validateOverrideDraft(draft, props.param)
  const hasCustom = props.existingOverrides.some(override => override.status !== 'encerrado')

  const patch = (values: Partial<OverrideDraft>) => {
    setDraft(current => ({ ...current, ...values }))
    setPreview(null)
  }

  const toggleMonth = (month: number) => {
    patch({
      months: draft.months.includes(month) ? draft.months.filter(item => item !== month) : [...draft.months, month],
    })
  }

  const runPreview = () => {
    if (draft.new_value == null) return
    setPreview(previewParameterImpact({
      parameterCode: draft.parameter_code,
      paramName: props.param.name,
      oldValue: props.param.default_value,
      newValue: draft.new_value,
      month: draft.scope === 'SOMENTE_ESTE_MES' ? (draft.months[0] ?? 1) : 1,
      params: [props.param],
      overrides: props.existingOverrides,
      dependents,
      valueMap: props.valueMap,
      evaluate: evaluateFormula,
    }))
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Personalizar parâmetro — ${props.param.name}`}
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          {hasCustom ? (
            <Button variant="outline" onClick={props.onRestore} disabled={props.submitting}>
              <RotateCcw size={14} />Restaurar padrão MX
            </Button>
          ) : null}
          <div className="flex-1" />
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button variant="outline" onClick={runPreview} disabled={props.submitting || draft.new_value == null}>Visualizar impacto</Button>
          <Button onClick={() => props.onSave(draft)} disabled={props.submitting || Boolean(error)}>
            {props.submitting ? 'Salvando...' : 'Salvar parâmetro'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}
        <p className="text-sm text-muted-foreground">Personalização de <strong>{props.param.code}</strong> para o ano {props.referenceYear}. Justificativa obrigatória.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Padrão MX">
            <Input value={props.param.default_value != null ? String(props.param.default_value) : '—'} readOnly />
          </MxField>
          <MxField label="Novo valor">
            <Input type="number" step="0.01" value={draft.new_value === null ? '' : String(draft.new_value)} onChange={event => patch({ new_value: event.target.value === '' ? null : Number(event.target.value) })} />
          </MxField>
        </div>

        <MxField label="Aplicação">
          <MxSelect
            aria-label="Escopo de aplicação"
            value={draft.scope}
            onChange={event => patch({ scope: event.target.value as OverrideScope, months: [] })}
          >
            {Object.entries(OVERRIDE_SCOPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </MxSelect>
        </MxField>

        {draft.scope === 'MESES_SELECIONADOS' || draft.scope === 'SOMENTE_ESTE_MES' ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-foreground">{draft.scope === 'SOMENTE_ESTE_MES' ? 'Selecione o mês' : 'Selecione os meses'}</div>
            <div className="flex flex-wrap gap-1.5">
              {MONTH_LABELS.map((label, index) => {
                const month = index + 1
                const selected = draft.months.includes(month)
                return (
                  <button
                    key={month}
                    type="button"
                    onClick={() => toggleMonth(month)}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${selected ? 'border-border-strong bg-background-muted font-semibold text-foreground' : 'border-border text-muted-foreground'}`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <MxField label="Justificativa" hint="Obrigatória.">
          <Input value={draft.reason} onChange={event => patch({ reason: event.target.value })} placeholder="Explique o motivo da personalização..." />
        </MxField>

        {dependents.length > 0 ? (
          <MxStatusBanner tone="info">
            <strong>Indicadores impactados:</strong> {dependents.map(item => item.name).join(', ')}
          </MxStatusBanner>
        ) : null}

        {preview ? (
          <div className="space-y-2 rounded-lg border border-border bg-background-muted p-4">
            <div className="text-sm font-semibold text-foreground">Prévia do impacto</div>
            {preview.impacted.map(item => (
              <div key={item.code} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.name}</span>
                <span className="font-mono">
                  {item.oldValue ?? '—'} → <strong>{item.newValue ?? 'Sem base'}</strong>
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
