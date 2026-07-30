import { useNotifications, useSystemBroadcasts } from '@/hooks/useData';
import { useStores } from '@/hooks/useTeam'
import { useState, useCallback } from 'react'
import { toast } from '@/lib/toast'
import { 
    Bell, Plus, X, Send, Building2, Globe, AlertCircle, 
    Calendar, RefreshCw, Zap, ShieldCheck, Mail, Users
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/molecules/Card'

type NotificationTargetRole = 'todos' | 'dono' | 'gerente' | 'vendedor'
const NOTIFICATION_TARGET_ROLES: NotificationTargetRole[] = ['todos', 'dono', 'gerente', 'vendedor']

export default function ConsultorNotificacoes() {
    const { sendNotification } = useNotifications()
    const { broadcasts, loading, refetch } = useSystemBroadcasts()
    const { lojas } = useStores()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ 
        title: '', 
        message: '', 
        target_type: 'all' as 'all' | 'store', 
        target_store_id: '',
        target_role: 'todos' as NotificationTargetRole
    })
    const [saving, setSaving] = useState(false)
    const [isRefetching, setIsRefetching] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title || !form.message) { toast.error('Preencha os campos obrigatórios.'); return }
        setSaving(true)
        
        const { error } = await sendNotification({ 
            store_id: form.target_type === 'store' ? form.target_store_id : undefined,
            target_role: form.target_role,
            title: form.title,
            message: form.message,
            type: 'system',
            priority: 'medium'
        })
        
        setSaving(false)
        if (error) { toast.error(error); return }
        toast.success('Comunicado disparado na rede!')
        setShowForm(false)
        setForm({ title: '', message: '', target_type: 'all', target_store_id: '', target_role: 'todos' })
        refetch()
    }

    const handleRefresh = useCallback(async () => {
        setIsRefetching(true); await refetch(); setIsRefetching(false)
        toast.success('Gateway sincronizado!')
    }, [refetch])

    if (loading) return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-surface-alt">
            <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-brand-primary mb-6" />
            <Typography variant="caption" tone="muted" className="animate-pulse">Sincronizando Gateway...</Typography>
        </div>
    )

    return (
        <main className="w-full h-full flex flex-col gap-mx-lg p-mx-lg overflow-y-auto no-scrollbar bg-surface-alt">
            
            {/* Header / Alerts Toolbar */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-mx-lg border-b border-border-default pb-10 shrink-0">
                <div className="flex flex-col gap-mx-tiny">
                    <div className="flex items-center gap-mx-sm">
                        <div className="w-mx-xs h-mx-10 bg-brand-primary rounded-mx-full shadow-mx-md" aria-hidden="true" />
                        <Typography variant="h1">Central de <span className="text-mx-green-700">Mensagens</span></Typography>
                    </div>
                    <Typography variant="caption" className="pl-mx-md">COMUNICAÇÃO ESTRATÉGICA DE REDE</Typography>
                </div>

                <div className="flex items-center gap-mx-sm shrink-0">
                    <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Atualizar" className="h-mx-xl w-mx-xl">
                        <RefreshCw size={20} className={cn(isRefetching && "animate-spin")} />
                    </Button>
                    <Button onClick={() => setShowForm(true)} className="h-mx-xl px-8 shadow-mx-lg">
                        <Plus size={18} className="mr-2" /> DISPARAR ALERTA
                    </Button>
                </div>
            </header>

            <AnimatePresence>
                {showForm && (
                    <motion.section initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="shrink-0 mb-10">
                        <form onSubmit={handleSubmit}>
                            <Card className="p-mx-10 md:p-14 border-none bg-white overflow-hidden relative">
                                <div className="absolute top-mx-0 right-mx-0 w-mx-96 h-mx-96 bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-48 -mt-48" />
                                
                                <header className="flex items-center justify-between border-b border-border-default pb-8 mb-10 relative z-10">
                                    <div className="flex items-center gap-mx-md">
                                        <div className="w-mx-14 h-mx-14 rounded-mx-xl bg-pure-black text-white flex items-center justify-center shadow-mx-lg transform rotate-2"><Mail size={24} className="text-brand-primary" /></div>
                                        <div>
                                            <Typography variant="h3">Compor Comunicado</Typography>
                                            <Typography variant="caption" tone="muted" className="mt-1">INTELIGÊNCIA DE REDE</Typography>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} aria-label="Fechar" className="rounded-mx-full w-mx-xl h-mx-xl bg-surface-alt hover:bg-white shadow-sm"><X size={24} /></Button>
                                </header>

                                <div className="grid lg:grid-cols-2 gap-mx-14 relative z-10">
                                    <div className="space-y-mx-lg">
                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">Assunto Estratégico</Typography>
                                            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Alerta de Ritmo Semanal" required className="!h-14 px-6 font-bold" />
                                        </div>
                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">Corpo da Mensagem</Typography>
                                            <textarea 
                                                value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                                                className="w-full bg-surface-alt border border-border-default rounded-mx-xl p-mx-lg text-sm font-bold text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-brand-primary focus:ring-8 focus:ring-brand-primary/5 transition-all resize-none shadow-inner h-mx-48"
                                                placeholder="Detalhes técnicos ou operacionais..." required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-mx-10">
                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">Público Alvo (Segmentação)</Typography>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-sm">
                                                <button type="button" onClick={() => setForm(p => ({ ...p, target_type: 'all' }))} className={cn("p-mx-lg rounded-mx-2xl border-2 transition-all flex flex-col items-center justify-center gap-mx-sm text-center group", form.target_type === 'all' ? "bg-mx-indigo-50 border-brand-primary shadow-mx-lg" : "bg-white border-border-default hover:border-brand-primary/20")}>
                                                    <div className={cn("w-mx-xl h-mx-xl rounded-mx-xl flex items-center justify-center shadow-sm transition-all", form.target_type === 'all' ? "bg-brand-primary text-white" : "bg-surface-alt text-text-tertiary group-hover:bg-white")}>
                                                        <Globe size={22} />
                                                    </div>
                                                    <Typography variant="caption" className={cn("font-black tracking-widest", form.target_type === 'all' ? "text-brand-primary" : "text-text-tertiary")}>TODA A REDE</Typography>
                                                </button>
                                                <button type="button" onClick={() => setForm(p => ({ ...p, target_type: 'store' }))} className={cn("p-mx-lg rounded-mx-2xl border-2 transition-all flex flex-col items-center justify-center gap-mx-sm text-center group", form.target_type === 'store' ? "bg-status-warning-surface border-status-warning shadow-mx-lg" : "bg-white border-border-default hover:border-brand-primary/20")}>
                                                    <div className={cn("w-mx-xl h-mx-xl rounded-mx-xl flex items-center justify-center shadow-sm transition-all", form.target_type === 'store' ? "bg-status-warning text-white" : "bg-surface-alt text-text-tertiary group-hover:bg-white")}>
                                                        <Building2 size={22} />
                                                    </div>
                                                    <Typography variant="caption" className={cn("font-black tracking-widest", form.target_type === 'store' ? "text-status-warning" : "text-text-tertiary")}>UNIDADE ALVO</Typography>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">Nível Hierárquico</Typography>
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-mx-xs">
                                                {NOTIFICATION_TARGET_ROLES.map(role => (
                                                    <Button key={role} type="button" variant={form.target_role === role ? 'secondary' : 'outline'} onClick={() => setForm(p => ({ ...p, target_role: role }))} className="h-mx-10 rounded-mx-xl text-mx-micro font-black uppercase px-0">{role}</Button>
                                                ))}
                                            </div>
                                        </div>

                                        {form.target_type === 'store' && (
                                            <div className="space-y-mx-sm">
                                                <Typography variant="caption" tone="muted" className="ml-2">Selecionar Loja</Typography>
                                                <select aria-label="Selecionar Loja" value={form.target_store_id} onChange={e => setForm(p => ({ ...p, target_store_id: e.target.value }))} required className="w-full h-mx-14 bg-surface-alt border border-status-warning/20 rounded-mx-xl px-6 text-sm font-bold text-text-primary focus:border-status-warning transition-all appearance-none cursor-pointer shadow-inner">
                                                    <option value="">Selecione a unidade...</option>
                                                    {lojas.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <footer className="pt-10 flex justify-end gap-mx-sm border-t border-border-default mt-10 relative z-10">
                                    <Button type="submit" disabled={saving} className="h-mx-2xl px-14 rounded-mx-full text-mx-tiny">
                                        {saving ? <RefreshCw className="animate-spin mr-3" /> : <Send size={20} className="mr-3" />} DISPARAR NA REDE
                                    </Button>
                                </footer>
                            </Card>
                        </form>
                    </motion.section>
                )}
            </AnimatePresence>

            {/* Campaign History Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-mx-lg pb-32" aria-live="polite">
                {broadcasts.length === 0 ? (
                    <Card className="col-span-full py-40 rounded-mx-4xl text-center border-dashed border-2 bg-white/50 flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="w-mx-3xl h-mx-3xl rounded-mx-3xl bg-white shadow-mx-xl flex items-center justify-center mb-8 border border-border-default group-hover:rotate-12 transition-transform duration-500">
                            <Bell size={40} className="text-text-tertiary/20" />
                        </div>
                        <Typography variant="h2" className="mb-4">Mural Vazio</Typography>
                        <Typography variant="p" tone="muted" className="max-w-xs mx-auto">Nenhum comunicado ativo no histórico da malha.</Typography>
                    </Card>
                ) : (
                    broadcasts.map((n, i) => (
                        <motion.article key={n.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                            <Card className="p-mx-lg h-full border-none bg-white group hover:shadow-mx-xl transition-all relative overflow-hidden flex flex-col">
                                <div className="absolute top-mx-0 right-mx-0 w-mx-4xl h-mx-4xl bg-brand-primary/5 rounded-mx-full blur-mx-lg -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                                
                                <header className="flex items-start justify-between mb-8 border-b border-border-default pb-6 relative z-10">
                                    <div className="w-mx-xl h-mx-xl rounded-mx-2xl bg-surface-alt flex items-center justify-center text-text-tertiary group-hover:bg-pure-black group-hover:text-white transition-all shadow-inner transform group-hover:rotate-6">
                                        <Zap size={20} />
                                    </div>
                                    <div className="flex flex-col items-end gap-mx-xs">
                                        <Badge variant={!n.store_id ? 'brand' : 'warning'} className="px-4 py-1 rounded-mx-full text-mx-micro">
                                            {!n.store_id ? 'REDE TODA' : 'UNIDADE'}
                                        </Badge>
                                        <Typography variant="caption" className="text-mx-micro opacity-30">SINC: ADMIN</Typography>
                                    </div>
                                </header>

                                <div className="flex-1 mb-8 relative z-10 space-y-mx-xs">
                                    <Typography variant="h3" className="text-lg leading-tight group-hover:text-brand-primary transition-colors line-clamp-2">{n.title}</Typography>
                                    <Typography variant="p" tone="muted" className="text-xs font-bold leading-relaxed line-clamp-4">"{n.message}"</Typography>
                                </div>

                                <footer className="pt-6 border-t border-border-default flex items-center justify-between mt-auto relative z-10">
                                    <div className="flex items-center gap-mx-xs text-mx-micro font-black text-text-tertiary uppercase tracking-widest">
                                        <Calendar size={14} className="text-brand-primary" /> {new Date(n.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    <Typography variant="mono" className="text-mx-tiny opacity-30">{new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Typography>
                                </footer>
                            </Card>
                        </motion.article>
                    ))
                )}
            </div>
        </main>
    )
}
