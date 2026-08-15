import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect } from '@/components/module/MxModuleVisualPrimitives'
import type { IndicatorInput } from '../hooks/useAdminMxLists'

// Valores aceitos pelos CHECKs de catalogo_metricas_consultoria.
const VALUE_TYPES = [
  { value: 'number', label: 'Número' },
  { value: 'percent', label: 'Percentual' },
  { value: 'currency', label: 'Moeda' },
]

const DIRECTIONS = [
  { value: 'increase', label: 'Maior é melhor' },
  { value: 'decrease', label: 'Menor é melhor' },
]

const SOURCE_SCOPES = [
  { value: 'manual', label: 'Lançamento manual' },
  { value: 'computed', label: 'Calculado' },
  { value: 'sales', label: 'Vendas' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'inventory', label: 'Estoque' },
  { value: 'dre', label: 'DRE' },
  { value: 'daily_tracking', label: 'Acompanhamento diário' },
  { value: 'diagnostic', label: 'Diagnóstico' },
  { value: 'target', label: 'Metas' },
  { value: 'training', label: 'Treinamento' },
]

export function IndicatorFormModal(props: {
  open: boolean
  editing: boolean
  draft: IndicatorInput
  submitting: boolean
  areas: string[]
  onDraft: (draft: IndicatorInput) => void
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.editing ? 'Editar indicador' : 'Novo indicador'}
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={props.onSubmit} disabled={props.submitting}>{props.submitting ? 'Salvando...' : 'Salvar'}</Button>
        </>
      )}
    >
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <MxField label="Chave da métrica" hint="Minúsculas, números e underline.">
          <Input
            value={props.draft.metric_key}
            disabled={props.editing}
            onChange={event => props.onDraft({ ...props.draft, metric_key: event.target.value.trim().toLowerCase() })}
            placeholder="ticket_medio"
          />
        </MxField>
        <MxField label="Nome do indicador">
          <Input value={props.draft.label} onChange={event => props.onDraft({ ...props.draft, label: event.target.value })} placeholder="Ticket médio" />
        </MxField>
        <MxField label="Área">
          <Input list="admin-mx-indicator-areas" value={props.draft.area} onChange={event => props.onDraft({ ...props.draft, area: event.target.value })} />
          <datalist id="admin-mx-indicator-areas">{props.areas.map(area => <option key={area} value={area} />)}</datalist>
        </MxField>
        <MxField label="Tipo de valor">
          <MxSelect aria-label="Tipo de valor" value={props.draft.value_type} onChange={event => props.onDraft({ ...props.draft, value_type: event.target.value })}>
            {VALUE_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Leitura">
          <MxSelect aria-label="Leitura do indicador" value={props.draft.direction} onChange={event => props.onDraft({ ...props.draft, direction: event.target.value })}>
            {DIRECTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Escopo da fonte">
          <MxSelect aria-label="Escopo da fonte" value={props.draft.source_scope} onChange={event => props.onDraft({ ...props.draft, source_scope: event.target.value })}>
            {SOURCE_SCOPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Status">
          <MxSelect aria-label="Status do indicador" value={props.draft.active ? 'ativo' : 'inativo'} onChange={event => props.onDraft({ ...props.draft, active: event.target.value === 'ativo' })}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </MxSelect>
        </MxField>
      </div>
    </Modal>
  )
}
