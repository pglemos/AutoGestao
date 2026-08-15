import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxInput, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { EVIDENCE_TYPES, RESPONSIBLE_ROLES, validateEvidence } from '../methodology'
import { archiveEncounterEvidence, saveEncounterEvidence, type EncounterEvidence } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

export function EvidenceTab(props: {
  evidence: EncounterEvidence[]
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [edit, setEdit] = useState<EncounterEvidence | 'new' | null>(null)

  const remove = async (item: EncounterEvidence) => {
    if (!item.id) return
    if (!confirm(`Remover evidência "${item.name}"?`)) return
    const result = await archiveEncounterEvidence(item.id)
    if (result.error) {
      await props.controller.audit('Evidências', 'EVIDENCE_REMOVE', '', item.name)
      return
    }
    await props.controller.audit('Evidências', 'EVIDENCE_REMOVE', '', item.name)
    await props.onSaved()
  }

  return (
    <div className="space-y-3 rounded-xl border border-border p-5">
      <Button size="sm" onClick={() => setEdit('new')}><Plus size={16} />Adicionar Evidência</Button>
      {props.evidence.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Nenhum requisito de evidência cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {props.evidence.map(item => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-status-info-surface px-2 py-0.5 text-xs font-medium text-status-info-text">{EVIDENCE_TYPES[item.evidence_type] ?? item.evidence_type}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.required ? 'Obrigatória' : 'Opcional'} · {item.recommended_responsible_role || '—'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEdit(item)}><Pencil size={16} />Editar</Button>
                <Button variant="ghost" size="sm" onClick={() => void remove(item)} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edit !== null && (
        <EvidenceFormModal
          evidence={edit === 'new' ? null : edit}
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

function EvidenceFormModal(props: {
  evidence: EncounterEvidence | null
  versionId: string
  visitNumber: number
  onClose: () => void
  onSaved: () => void
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState({
    name: props.evidence?.name ?? '',
    description: props.evidence?.description ?? '',
    required: props.evidence?.required ?? true,
    evidence_type: props.evidence?.evidence_type ?? 'ARQUIVO',
    recommended_responsible_role: props.evidence?.recommended_responsible_role ?? '',
    recommended_validator_role: props.evidence?.recommended_validator_role ?? '',
    deadline_offset_days: props.evidence?.deadline_offset_days ?? 0,
    file_limit: props.evidence?.file_limit ?? 1,
    allowed_formats: props.evidence?.allowed_formats ?? '',
    client_guidance: props.evidence?.client_guidance ?? '',
    display_order: props.evidence?.display_order ?? 1,
    status: props.evidence?.status ?? 'rascunho',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string | number | boolean) => setForm(current => ({ ...current, [field]: value }))

  const save = async () => {
    const invalid = validateEvidence(form.name, form.description)
    if (invalid) {
      setError(invalid)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const result = await saveEncounterEvidence({
        id: props.evidence?.id,
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        name: form.name,
        description: form.description,
        required: form.required,
        evidence_type: form.evidence_type,
        recommended_responsible_role: form.recommended_responsible_role || null,
        recommended_validator_role: form.recommended_validator_role || null,
        deadline_offset_days: form.deadline_offset_days,
        file_limit: form.file_limit,
        allowed_formats: form.allowed_formats || null,
        client_guidance: form.client_guidance || null,
        display_order: form.display_order,
        status: form.status as EncounterEvidence['status'],
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await props.controller.audit('Evidências', props.evidence ? 'EVIDENCE_UPDATE' : 'EVIDENCE_ADD', form.name)
      props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={props.onClose} title={props.evidence ? 'Editar Evidência' : 'Adicionar Evidência'} size="lg" footer={(
      <>
        <Button variant="outline" onClick={props.onClose} disabled={saving}>Cancelar</Button>
        <Button onClick={() => void save()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
      </>
    )}>
      <div className="space-y-3">
        {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
        <MxField label="Nome *"><MxInput value={form.name} onChange={event => update('name', event.target.value)} /></MxField>
        <MxField label="Descrição *"><MxTextarea rows={2} value={form.description} onChange={event => update('description', event.target.value)} /></MxField>
        <div className="grid grid-cols-2 gap-3">
          <MxField label="Tipo de evidência">
            <MxSelect aria-label="Tipo de evidência" value={form.evidence_type} onChange={event => update('evidence_type', event.target.value)}>
              {Object.entries(EVIDENCE_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Responsável recomendado">
            <MxSelect aria-label="Responsável recomendado" value={form.recommended_responsible_role} onChange={event => update('recommended_responsible_role', event.target.value)}>
              <option value="">—</option>
              {RESPONSIBLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </MxSelect>
          </MxField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MxField label="Validador recomendado">
            <MxSelect aria-label="Validador recomendado" value={form.recommended_validator_role} onChange={event => update('recommended_validator_role', event.target.value)}>
              <option value="">—</option>
              {RESPONSIBLE_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Prazo relativo (dias)">
            <MxInput type="number" value={form.deadline_offset_days} onChange={event => update('deadline_offset_days', Number(event.target.value))} />
          </MxField>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MxField label="Limite de arquivos">
            <MxInput type="number" min={0} value={form.file_limit} onChange={event => update('file_limit', Number(event.target.value))} />
          </MxField>
          <MxField label="Formatos permitidos">
            <MxInput value={form.allowed_formats} onChange={event => update('allowed_formats', event.target.value)} placeholder="PDF, JPG, XLSX" />
          </MxField>
        </div>
        <MxField label="Orientação ao cliente"><MxTextarea rows={2} value={form.client_guidance} onChange={event => update('client_guidance', event.target.value)} /></MxField>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.required} onChange={event => update('required', event.target.checked)} className="h-4 w-4 accent-brand-primary" />
          <span className="text-sm text-foreground">Obrigatória</span>
        </label>
      </div>
    </Modal>
  )
}
