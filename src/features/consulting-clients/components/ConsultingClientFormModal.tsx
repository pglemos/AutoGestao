import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
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
  if (!props.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay/50 p-4" role="dialog" aria-modal="true" aria-labelledby="consulting-client-modal-title" onMouseDown={event => { if (event.currentTarget === event.target) props.onClose() }}>
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <h2 id="consulting-client-modal-title" className="text-xl font-bold text-foreground">{props.editing ? 'Editar cliente da consultoria' : 'Novo cliente da consultoria'}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <MxField label="Nome"><Input value={props.draft.name} onChange={event => props.onDraft({ ...props.draft, name: event.target.value })} /></MxField>
          <MxField label="Razão social"><Input value={props.draft.legal_name} onChange={event => props.onDraft({ ...props.draft, legal_name: event.target.value })} /></MxField>
          <MxField label="CNPJ"><Input value={props.draft.cnpj} onChange={event => props.onDraft({ ...props.draft, cnpj: event.target.value })} /></MxField>
          <MxField label="Produto"><Input value={props.draft.product_name} onChange={event => props.onDraft({ ...props.draft, product_name: event.target.value })} /></MxField>
          <MxField label="Observações" className="sm:col-span-2"><MxTextarea rows={4} value={props.draft.notes} onChange={event => props.onDraft({ ...props.draft, notes: event.target.value })} /></MxField>
          <div className="sm:col-span-2"><ConsultingModuleSelector modules={props.modules} value={props.draft.enabled_modules} onChange={enabled_modules => props.onDraft({ ...props.draft, enabled_modules })} /></div>
        </div>
        <div className="mt-6 flex justify-end gap-2"><Button variant="secondary" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button><Button onClick={props.onSubmit} disabled={props.submitting}>{props.submitting ? 'Salvando...' : props.editing ? 'Salvar alterações' : 'Criar cliente'}</Button></div>
      </section>
    </div>
  )
}
