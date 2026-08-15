import { useState } from 'react'
import { Building2, Plus, Star, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { ASSIGNMENT_TYPES, canRemoveStoreAssignment, todayIso, validateStoreAssignmentAdd, type RoleGrantDraft, type StoreAssignmentDraft } from './userEdit'
import { addStoreAssignment, removeStoreAssignment, setStoreAssignmentPrimary, type AvailableStore } from './userEditMutations'

const ASSIGNMENT_LABEL = Object.fromEntries(ASSIGNMENT_TYPES.map(a => [a.value, a.label])) as Record<string, string>

export function UserStoresTab(props: {
  userId: string
  stores: AvailableStore[]
  storeAssignments: StoreAssignmentDraft[]
  roleGrants: RoleGrantDraft[]
  onStoreAssignments: (assignments: StoreAssignmentDraft[]) => void
}) {
  const { userId, stores, storeAssignments, roleGrants, onStoreAssignments } = props
  const [showAdd, setShowAdd] = useState(false)
  const [newStore, setNewStore] = useState('')
  const [newType, setNewType] = useState('USUARIO_OPERACIONAL')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeAssignments = storeAssignments.filter(s => s.status === 'ATIVO')
  const isVendedor = roleGrants.some(g => g.role === 'VENDEDOR' && g.status === 'ATIVO')
  const availableStores = stores.filter(store => !activeAssignments.find(a => a.store_id === store.id))

  const addStore = async () => {
    if (!newStore) return
    const store = stores.find(s => s.id === newStore)
    const draft: StoreAssignmentDraft = {
      store_id: newStore,
      store_name: store?.name ?? '',
      assignment_type: newType,
      is_primary: activeAssignments.length === 0,
      valid_from: todayIso(),
      valid_until: '',
      status: 'ATIVO',
    }
    const errors = validateStoreAssignmentAdd(draft, activeAssignments, isVendedor)
    if (errors.length) {
      setError(errors[0])
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await addStoreAssignment(userId, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      onStoreAssignments([...storeAssignments, draft])
      toast.success(`Loja ${store?.name ?? ''} vinculada.`)
      setNewStore('')
      setNewType('USUARIO_OPERACIONAL')
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  const removeStore = async (assignment: StoreAssignmentDraft) => {
    if (!assignment.id) return
    const blocked = canRemoveStoreAssignment(assignment, activeAssignments, assignment.store_name)
    if (blocked) {
      setError(blocked)
      return
    }
    if (!window.confirm(`Confirmar remoção do vínculo com "${assignment.store_name}"?`)) return
    setSaving(true)
    setError('')
    try {
      const result = await removeStoreAssignment(assignment.id)
      if (result.error) {
        setError(result.error)
        return
      }
      onStoreAssignments(storeAssignments.map(a => a.id === assignment.id ? { ...a, status: 'ENCERRADO' as const } : a))
      toast.success('Vínculo encerrado.')
    } finally {
      setSaving(false)
    }
  }

  const setPrimary = async (assignment: StoreAssignmentDraft) => {
    if (!assignment.id) return
    setSaving(true)
    setError('')
    try {
      const result = await setStoreAssignmentPrimary(userId, assignment.id)
      if (result.error) {
        setError(result.error)
        return
      }
      onStoreAssignments(storeAssignments.map(a => ({ ...a, is_primary: a.id === assignment.id })))
      toast.success('Loja principal definida.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {isVendedor ? (
        <div className="rounded-lg bg-status-warning-surface p-2 text-xs text-status-warning-text">
          Vendedor deve possuir apenas uma Loja operacional principal ativa por vez. Para trocar de Loja, use o fluxo de Transferência de Vendedor.
        </div>
      ) : null}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lojas e Vínculos</h4>
          {availableStores.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setShowAdd(v => !v)}>
              <Plus size={12} /> Adicionar Loja
            </Button>
          ) : null}
        </div>
        {showAdd ? (
          <div className="mb-2 space-y-2 rounded-lg bg-surface-alt p-3">
            <MxSelect aria-label="Selecionar loja" value={newStore} onChange={event => setNewStore(event.target.value)}>
              <option value="">Selecionar Loja...</option>
              {availableStores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </MxSelect>
            <MxSelect aria-label="Tipo de vínculo" value={newType} onChange={event => setNewType(event.target.value)}>
              {ASSIGNMENT_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
            </MxSelect>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={saving || !newStore} onClick={() => void addStore()}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setNewStore(''); }}>Cancelar</Button>
            </div>
          </div>
        ) : null}
        {activeAssignments.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nenhum vínculo de Loja ativo.</p>
        ) : (
          <div className="space-y-1.5">
            {activeAssignments.map(assignment => (
              <div key={assignment.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-default px-3 py-2">
                <div className="flex items-center gap-2">
                  <button type="button" title="Definir como principal" disabled={saving} onClick={() => void setPrimary(assignment)}>
                    <Star size={14} className={assignment.is_primary ? 'fill-status-warning text-status-warning' : 'text-muted-foreground'} />
                  </button>
                  <Building2 size={14} className="text-status-success-text" />
                  <div>
                    <span className="text-sm font-medium text-foreground">{assignment.store_name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{ASSIGNMENT_LABEL[assignment.assignment_type] ?? assignment.assignment_type}</span>
                  </div>
                  {assignment.is_primary ? <span className="rounded-full bg-status-warning-surface px-1.5 py-0.5 text-caption font-medium text-status-warning-text">Principal</span> : null}
                </div>
                <button type="button" aria-label={`Remover vínculo com ${assignment.store_name}`} disabled={saving} className="rounded-lg p-1 text-muted-foreground hover:bg-status-error-surface hover:text-status-error focus-visible:ring-2 focus-visible:ring-status-error/40 focus-visible:outline-none" onClick={() => void removeStore(assignment)}>
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
