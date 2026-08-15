import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { validateProductDraft, type ProductDraft } from './consultingProducts'

const MODALIDADES = ['presencial', 'online', 'hibrido']

export function ConsultingProductFormModal(props: {
  open: boolean
  editing: boolean
  draft: ProductDraft
  submitting: boolean
  onDraft: (draft: ProductDraft) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const error = validateProductDraft(props.draft)
  const numberOrNull = (value: string) => (value === '' ? null : Number(value))

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
          <Button onClick={props.onSubmit} disabled={props.submitting || Boolean(error)}>{props.submitting ? 'Salvando...' : 'Salvar'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        {error ? <MxStatusBanner tone="warning">{error}</MxStatusBanner> : null}
        {props.editing ? null : <MxStatusBanner tone="info">O produto nasce como rascunho e só fica disponível para venda depois de publicado.</MxStatusBanner>}

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Chave do programa" hint="Minúsculas, números e underline.">
            <Input value={props.draft.program_key} disabled={props.editing} onChange={event => props.onDraft({ ...props.draft, program_key: event.target.value.trim().toLowerCase() })} placeholder="pmr_online" />
          </MxField>
          <MxField label="Nome do produto">
            <Input value={props.draft.name} onChange={event => props.onDraft({ ...props.draft, name: event.target.value })} placeholder="PMR Online" />
          </MxField>
          <MxField label="Modalidade">
            <MxSelect aria-label="Modalidade do produto" value={props.draft.modalidade} onChange={event => props.onDraft({ ...props.draft, modalidade: event.target.value })}>
              <option value="">Não definida</option>
              {MODALIDADES.map(item => <option key={item} value={item}>{item}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Encontros da jornada">
            <Input type="number" min={1} value={String(props.draft.total_visits)} onChange={event => props.onDraft({ ...props.draft, total_visits: Number(event.target.value) })} />
          </MxField>
          <MxField label="Mínimo de presenciais">
            <Input type="number" min={0} value={props.draft.min_presenciais === null ? '' : String(props.draft.min_presenciais)} onChange={event => props.onDraft({ ...props.draft, min_presenciais: numberOrNull(event.target.value) })} />
          </MxField>
          <MxField label="Máximo de presenciais">
            <Input type="number" min={0} value={props.draft.max_presenciais === null ? '' : String(props.draft.max_presenciais)} onChange={event => props.onDraft({ ...props.draft, max_presenciais: numberOrNull(event.target.value) })} />
          </MxField>
          <MxField label="Descrição" className="sm:col-span-2">
            <MxTextarea rows={2} value={props.draft.descricao} onChange={event => props.onDraft({ ...props.draft, descricao: event.target.value })} />
          </MxField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={props.draft.usa_plano_estrategico} onChange={event => props.onDraft({ ...props.draft, usa_plano_estrategico: event.target.checked })} />
            <span>Este produto utiliza Plano Estratégico</span>
          </label>
        </div>
      </div>
    </Modal>
  )
}
