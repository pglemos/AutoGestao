import { useMemo, useState } from 'react'
import { Plus, Search, Trash2, Pencil, RefreshCw, Users, ShieldCheck, ShieldAlert, Building2, Mail, Download } from 'lucide-react'
import { useTeam, useStores, type TeamMember } from '@/hooks/useTeam'
import { isAdministradorMx, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { Avatar } from '@/components/atoms/Avatar'
import { UserCreationModal } from '@/features/equipe/components/UserCreationModal'
import { EditUserModal } from '@/features/configuracoes/components/EditUserModal'
import type { UserRole } from '@/types/database'
import type { TabContext } from '@/features/configuracoes/types'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { buildTeamContactsWorkbook, type TeamContactRow } from '@/lib/team-contacts-export'

const ROLE_LABEL: Record<string, string> = {
    administrador_geral: 'Admin Master',
    administrador_mx: 'Admin MX',
    consultor_mx: 'Consultor MX',
    dono: 'Dono',
    gerente: 'Gerente',
    vendedor: 'Vendedor',
}

const ROLE_BADGE: Record<string, 'brand' | 'success' | 'warning' | 'outline'> = {
    administrador_geral: 'brand',
    administrador_mx: 'brand',
    consultor_mx: 'success',
    dono: 'warning',
    gerente: 'warning',
    vendedor: 'outline',
}

interface ExportContactRpcRow {
    loja: string | null
    papel: string | null
    nome: string | null
    telefone: string | null
    email: string | null
    origem: string | null
    vinculo_desde: string | null
}

export function EquipeUsuariosTab({ isReadOnly }: TabContext) {
    const { role, storeId } = useAuth()
    const isGlobalAdmin = isAdministradorMx(role)
    const canExportContacts = isPerfilInternoMx(role)
    const canCreate = !isReadOnly
    const canMutateExisting = !isReadOnly && isAdministradorMx(role)
    // Admin master/MX vêem global; outros vêem só sua loja
    const scopedStoreId = isGlobalAdmin ? 'all' : (storeId || undefined)
    const { sellers, loading, registerUser, updateTeamMember, deleteTeamMember, refetch } = useTeam(scopedStoreId)
    const { lojas } = useStores()

    const [showCreate, setShowCreate] = useState(false)
    const [editingUser, setEditingUser] = useState<TeamMember | null>(null)
    const [filter, setFilter] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('')
    const [exportingContacts, setExportingContacts] = useState(false)

    const allowedRolesForCreate = useMemo<UserRole[]>(() => {
        if (role === 'administrador_geral') return ['administrador_geral', 'administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor']
        if (role === 'administrador_mx') return ['administrador_mx', 'consultor_mx', 'dono', 'gerente', 'vendedor']
        if (role === 'dono') return ['gerente', 'vendedor']
        if (role === 'gerente') return ['vendedor']
        return []
    }, [role])

    const filtered = useMemo(() => {
        return sellers.filter(s => {
            const matchesText = !filter ||
                s.name?.toLowerCase().includes(filter.toLowerCase()) ||
                s.email?.toLowerCase().includes(filter.toLowerCase())
            const matchesRole = !roleFilter || s.role === roleFilter
            return matchesText && matchesRole
        })
    }, [sellers, filter, roleFilter])

    const executeDelete = async (user: TeamMember) => {
        const { error } = await deleteTeamMember(user.id, user.store_id)
        if (error) toast.error(error)
        else toast.success(`${user.name} removido da equipe.`)
    }

    const handleDelete = (user: TeamMember) => {
        requestToastConfirmation({
            key: `remove-team-user:${user.id}:${user.store_id || 'global'}`,
            title: `Remover ${user.name} da equipe?`,
            description: 'Esta ação desativa o vínculo. O histórico é preservado.',
            label: 'Remover',
            onConfirm: () => executeDelete(user),
        })
    }

    const handleExportContacts = async () => {
        setExportingContacts(true)
        try {
            const { data, error } = await supabase.rpc('exportar_contatos_cadastros_mx')
            if (error) throw error

            const rows: TeamContactRow[] = ((data || []) as ExportContactRpcRow[]).map((row) => ({
                Loja: row.loja || '',
                Papel: row.papel || '',
                Nome: row.nome || '',
                Telefone: row.telefone || '',
                Email: row.email || '',
                Origem: row.origem || '',
                'Vínculo desde': row.vinculo_desde || '',
            }))

            const { exportWorkbookToExcel } = await import('@/lib/export')
            const success = exportWorkbookToExcel(buildTeamContactsWorkbook(rows), 'Contatos_Cadastros_MX')
            if (!success) throw new Error('Falha ao gerar arquivo XLSX.')
            toast.success(`${rows.length} contatos exportados.`)
        } catch (error) {
            console.error('Erro ao exportar contatos dos cadastros:', error)
            toast.error('Não foi possível exportar os contatos dos cadastros.')
        } finally {
            setExportingContacts(false)
        }
    }

    const stats = useMemo(() => ({
        total: sellers.length,
        ativos: sellers.filter(s => s.is_active !== false && s.active !== false).length,
        admins: sellers.filter(s => isPerfilInternoMx(s.role)).length,
        sellers: sellers.filter(s => s.role === 'vendedor').length,
    }), [sellers])

    return (
        <div className="space-y-mx-lg">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-mx-md">
                <StatCard icon={<Users size={18} />} label="Total" value={stats.total} />
                <StatCard icon={<ShieldCheck size={18} />} label="Ativos" value={stats.ativos} tone="success" />
                <StatCard icon={<ShieldAlert size={18} />} label="Admins MX" value={stats.admins} tone="brand" />
                <StatCard icon={<Building2 size={18} />} label="Vendedores" value={stats.sellers} tone="muted" />
            </div>

            {/* Toolbar */}
            <Card className="p-mx-md border-none bg-white flex flex-col md:flex-row items-stretch md:items-center gap-mx-md">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="team-search"
                        name="team-search"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Buscar por nome ou e-mail..."
                        className="!pl-mx-10 !h-mx-12 font-bold"
                    />
                </div>
                <select
                    id="team-role-filter"
                    name="role-filter"
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="h-mx-12 px-mx-sm bg-surface-alt border border-border rounded-2xl font-bold uppercase text-xs cursor-pointer"
                >
                    <option value="">Todos os papéis</option>
                    {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v.toUpperCase()}</option>)}
                </select>
                <Button variant="outline" onClick={refetch} className="h-mx-12 px-mx-sm" aria-label="Atualizar equipe">
                    <RefreshCw size={14} />
                </Button>
                {canExportContacts && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleExportContacts}
                        disabled={exportingContacts}
                        className="h-mx-12 px-5 text-xs"
                    >
                        {exportingContacts ? (
                            <RefreshCw size={16} className="mr-2 animate-spin" />
                        ) : (
                            <Download size={16} className="mr-2" />
                        )}
                        Baixar XLSX
                    </Button>
                )}
                {canCreate && allowedRolesForCreate.length > 0 && (
                    <Button
                        onClick={() => setShowCreate(true)}
                        className="h-mx-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs"
                    >
                        <Plus size={16} className="mr-2" /> Novo Usuário
                    </Button>
                )}
            </Card>

            {/* Lista */}
            <Card className="border-none bg-white overflow-hidden">
                {loading ? (
                    <div className="p-mx-xl text-center">
                        <RefreshCw size={24} className="animate-spin mx-auto text-status-success-text" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="p-mx-xl text-center space-y-mx-sm">
                        <Users size={40} className="mx-auto text-muted-foreground opacity-30" />
                        <Typography variant="caption" tone="muted" className="">Nenhum usuário encontrado</Typography>
                    </div>
                ) : (
                    <div className="divide-y divide-border-default">
                        {filtered.map(user => {
                            const isInactive = user.is_active === false || user.active === false
                            return (
                                <div key={`${user.id}-${user.store_id || 'no-store'}`} className="flex items-center justify-between gap-mx-md p-mx-md hover:bg-surface-alt transition-colors">
                                    <div className="flex items-center gap-mx-sm flex-1 min-w-0">
                                        <Avatar
                                            src={user.avatar_url || undefined}
                                            alt={`Avatar de ${user.name || 'usuário'}`}
                                            fallback={user.name || '?'}
                                            size="lg"
                                            className={`rounded-2xl text-sm ${isInactive ? 'bg-text-tertiary text-white' : 'bg-brand-primary text-white'}`}
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-mx-sm">
                                                <Typography variant="caption" className="tracking-tight truncate">
                                                    {user.name || '—'}
                                                </Typography>
                                                {isInactive && <Badge variant="outline" className="text-mx-micro">Inativo</Badge>}
                                                {user.must_change_password && <Badge variant="warning" className="text-mx-micro">Trocar Senha</Badge>}
                                            </div>
                                            <div className="flex items-center gap-mx-md flex-wrap mt-1">
                                                <span className="flex items-center gap-mx-tiny text-mx-micro font-bold text-muted-foreground">
                                                    <Mail size={11} />{user.email}
                                                </span>
                                                {user.store_name && (
                                                    <span className="flex items-center gap-mx-tiny text-mx-micro font-bold text-muted-foreground">
                                                        <Building2 size={11} />{user.store_name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant={ROLE_BADGE[user.role || ''] || 'outline'} className="shrink-0">
                                        {ROLE_LABEL[user.role || ''] || user.role}
                                    </Badge>
                                    {canMutateExisting && (
                                        <div className="flex gap-mx-xs shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingUser(user)}
                                                aria-label={`Editar ${user.name}`}
                                                className="h-mx-10 w-mx-10 rounded-2xl"
                                            >
                                                <Pencil size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(user)}
                                                aria-label={`Remover ${user.name}`}
                                                className="h-mx-10 w-mx-10 rounded-2xl text-status-error-text hover:bg-status-error-surface"
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            {canCreate && (
                <UserCreationModal
                    isOpen={showCreate}
                    onClose={() => setShowCreate(false)}
                    onSuccess={refetch}
                    registerUser={registerUser}
                    storeId={isGlobalAdmin ? undefined : (storeId || undefined)}
                    lojas={lojas}
                />
            )}

            {canMutateExisting && (
                <EditUserModal
                    open={Boolean(editingUser)}
                    user={editingUser}
                    lojas={lojas}
                    allowedRoles={allowedRolesForCreate}
                    onClose={() => setEditingUser(null)}
                    onSubmit={updateTeamMember}
                />
            )}
        </div>
    )
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: 'success' | 'brand' | 'muted' }) {
    const toneColor = tone === 'success' ? 'text-status-success-text' :
        tone === 'brand' ? 'text-status-success-text' : 'text-foreground'
    return (
        <Card className="p-mx-md border-none bg-white">
            <div className="flex items-center gap-mx-sm">
                <div className={`w-mx-10 h-mx-10 rounded-2xl bg-surface-alt flex items-center justify-center ${toneColor}`}>
                    {icon}
                </div>
                <div>
                    <Typography variant="tiny" tone="muted" className="">{label}</Typography>
                    <Typography variant="h3" className="tabular-nums">{value}</Typography>
                </div>
            </div>
        </Card>
    )
}
