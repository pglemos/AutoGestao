import { useNavigate } from 'react-router-dom'
import { usePDISessions } from '@/hooks/usePDI_MX'
import { useAuth } from '@/hooks/useAuth'
import { canManagePDI as canManagePDICapability } from '@/lib/auth/capabilities'
import { useState, useCallback, useMemo } from 'react'
import { 
    Plus, Calendar, TrendingUp, 
    Search, RefreshCw, Printer, ChevronRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { toast } from '@/lib/toast'
import { format, parseISO } from 'date-fns'
import { cn } from "@/lib/utils"
import { Badge } from "@/components/atoms/Badge"
import { Typography } from '@/components/atoms/Typography'
import { Skeleton } from '@/components/atoms/Skeleton'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Avatar } from '@/components/atoms/Avatar'
import { Card } from '@/components/molecules/Card'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { WizardPDI } from '@/features/pdi/WizardPDI'
import { PageTemplate } from '@/components/templates/PageTemplate'

const statusCfg = {
    aberto: { variant: 'danger' as const, label: 'ABERTO' },
    em_andamento: { variant: 'warning' as const, label: 'EM EXECUÇÃO' },
    concluido: { variant: 'success' as const, label: 'CONCLUÍDO' },
    draft: { variant: 'warning' as const, label: 'RASCUNHO' }
}

function formatSafeDate(value?: string | null) {
    if (!value) return '--/--'
    try {
        return format(parseISO(value), 'dd/MM/yy')
    } catch {
        return '--/--'
    }
}

export default function GerentePDI() {
    const { role } = useAuth()
    const navigate = useNavigate()
    const { pdis, loading, refetch } = usePDISessions()
    const [showForm, setShowForm] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isRefetching, setIsRefetching] = useState(false)
    const isOwner = role === 'dono'
    const isManager = role === 'gerente'
    const canManagePDI = canManagePDICapability(role)

    const handleRefresh = useCallback(async () => {
        setIsRefetching(true)
        try {
            await refetch()
            toast.success('Matriz de PDI sincronizada.')
        } catch {
            toast.error('Não foi possível atualizar os PDIs.')
        } finally {
            setIsRefetching(false)
        }
    }, [refetch])

    const filteredPDIs = useMemo(() => {
        const term = searchTerm.toLowerCase()
        return pdis.filter(p =>
            (p.meta_6m || '').toLowerCase().includes(term) ||
            (p.meta_12m || '').toLowerCase().includes(term) ||
            (p.meta_24m || '').toLowerCase().includes(term) ||
            (p.seller_name || '').toLowerCase().includes(term) ||
            (p.store_name || '').toLowerCase().includes(term)
        )
    }, [pdis, searchTerm])

    if (loading) return (
        <PageTemplate
            scrollerClassName="animate-in fade-in duration-500"
            as="div"
            width="dashboard"
            className="flex flex-col gap-mx-lg"
            aria-busy="true"
            aria-live="polite"
            aria-label="Carregando PDI"
        >
            <SellerPageHeader
                icon={TrendingUp}
                title={isOwner ? 'PDI da Rede' : 'Evolução do Vendedor'}
                subtitle="Carregando planos de desenvolvimento..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-mx-lg">
                <Skeleton className="h-mx-64 rounded-2xl" />
                <Skeleton className="h-mx-64 rounded-2xl" />
                <Skeleton className="h-mx-64 rounded-2xl" />
            </div>
        </PageTemplate>
    )

    return (
        <PageTemplate as="div" width="dashboard" className="flex flex-col gap-mx-lg">
            <SellerPageHeader
                icon={TrendingUp}
                title={isOwner ? 'PDI da Rede' : 'Evolução do Vendedor'}
                subtitle={isOwner ? 'Acompanhamento executivo dos planos de desenvolvimento' : 'Planos de desenvolvimento da equipe'}
                actions={(
                    <div className="flex flex-col sm:flex-row items-center gap-mx-sm shrink-0 w-full sm:w-auto">
                        <div className="relative group w-full sm:w-mx-sidebar-expanded">
                            <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors" />
                            <label htmlFor="pdi-search" className="sr-only">Buscar plano de PDI</label>
                            <Input
                                id="pdi-search"
                                name="pdi-search"
                                placeholder="BUSCAR PLANO..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-12 text-caption font-bold"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Atualizar lista de PDIs" className="h-mx-xl w-mx-xl bg-white hover:bg-surface-alt">
                            <RefreshCw size={20} className={cn(isRefetching && "animate-spin")} />
                        </Button>
                        {canManagePDI && (
                            <Button onClick={() => setShowForm(true)} className="h-mx-xl px-8 shadow-sm bg-brand-primary hover:bg-brand-primary-hover font-bold text-sm rounded-2xl text-white">
                                <Plus size={18} className="mr-2" /> NOVO PDI
                            </Button>
                        )}
                    </div>
                )}
            />

            {isManager && (
                <Card className="border border-status-info/20 bg-status-info-surface p-mx-md">
                    <Typography variant="h3" className=" text-status-info-text">Escopo do gerente</Typography>
                    <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
                        Esta tela mostra os PDIs da sua unidade. Use o botão de novo PDI para conduzir desenvolvimento da equipe; Admin MX e Dono usam a mesma rota em escopos diferentes.
                    </Typography>
                </Card>
            )}

            {isOwner && (
                <Card className="border border-status-info/20 bg-status-info-surface p-mx-md">
                    <Typography variant="h3" className=" text-status-info-text">PDI como acompanhamento do Dono</Typography>
                    <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
                        Esta visão mostra evolução, prazos e consistência dos planos. Criação e condução de PDI ficam com gerente/Admin MX; aqui o foco é decidir onde cobrar cadência.
                    </Typography>
                </Card>
            )}

            <AnimatePresence>
                {showForm && (
                    <WizardPDI 
                        onClose={() => setShowForm(false)} 
                        onSuccess={async (sessionId) => {
                            setShowForm(false)
                            await refetch()
                            if (sessionId) navigate(`/pdi/${sessionId}/print`)
                        }} 
                    />
                )}
            </AnimatePresence>

            {/* PDI Grid */}
            <div className="flex-1 min-h-0 pb-32">
                {filteredPDIs.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-mx-lg">
                        <AnimatePresence mode="popLayout">
                            {filteredPDIs.map((p, i) => {
                                const status = statusCfg[p.status as keyof typeof statusCfg] || statusCfg.aberto
                                return (
                                    <motion.article key={p.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                                        <Card className="border p-mx-md h-full flex flex-col justify-between group hover:shadow-sm transition-all bg-white relative overflow-hidden">
                                            <div className="absolute top-mx-0 right-mx-0 w-mx-4xl h-mx-4xl bg-brand-primary/5 rounded-mx-full blur-mx-lg -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                                            
                                            <div>
                                                <header className="flex items-start justify-between mb-10 border-b border-border pb-6 relative z-[var(--mx-z-sticky)]">
                                                    <div className="flex items-center gap-mx-sm min-w-0">
                                                        <Avatar
                                                            src={p.seller_avatar_url || undefined}
                                                            alt={`Avatar de ${p.seller_name || 'nome não informado'}`}
                                                            fallback={p.seller_name || 'U'}
                                                            size="lg"
                                                            className="w-mx-14 h-mx-14 rounded-xl shadow-mx-inner group-hover:border-brand-primary transition-all transform group-hover:rotate-3"
                                                        />
                                                        <div className="min-w-0">
                                                            <Typography variant="h3" className="text-base truncate group-hover:text-status-success-text transition-colors">{p.seller_name}</Typography>
                                                            <Typography variant="tiny" tone="muted" className="">ESPECIALISTA</Typography>
                                                        </div>
                                                    </div>
                                                    <Badge variant={status.variant} className="px-4 py-1 text-mx-tiny shadow-sm border-none">{status.label}</Badge>
                                                </header>

                                                <div className="space-y-mx-lg relative z-[var(--mx-z-sticky)]">
                                                    <div className="space-y-mx-xs">
                                                        <Typography variant="tiny" tone="brand" className="mb-2 block">Objetivo 06 Meses</Typography>
                                                        <Typography variant="h2" className="text-xl leading-snug line-clamp-2er">"{p.meta_6m || 'N/A'}"</Typography>
                                                    </div>
                                                </div>
                                            </div>

                                            <footer className="pt-8 border-t border-border flex items-center justify-between mt-10 relative z-[var(--mx-z-sticky)]">
                                                <div className="flex items-center gap-mx-md">
                                                    <div className="flex items-center gap-mx-xs">
                                                        <Calendar size={14} className="text-status-success-text" />
                                                        <Typography variant="mono" tone="muted" className="text-mx-tiny">
                                                            {formatSafeDate(p.due_date)}
                                                        </Typography>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => navigate(`/pdi/${p.id}/print`)} className="w-mx-10 h-mx-10 rounded-xl text-muted-foreground hover:text-status-success-text hover:bg-brand-primary-subtle bg-white shadow-sm border border-border-subtle" aria-label={`Imprimir PDI de ${p.seller_name || 'nome não informado'}`}>
                                                        <Printer size={18} />
                                                    </Button>
                                                </div>
                                                <Button type="button" variant="outline" size="icon" onClick={() => navigate(`/pdi/${p.id}/print`)} className="w-mx-xl h-mx-xl rounded-xl shadow-sm hover:scale-110 active:scale-95 transition-all" aria-label={`Abrir PDI de ${p.seller_name || 'nome não informado'}`}>
                                                    <ChevronRight size={24} strokeWidth={2} />
                                                </Button>
                                            </footer>
                                        </Card>
                                    </motion.article>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="col-span-full py-40 rounded-xl text-center border border-dashed border-border-subtle bg-white shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                        <div className="w-mx-3xl h-mx-3xl rounded-xl bg-surface-alt shadow-sm flex items-center justify-center mb-8 border border-border-subtle group-hover:rotate-12 transition-transform duration-500">
                            <TrendingUp size={48} className="text-muted-foreground opacity-20" />
                        </div>
                        <Typography variant="h2" className="mb-4er">Matriz de Evolução Limpa</Typography>
                        <Typography variant="caption" tone="muted" className="max-w-sm mx-auto mb-10">Não localizamos planos de desenvolvimento para os filtros atuais.</Typography>
                        {canManagePDI && (
                            <Button onClick={() => setShowForm(true)} className="h-mx-2xl px-12 rounded-2xl shadow-sm font-bold text-sm">
                                <Plus size={20} className="mr-3" /> INICIAR PRIMEIRO PDI
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </PageTemplate>
    )
}
