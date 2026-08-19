import { useState } from 'react'
import { Plus, Star, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { compatibleViews, canRemoveRoleGrant, ROLE_GRANT_ROLES, todayIso, validateRoleGrantAdd, type RoleGrantDraft } from './userEdit'
import { addRoleGrant, removeRoleGrant, saveDefaultView, setRoleGrantPrimary } from './userEditMutations'

const ROLE_LABEL: Record<string, string> = {
  DONO_MASTER: 'Dono Master',
  DONO_SOCIO: 'Dono / Sócio',
  DIRETOR: 'Diretor',
  GERENTE_COMERCIAL: 'Gerente Comercial',
  VENDEDOR: 'Vendedor',
  MARKETING: 'Marketing',
  PRODUTO_ESTOQUE: 'Produto / Estoque',
  FINANCEIRO_ADMINISTRATIVO: 'Financeiro / Administrativo',
  RH: 'RH',
  OPERACOES: 'Operações',
}

/** Papel efetivo em `usuarios.role` — o que o sistema de fato usa. */
const EFFECTIVE_ROLE_LABEL: Record<string, string> = {
  administrador_mx: 'Administrador MX',
  administrador_geral: 'Administrador geral',
  consultor_mx: 'Consultor MX',
  dono: 'Dono',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

export function UserRolesTab(props: {
  userId: string
  effectiveRole: string | null
  roleGrants: RoleGrantDraft[]
  defaultView: string
  onRoleGrants: (grants: RoleGrantDraft[]) => void
  onDefaultView: (view: string) => void
}) {
  const { userId, effectiveRole, roleGrants, defaultView, onRoleGrants, onDefaultView } = props
  const [showAdd, setShowAdd] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [newReason, setNewReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const activeGrants = roleGrants.filter(g => g.status === 'ATIVO')
  const activeRoles = activeGrants.map(g => g.role)
  const availableRoles = ROLE_GRANT_ROLES.filter(role => !activeRoles.includes(role))
  const compatibleViewsList = compatibleViews(activeRoles)

  const addRole = async () => {
    if (!newRole) return
    const draft: RoleGrantDraft = {
      role: newRole,
      is_primary: activeGrants.length === 0,
      valid_from: todayIso(),
      valid_until: '',
      status: 'ATIVO',
      change_reason: newReason,
    }
    const errors = validateRoleGrantAdd(draft, activeGrants)
    if (errors.length) {
      setError(errors[0])
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await addRoleGrant(userId, draft)
      if (result.error) {
        setError(result.error)
        return
      }
      onRoleGrants([...roleGrants, draft])
      toast.success(`Papel ${ROLE_LABEL[newRole] ?? newRole} atribuído.`)
      setNewRole('')
      setNewReason('')
      setShowAdd(false)
    } finally {
      setSaving(false)
    }
  }

  const removeRole = async (grant: RoleGrantDraft) => {
    if (!grant.id) return
    const blocked = canRemoveRoleGrant(grant, activeGrants)
    if (blocked) {
      setError(blocked)
      return
    }
    if (!window.confirm(`Confirmar remoção do papel "${ROLE_LABEL[grant.role] ?? grant.role}"? Os acessos relacionados serão encerrados.`)) return
    setSaving(true)
    setError('')
    try {
      const result = await removeRoleGrant(grant.id)
      if (result.error) {
        setError(result.error)
        return
      }
      onRoleGrants(roleGrants.map(g => g.id === grant.id ? { ...g, status: 'ENCERRADO' as const } : g))
      toast.success('Papel encerrado.')
    } finally {
      setSaving(false)
    }
  }

  const setPrimary = async (grant: RoleGrantDraft) => {
    if (!grant.id) return
    setSaving(true)
    setError('')
    try {
      const result = await setRoleGrantPrimary(userId, grant.id)
      if (result.error) {
        setError(result.error)
        return
      }
      onRoleGrants(roleGrants.map(g => ({ ...g, is_primary: g.id === grant.id })))
      toast.success('Papel principal definido.')
    } finally {
      setSaving(false)
    }
  }

  const changeDefaultView = async (view: string) => {
    onDefaultView(view)
    const result = await saveDefaultView(userId, view)
    if (result.error) toast.error(result.error)
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Papel efetivo</h4>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface-default px-3 py-2">
          <span className="text-sm font-medium text-foreground">
            {effectiveRole ? EFFECTIVE_ROLE_LABEL[effectiveRole] ?? effectiveRole : 'Sem papel definido'}
          </span>
          <span className="text-caption text-muted-foreground">define o acesso do usuário</span>
        </div>
        <p className="mt-1.5 text-caption text-muted-foreground">
          É este papel que governa o que o usuário enxerga. Alterá-lo é feito em Configurações da
          Plataforma, pelo fluxo de usuários internos.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Papéis complementares</h4>
          <Button variant="outline" size="sm" disabled={availableRoles.length === 0} onClick={() => setShowAdd(v => !v)}>
            <Plus size={12} /> Adicionar Papel
          </Button>
        </div>
        {showAdd ? (
          <div className="mb-2 space-y-2 rounded-lg bg-surface-alt p-3">
            <MxSelect aria-label="Selecionar papel" value={newRole} onChange={event => setNewRole(event.target.value)}>
              <option value="">Selecionar papel...</option>
              {availableRoles.map(role => <option key={role} value={role}>{ROLE_LABEL[role] ?? role}</option>)}
            </MxSelect>
            <input
              value={newReason}
              onChange={event => setNewReason(event.target.value)}
              placeholder="Motivo da alteração"
              className="h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border border-border bg-surface-default px-3 text-sm text-text-primary outline-none focus-visible:border-primary"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={saving || !newRole} onClick={() => void addRole()}>
                {saving ? 'Salvando...' : 'Confirmar'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setNewRole(''); setNewReason(''); }}>Cancelar</Button>
            </div>
          </div>
        ) : null}
        {activeGrants.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">Nenhum papel complementar concedido.</p>
        ) : (
          <div className="space-y-1.5">
            {activeGrants.map(grant => (
              <div key={grant.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-default px-3 py-2">
                <div className="flex items-center gap-2">
                  <button type="button" title="Definir como principal" disabled={saving} onClick={() => void setPrimary(grant)}>
                    <Star size={14} className={grant.is_primary ? 'fill-status-warning text-status-warning' : 'text-muted-foreground'} />
                  </button>
                  <span className="text-sm font-medium text-foreground">{ROLE_LABEL[grant.role] ?? grant.role}</span>
                  {grant.is_primary ? <span className="rounded-full bg-status-warning-surface px-1.5 py-0.5 text-caption font-medium text-status-warning-text">Principal</span> : null}
                </div>
                <button type="button" aria-label={`Remover papel ${ROLE_LABEL[grant.role] ?? grant.role}`} disabled={saving} className="rounded-lg p-1 text-muted-foreground hover:bg-status-error-surface hover:text-status-error focus-visible:ring-2 focus-visible:ring-status-error/40 focus-visible:outline-none" onClick={() => void removeRole(grant)}>
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <MxField label="Visão padrão ao entrar">
        <MxSelect aria-label="Visão padrão ao entrar" value={defaultView} onChange={event => void changeDefaultView(event.target.value)}>
          <option value="">Selecionar...</option>
          {compatibleViewsList.map(view => <option key={view.value} value={view.value}>{view.label}</option>)}
        </MxSelect>
        {defaultView && !compatibleViewsList.find(view => view.value === defaultView) ? (
          <p className="mt-1 text-xs text-status-error-text">A visão padrão atual não é compatível com os papéis ativos.</p>
        ) : null}
      </MxField>

      {error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : null}
    </div>
  )
}
