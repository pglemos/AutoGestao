import { useState } from 'react'
import { Clock, Plus, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { todayIso, USER_STATUS_OPTIONS, USER_STATUS_LABELS, validateDelegation, type ManagerDelegationDraft } from './userEdit'
import { createDelegation, endDelegation, saveUserAccess, type AvailableStore } from './userEditMutations'

export function UserAccessTab(props: {
  userId: string
  form: { status: string; activated_at: string }
  delegations: ManagerDelegationDraft[]
  stores: AvailableStore[]
  onDelegations: (delegations: ManagerDelegationDraft[]) => void
  onStatus: (status: string) => void
}) {
  const { userId, form, delegations, stores, onDelegations, onStatus } = props
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleg, setShowDeleg] = useState(false)
  const [delegForm, setDelegForm] = useState({ store_id: '', access_level: '', valid_from: '', valid_until: '', reason: '' })

  const activeDelegations = delegations.filter(d => d.status === 'ATIVO')

  const saveStatus = async (newStatus: string) => {
    setSaving(true)
    setError('')
    try {
      const result = await saveUserAccess(userId, newStatus, '')
      if (result.error) {
        setError(result.error)
        return
      }
      onStatus(newStatus)
      toast.success(`Situação alterada para ${USER_STATUS_LABELS[newStatus as keyof typeof USER_STATUS_LABELS] ?? newStatus}.`)
    } finally {
      setSaving(false)
    }
  }

  const createDeleg = async () => {
    const store = stores.find(s => s.id === delegForm.store_id)
    const draft: ManagerDelegationDraft = {
      store_id: delegForm.store_id,
      store_name: store?.name ?? '',
      access_level: delegForm.access_level,
      valid_from: delegForm.valid_from,
      valid_until: delegForm.valid_until,
      reason: delegForm.reason,
      authorized_by: 'Administrador MX',
      status: 'ATIVO',
    }
    const errors = validateDelegation(draft)
    if (errors.length) {
      setError(errors[0])
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await createDelegation(userId, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      onDelegations([...delegations, { ...draft, valid_from: draft.valid_from || todayIso() }])
      toast.success('Delegação criada.')
      setDelegForm({ store_id: '', access_level: '', valid_from: '', valid_until: '', reason: '' })
      setShowDeleg(false)
    } finally {
      setSaving(false)
    }
  }

  const endDeleg = async (delegation: ManagerDelegationDraft) => {
    if (!delegation.id) return
    setSaving(true)
    setError('')
    try {
      const result = await endDelegation(delegation.id)
      if (result.error) {
        setError(result.error)
        return
      }
      onDelegations(delegations.map(d => d.id === delegation.id ? { ...d, status: 'ENCERRADO' as const } : d))
      toast.success('Delegação encerrada.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <MxField label="Situação do usuário">
          <MxSelect
            aria-label="Situação do usuário"
            value={form.status}
            onChange={event => {
              const value = event.target.value
              if (value === form.status) return
              if (value === 'DESATIVADO' && !window.confirm('Esta ação encerrará os acessos futuros, mas preservará todo o histórico do usuário.')) return
              void saveStatus(value)
            }}
          >
            {USER_STATUS_OPTIONS.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
          </MxSelect>
        </MxField>
      </div>

      <div className="flex flex-wrap gap-2">
        {form.status === 'ATIVO' ? (
          <Button variant="outline" size="sm" disabled={saving} onClick={() => void saveStatus('SUSPENSO')}>Suspender acesso</Button>
        ) : null}
        {(form.status === 'SUSPENSO' || form.status === 'AFASTADO' || form.status === 'FERIAS') ? (
          <Button variant="outline" size="sm" disabled={saving} onClick={() => void saveStatus('ATIVO')}>Reativar acesso</Button>
        ) : null}
        {form.status !== 'DESATIVADO' ? (
          <Button variant="outline" size="sm" disabled={saving} onClick={() => {
            if (window.confirm('Esta ação encerrará os acessos futuros, mas preservará todo o histórico do usuário.')) void saveStatus('DESATIVADO')
          }}>Desativar</Button>
        ) : null}
      </div>

      <div className="border-t border-border pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Delegações Gerenciais</h4>
          <Button variant="outline" size="sm" onClick={() => setShowDeleg(v => !v)}>
            <Plus size={12} /> Criar Delegação
          </Button>
        </div>
        {showDeleg ? (
          <div className="mb-2 space-y-2 rounded-lg bg-surface-alt p-3">
            <MxSelect aria-label="Selecionar loja para delegação" value={delegForm.store_id} onChange={event => setDelegForm(f => ({ ...f, store_id: event.target.value }))}>
              <option value="">Selecionar Loja...</option>
              {stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </MxSelect>
            <input
              value={delegForm.access_level}
              onChange={event => setDelegForm(f => ({ ...f, access_level: event.target.value }))}
              placeholder="Nível de acesso"
              className="h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border border-border bg-surface-default px-3 text-sm text-text-primary outline-none focus-visible:border-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={delegForm.valid_from}
                onChange={event => setDelegForm(f => ({ ...f, valid_from: event.target.value }))}
                className="h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border border-border bg-surface-default px-3 text-sm text-text-primary outline-none focus-visible:border-primary"
              />
              <input
                type="date"
                value={delegForm.valid_until}
                onChange={event => setDelegForm(f => ({ ...f, valid_until: event.target.value }))}
                className="h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border border-border bg-surface-default px-3 text-sm text-text-primary outline-none focus-visible:border-primary"
              />
            </div>
            <input
              value={delegForm.reason}
              onChange={event => setDelegForm(f => ({ ...f, reason: event.target.value }))}
              placeholder="Motivo"
              className="h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border border-border bg-surface-default px-3 text-sm text-text-primary outline-none focus-visible:border-primary"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={saving} onClick={() => void createDeleg()}>{saving ? 'Salvando...' : 'Confirmar'}</Button>
              <Button variant="ghost" size="sm" onClick={() => setShowDeleg(false)}>Cancelar</Button>
            </div>
          </div>
        ) : null}
        {activeDelegations.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nenhuma delegação ativa.</p>
        ) : (
          <div className="space-y-1.5">
            {activeDelegations.map(delegation => (
              <div key={delegation.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-default px-3 py-2">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-status-info-text" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{delegation.store_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{delegation.access_level} · até {delegation.valid_until}</span>
                  </div>
                </div>
                <button type="button" aria-label={`Encerrar delegação de ${delegation.store_name}`} disabled={saving} className="rounded-lg p-1 text-muted-foreground hover:bg-status-error-surface hover:text-status-error focus-visible:ring-2 focus-visible:ring-status-error/40 focus-visible:outline-none" onClick={() => void endDeleg(delegation)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : null}
    </div>
  )
}
