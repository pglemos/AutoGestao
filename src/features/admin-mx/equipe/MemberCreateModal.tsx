import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import {
  emptyMemberCreate,
  MEMBER_PROGRAM_OPTIONS,
  MEMBER_ROLE_OPTIONS,
  MEMBER_SITUATION_OPTIONS,
  requiresConsultantProfile,
  validateMemberCreate,
  type MemberCreateDraft,
} from './memberCreate'
import { createTeamMember } from './memberCreateMutations'

export function MemberCreateModal(props: {
  open: boolean
  stores: Array<{ id: string; name: string }>
  onClose: () => void
  onSaved: () => void
}) {
  const { open, stores, onClose, onSaved } = props
  const [draft, setDraft] = useState<MemberCreateDraft>(emptyMemberCreate())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = <K extends keyof MemberCreateDraft>(field: K, value: MemberCreateDraft[K]) =>
    setDraft(current => ({ ...current, [field]: value }))

  const toggleProgram = (programKey: string) => {
    setDraft(current => ({
      ...current,
      enabled_programs: current.enabled_programs.includes(programKey)
        ? current.enabled_programs.filter(key => key !== programKey)
        : [...current.enabled_programs, programKey],
    }))
  }

  const errors = validateMemberCreate(draft)

  const reset = () => {
    setDraft(emptyMemberCreate())
    setError('')
  }

  const submit = async () => {
    if (saving) return
    if (errors.length) {
      setError(errors[0])
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await createTeamMember(draft)
      if (result.error) {
        setError(result.error)
        return
      }
      toast.success(
        result.temporaryPassword
          ? `Membro criado. Senha temporária: ${result.temporaryPassword}`
          : 'Membro da equipe criado.',
      )
      reset()
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (!saving) { reset(); onClose() } }}
      title="Adicionar Membro da Equipe"
      description="Cria um perfil interno MX com papel, situação e programas habilitados."
      size="lg"
      closeOnEscape={!saving}
      footer={(
        <>
          <Button variant="outline" onClick={() => { reset(); onClose() }} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={saving || errors.length > 0}>{saving ? 'Salvando...' : 'Salvar Membro'}</Button>
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Nome completo *">
            <Input value={draft.name} onChange={event => update('name', event.target.value)} />
          </MxField>
          <MxField label="E-mail *">
            <Input type="email" value={draft.email} onChange={event => update('email', event.target.value)} />
          </MxField>
          <MxField label="Telefone">
            <Input value={draft.phone} onChange={event => update('phone', event.target.value)} placeholder="(00) 00000-0000" />
          </MxField>
          <MxField label="Papel interno *">
            <MxSelect aria-label="Papel interno" value={draft.role} onChange={event => update('role', event.target.value as MemberCreateDraft['role'])}>
              {MEMBER_ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Loja principal">
            <MxSelect aria-label="Loja principal" value={draft.store_id} onChange={event => update('store_id', event.target.value)}>
              <option value="">Sem loja</option>
              {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Situação">
            <MxSelect aria-label="Situação" value={draft.situation} onChange={event => update('situation', event.target.value as MemberCreateDraft['situation'])}>
              {MEMBER_SITUATION_OPTIONS.map(situation => <option key={situation.value} value={situation.value}>{situation.label}</option>)}
            </MxSelect>
          </MxField>
        </div>

        {requiresConsultantProfile(draft.role) ? (
          <div className="space-y-3 rounded-lg border border-border bg-surface-alt/40 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <UserPlus size={16} className="text-status-success-text" />
              Programas Habilitados
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {MEMBER_PROGRAM_OPTIONS.map(program => (
                <label key={program.value} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={draft.enabled_programs.includes(program.value)}
                    onChange={() => toggleProgram(program.value)}
                  />
                  {program.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
