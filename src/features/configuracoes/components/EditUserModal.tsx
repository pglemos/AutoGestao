import { useEffect, useState } from 'react'
import { Save, RefreshCw, Mail, Phone, User as UserIcon, Shield, Building2, KeyRound } from 'lucide-react'
import { Modal } from '@/components/organisms/Modal'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import type { User, UserRole, Store } from '@/types/database'
import type { TeamMemberUpdateFields } from '@/hooks/useTeam'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'
import { requestPasswordRecovery } from '@/lib/auth/passwordRecovery'

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
    { value: 'administrador_geral', label: 'Admin Master MX' },
    { value: 'administrador_mx', label: 'Admin MX' },
    { value: 'consultor_mx', label: 'Consultor MX' },
    { value: 'dono', label: 'Dono' },
    { value: 'gerente', label: 'Gerente' },
    { value: 'vendedor', label: 'Vendedor' },
]

const INTERNAL_ROLES: UserRole[] = ['administrador_geral', 'administrador_mx', 'consultor_mx']

interface EditUserModalProps {
    open: boolean
    user: (User & { store_id?: string }) | null
    lojas: Store[]
    onClose: () => void
    onSubmit: (userId: string, updates: TeamMemberUpdateFields) => Promise<{ error: string | null }>
    allowedRoles: UserRole[]
}

export function EditUserModal({ open, user, lojas, onClose, onSubmit, allowedRoles }: EditUserModalProps) {
    const [form, setForm] = useState<TeamMemberUpdateFields>({})
    const [saving, setSaving] = useState(false)
    const [resetting, setResetting] = useState(false)

    useEffect(() => {
        if (!user) return
        setForm({
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role,
            store_id: user.store_id,
            active: user.active,
        })
    }, [user])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return
        setSaving(true)
        const { error } = await onSubmit(user.id, form)
        setSaving(false)
        if (error) toast.error(error)
        else {
            toast.success('Usuário atualizado!')
            onClose()
        }
    }

    const executeResetPassword = async () => {
        if (!user) return
        setResetting(true)
        const { error } = await supabase
            .from('usuarios')
            .update({ must_change_password: true })
            .eq('id', user.id)
        setResetting(false)
        if (error) toast.error(error.message)
        else toast.success('Próximo login exigirá nova senha.')
    }

    const handleResetPassword = () => {
        if (!user) return
        requestToastConfirmation({
            key: `force-password-change:${user.id}`,
            title: `Forçar troca de senha de ${user.name}?`,
            description: 'O usuário será obrigado a definir nova senha no próximo login.',
            label: 'Forçar',
            onConfirm: executeResetPassword,
        })
    }

    const executeSendMagicLink = async () => {
        if (!user) return
        try {
            await requestPasswordRecovery(user.email)
            toast.success(`E-mail de redefinição enviado para ${user.email}`)
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Não foi possível enviar o e-mail de redefinição.')
        }
    }

    const handleSendMagicLink = () => {
        if (!user) return
        requestToastConfirmation({
            key: `send-password-reset:${user.id}`,
            title: `Enviar redefinição para ${user.email}?`,
            description: 'O usuário receberá um link de redefinição de senha por e-mail.',
            label: 'Enviar',
            onConfirm: executeSendMagicLink,
        })
    }

    const isInternal = INTERNAL_ROLES.includes(form.role as UserRole)

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Editar Integrante"
            description={user ? `${user.name} — ${user.email}` : ''}
            size="xl"
            footer={
                <>
                    <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>CANCELAR</Button>
                    <Button type="submit" form="edit-user-form" disabled={saving}>
                        {saving ? <RefreshCw size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
                        SALVAR
                    </Button>
                </>
            }
        >
            <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-mx-lg">
                <div className="grid md:grid-cols-2 gap-mx-md">
                    <FormGroup icon={<UserIcon size={16} />} label="Nome">
                        <Input
                            id="edit-user-name"
                            name="name"
                            value={form.name || ''}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            className="!pl-mx-12 !h-mx-14 font-bold uppercase"
                        />
                    </FormGroup>

                    <FormGroup icon={<Mail size={16} />} label="E-mail">
                        <Input
                            id="edit-user-email"
                            name="email"
                            type="email"
                            value={form.email || ''}
                            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            className="!pl-mx-12 !h-mx-14 font-bold"
                        />
                    </FormGroup>

                    <FormGroup icon={<Phone size={16} />} label="Telefone">
                        <Input
                            id="edit-user-phone"
                            name="phone"
                            value={form.phone || ''}
                            onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                            className="!pl-mx-12 !h-mx-14 font-bold"
                        />
                    </FormGroup>

                    <FormGroup icon={<Shield size={16} />} label="Papel/Hierarquia">
                        <select
                            id="edit-user-role"
                            name="role"
                            value={form.role || ''}
                            onChange={e => setForm(p => ({ ...p, role: e.target.value as UserRole }))}
                            className="w-full h-mx-14 pl-mx-12 pr-mx-sm bg-gray-50 border border-gray-200 rounded-2xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
                        >
                            {ROLE_OPTIONS.filter(r => allowedRoles.includes(r.value)).map(r => (
                                <option key={r.value} value={r.value}>{r.label.toUpperCase()}</option>
                            ))}
                        </select>
                    </FormGroup>

                    {!isInternal && (
                        <FormGroup icon={<Building2 size={16} />} label="Loja">
                            <select
                                id="edit-user-store"
                                name="store_id"
                                value={form.store_id || ''}
                                onChange={e => setForm(p => ({ ...p, store_id: e.target.value }))}
                                className="w-full h-mx-14 pl-mx-12 pr-mx-sm bg-gray-50 border border-gray-200 rounded-2xl font-bold uppercase text-xs focus:outline-none focus:border-brand-primary appearance-none cursor-pointer"
                            >
                                <option value="">Selecione a loja</option>
                                {lojas.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </FormGroup>
                    )}

                    <div className="md:col-span-2">
                        <label htmlFor="user-active" className="flex items-start gap-mx-sm rounded-2xl border border-gray-200 bg-gray-50 p-mx-md cursor-pointer">
                            <input
                                id="user-active"
                                name="active"
                                type="checkbox"
                                checked={Boolean(form.active)}
                                onChange={e => setForm(p => ({ ...p, active: e.target.checked }))}
                                className="mt-1 h-mx-sm w-mx-sm accent-brand-primary"
                            />
                            <span className="flex-1">
                                <span className="block text-sm font-bold uppercase tracking-widest text-foreground">Usuário ativo</span>
                                <span className="block text-xs font-bold text-muted-foreground mt-1">
                                    Desativar bloqueia o login mas preserva o histórico operacional.
                                </span>
                            </span>
                        </label>
                    </div>
                </div>

                <div className="pt-mx-md border-t border-gray-200 space-y-mx-sm">
                    <Typography variant="caption" tone="muted" className="">Ações de Segurança</Typography>
                    <div className="flex flex-wrap gap-mx-sm">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleResetPassword}
                            disabled={resetting}
                            className="h-mx-xl text-xs"
                        >
                            <KeyRound size={14} className="mr-2" />
                            {resetting ? 'Aplicando...' : 'Forçar troca de senha'}
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleSendMagicLink}
                            className="h-mx-xl text-xs"
                        >
                            <Mail size={14} className="mr-2" />
                            Enviar e-mail de redefinição
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}

function FormGroup({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-mx-xs">
            <Typography variant="tiny" tone="muted" className="px-1">{label}</Typography>
            <div className="relative">
                <span className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none">{icon}</span>
                {children}
            </div>
        </div>
    )
}
