import { useState } from 'react'
import { Check, Save } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxField, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { PARTICIPANT_ROLES, toggleRole } from '../methodology'
import { saveEncounterContent, type EncounterContent } from '../consultoriaMxData'
import type { ConsultoriaMxController } from '../useConsultoriaMx'

export function ObjectiveTab(props: {
  content: EncounterContent | null
  versionId: string
  visitNumber: number
  onSaved: () => Promise<void>
  controller: ConsultoriaMxController
}) {
  const [form, setForm] = useState({
    objective: props.content?.objective ?? '',
    reason: props.content?.reason ?? '',
    expected_result: props.content?.expected_result ?? '',
    required_participant_roles: props.content?.required_participant_roles ?? '',
    recommended_participant_roles: props.content?.recommended_participant_roles ?? '',
    prerequisites: props.content?.prerequisites ?? '',
    client_observation: props.content?.client_observation ?? '',
    owner_visibility: props.content?.owner_visibility ?? true,
    can_be_anticipated: props.content?.can_be_anticipated ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: string, value: string | boolean) => {
    setForm(current => ({ ...current, [field]: value }))
    setSaved(false)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const result = await saveEncounterContent({
        methodology_version_id: props.versionId,
        visit_number: props.visitNumber,
        objective: form.objective,
        reason: form.reason,
        expected_result: form.expected_result,
        required_participant_roles: form.required_participant_roles,
        recommended_participant_roles: form.recommended_participant_roles,
        prerequisites: form.prerequisites,
        client_observation: form.client_observation,
        owner_visibility: form.owner_visibility,
        can_be_anticipated: form.can_be_anticipated,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      await props.controller.audit('Objetivo', props.content?.id ? 'OBJECTIVE_UPDATE' : 'OBJECTIVE_CREATE', `Encontro ${props.visitNumber}`)
      await props.onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border p-5">
      {error && <MxStatusBanner tone="danger">{error}</MxStatusBanner>}
      <MxField label="Objetivo do Encontro *">
        <MxTextarea rows={2} value={form.objective} onChange={event => update('objective', event.target.value)} placeholder="Qual o objetivo deste encontro?" />
      </MxField>
      <MxField label="Por que este encontro existe *">
        <MxTextarea rows={2} value={form.reason} onChange={event => update('reason', event.target.value)} placeholder="A justificativa da existência deste encontro" />
      </MxField>
      <MxField label="Resultado esperado *">
        <MxTextarea rows={2} value={form.expected_result} onChange={event => update('expected_result', event.target.value)} placeholder="O que se espera alcançar ao final" />
      </MxField>

      <RoleToggleGroup label="Participantes obrigatórios" roles={form.required_participant_roles} activeTone="brand" onToggle={role => update('required_participant_roles', toggleRole(form.required_participant_roles, role))} />
      <RoleToggleGroup label="Participantes recomendados" roles={form.recommended_participant_roles} activeTone="info" onToggle={role => update('recommended_participant_roles', toggleRole(form.recommended_participant_roles, role))} />

      <MxField label="Pré-requisitos">
        <MxTextarea rows={2} value={form.prerequisites} onChange={event => update('prerequisites', event.target.value)} placeholder="O que deve estar pronto antes deste encontro" />
      </MxField>
      <MxField label="Observação ao cliente">
        <MxTextarea rows={2} value={form.client_observation} onChange={event => update('client_observation', event.target.value)} placeholder="Texto que será exibido ao cliente" />
      </MxField>

      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.owner_visibility} onChange={event => update('owner_visibility', event.target.checked)} className="h-4 w-4 accent-brand-primary" />
          <span className="text-sm text-foreground">Visível no Módulo Dono</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={form.can_be_anticipated} onChange={event => update('can_be_anticipated', event.target.checked)} className="h-4 w-4 accent-brand-primary" />
          <span className="text-sm text-foreground">Pode ser antecipado</span>
        </label>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4">
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? 'Salvando...' : saved ? <><Check size={16} />Salvo</> : <><Save size={16} />Salvar</>}
        </Button>
        {saved && <span className="text-xs text-status-success-text">Conteúdo salvo.</span>}
      </div>
    </div>
  )
}

function RoleToggleGroup(props: {
  label: string
  roles: string
  activeTone: 'brand' | 'info'
  onToggle: (role: string) => void
}) {
  const current = props.roles.split(',').map(part => part.trim()).filter(Boolean)
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-foreground">{props.label}</div>
      <div className="flex flex-wrap gap-1.5">
        {PARTICIPANT_ROLES.map(role => {
          const active = current.includes(role)
          const activeClass = props.activeTone === 'brand'
            ? 'bg-brand-primary text-white border-brand-primary'
            : 'bg-status-info-surface text-status-info-text border-status-info/30'
          return (
            <button
              key={role}
              onClick={() => props.onToggle(role)}
              className={`rounded-full border px-2.5 py-1 text-xs transition-all ${active ? activeClass : 'border-border text-muted-foreground hover:bg-surface-alt'}`}
            >
              {role}
            </button>
          )
        })}
      </div>
    </div>
  )
}
