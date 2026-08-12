import { useState } from 'react'
import { Lock, RefreshCw, Save, Eye, EyeOff, ShieldCheck, AlertTriangle, KeyRound, LogOut, Smartphone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'
import { Card } from '@/components/molecules/Card'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Typography } from '@/components/atoms/Typography'
import { Badge } from '@/components/atoms/Badge'
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/auth/passwordPolicy'
import { requestToastConfirmation } from '@/lib/ui/confirmAction'

export function SegurancaTab() {
    const { changePassword, signOut, profile } = useAuth()
    const [form, setForm] = useState({ current: '', next: '', confirm: '' })
    const [showPasswords, setShowPasswords] = useState(false)
    const [saving, setSaving] = useState(false)

    const handleChangePassword = async () => {
        if (!isStrongPassword(form.next)) return toast.error(PASSWORD_POLICY_MESSAGE)
        if (form.next !== form.confirm) return toast.error('Confirmação de senha não confere.')
        setSaving(true)
        const { error } = await changePassword(form.next)
        setSaving(false)
        if (error) {
            toast.error(error)
        } else {
            toast.success('Senha alterada com sucesso!')
            setForm({ current: '', next: '', confirm: '' })
        }
    }

    const executeForceLogoutAll = async () => {
        await supabase.auth.signOut({ scope: 'global' })
        await signOut()
        toast.success('Todas as sessões foram encerradas.')
    }

    const handleForceLogoutAll = () => {
        requestToastConfirmation({
            key: `force-logout-all:${profile?.id || 'current'}`,
            title: 'Encerrar todas as sessões ativas?',
            description: 'Esta sessão também será encerrada e será necessário fazer login novamente.',
            label: 'Encerrar',
            onConfirm: executeForceLogoutAll,
        })
    }

    return (
        <div className="space-y-mx-lg">
            {/* Alterar senha */}
            <Card className="p-mx-lg md:p-mx-xl border-none bg-white">
                <header className="flex items-center gap-mx-sm pb-mx-md border-b border-border mb-mx-lg">
                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-brand-primary-subtle text-status-success-text flex items-center justify-center border border-brand-primary/20 shadow-none">
                        <KeyRound size={26} />
                    </div>
                    <div>
                        <Typography variant="h3" className="tracking-tight">Alterar Credenciais</Typography>
                        <Typography variant="caption" tone="muted" className="">Senha de acesso ao sistema</Typography>
                    </div>
                </header>

                <div className="grid md:grid-cols-2 gap-mx-lg">
                    <div className="space-y-mx-sm md:col-span-2">
                        <Typography variant="caption" tone="muted" className="ml-2">Nova Senha</Typography>
                        <div className="relative">
                            <Lock size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="settings-new-password"
                                name="new-password"
                                type={showPasswords ? 'text' : 'password'}
                                minLength={6}
                                autoComplete="new-password"
                                value={form.next}
                                onChange={e => setForm(p => ({ ...p, next: e.target.value }))}
                                className="!h-mx-14 !pl-mx-12 pr-mx-12 font-bold"
                                placeholder="Mínimo 6 caracteres"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswords(s => !s)}
                                className="absolute right-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground hover:text-status-success-text"
                                aria-label={showPasswords ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-mx-sm md:col-span-2">
                        <Typography variant="caption" tone="muted" className="ml-2">Confirmar Nova Senha</Typography>
                        <div className="relative">
                            <Lock size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="settings-confirm-password"
                                name="confirm-password"
                                type={showPasswords ? 'text' : 'password'}
                                autoComplete="new-password"
                                value={form.confirm}
                                onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
                                className="!h-mx-14 !pl-mx-12 font-bold"
                                placeholder="Repita a senha"
                            />
                        </div>
                    </div>
                </div>

                <div className="mt-mx-lg pt-mx-md border-t border-border flex items-center justify-end">
                    <Button
                        onClick={handleChangePassword}
                        disabled={saving || !form.next || !form.confirm}
                        className="h-mx-xl px-8 rounded-mx-full"
                    >
                        {saving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <ShieldCheck size={16} className="mr-2" />}
                        Atualizar Senha
                    </Button>
                </div>
            </Card>

            {/* must_change_password warning */}
            {profile?.must_change_password && (
                <Card className="p-mx-md bg-status-warning-surface border border-status-warning/30">
                    <div className="flex items-start gap-mx-sm">
                        <AlertTriangle size={20} className="text-status-warning-text shrink-0 mt-0.5" />
                        <div>
                            <Typography variant="caption" tone="warning" className="">Troca de Senha Obrigatória</Typography>
                            <Typography variant="tiny" tone="muted" className="font-bold leading-relaxed">
                                Você está usando uma senha provisória. Por favor, defina uma senha pessoal acima.
                            </Typography>
                        </div>
                    </div>
                </Card>
            )}

            {/* Sessões ativas */}
            <Card className="p-mx-lg border-none bg-white">
                <header className="flex items-center gap-mx-sm pb-mx-md border-b border-border mb-mx-lg">
                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-gray-50 text-muted-foreground flex items-center justify-center border border-border shadow-none">
                        <Smartphone size={26} />
                    </div>
                    <div>
                        <Typography variant="h3" className="tracking-tight">Sessões Ativas</Typography>
                        <Typography variant="caption" tone="muted" className="">Dispositivos conectados</Typography>
                    </div>
                </header>

                <div className="space-y-mx-md">
                    <div className="flex items-center justify-between p-mx-md bg-gray-50 rounded-2xl border border-border-subtle">
                        <div className="flex items-center gap-mx-sm">
                            <div className="w-mx-10 h-mx-10 rounded-mx-full bg-status-success/10 text-status-success flex items-center justify-center">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <Typography variant="caption" className="">Esta sessão</Typography>
                                <Typography variant="tiny" tone="muted" className="font-bold">Sessão expira em 24h por protocolo de segurança.</Typography>
                            </div>
                        </div>
                        <Badge variant="success" className="">Ativa</Badge>
                    </div>

                    <Button
                        variant="outline"
                        onClick={handleForceLogoutAll}
                        className="w-full h-mx-xl border-status-error/30 text-status-error-text hover:bg-status-error-surface"
                    >
                        <LogOut size={16} className="mr-2" /> Encerrar todas as sessões
                    </Button>
                </div>
            </Card>

            {/* 2FA placeholder */}
            <Card className="p-mx-lg border-none bg-white">
                <header className="flex items-center gap-mx-sm pb-mx-md border-b border-border mb-mx-lg">
                    <div className="w-mx-14 h-mx-14 rounded-2xl bg-brand-primary-subtle text-status-success-text flex items-center justify-center border border-brand-primary/20 shadow-none">
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <Typography variant="h3" className="tracking-tight">Autenticação em Dois Fatores</Typography>
                        <Typography variant="caption" tone="muted" className="">Recurso não habilitado</Typography>
                    </div>
                </header>
                <div className="flex items-center justify-between">
                    <Typography variant="caption" tone="muted" className="font-bold leading-relaxed">
                        2FA ainda não está disponível neste ambiente. A segurança ativa hoje é feita por senha com mínimo de 6 caracteres, troca obrigatória e encerramento global de sessões.
                    </Typography>
                    <Badge variant="outline" className="shrink-0">Indisponível</Badge>
                </div>
            </Card>
        </div>
    )
}
