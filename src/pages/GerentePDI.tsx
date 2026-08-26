import { useNavigate } from 'react-router-dom'
import { usePDISessions, type PDIPlanoAcao360 } from '@/hooks/usePDI_MX'
import { useAuth } from '@/hooks/useAuth'
import { canManagePDI as canManagePDICapability } from '@/lib/auth/capabilities'
import { useState, useCallback, useEffect, useMemo, type ComponentType, type ReactNode } from 'react'
import {
    Plus, CalendarDays, TrendingUp,
    Search, RefreshCw, Printer, Pencil, ChevronRight, MoreHorizontal, RotateCcw,
    ListChecks, Clock3, AlertTriangle, X,
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
import { MxEmptyState, MxErrorState, MxProgress } from '@/components/module/MxModuleVisualPrimitives'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const MenuContent = DropdownMenuContent as unknown as ComponentType<{ children: ReactNode; align?: 'start' | 'center' | 'end'; className?: string }>
const MenuItem = DropdownMenuItem as unknown as ComponentType<{ children: ReactNode; className?: string; onSelect: () => void }>

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

const completedPdiStatuses = new Set(['concluido', 'concluida', 'completed', 'finalizado'])
const completedActionStatuses = new Set(['concluida', 'concluido', 'completed', 'justificada', 'finalizada'])

function localDateKey(date: Date) {
    const offset = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

function isCompletedPdi(status?: string | null) {
    return completedPdiStatuses.has((status || '').toLocaleLowerCase('pt-BR'))
}

function isCompletedAction(action: PDIPlanoAcao360) {
    return completedActionStatuses.has((action.status || '').toLocaleLowerCase('pt-BR'))
}

function daysFromToday(value: string | null | undefined, today: string) {
    if (!value) return null
    const current = parseISO(today)
    const target = parseISO(value)
    return Math.round((target.getTime() - current.getTime()) / 86_400_000)
}

export default function GerentePDI() {
    const { role, profile, storeId } = useAuth()
    const navigate = useNavigate()
    const { pdis, loading, error, refetch } = usePDISessions()
    const [showForm, setShowForm] = useState(false)
    const [hasDraft, setHasDraft] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [isRefetching, setIsRefetching] = useState(false)
    const isOwner = role === 'dono'
    const isManager = role === 'gerente'
    const canManagePDI = canManagePDICapability(role)
    const draftKey = useMemo(
        () => profile?.id ? `mx:pdi:draft:${profile.id}:${storeId || 'all'}` : null,
        [profile?.id, storeId],
    )

    const refreshDraft = useCallback(() => {
        if (!draftKey || typeof window === 'undefined') {
            setHasDraft(false)
            return
        }
        try {
            setHasDraft(Boolean(window.sessionStorage.getItem(draftKey)))
        } catch {
            setHasDraft(false)
        }
    }, [draftKey])

    useEffect(() => {
        refreshDraft()
    }, [refreshDraft])

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
        const term = searchTerm.trim().toLocaleLowerCase('pt-BR')
        if (!term) return pdis
        return pdis.filter(p => [
            p.meta_6m,
            p.meta_12m,
            p.meta_24m,
            p.seller_name,
            p.store_name,
            ...p.plano_acao.map(action => action.descricao_acao),
            ...p.top_5_gaps.map(gap => gap.competencia),
        ].some(value => (value || '').toLocaleLowerCase('pt-BR').includes(term)))
    }, [pdis, searchTerm])

    const today = localDateKey(new Date())
    const summary = useMemo(() => {
        const active = pdis.filter(p => !isCompletedPdi(p.status)).length
        const reviews = pdis.filter(p => {
            if (isCompletedPdi(p.status)) return false
            const days = daysFromToday(p.due_date || p.proxima_revisao_data, today)
            return days !== null && days >= 0 && days <= 30
        }).length
        const overdue = pdis.filter(p => {
            if (isCompletedPdi(p.status)) return false
            const days = daysFromToday(p.due_date || p.proxima_revisao_data, today)
            return days !== null && days < 0
        }).length
        const overdueActions = pdis
            .flatMap(p => p.plano_acao || [])
            .filter(action => !isCompletedAction(action) && Boolean(action.data_conclusao) && action.data_conclusao < today)
            .length

        return { active, reviews, overdue, overdueActions }
    }, [pdis, today])

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

    if (error) return (
        <PageTemplate as="div" width="dashboard" className="flex flex-col gap-mx-lg">
            <SellerPageHeader
                icon={TrendingUp}
                title={isOwner ? 'PDI da Rede' : 'Evolução do Vendedor'}
                subtitle="Acompanhamento dos planos de desenvolvimento"
            />
            <Card className="border border-status-error/20 bg-white">
                <MxErrorState
                    title="Não foi possível carregar os PDIs"
                    description="A matriz de desenvolvimento não respondeu. Tente novamente para sincronizar os dados da sua unidade."
                    retry={() => void refetch()}
                />
            </Card>
        </PageTemplate>
    )

    return (
        <PageTemplate as="div" width="dashboard" className="flex flex-col gap-mx-lg">
            <SellerPageHeader
                icon={TrendingUp}
                title={isOwner ? 'PDI da Rede' : 'Evolução do Vendedor'}
                subtitle={isOwner ? 'Acompanhamento executivo dos planos de desenvolvimento' : 'Planos de desenvolvimento da equipe'}
                actions={(
                    <div className="flex w-full flex-col items-stretch gap-mx-sm sm:w-auto sm:flex-row sm:items-center">
                        <div className="relative group w-full sm:w-72">
                            <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors" />
                            <label htmlFor="pdi-search" className="sr-only">Buscar plano de PDI</label>
                            <Input
                                id="pdi-search"
                                name="pdi-search"
                                type="search"
                                autoComplete="off"
                                placeholder="Buscar plano..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                aria-describedby="pdi-search-help"
                                className="pl-10 pr-10 text-caption font-bold"
                            />
                            {searchTerm && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setSearchTerm('')}
                                    aria-label="Limpar busca"
                                    className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                >
                                    <X size={16} />
                                </Button>
                            )}
                            <span id="pdi-search-help" className="sr-only">Busque por vendedor, loja, meta, ação ou competência.</span>
                        </div>
                        <Typography variant="tiny" tone="muted" className="shrink-0 sm:max-w-24">{filteredPDIs.length} de {pdis.length}</Typography>
                        <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Atualizar lista de PDIs" className="h-mx-xl w-mx-xl bg-white hover:bg-surface-alt">
                            <RefreshCw size={20} className={cn(isRefetching && "animate-spin")} />
                        </Button>
                        {canManagePDI && (
                            <Button onClick={() => setShowForm(true)} className="h-mx-xl px-8 shadow-sm bg-brand-primary hover:bg-brand-primary-hover font-bold text-sm rounded-2xl text-white">
                                {hasDraft ? <RotateCcw size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />} {hasDraft ? 'RETOMAR PDI' : 'NOVO PDI'}
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

            <Card className="border border-border-subtle bg-white p-3 shadow-sm">
                <dl aria-label="Resumo dos planos de desenvolvimento" className="grid grid-cols-2 divide-x divide-y divide-border-subtle sm:grid-cols-4 sm:divide-y-0">
                    {[
                        { label: 'PDIs ativos', value: summary.active, detail: 'em acompanhamento', icon: ListChecks, tone: 'text-status-info-text' },
                        { label: 'Revisões próximas', value: summary.reviews, detail: 'nos próximos 30 dias', icon: Clock3, tone: 'text-status-warning-text' },
                        { label: 'PDIs em atraso', value: summary.overdue, detail: 'pedem uma ação', icon: AlertTriangle, tone: 'text-status-error-text' },
                        { label: 'Ações vencidas', value: summary.overdueActions, detail: 'sem conclusão', icon: CalendarDays, tone: 'text-status-error-text' },
                    ].map(({ label, value, detail, icon: Icon, tone }) => (
                        <div key={label} className="flex min-w-0 items-center gap-3 px-3 py-2 first:pl-1 last:pr-1 sm:px-4">
                            <Icon size={18} className={cn('shrink-0', tone)} aria-hidden="true" />
                            <div className="min-w-0">
                                <dt className="truncate text-xs font-semibold text-muted-foreground">{label}</dt>
                                <dd className="flex items-baseline gap-1.5">
                                    <span className="text-xl font-bold leading-none text-foreground">{value}</span>
                                    <span className="hidden truncate text-xs text-muted-foreground xl:inline">{detail}</span>
                                </dd>
                            </div>
                        </div>
                    ))}
                </dl>
            </Card>

            <AnimatePresence>
                {showForm && (
                    <WizardPDI 
                        onClose={() => { setShowForm(false); refreshDraft() }}
                        onSuccess={async (sessionId) => {
                            setShowForm(false)
                            setHasDraft(false)
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
                                const actions = p.plano_acao || []
                                const completedActions = actions.filter(isCompletedAction).length
                                const actionProgress = actions.length ? Math.round((completedActions / actions.length) * 100) : 0
                                const reviewDate = p.due_date || p.proxima_revisao_data
                                const reviewDays = daysFromToday(reviewDate, today)
                                const topGap = [...(p.top_5_gaps || []), ...(p.avaliacoes || [])]
                                    .sort((a, b) => b.gap - a.gap)[0]
                                const sellerName = p.seller_name || 'Nome não informado'
                                return (
                                    <motion.article key={p.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                                        <Card className="flex h-full flex-col justify-between border p-mx-md group bg-white transition-all hover:shadow-sm">
                                            <div className="absolute top-mx-0 right-mx-0 w-mx-4xl h-mx-4xl bg-brand-primary/5 rounded-mx-full blur-mx-lg -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                                            
                                            <div>
                                                <header className="relative z-[var(--mx-z-sticky)] mb-6 flex items-start justify-between border-b border-border pb-4">
                                                    <div className="flex items-center gap-mx-sm min-w-0">
                                                        <Avatar
                                                            src={p.seller_avatar_url || undefined}
                                                            alt={`Avatar de ${sellerName}`}
                                                            fallback={sellerName}
                                                            size="lg"
                                                            className="w-mx-14 h-mx-14 rounded-xl shadow-mx-inner group-hover:border-brand-primary transition-all transform group-hover:rotate-3"
                                                        />
                                                        <div className="min-w-0">
                                                            <Typography variant="h3" className="truncate text-base transition-colors group-hover:text-status-success-text">{sellerName}</Typography>
                                                            <Typography variant="tiny" tone="muted" className="">ESPECIALISTA</Typography>
                                                        </div>
                                                    </div>
                                                    <Badge variant={status.variant} className="border-none px-3 py-1 text-mx-tiny shadow-sm">{status.label}</Badge>
                                                </header>

                                                <div className="relative z-[var(--mx-z-sticky)] space-y-5">
                                                    <div>
                                                        <Typography variant="tiny" tone="brand" className="mb-2 block">Meta em 6 meses</Typography>
                                                        <Typography variant="h2" className="line-clamp-2 text-xl leading-snug">{p.meta_6m || 'Meta ainda não registrada'}</Typography>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <Typography variant="tiny" className="font-semibold">Progresso das ações</Typography>
                                                            <Typography variant="mono" tone="muted" className="text-mx-tiny">{completedActions}/{actions.length || 0}</Typography>
                                                        </div>
                                                        <MxProgress value={actionProgress} label="" />
                                                    </div>

                                                    <dl className="grid grid-cols-2 gap-3 border-t border-border-subtle pt-4">
                                                        <div className="min-w-0">
                                                            <dt className="text-mx-tiny font-semibold uppercase tracking-wide text-muted-foreground">Próxima revisão</dt>
                                                            <dd className={cn('mt-1 flex items-center gap-1.5 text-sm font-bold', reviewDays !== null && reviewDays < 0 ? 'text-status-error-text' : 'text-foreground')}>
                                                                <CalendarDays size={14} aria-hidden="true" />
                                                                {formatSafeDate(reviewDate)}
                                                            </dd>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <dt className="text-mx-tiny font-semibold uppercase tracking-wide text-muted-foreground">Maior lacuna</dt>
                                                            <dd className="mt-1 line-clamp-2 text-sm font-semibold text-foreground">
                                                                {topGap ? `${topGap.competencia} (${topGap.gap > 0 ? `-${topGap.gap}` : 'sem gap'})` : 'Ainda não mapeada'}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </div>
                                            </div>

                                            <footer className="relative z-[var(--mx-z-sticky)] mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
                                                <Typography variant="tiny" tone="muted" className="min-w-0 truncate">{p.store_name || 'Plano da equipe'}</Typography>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-mx-xl w-mx-xl rounded-xl border border-border-subtle bg-white"
                                                                aria-label={`Mais ações para o PDI de ${sellerName}`}
                                                            >
                                                                <MoreHorizontal size={18} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <MenuContent align="end">
                                                            <MenuItem onSelect={() => navigate(`/pdi/${p.id}/print`)}>
                                                                <Printer size={16} aria-hidden="true" />
                                                                Imprimir PDF
                                                            </MenuItem>
                                                        </MenuContent>
                                                    </DropdownMenu>
                                                    {/* A caneta fica à vista, ao lado de "Abrir PDI": corrigir uma
                                                        nota ou um ponto do plano é rotina do gestor, não ação
                                                        secundária de menu. */}
                                                    {canManagePDI && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => navigate(`/pdi/${p.id}/print?editar=1`)}
                                                            className="h-mx-xl rounded-xl border border-border-subtle bg-white px-3"
                                                            aria-label={`Editar PDI de ${sellerName}`}
                                                        >
                                                            <Pencil size={16} />
                                                            <span>Editar</span>
                                                        </Button>
                                                    )}
                                                    <Button type="button" variant="outline" size="sm" onClick={() => navigate(`/pdi/${p.id}/print`)} className="rounded-xl px-3 shadow-sm" aria-label={`Abrir PDI de ${sellerName}`}>
                                                        Abrir PDI <ChevronRight size={16} />
                                                    </Button>
                                                </div>
                                            </footer>
                                        </Card>
                                    </motion.article>
                                )
                            })}
                        </AnimatePresence>
                    </div>
                ) : (
                    <MxEmptyState
                        variant={searchTerm.trim() ? 'filter' : 'dataset'}
                        icon={TrendingUp}
                        title={searchTerm.trim() ? 'Nenhum PDI encontrado' : 'Ainda não há PDIs cadastrados'}
                        description={searchTerm.trim() ? 'Tente outro termo ou limpe a busca para ver todos os planos.' : 'Crie o primeiro plano de desenvolvimento da equipe para começar o acompanhamento.'}
                        action={searchTerm.trim() ? (
                            <Button type="button" variant="outline" onClick={() => setSearchTerm('')}>Limpar busca</Button>
                        ) : canManagePDI ? (
                            <Button type="button" onClick={() => setShowForm(true)}>{hasDraft ? <RotateCcw size={18} /> : <Plus size={18} />}{hasDraft ? 'Retomar rascunho' : 'Iniciar primeiro PDI'}</Button>
                        ) : undefined}
                        className="col-span-full"
                    />
                )}
            </div>
        </PageTemplate>
    )
}
