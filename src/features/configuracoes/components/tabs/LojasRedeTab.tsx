import { useMemo, useState } from 'react'
import { Plus, Search, Trash2, Edit3, RefreshCw, Building2, Power, ShieldCheck, Users } from 'lucide-react'
import { useStores, useStoresStats } from '@/hooks/useTeam'
import { isAdministradorMx, useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { StoreEditModal } from '@/features/admin/components/StoreEditModal'
import { CreateStoreModal, type NewStoreDraft } from '@/components/organisms/CreateStoreModal'
import type { Store } from '@/types/database'
import type { StoreUpdateFields } from '@/hooks/useTeam'
import type { TabContext } from '@/features/configuracoes/types'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'

export function LojasRedeTab({ isReadOnly }: TabContext) {
    const { role } = useAuth()
    const canManage = !isReadOnly && isAdministradorMx(role)
    const { lojas, loading, createStore, updateStore, deleteStore, toggleStoreStatus, refetch } = useStores()
    const { stats } = useStoresStats()

    const [showCreate, setShowCreate] = useState(false)
    // O modal canônico deixa o rascunho com o chamador — a versão que esta aba
    // usava guardava o estado por dentro, e era a única das três a fazer isso.
    const [newStore, setNewStore] = useState<NewStoreDraft>({ name: '', manager_email: '' })
    const [creatingStore, setCreatingStore] = useState(false)

    const closeCreate = () => {
        setShowCreate(false)
        setNewStore({ name: '', manager_email: '' })
    }

    const handleCreateStore = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (creatingStore) return
        setCreatingStore(true)
        const { error } = await createStore(newStore.name, newStore.manager_email || undefined)
        setCreatingStore(false)
        if (error) {
            toast.error(error)
            return
        }
        toast.success('Loja criada com sucesso.')
        closeCreate()
    }
    const [editing, setEditing] = useState<Store | null>(null)
    const [savingEdit, setSavingEdit] = useState(false)
    const [filter, setFilter] = useState('')
    const [showInactive, setShowInactive] = useState(false)

    const filtered = useMemo(() => {
        return lojas.filter(s =>
            (showInactive || s.active) &&
            (!filter || s.name.toLowerCase().includes(filter.toLowerCase()) || s.manager_email?.toLowerCase().includes(filter.toLowerCase()))
        )
    }, [lojas, filter, showInactive])

    const handleEditSubmit = async (id: string, updates: Partial<StoreUpdateFields>) => {
        setSavingEdit(true)
        const { error } = await updateStore(id, updates)
        setSavingEdit(false)
        if (!error) setEditing(null)
    }

    const executeDelete = async (store: Store) => {
        const { error } = await deleteStore(store.id)
        if (error) toast.error(error)
        else toast.success('Loja arquivada.')
    }

    const handleDelete = (store: Store) => {
        requestToastConfirmation({
            key: `archive-store-settings:${store.id}`,
            title: `Arquivar ${store.name}?`,
            description: 'A loja ficará inativa, mas o histórico será preservado.',
            label: 'Arquivar',
            onConfirm: () => executeDelete(store),
        })
    }

    const handleToggle = async (store: Store) => {
        const { error } = await toggleStoreStatus(store.id, !store.active)
        if (error) toast.error(error)
        else toast.success(store.active ? 'Loja desativada.' : 'Loja ativada.')
    }

    const totals = useMemo(() => ({
        total: lojas.length,
        ativas: lojas.filter(s => s.active).length,
        inativas: lojas.filter(s => !s.active).length,
        vendedores: Object.values(stats).reduce((acc, s) => acc + (s.sellers || 0), 0),
    }), [lojas, stats])

    return (
        <div className="space-y-mx-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-mx-md">
                <Mini icon={<Building2 size={18} />} label="Lojas" value={totals.total} />
                <Mini icon={<ShieldCheck size={18} />} label="Ativas" value={totals.ativas} tone="success" />
                <Mini icon={<Power size={18} />} label="Inativas" value={totals.inativas} tone="error" />
                <Mini icon={<Users size={18} />} label="Vendedores" value={totals.vendedores} tone="brand" />
            </div>

            <Card className="p-mx-md border-none bg-white flex flex-col md:flex-row items-stretch md:items-center gap-mx-md">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="store-search"
                        name="store-search"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="Buscar por nome ou e-mail do gestor..."
                        className="!pl-mx-10 !h-mx-12 font-bold"
                    />
                </div>
                <label className="flex items-center gap-mx-xs cursor-pointer text-xs font-bold uppercase tracking-widest">
                    <input
                        id="show-inactive-stores"
                        name="show-inactive-stores"
                        type="checkbox"
                        checked={showInactive}
                        onChange={e => setShowInactive(e.target.checked)}
                        className="accent-brand-primary"
                    />
                    Mostrar inativas
                </label>
                <Button variant="outline" onClick={refetch} className="h-mx-12 px-mx-sm" aria-label="Atualizar lojas">
                    <RefreshCw size={14} />
                </Button>
                {canManage && (
                    <Button onClick={() => setShowCreate(true)} className="h-mx-12 px-6 rounded-2xl font-bold uppercase tracking-widest text-xs">
                        <Plus size={16} className="mr-2" /> Nova Loja
                    </Button>
                )}
            </Card>

            <Card className="border-none bg-white overflow-hidden">
                {loading ? (
                    <div className="p-mx-xl text-center"><RefreshCw size={24} className="animate-spin mx-auto text-status-success-text" /></div>
                ) : filtered.length === 0 ? (
                    <div className="p-mx-xl text-center space-y-mx-sm">
                        <Building2 size={40} className="mx-auto text-muted-foreground opacity-30" />
                        <Typography variant="caption" tone="muted" className="">Nenhuma loja encontrada</Typography>
                    </div>
                ) : (
                    <div className="divide-y divide-border-default">
                        {filtered.map(store => {
                            const s = stats[store.id] || { sellers: 0, checkedIn: 0, disciplinePct: 0 }
                            return (
                                <div key={store.id} className="flex items-center justify-between gap-mx-md p-mx-md hover:bg-surface-alt transition-colors">
                                    <div className="flex items-center gap-mx-sm flex-1 min-w-0">
                                        <div className={`w-mx-12 h-mx-12 rounded-2xl flex items-center justify-center text-white shrink-0 ${store.active ? 'bg-brand-primary' : 'bg-text-tertiary'}`}>
                                            <Building2 size={20} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <Typography variant="caption" className="tracking-tight truncate">{store.name}</Typography>
                                            <div className="flex items-center gap-mx-md flex-wrap mt-1">
                                                {store.manager_email && (
                                                    <span className="text-mx-micro font-bold text-muted-foreground">{store.manager_email}</span>
                                                )}
                                                <span className="text-mx-micro font-bold text-muted-foreground">
                                                    {s.sellers} vendedor{s.sellers !== 1 ? 'es' : ''} · {s.disciplinePct}% disciplina
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant={store.active ? 'success' : 'outline'} className="shrink-0">
                                        {store.active ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                    {canManage && (
                                        <div className="flex gap-mx-xs shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleToggle(store)}
                                                aria-label={store.active ? 'Desativar' : 'Ativar'}
                                                className="h-mx-10 w-mx-10 rounded-2xl"
                                            >
                                                <Power size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditing(store)}
                                                aria-label="Editar"
                                                className="h-mx-10 w-mx-10 rounded-2xl"
                                            >
                                                <Edit3 size={16} />
                                            </Button>
                                            {role === 'administrador_geral' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(store)}
                                                    aria-label="Excluir"
                                                    className="h-mx-10 w-mx-10 rounded-2xl text-status-error-text hover:bg-status-error-surface"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </Card>

            {canManage && (
                <>
                    <CreateStoreModal
                        open={showCreate}
                        newStore={newStore}
                        setNewStore={setNewStore}
                        creating={creatingStore}
                        onClose={closeCreate}
                        onSubmit={handleCreateStore}
                    />
                    <StoreEditModal
                        open={Boolean(editing)}
                        store={editing}
                        saving={savingEdit}
                        onClose={() => setEditing(null)}
                        onSubmit={handleEditSubmit}
                    />
                </>
            )}
        </div>
    )
}

function Mini({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: 'success' | 'brand' | 'error' }) {
    const toneColor = tone === 'success' ? 'text-status-success-text' :
        tone === 'brand' ? 'text-status-success-text' :
        tone === 'error' ? 'text-status-error-text' : 'text-foreground'
    return (
        <Card className="p-mx-md border-none bg-white">
            <div className="flex items-center gap-mx-sm">
                <div className={`w-mx-10 h-mx-10 rounded-2xl bg-surface-alt flex items-center justify-center ${toneColor}`}>{icon}</div>
                <div>
                    <Typography variant="tiny" tone="muted" className="">{label}</Typography>
                    <Typography variant="h3" className="tabular-nums">{value}</Typography>
                </div>
            </div>
        </Card>
    )
}
