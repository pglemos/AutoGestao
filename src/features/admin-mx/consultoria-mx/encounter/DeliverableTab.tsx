import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { DELIVERY_MOMENTS, RESPONSIBLE_ROLES, validateDeliverable } from '../methodology'
import { archiveEncounterDeliverable, saveEncounterDeliverable, type EncounterDeliverable } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

export function DeliverableTab(props: {
  deliverables: EncounterDeliverable[]
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [edit, setEdit] = useState<EncounterDeliverable | 'new' | null>(null)

  const remove = async (deliverable: EncounterDeliverable) => {
    if (!deliverable.id) return
    if (!confirm(`Remover entrega "${deliverable.title}"?`)) return
    const result = await archiveEncounterDeliverable(deliverable.id)
    if (result.error) {
      await props.controller.audit('Entrega', 'DELIVERABLE_REMOVE', '', deliverable.title)
      return
    }
    await props.controller.audit('Entrega', 'DELIVERABLE_REMOVE', '', deliverable.title)
    await props.onSaved()
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <Button size="sm" onClick={() => setEdit('new')}><Plus size={16} />Adicionar Entrega</Button>
      {props.deliverables.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhuma entrega cadastrada. Será transformada em entrega real na jornada do cliente.</p>
      ) : (
        <div className="space-y-2">
          {props.deliverables.map(deliverable => (
            <div key={deliverable.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-status-info-surface px-2 py-0.5 text-xs font-medium text-status-info-text">{DELIVERY_MOMENTS[deliverable.delivery_moment] ?? deliverable.delivery_moment}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">{deliverable.title}</div>
                  <div className="text-xs text-muted-foreground">{deliverable.required ? 'Obrigatória' : 'Opcional'} · {deliverable.recommended_responsible_role || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEdit(deliverable)}><Pencil size={16} />Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(deliverable)} aria-label={`Remover ${deliverable.title}`}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit !== null && (
        <DeliverableFormModal
          deliverable={edit === 'new' ? null : edit}
          versionId={props.versionId}
          visitNumber={props.visitNumber}
          onClose={() => setEdit(null)}
          onSaved={() => { setEdit(null); void props.onSaved() }}
          controller={props.controller}
        />
      )}
    </div>
  )
}

function DeliverableFormModal(props: {
  deliverable: EncounterDeliverable | null
  versionId: string
  visitNumber: number
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState({
    title: props.deliverable?.title ?? '',
    description: props.deliverable?.description ?? '',
    execution_instruction: props.deliverable?.execution_instruction ?? '',
    required: props.deliverable?.required ?? true,
    recommended_responsible_role: props.deliverable?.recommended_responsible_role ?? '',
    deadline_offset_days: props.deliverable?.deadline_offset_days ?? 0,
    delivery_moment: props.deliverable?.delivery_moment ?? 'DURANTE',
    file_allowed: props.deliverable?.file_allowed ?? false,
    file_required: props.deliverable?.file_required ?? false,
    confirmation_required: props.deliverable?.confirmation_required ?? false,
    display_order: props.deliverable?.display_order ?? 1,
    status: props.deliverable?.status ?? 'rascunho',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string | number | boolean) => setForm(current => ({ ...current, [field]: value }))

  const save = async () => {
    const invalid = validateDeliverable(form.title, form.description)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await saveEncounterDeliverable({
        id: props.deliverable?.id,
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        title: form.title,
        description: form.description,
        execution_instruction: form.execution_instruction,
        required: form.required,
        recommended_responsible_role: form.recommended_responsible_role || null,
        deadline_offset_days: form.deadline_offset_days,
        delivery_moment: form.delivery_moment as EncounterDeliverable['delivery_moment'],
        file_allowed: form.file_allowed,
        file_required: form.file_required,
        confirmation_required: form.confirmation_required,
        display_order: form.display_order,
        status: form.status as EncounterDeliverable['status'],
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Entrega', props.deliverable ? 'DELIVERABLE_UPDATE' : 'DELIVERABLE_ADD', form.title)
      props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={props.onClose} title={props.deliverable ? 'Editar Entrega' : 'Adicionar Entrega'} size="lg" footer={(
      <>
        <Button variant="outline" onClick={props.onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </>
    )}>
      <div className="space-y-3">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        <MxField label="Título *"><MxInput value={form.title} onChange={event => update('title', event.target.value)} /></MxField>
        <MxField label="Descrição *"><MxTextarea rows={2} value={form.description} onChange={event => update('description', event.target.value)} /></MxField>
        <MxField label="Instrução de execução"><MxTextarea rows={2} value={form.execution_instruction} onChange={event => update('execution_instruction', event.target.value)} /></MxField>
        <div className="grid grid-cols-2 gap-3">
          <MxField label="Momento">
            <MxSelect aria-label="Momento da entrega" value={form.delivery_moment} onChange={event => update('delivery_moment', event.target.value)}>
              {Object.entries(DELIVERY_MOMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Responsável recomendado">
            <MxSelect aria-label="Responsável recomendado" value={form.recommended_responsible_role} onChange={event => update('recommended_responsible_role', event.target.value)}>
              <option value="">—</option>
              {RESPONSIBLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </MxSelect>
          </MxField>
        </div>
        <MxField label="Prazo relativo (dias)">
          <MxInput type="number" value={form.deadline_offset_days} onChange={event => update('deadline_offset_days', Number(event.target.value))} />
          <span className="mt-1 block text-xs text-muted-foreground">Negativo = antes do encontro, 0 = no mesmo dia, positivo = depois</span>
        </MxField>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={form.required} onChange={event => update('required', event.target.checked)} className="h-4 w-4 accent-brand-primary" /><span className="text-sm text-foreground">Obrigatória</span></label>
          <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={form.file_allowed} onChange={event => update('file_allowed', event.target.checked)} className="h-4 w-4 accent-brand-primary" /><span className="text-sm text-foreground">Arquivo permitido</span></label>
          <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={form.file_required} onChange={event => update('file_required', event.target.checked)} className="h-4 w-4 accent-brand-primary" /><span className="text-sm text-foreground">Arquivo obrigatório</span></label>
          <label className="flex cursor-pointer items-center gap-1.5"><input type="checkbox" checked={form.confirmation_required} onChange={event => update('confirmation_required', event.target.checked)} className="h-4 w-4 accent-brand-primary" /><span className="text-sm text-foreground">Confirmação necessária</span></label>
        </div>
      </div>
    </Modal>
  )
}
