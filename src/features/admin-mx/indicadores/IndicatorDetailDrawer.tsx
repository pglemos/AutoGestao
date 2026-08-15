import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import {
  INDICATOR_FREQUENCY_LABEL,
  INDICATOR_STATUS_LABEL,
  allowedIndicatorTransitions,
  isUsableIndicator,
  type CatalogIndicator,
  type IndicatorStatus,
} from './indicatorCatalog'

export function IndicatorDetailDrawer(props: {
  indicator: CatalogIndicator | null
  busy: boolean
  onTransition: (status: IndicatorStatus) => void
  onToggleVisibility: (visible: boolean) => void
  onEdit: () => void
  onClose: () => void
}) {
  const { indicator } = props
  if (!indicator) return null

  return (
    <Modal
      open
      onClose={props.onClose}
      title={`${indicator.label} — ${INDICATOR_STATUS_LABEL[indicator.status]}`}
      size="lg"
      closeOnEscape={!props.busy}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.busy}>Fechar</Button>
          <Button variant="outline" onClick={props.onEdit} disabled={props.busy}>Editar</Button>
          {allowedIndicatorTransitions(indicator.status).map(status => (
            <Button key={status} variant={status === 'publicado' ? 'primary' : 'outline'} onClick={() => props.onTransition(status)} disabled={props.busy}>
              {INDICATOR_STATUS_LABEL[status]}
            </Button>
          ))}
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {isUsableIndicator(indicator)
          ? <MxStatusBanner tone="success">Indicador disponível para planos estratégicos e para o Módulo Dono.</MxStatusBanner>
          : <MxStatusBanner tone="warning">Só indicador publicado entra em plano estratégico e no Módulo Dono.</MxStatusBanner>}

        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ['Chave', indicator.metric_key],
            ['Área', indicator.area],
            ['Tipo de valor', indicator.value_type],
            ['Leitura', indicator.direction === 'increase' ? 'Maior é melhor' : 'Menor é melhor'],
            ['Escopo da fonte', indicator.source_scope],
            ['Frequência', INDICATOR_FREQUENCY_LABEL[indicator.frequencia]],
            ['Casas decimais', String(indicator.casas_decimais)],
            ['Vigência', `${indicator.ano_inicial ?? '—'} a ${indicator.ano_final ?? 'sem fim'}`],
            ['Metas cadastradas', String(indicator.targets)],
            ['Ordem oficial', String(indicator.sort_order)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-semibold text-foreground">{value}</dd>
            </div>
          ))}
        </dl>

        {indicator.descricao ? (
          <div className="rounded-lg border border-border p-3">
            <div className="text-xs text-muted-foreground">Descrição</div>
            <p className="text-sm text-foreground">{indicator.descricao}</p>
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={indicator.visivel_dono}
            disabled={props.busy}
            onChange={event => props.onToggleVisibility(event.target.checked)}
          />
          <span>Visível no Módulo Dono</span>
        </label>
      </div>
    </Modal>
  )
}
