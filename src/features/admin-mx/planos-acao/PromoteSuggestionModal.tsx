import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { suggestionPriorityToPlanPriority, type ActionPlanSuggestion } from './actionPlanSuggestions'

export function PromoteSuggestionModal(props: {
  open: boolean
  suggestion: ActionPlanSuggestion | null
  departamento: string
  indicador: string
  prazo: string
  submitting: boolean
  onDepartamento: (value: string) => void
  onIndicador: (value: string) => void
  onPrazo: (value: string) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const suggestion = props.suggestion

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Transformar sugestão em plano de ação"
      size="lg"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={props.onSubmit} disabled={props.submitting || !suggestion}>{props.submitting ? 'Criando...' : 'Criar plano'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {suggestion ? (
          <>
            <MxStatusBanner tone="info">
              {`Prioridade ${suggestionPriorityToPlanPriority(suggestion.priority)} · regra ${suggestion.rule_code ?? 'não identificada'}`}
            </MxStatusBanner>
            <div className="space-y-2 rounded-lg border border-border p-4 text-sm">
              <p><span className="font-semibold text-foreground">Problema:</span> {suggestion.problem || '—'}</p>
              <p><span className="font-semibold text-foreground">Recomendação:</span> {suggestion.recommendation || '—'}</p>
              {suggestion.rationale ? <p className="text-muted-foreground">{suggestion.rationale}</p> : null}
            </div>
          </>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Departamento"><Input value={props.departamento} onChange={event => props.onDepartamento(event.target.value)} /></MxField>
          <MxField label="Indicador"><Input value={props.indicador} onChange={event => props.onIndicador(event.target.value)} /></MxField>
          <MxField label="Prazo"><Input type="date" value={props.prazo} onChange={event => props.onPrazo(event.target.value)} /></MxField>
        </div>
      </div>
    </Modal>
  )
}
