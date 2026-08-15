import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import type { ActionPlanTemplate } from './actionPlanTemplates'

export function ApplyTemplateModal(props: {
  open: boolean
  template: ActionPlanTemplate | null
  stores: Array<{ id: string; name: string }>
  storeId: string
  submitting: boolean
  onStore: (storeId: string) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const published = props.template?.versions.find(version => version.status === 'publicada') ?? null

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Aplicar template${props.template ? ` — ${props.template.nome}` : ''}`}
      size="md"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={props.onSubmit} disabled={props.submitting || !published || !props.storeId}>
            {props.submitting ? 'Aplicando...' : 'Aplicar na loja'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {published
          ? <MxStatusBanner tone="info">{`Versão ${published.versao} (publicada) será materializada como planos de ação da loja.`}</MxStatusBanner>
          : <MxStatusBanner tone="warning">Este template ainda não tem versão publicada.</MxStatusBanner>}
        <MxField label="Loja de destino">
          <MxSelect value={props.storeId} onChange={event => props.onStore(event.target.value)}>
            <option value="">Selecione a loja</option>
            {props.stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
          </MxSelect>
        </MxField>
      </div>
    </Modal>
  )
}
