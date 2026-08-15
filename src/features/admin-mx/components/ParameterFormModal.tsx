import { useState } from 'react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { validateThresholds, type CatalogIndicator } from '../indicadores/indicatorCatalog'
import type { IndicatorParameter } from '../indicadores/indicatorCatalog'

export function ParameterFormModal(props: {
  open: boolean
  indicator: CatalogIndicator
  parameter: IndicatorParameter | null
  submitting: boolean
  onSave: (values: {
    target_default: number | null
    market_average: number | null
    best_practice: number | null
    red_threshold: number | null
    yellow_threshold: number | null
    green_threshold: number | null
    notes: string | null
  }) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    target_default: props.parameter?.target_default ?? null,
    market_average: props.parameter?.market_average ?? null,
    best_practice: props.parameter?.best_practice ?? null,
    red_threshold: props.parameter?.red_threshold ?? null,
    yellow_threshold: props.parameter?.yellow_threshold ?? null,
    green_threshold: props.parameter?.green_threshold ?? null,
    notes: props.parameter?.notes ?? '',
  })

  const thresholdProblem = validateThresholds(form, props.indicator.direction)
  const num = (value: string, current: number | null): number | null => (value === '' ? null : Number(value))

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Parâmetros — ${props.indicator.label}`}
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button
            onClick={() => props.onSave({
              target_default: form.target_default,
              market_average: form.market_average,
              best_practice: form.best_practice,
              red_threshold: form.red_threshold,
              yellow_threshold: form.yellow_threshold,
              green_threshold: form.green_threshold,
              notes: form.notes.trim() || null,
            })}
            disabled={props.submitting || Boolean(thresholdProblem)}
          >
            {props.submitting ? 'Salvando...' : 'Salvar parâmetros'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {thresholdProblem ? <MxStatusBanner tone="warning">{thresholdProblem}</MxStatusBanner> : null}
        <p className="text-sm text-muted-foreground">
          Faixas de referência no conjunto ativo de parâmetros. Vazio = não definido para o indicador.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Meta padrão">
            <Input type="number" value={form.target_default === null ? '' : String(form.target_default)} onChange={event => setForm(current => ({ ...current, target_default: num(event.target.value, current.target_default) }))} />
          </MxField>
          <MxField label="Média de mercado">
            <Input type="number" value={form.market_average === null ? '' : String(form.market_average)} onChange={event => setForm(current => ({ ...current, market_average: num(event.target.value, current.market_average) }))} />
          </MxField>
          <MxField label="Melhor prática">
            <Input type="number" value={form.best_practice === null ? '' : String(form.best_practice)} onChange={event => setForm(current => ({ ...current, best_practice: num(event.target.value, current.best_practice) }))} />
          </MxField>
          <MxField label="Faixa vermelha">
            <Input type="number" value={form.red_threshold === null ? '' : String(form.red_threshold)} onChange={event => setForm(current => ({ ...current, red_threshold: num(event.target.value, current.red_threshold) }))} />
          </MxField>
          <MxField label="Faixa amarela">
            <Input type="number" value={form.yellow_threshold === null ? '' : String(form.yellow_threshold)} onChange={event => setForm(current => ({ ...current, yellow_threshold: num(event.target.value, current.yellow_threshold) }))} />
          </MxField>
          <MxField label="Faixa verde">
            <Input type="number" value={form.green_threshold === null ? '' : String(form.green_threshold)} onChange={event => setForm(current => ({ ...current, green_threshold: num(event.target.value, current.green_threshold) }))} />
          </MxField>
          <MxField label="Observações" className="sm:col-span-2">
            <Input value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
          </MxField>
        </div>
      </div>
    </Modal>
  )
}
