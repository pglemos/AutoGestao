import { useCallback, useEffect, useMemo, useState } from 'react'
import { Edit3, KeyRound, Plus, RefreshCw, Search, Shield, Trash2, UserX, Users } from 'lucide-react'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import {
  MxEmptyState,
  MxField,
  MxLoadingState,
  MxMetricCard,
  MxMetricGrid,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
  MxTableSurface,
} from '@/components/module/MxModuleVisualPrimitives'
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy'
import { resolveFunctionInvokeError, supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import type { Store, UserRole } from '@/types/database'

const INTERNAL_ROLES: UserRole[] = ['administrador_geral', 'administrador_mx', 'consultor_mx']
const ALL_ROLES: UserRole[] = [...INTERNAL_ROLES, 'dono', 'gerente', 'vendedor']
const ROLE_LABELS: Record<UserRole, string> = {
  administrador_geral: 'Administrador Geral',
  administrador_mx: 'Administrador MX',
  consultor_mx: 'Consultor MX',
  dono: 'Dono',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

type MembershipRow = {
  user_id: string
  store_id: string
  role: string
  is_active: boolean
  store: { id: string; name: string } | null
}

type GlobalUser = {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  active: boolean
  is_venda_loja: boolean
  must_change_password: boolean
  updated_at: string | null
  membership: MembershipRow | null
}

type UserDraft = {
  name: string
  email: string
  password: string
  phone: string
  role: UserRole
  store_id: string
  active: boolean
  is_venda_loja: boolean
}

const emptyDraft: UserDraft = {
  name: '',
  email: '',
  password: '',
  phone: '',
  role: 'vendedor',
  store_id: '',
  active: true,
  is_venda_loja: false,
}

export function InternalMxUsersTab() {
  const [users, setUsers] = useState<GlobalUser[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<GlobalUser | null>(null)
  const [draft, setDraft] = useState<UserDraft>(emptyDraft)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [{ data: userRows, error: userError }, { data: membershipRows, error: membershipError }, { data: storeRows, error: storeError }] = await Promise.all([
        supabase
          .from('usuarios')
          .select('id, name, email, phone, role, active, is_venda_loja, must_change_password, updated_at')
          .order('name'),
        supabase
          .from('vinculos_loja')
          .select('user_id, store_id, role, is_active, store:lojas(id, name)')
          .eq('is_active', true),
        supabase
          .from('lojas')
          .select('id, name, manager_email, legal_name, cnpj, address, administrative_phone, partners, active, source_mode, created_at, updated_at')
          .order('name'),
      ])
      if (userError) throw userError
      if (membershipError) throw membershipError
      if (storeError) throw storeError

      const memberships = new Map<string, MembershipRow>()
      for (const row of (membershipRows || []) as unknown as MembershipRow[]) {
        if (!memberships.has(row.user_id)) memberships.set(row.user_id, row)
      }

      setUsers(((userRows || []) as Array<Omit<GlobalUser, 'membership'>>).map((user) => ({
        ...user,
        role: user.role as UserRole,
        membership: memberships.get(user.id) || null,
      })))
      setStores((storeRows || []) as Store[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os usuários globais.')
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const reload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void load() }, 250)
    }
    const channel = supabase
      .channel('internal-mx-global-users')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'usuarios' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vinculos_loja' }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedores_loja' }, reload)
      .subscribe()
    return () => {
      if (timer) clearTimeout(timer)
      void supabase.removeChannel(channel)
    }
  }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return users.filter((user) => {
      const matchesTerm = !term || [user.name, user.email, user.phone, user.membership?.store?.name]
        .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(term))
      const matchesRole = roleFilter === 'all' || user.role === roleFilter
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? user.active : !user.active)
      return matchesTerm && matchesRole && matchesStatus
    })
  }, [roleFilter, search, statusFilter, users])

  const metrics = useMemo(() => ({
    total: users.length,
    active: users.filter((user) => user.active).length,
    internal: users.filter((user) => INTERNAL_ROLES.includes(user.role)).length,
    sellers: users.filter((user) => user.role === 'vendedor' && user.active).length,
  }), [users])

  const openCreate = () => {
    setDraft(emptyDraft)
    setCreating(true)
  }

  const openEdit = (user: GlobalUser) => {
    setDraft({
      name: user.name || '',
      email: user.email || '',
      password: '',
      phone: user.phone || '',
      role: user.role,
      store_id: user.membership?.store_id || '',
      active: user.active,
      is_venda_loja: user.is_venda_loja,
    })
    setEditing(user)
  }

  const invokeGlobalUser = async (body: Record<string, unknown>) => {
    const { data, error: invokeError } = await supabase.functions.invoke('manage-global-user', { body })
    if (!invokeError && data?.success) return data
    throw new Error(await resolveFunctionInvokeError(invokeError, data, 'Não foi possível concluir a operação global.'))
  }

  const saveCreate = async () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error('Nome e e-mail são obrigatórios.')
      return
    }
    if (!isStrongPassword(draft.password)) {
      toast.error(PASSWORD_POLICY_MESSAGE)
      return
    }
    if (!INTERNAL_ROLES.includes(draft.role) && !draft.store_id) {
      toast.error('Selecione a loja para o papel escolhido.')
      return
    }
    setSaving(true)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('register-user', {
        body: {
          name: draft.name.trim(),
          email: draft.email.trim(),
          password: draft.password,
          phone: draft.phone.trim() || null,
          role: draft.role,
          store_id: INTERNAL_ROLES.includes(draft.role) ? undefined : draft.store_id,
          is_venda_loja: draft.is_venda_loja,
        },
      })
      if (invokeError || !data?.success) {
        throw new Error(await resolveFunctionInvokeError(invokeError, data, 'Não foi possível criar o usuário.'))
      }
      toast.success('Usuário criado com acesso administrativo definido.')
      setCreating(false)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível criar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  const saveEdit = async () => {
    if (!editing) return
    if (!INTERNAL_ROLES.includes(draft.role) && !draft.store_id) {
      toast.error('Selecione a loja para o papel escolhido.')
      return
    }
    setSaving(true)
    try {
      await invokeGlobalUser({
        action: 'update',
        user_id: editing.id,
        updates: {
          name: draft.name,
          email: draft.email,
          phone: draft.phone || null,
          role: draft.role,
          active: draft.active,
          is_venda_loja: draft.is_venda_loja,
          store_id: INTERNAL_ROLES.includes(draft.role) ? null : draft.store_id,
          previous_store_id: editing.membership?.store_id || null,
        },
      })
      toast.success('Usuário atualizado globalmente.')
      setEditing(null)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível atualizar o usuário.')
    } finally {
      setSaving(false)
    }
  }

  const forcePasswordChange = async (user: GlobalUser) => {
    setSaving(true)
    try {
      await invokeGlobalUser({ action: 'force_password_change', user_id: user.id })
      toast.success('Troca de senha obrigatória configurada.')
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Não foi possível forçar a troca de senha.')
    } finally {
      setSaving(false)
    }
  }

  const deactivate = (user: GlobalUser) => {
    requestToastConfirmation({
      key: `global-user-deactivate:${user.id}`,
      title: `Desativar ${user.name}?`,
      description: 'O login e todos os vínculos ativos serão desativados. O histórico será preservado.',
      label: 'Desativar',
      onConfirm: async () => {
        try {
          await invokeGlobalUser({ action: 'delete', user_id: user.id, hard_delete: false })
          toast.success('Usuário desativado.')
          await load()
        } catch (cause) {
          toast.error(cause instanceof Error ? cause.message : 'Não foi possível desativar o usuário.')
        }
      },
    })
  }

  const hardDelete = (user: GlobalUser) => {
    requestToastConfirmation({
      key: `global-user-hard-delete:${user.id}`,
      title: `Excluir definitivamente ${user.name}?`,
      description: 'A operação só será executada se não houver histórico operacional protegido. Não existe restauração após a exclusão.',
      label: 'Excluir definitivamente',
      onConfirm: async () => {
        try {
          await invokeGlobalUser({ action: 'delete', user_id: user.id, hard_delete: true })
          toast.success('Usuário excluído definitivamente.')
          await load()
        } catch (cause) {
          toast.error(cause instanceof Error ? cause.message : 'A exclusão definitiva foi bloqueada.')
        }
      },
    })
  }

  return (
    <div className="space-y-mx-lg">
      <MxMetricGrid>
        <MxMetricCard title="Usuários" value={metrics.total} detail="Todos os cadastros" icon={Users} />
        <MxMetricCard title="Ativos" value={metrics.active} detail="Com acesso liberado" icon={Shield} tone="success" />
        <MxMetricCard title="Área interna" value={metrics.internal} detail="Três perfis equivalentes" icon={Shield} tone="violet" />
        <MxMetricCard title="Vendedores ativos" value={metrics.sellers} detail="Em toda a rede" icon={Users} tone="info" />
      </MxMetricGrid>

      {error ? <MxStatusBanner tone="danger">{error}</MxStatusBanner> : null}

      <MxSectionCard>
        <MxSectionHeader
          title="Administração global de usuários"
          description="Administrador Geral, Administrador MX e Consultor MX possuem o mesmo CRUD global nesta superfície."
          actions={<div className="flex gap-2"><Button variant="managerSecondary" onClick={() => void load()}><RefreshCw size={16} />Atualizar</Button><Button onClick={openCreate}><Plus size={16} />Novo usuário</Button></div>}
        />
        <div className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <div className="relative"><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" /><Input aria-label="Buscar usuários" className="pl-10" placeholder="Nome, e-mail, telefone ou loja" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <select aria-label="Filtrar por papel" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="h-11 rounded-xl border border-border-default bg-white px-3 text-sm font-semibold"><option value="all">Todos os papéis</option>{ALL_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select>
          <select aria-label="Filtrar por status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-border-default bg-white px-3 text-sm font-semibold"><option value="all">Todos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select>
        </div>

        {loading ? <MxLoadingState label="Carregando usuários globais" /> : filtered.length ? (
          <MxTableSurface className="rounded-none border-x-0 border-b-0">
            <table className="min-w-[1120px] w-full text-sm">
              <thead><tr className="border-b border-border-default bg-surface-alt text-left text-xs uppercase text-text-tertiary"><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Papel</th><th className="px-4 py-3">Loja</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Segurança</th><th className="px-4 py-3 text-right">Operações</th></tr></thead>
              <tbody>{filtered.map((user) => <tr key={user.id} className="border-b border-border-subtle last:border-0"><td className="px-4 py-4"><div className="font-semibold text-text-primary">{user.name}</div><div className="text-xs text-text-tertiary">{user.email}{user.phone ? ` · ${user.phone}` : ''}</div></td><td className="px-4 py-4"><Badge variant={INTERNAL_ROLES.includes(user.role) ? 'brand' : 'outline'}>{ROLE_LABELS[user.role] || user.role}</Badge></td><td className="px-4 py-4">{user.membership?.store?.name || 'Escopo global'}</td><td className="px-4 py-4"><Badge variant={user.active ? 'success' : 'outline'}>{user.active ? 'Ativo' : 'Inativo'}</Badge></td><td className="px-4 py-4">{user.must_change_password ? <Badge variant="warning">Troca pendente</Badge> : 'Regular'}</td><td className="px-4 py-4"><div className="flex justify-end gap-1"><Button size="icon" variant="managerSecondary" aria-label={`Editar ${user.name}`} onClick={() => openEdit(user)}><Edit3 size={15} /></Button><Button size="icon" variant="managerSecondary" aria-label={`Forçar troca de senha de ${user.name}`} onClick={() => void forcePasswordChange(user)} disabled={saving}><KeyRound size={15} /></Button><Button size="icon" variant="managerSecondary" aria-label={`Desativar ${user.name}`} onClick={() => deactivate(user)}><UserX size={15} /></Button><Button size="icon" variant="managerSecondary" aria-label={`Excluir definitivamente ${user.name}`} onClick={() => hardDelete(user)}><Trash2 size={15} /></Button></div></td></tr>)}</tbody>
            </table>
          </MxTableSurface>
        ) : <MxEmptyState title="Nenhum usuário encontrado" description="Ajuste os filtros ou crie um novo cadastro global." />}
      </MxSectionCard>

      <UserFormModal open={creating} title="Criar usuário global" draft={draft} stores={stores} saving={saving} creating onDraft={setDraft} onClose={() => setCreating(false)} onSave={() => void saveCreate()} />
      <UserFormModal open={Boolean(editing)} title="Editar usuário global" draft={draft} stores={stores} saving={saving} creating={false} onDraft={setDraft} onClose={() => setEditing(null)} onSave={() => void saveEdit()} />
    </div>
  )
}

function UserFormModal({ open, title, draft, stores, saving, creating, onDraft, onClose, onSave }: { open: boolean; title: string; draft: UserDraft; stores: Store[]; saving: boolean; creating: boolean; onDraft: (draft: UserDraft) => void; onClose: () => void; onSave: () => void }) {
  const internal = INTERNAL_ROLES.includes(draft.role)
  return <Modal open={open} onClose={onClose} title={title} description="CRUD global da área interna MX" size="xl" footer={<><Button variant="managerSecondary" onClick={onClose} disabled={saving}>Cancelar</Button><Button onClick={onSave} loading={saving}>Salvar</Button></>}><div className="grid gap-4 md:grid-cols-2"><MxField label="Nome"><Input value={draft.name} onChange={(event) => onDraft({ ...draft, name: event.target.value })} /></MxField><MxField label="E-mail"><Input type="email" value={draft.email} onChange={(event) => onDraft({ ...draft, email: event.target.value })} /></MxField>{creating ? <MxField label="Senha provisória"><Input type="password" value={draft.password} onChange={(event) => onDraft({ ...draft, password: event.target.value })} /></MxField> : null}<MxField label="Telefone"><Input value={draft.phone} onChange={(event) => onDraft({ ...draft, phone: event.target.value })} /></MxField><MxField label="Papel"><select className="h-11 w-full rounded-xl border border-border-default bg-white px-3" value={draft.role} onChange={(event) => onDraft({ ...draft, role: event.target.value as UserRole, store_id: INTERNAL_ROLES.includes(event.target.value as UserRole) ? '' : draft.store_id })}>{ALL_ROLES.map((role) => <option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></MxField>{!internal ? <MxField label="Loja"><select className="h-11 w-full rounded-xl border border-border-default bg-white px-3" value={draft.store_id} onChange={(event) => onDraft({ ...draft, store_id: event.target.value })}><option value="">Selecione</option>{stores.map((store) => <option key={store.id} value={store.id}>{store.name}</option>)}</select></MxField> : null}<label className="flex items-center gap-3 rounded-xl border border-border-default p-4"><input type="checkbox" checked={draft.active} onChange={(event) => onDraft({ ...draft, active: event.target.checked })} />Usuário ativo</label><label className="flex items-center gap-3 rounded-xl border border-border-default p-4"><input type="checkbox" checked={draft.is_venda_loja} onChange={(event) => onDraft({ ...draft, is_venda_loja: event.target.checked })} />Venda da loja</label></div></Modal>
}

export default InternalMxUsersTab
