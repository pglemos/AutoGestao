import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { emptyTemplateItem, validateTemplateDraft, type ActionPlanTemplateItem, type TemplateDraft, type TemplateItemPriority } from './actionPlanTemplates'

const PRIORITIES: Array<{ value: TemplateItemPriority; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

export function TemplateFormModal(props: {
  open: boolean
  editing: boolean
  draft: TemplateDraft
  submitting: boolean
  onDraft: (draft: TemplateDraft) => void
  onSubmit: () => void
  onClose: () => void
}) {
  const errors = validateTemplateDraft(props.draft)
  const patchItem = (index: number, values: Partial<ActionPlanTemplateItem>) => {
    props.onDraft({ ...props.draft, items: props.draft.items.map((item, position) => (position === index ? { ...item, ...values } : item)) })
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={props.editing ? 'Editar template de plano de ação' : 'Novo template de plano de ação'}
      size="xl"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          <Button onClick={props.onSubmit} disabled={props.submitting || errors.length > 0}>
            {props.submitting ? 'Salvando...' : 'Salvar rascunho'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {errors.length ? <MxStatusBanner tone="warning">{errors[0]}</MxStatusBanner> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Chave do template" hint="Minúsculas, números e underline.">
            <Input value={props.draft.template_key} disabled={props.editing} onChange={event => props.onDraft({ ...props.draft, template_key: event.target.value.trim().toLowerCase() })} placeholder="ruptura_estoque" />
          </MxField>
          <MxField label="Nome"><Input value={props.draft.nome} onChange={event => props.onDraft({ ...props.draft, nome: event.target.value })} /></MxField>
          <MxField label="Departamento"><Input value={props.draft.departamento} onChange={event => props.onDraft({ ...props.draft, departamento: event.target.value })} /></MxField>
          <MxField label="Indicador"><Input value={props.draft.indicador} onChange={event => props.onDraft({ ...props.draft, indicador: event.target.value })} /></MxField>
          <MxField label="Produto (opcional)"><Input value={props.draft.program_key} onChange={event => props.onDraft({ ...props.draft, program_key: event.target.value })} placeholder="pmr_online" /></MxField>
          <MxField label="Status">
            <MxSelect value={props.draft.active ? 'ativo' : 'inativo'} onChange={event => props.onDraft({ ...props.draft, active: event.target.value === 'ativo' })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </MxSelect>
          </MxField>
          <MxField label="Descrição" className="sm:col-span-2">
            <MxTextarea rows={2} value={props.draft.descricao} onChange={event => props.onDraft({ ...props.draft, descricao: event.target.value })} />
          </MxField>
        </div>

        <div className="space-y-3">
          {props.draft.items.map((item, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Item {index + 1}</span>
                {props.draft.items.length > 1 ? (
                  <Button variant="outline" size="sm" aria-label={`Remover item ${index + 1}`} onClick={() => props.onDraft({ ...props.draft, items: props.draft.items.filter((_, position) => position !== index) })}>
                    <Trash2 size={16} />
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MxField label="Problema"><Input value={item.problema} onChange={event => patchItem(index, { problema: event.target.value })} /></MxField>
                <MxField label="Ação"><Input value={item.acao} onChange={event => patchItem(index, { acao: event.target.value })} /></MxField>
                <MxField label="Como" className="sm:col-span-2"><MxTextarea rows={2} value={item.como} onChange={event => patchItem(index, { como: event.target.value })} /></MxField>
                <MxField label="Prioridade">
                  <MxSelect value={item.prioridade} onChange={event => patchItem(index, { prioridade: event.target.value as TemplateItemPriority })}>
                    {PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
                  </MxSelect>
                </MxField>
                <MxField label="Prazo (dias)">
                  <Input
                    type="number"
                    min={0}
                    value={item.prazo_dias === null ? '' : String(item.prazo_dias)}
                    onChange={event => patchItem(index, { prazo_dias: event.target.value === '' ? null : Number(event.target.value) })}
                  />
                </MxField>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" checked={item.evidencia_requerida} onChange={event => patchItem(index, { evidencia_requerida: event.target.checked })} />
                  <span>Exige evidência na conclusão</span>
                </label>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={() => props.onDraft({ ...props.draft, items: [...props.draft.items, emptyTemplateItem(props.draft.items.length + 1)] })}>
            <Plus size={16} />Adicionar item
          </Button>
        </div>
      </div>
    </Modal>
  )
}
