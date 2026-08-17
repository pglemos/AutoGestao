import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import {
  emptyMemberCreate,
  MEMBER_ROLE_OPTIONS,
  MEMBER_SITUATION_OPTIONS,
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

  const update = (field: keyof MemberCreateDraft, value: string) => setDraft(current => ({ ...current, [field]: value }))
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
      toast.success('Membro da equipe criado.')
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
      description="Cria um perfil interno MX com papel e situação iniciais."
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
            <MxSelect aria-label="Papel interno" value={draft.role} onChange={event => update('role', event.target.value)}>
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
            <MxSelect aria-label="Situação" value={draft.situation} onChange={event => update('situation', event.target.value)}>
              {MEMBER_SITUATION_OPTIONS.map(situation => <option key={situation.value} value={situation.value}>{situation.label}</option>)}
            </MxSelect>
          </MxField>
        </div>
        {draft.role === 'consultor_mx' ? (
          <div className="flex items-center gap-2 rounded-lg bg-surface-alt p-3 text-sm text-muted-foreground">
            <UserPlus size={16} className="shrink-0 text-status-success-text" />
            Consultores MX ganham perfil de consultor com a situação escolhida.
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
