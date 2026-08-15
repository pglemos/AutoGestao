import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect } from '@/components/module/MxModuleVisualPrimitives'
import type { ConsultingProductInput } from '../hooks/useAdminMxLists'

export function ConsultingProductFormModal(props: {
  open: boolean
  editing: boolean
  draft: ConsultingProductInput
  submitting: boolean
  onDraft: (draft: ConsultingProductInput) => void
  onSubmit: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.editing ? 'Editar produto de consultoria' : 'Novo produto de consultoria'}
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
        <MxField label="Chave do programa" hint="Identificador usado pelos clientes e pela jornada.">
          <Input
            value={props.draft.program_key}
            disabled={props.editing}
            onChange={event => props.onDraft({ ...props.draft, program_key: event.target.value.trim().toLowerCase() })}
            placeholder="pmr_online"
          />
        </MxField>
        <MxField label="Nome do produto">
          <Input value={props.draft.name} onChange={event => props.onDraft({ ...props.draft, name: event.target.value })} placeholder="PMR Online" />
        </MxField>
        <MxField label="Encontros da jornada">
          <Input
            type="number"
            min={1}
            value={String(props.draft.total_visits)}
            onChange={event => props.onDraft({ ...props.draft, total_visits: Number(event.target.value) })}
          />
        </MxField>
        <MxField label="Status">
          <MxSelect aria-label="Status do produto" value={props.draft.active ? 'ativo' : 'inativo'} onChange={event => props.onDraft({ ...props.draft, active: event.target.value === 'ativo' })}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </MxSelect>
        </MxField>
      </div>
    </Modal>
  )
}
