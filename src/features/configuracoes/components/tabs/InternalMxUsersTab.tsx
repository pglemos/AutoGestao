import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, KeyRound, Plus, RefreshCw, Search, Shield, Trash2, UserX, Users } from 'lucide-react'
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
const USER_PAGE_SIZE = 50

const ROLE_LABELS: Record<UserRole, string> = {
  administrador_geral: 'Administrador Geral',
  administrador_mx: 'Administrador MX',
  consultor_mx: 'Consultor MX',
  dono: 'Dono',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

type StoreOption = Pick<Store, 'id' | 'name' | 'active'>

type MembershipRow = {
  user_id: string
  store_id: string
  role: string
  is_active: boolean
  created_at: string | null
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

type GlobalUserResponse = {
  success: boolean
  error?: string
  hard_deleted?: boolean
  user?: unknown
  blocking_references?: unknown[]
}

type NetworkUserMetrics = {
  total: number
  active: number
  internal: number
  sellers: number
}

type RoleFilter = UserRole | 'all'
type StatusFilter = 'all' | 'active' | 'inactive'

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

const emptyMetrics: NetworkUserMetrics = {
  total: 0,
  active: 0,
  internal: 0,
  sellers: 0,
}

export function InternalMxUsersTab() {
  const [users, setUsers] = useState<GlobalUser[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])
  const [metrics, setMetrics] = useState<NetworkUserMetrics>(emptyMetrics)
  const [totalFiltered, setTotalFiltered] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<GlobalUser | null>(null)
  const [draft, setDraft] = useState<UserDraft>(emptyDraft)
  const [hardDeleteTarget, setHardDeleteTarget] = useState<GlobalUser | null>(null)
  const [hardDeleteConfirmation, setHardDeleteConfirmation] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0)
      setSearchQuery(searchInput.trim())
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const safeTerm = searchQuery.replace(/[,%()]/g, ' ').trim()
      let usersQuery = supabase
        .from('usuarios')
        .select(
          'id, name, email, phone, role, active, is_venda_loja, must_change_password, updated_at',
          { count: 'exact' },
        )

      if (roleFilter !== 'all') usersQuery = usersQuery.eq('role', roleFilter)
      if (statusFilter !== 'all') usersQuery = usersQuery.eq('active', statusFilter === 'active')
      if (safeTerm) {
        usersQuery = usersQuery.or(
          `name.ilike.%${safeTerm}%,email.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%`,
        )
      }

      const firstRow = page * USER_PAGE_SIZE
      const lastRow = firstRow + USER_PAGE_SIZE - 1

      const [usersResult, storesResult, totalResult, activeResult, internalResult, sellersResult] = await Promise.all([
        usersQuery.order('name').range(firstRow, lastRow),
        supabase
          .from('lojas')
          .select('id, name, active')
          .order('name'),
        supabase.from('usuarios').select('id', { count: 'exact', head: true }),
        supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('usuarios').select('id', { count: 'exact', head: true }).in('role', INTERNAL_ROLES),
        supabase
          .from('usuarios')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'vendedor')
          .eq('active', true),
      ])

      if (usersResult.error) throw usersResult.error
      if (storesResult.error) throw storesResult.error
      if (totalResult.error) throw totalResult.error
      if (activeResult.error) throw activeResult.error
      if (internalResult.error) throw internalResult.error
      if (sellersResult.error) throw sellersResult.error

      const userRows = (usersResult.data || []) as Array<Omit<GlobalUser, 'membership'>>
      const userIds = userRows.map((user) => user.id)
      let membershipRows: MembershipRow[] = []

      if (userIds.length > 0) {
        const { data, error: membershipError } = await supabase
          .from('vinculos_loja')
          .select('user_id, store_id, role, is_active, created_at, store:lojas(id, name)')
          .in('user_id', userIds)
          .eq('is_active', true)
          .order('created_at', { ascending: false, nullsFirst: false })

        if (membershipError) throw membershipError
        membershipRows = (data || []) as unknown as MembershipRow[]
      }

      const memberships = new Map<string, MembershipRow>()
      for (const row of membershipRows) {
        if (!memberships.has(row.user_id)) memberships.set(row.user_id, row)
      }

      setUsers(userRows.map((user) => ({
        ...user,
        role: user.role as UserRole,
        membership: memberships.get(user.id) || null,
      })))
      setStores((storesResult.data || []) as StoreOption[])
      setTotalFiltered(usersResult.count || 0)
      setMetrics({
        total: totalResult.count || 0,
        active: activeResult.count || 0,
        internal: internalResult.count || 0,
        sellers: sellersResult.count || 0,
      })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os usuários globais.')
      setUsers([])
      setTotalFiltered(0)
    } finally {
      setLoading(false)
    }
  }, [page, roleFilter, searchQuery, statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalFiltered / USER_PAGE_SIZE))
    if (page >= totalPages) setPage(totalPages - 1)
  }, [page, totalFiltered])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const reload = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { void load() }, 500)
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

  const totalPages = Math.max(1, Math.ceil(totalFiltered / USER_PAGE_SIZE))

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

  const invokeGlobalUser = async (body: Record<string, unknown>): Promise<GlobalUserResponse> => {
    const { data, error: invokeError } = await supabase.functions.invoke<GlobalUserResponse>(
      'manage-global-user',
      { body },
    )
    if (!invokeError && data?.success) return data
    throw new Error(await resolveFunctionInvokeError(
      invokeError,
      data,
      'Não foi possível concluir a operação global.',
    ))
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
      const { data, error: invokeError } = await supabase.functions.invoke<GlobalUserResponse>('register-user', {
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
        throw new Error(await resolveFunctionInvokeError(
          invokeError,
          data,
          'Não foi possível criar o usuário.',
        ))
      }
      toast.success('Usuário criado com acesso administrativo definido.')
      setCreating(false)
      setPage(0)
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

  const openHardDelete = (user: GlobalUser) => {
    setHardDeleteTarget(user)
    setHardDeleteConfirmation('')
  }

  const confirmHardDelete = async () => {
    if (!hardDeleteTarget) return
    if (hardDeleteConfirmation.trim().toLowerCase() !== hardDeleteTarget.email.trim().toLowerCase()) {
      toast.error('Digite exatamente o e-mail do usuário para confirmar.')
      return
    }

    setSaving(true)
    try {
      await invokeGlobalUser({
        action: 'delete',
        user_id: hardDeleteTarget.id,
        hard_delete: true,
        reason: 'Exclusão definitiva confirmada nominalmente na administração global.',
      })
      toast.success('Usuário excluído definitivamente.')
      setHardDeleteTarget(null)
      setHardDeleteConfirmation('')
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'A exclusão definitiva foi bloqueada.')
    } finally {
      setSaving(false)
    }
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
          actions={(
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void load()}>
                <RefreshCw size={16} />
                Atualizar
              </Button>
              <Button onClick={openCreate}>
                <Plus size={16} />
                Novo usuário
              </Button>
            </div>
          )}
        />

        <div className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_220px_180px]">
          <div className="relative">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label="Buscar usuários"
              className="pl-10"
              placeholder="Nome, e-mail ou telefone"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <select
            aria-label="Filtrar por papel"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value as RoleFilter)
              setPage(0)
            }}
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold"
          >
            <option value="all">Todos os papéis</option>
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
          </select>

          <select
            aria-label="Filtrar por status"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter)
              setPage(0)
            }}
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm font-semibold"
          >
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {loading ? (
          <MxLoadingState label="Carregando usuários globais" />
        ) : users.length > 0 ? (
          <>
            <MxTableSurface className="rounded-none border-x-0 border-b-0">
              <table className="min-w-[1120px] w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase text-muted-foreground">
                    <th className="px-4 py-3">Usuário</th>
                    <th className="px-4 py-3">Papel</th>
                    <th className="px-4 py-3">Loja</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Segurança</th>
                    <th className="px-4 py-3 text-right">Operações</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      saving={saving}
                      onEdit={openEdit}
                      onForcePasswordChange={forcePasswordChange}
                      onDeactivate={deactivate}
                      onHardDelete={openHardDelete}
                    />
                  ))}
                </tbody>
              </table>
            </MxTableSurface>

            <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {totalFiltered} resultado{totalFiltered === 1 ? '' : 's'} · página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  disabled={page + 1 >= totalPages || loading}
                  onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        ) : (
          <MxEmptyState
            variant="filter"
            title="Nenhum usuário encontrado"
            description="Ajuste os filtros ou crie um novo cadastro global."
          />
        )}
      </MxSectionCard>

      <UserFormModal
        open={creating}
        title="Criar usuário global"
        draft={draft}
        stores={stores}
        saving={saving}
        creating
        onDraft={setDraft}
        onClose={() => setCreating(false)}
        onSave={() => void saveCreate()}
      />

      <UserFormModal
        open={Boolean(editing)}
        title="Editar usuário global"
        draft={draft}
        stores={stores}
        saving={saving}
        creating={false}
        onDraft={setDraft}
        onClose={() => setEditing(null)}
        onSave={() => void saveEdit()}
      />

      <Modal
        open={Boolean(hardDeleteTarget)}
        onClose={() => {
          if (saving) return
          setHardDeleteTarget(null)
          setHardDeleteConfirmation('')
        }}
        title="Excluir usuário definitivamente"
        description="Esta ação não possui restauração e só será executada quando não houver histórico operacional protegido."
        size="md"
        footer={(
          <>
            <Button
              variant="outline"
              onClick={() => setHardDeleteTarget(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => void confirmHardDelete()}
              loading={saving}
              disabled={!hardDeleteTarget || hardDeleteConfirmation.trim().toLowerCase() !== hardDeleteTarget.email.trim().toLowerCase()}
            >
              Excluir definitivamente
            </Button>
          </>
        )}
      >
        <div className="space-y-4">
          <MxStatusBanner tone="danger">
            Para confirmar, digite exatamente o e-mail <strong>{hardDeleteTarget?.email}</strong>.
          </MxStatusBanner>
          <MxField label="E-mail de confirmação">
            <Input
              type="email"
              value={hardDeleteConfirmation}
              onChange={(event) => setHardDeleteConfirmation(event.target.value)}
              autoComplete="off"
            />
          </MxField>
        </div>
      </Modal>
    </div>
  )
}

type UserRowProps = {
  user: GlobalUser
  saving: boolean
  onEdit: (user: GlobalUser) => void
  onForcePasswordChange: (user: GlobalUser) => Promise<void>
  onDeactivate: (user: GlobalUser) => void
  onHardDelete: (user: GlobalUser) => void
}

function UserRow({
  user,
  saving,
  onEdit,
  onForcePasswordChange,
  onDeactivate,
  onHardDelete,
}: UserRowProps) {
  return (
    <tr className="border-b border-border-subtle last:border-0">
      <td className="px-4 py-4">
        <div className="font-semibold text-foreground">{user.name}</div>
        <div className="text-xs text-muted-foreground">
          {user.email}{user.phone ? ` · ${user.phone}` : ''}
        </div>
      </td>
      <td className="px-4 py-4">
        <Badge variant={INTERNAL_ROLES.includes(user.role) ? 'brand' : 'outline'}>
          {ROLE_LABELS[user.role] || user.role}
        </Badge>
      </td>
      <td className="px-4 py-4">{user.membership?.store?.name || 'Escopo global'}</td>
      <td className="px-4 py-4">
        <Badge variant={user.active ? 'success' : 'outline'}>
          {user.active ? 'Ativo' : 'Inativo'}
        </Badge>
      </td>
      <td className="px-4 py-4">
        {user.must_change_password ? <Badge variant="warning">Troca pendente</Badge> : 'Regular'}
      </td>
      <td className="px-4 py-4">
        <div className="flex justify-end gap-1">
          <Button
            size="icon"
            variant="outline"
            aria-label={`Editar ${user.name}`}
            onClick={() => onEdit(user)}
            disabled={saving}
          >
            <Pencil size={15} />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label={`Forçar troca de senha de ${user.name}`}
            onClick={() => void onForcePasswordChange(user)}
            disabled={saving}
          >
            <KeyRound size={15} />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label={`Desativar ${user.name}`}
            onClick={() => onDeactivate(user)}
            disabled={saving}
          >
            <UserX size={15} />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label={`Excluir definitivamente ${user.name}`}
            onClick={() => onHardDelete(user)}
            disabled={saving}
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </td>
    </tr>
  )
}

type UserFormModalProps = {
  open: boolean
  title: string
  draft: UserDraft
  stores: StoreOption[]
  saving: boolean
  creating: boolean
  onDraft: (draft: UserDraft) => void
  onClose: () => void
  onSave: () => void
}

function UserFormModal({
  open,
  title,
  draft,
  stores,
  saving,
  creating,
  onDraft,
  onClose,
  onSave,
}: UserFormModalProps) {
  const internal = INTERNAL_ROLES.includes(draft.role)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="CRUD global da área interna MX"
      size="xl"
      footer={(
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} loading={saving}>
            Salvar
          </Button>
        </>
      )}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <MxField label="Nome">
          <Input
            value={draft.name}
            onChange={(event) => onDraft({ ...draft, name: event.target.value })}
          />
        </MxField>

        <MxField label="E-mail">
          <Input
            type="email"
            value={draft.email}
            onChange={(event) => onDraft({ ...draft, email: event.target.value })}
          />
        </MxField>

        {creating ? (
          <MxField label="Senha provisória">
            <Input
              type="password"
              value={draft.password}
              onChange={(event) => onDraft({ ...draft, password: event.target.value })}
            />
          </MxField>
        ) : null}

        <MxField label="Telefone">
          <Input
            value={draft.phone}
            onChange={(event) => onDraft({ ...draft, phone: event.target.value })}
          />
        </MxField>

        <MxField label="Papel">
          <select
            className="h-11 w-full rounded-xl border border-border bg-white px-3"
            value={draft.role}
            onChange={(event) => {
              const role = event.target.value as UserRole
              onDraft({
                ...draft,
                role,
                store_id: INTERNAL_ROLES.includes(role) ? '' : draft.store_id,
              })
            }}
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
            ))}
          </select>
        </MxField>

        {!internal ? (
          <MxField label="Loja">
            <select
              className="h-11 w-full rounded-xl border border-border bg-white px-3"
              value={draft.store_id}
              onChange={(event) => onDraft({ ...draft, store_id: event.target.value })}
            >
              <option value="">Selecione</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}{store.active ? '' : ' (inativa)'}
                </option>
              ))}
            </select>
          </MxField>
        ) : null}

        <label className="flex items-center gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            checked={draft.active}
            onChange={(event) => onDraft({ ...draft, active: event.target.checked })}
          />
          Usuário ativo
        </label>

        <label className="flex items-center gap-3 rounded-xl border border-border p-4">
          <input
            type="checkbox"
            checked={draft.is_venda_loja}
            onChange={(event) => onDraft({ ...draft, is_venda_loja: event.target.checked })}
          />
          Venda da loja
        </label>
      </div>
    </Modal>
  )
}

export default InternalMxUsersTab
