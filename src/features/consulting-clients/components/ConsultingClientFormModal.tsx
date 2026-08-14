import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { ConsultingModuleSelector } from './ConsultingModuleSelector'
import type { ConsultingClientDraft } from '../types'

export function ConsultingClientFormModal(props: {
  open: boolean
  draft: ConsultingClientDraft
  submitting: boolean
  modules: Array<{ module_key: string; label: string; enabled: boolean; premium?: boolean }>
  onDraft: (draft: ConsultingClientDraft) => void
  onSubmit: () => void
  onClose: () => void
  editing?: boolean
}) {
  const title = props.editing ? 'Editar cliente da consultoria' : 'Novo cliente da consultoria'

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={title}
      size="xl"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={props.onSubmit} disabled={props.submitting}>{props.submitting ? 'Salvando...' : props.editing ? 'Salvar alterações' : 'Criar cliente'}</Button>
        </>
      )}
    >
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <MxField label="Nome"><Input value={props.draft.name} onChange={event => props.onDraft({ ...props.draft, name: event.target.value })} /></MxField>
          <MxField label="Razão social"><Input value={props.draft.legal_name} onChange={event => props.onDraft({ ...props.draft, legal_name: event.target.value })} /></MxField>
          <MxField label="CNPJ"><Input value={props.draft.cnpj} onChange={event => props.onDraft({ ...props.draft, cnpj: event.target.value })} /></MxField>
          <MxField label="Produto"><Input value={props.draft.product_name} onChange={event => props.onDraft({ ...props.draft, product_name: event.target.value })} /></MxField>
          <MxField label="Observações" className="sm:col-span-2"><MxTextarea rows={4} value={props.draft.notes} onChange={event => props.onDraft({ ...props.draft, notes: event.target.value })} /></MxField>
          <div className="sm:col-span-2"><ConsultingModuleSelector modules={props.modules} value={props.draft.enabled_modules} onChange={enabled_modules => props.onDraft({ ...props.draft, enabled_modules })} /></div>
        </div>
    </Modal>
  )
}
