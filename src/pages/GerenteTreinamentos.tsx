import { useContentSuggestions, useDevelopmentTracks, useTrainings, useTeamTrainings, useNotifications } from '@/hooks/useData'
import { motion, AnimatePresence } from 'motion/react'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    GraduationCap, Play, CheckCircle, Search, BookOpen, TrendingUp,
    Filter, RefreshCw, X, Award, Users, LayoutDashboard, Target, Send, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TabNavPill } from '@/components/molecules/TabNavPill'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Avatar } from '@/components/atoms/Avatar'
import { Card, CardHeader } from '@/components/molecules/Card'
import { SellerPageHeader } from '@/components/seller/SellerPageHeader'
import { toast } from '@/lib/toast'
import { useAuth } from '@/hooks/useAuth'
import { AulasAoVivoSection } from '@/features/universidade/sections/AulasAoVivoSection'
import { ManagerUniversityReference } from '@/features/manager/development/ManagerUniversityReference'
import { ContentSuggestionDialog } from '@/features/universidade/components/ContentSuggestionDialog'
import { PageTemplate } from '@/components/templates/PageTemplate'
import { ScrollableRegion } from '@/design-system/page/ScrollableRegion'

export default function GerenteTreinamentos() {
    const { role, membership } = useAuth()
    const isOwner = role === 'dono'
    const [searchParams, setSearchParams] = useSearchParams()
    const [tab, setTab] = useState<'meus' | 'equipe' | 'matriz'>(() => role === 'gerente' ? 'meus' : isOwner ? 'matriz' : 'equipe')
    useEffect(() => {
        if (role !== 'gerente') return
        const requestedTab = searchParams.get('tab')
        if (requestedTab === 'team') setTab('equipe')
        if (requestedTab === 'manager') setTab('meus')
    }, [role, searchParams])
    const trainingTabs = useMemo(() => (
        isOwner
            ? [
                { key: 'matriz' as const, label: 'Matriz da Equipe', mobileLabel: 'Matriz', icon: LayoutDashboard },
                { key: 'meus' as const, label: 'Minha Trilha', mobileLabel: 'Trilha', icon: Target },
            ]
            : [
                { key: 'equipe' as const, label: 'Equipe', icon: Users },
                { key: 'matriz' as const, label: 'Matriz da Equipe', mobileLabel: 'Matriz', icon: LayoutDashboard },
                { key: 'meus' as const, label: 'Minha Trilha', mobileLabel: 'Trilha', icon: Target },
            ]
    ), [isOwner])
    const [searchTerm, setSearchTerm] = useState('')
    const [isRefetching, setIsRefetching] = useState(false)
    const [assigningTo, setAssigningTo] = useState<string | null>(null)
    const [isAssigning, setIsAssigning] = useState(false)
    const [institutionalForm, setInstitutionalForm] = useState({ title: '', description: '', video_url: '' })
    const [savingInstitutional, setSavingInstitutional] = useState(false)

    // Meus Treinamentos
    const { treinamentos, loading: tLoading, error: tError, markWatched, createTraining, refetch: refetchMe } = useTrainings()
    const watched = useMemo(() => treinamentos?.filter(t => t.watched).length || 0, [treinamentos])
    const progress = useMemo(() => (treinamentos?.length || 0) > 0 ? (watched / treinamentos.length) * 100 : 0, [watched, treinamentos])

    // Progresso da Equipe
    const { teamProgress, loading: tpLoading, error: tpError, refetch: refetchTeam } = useTeamTrainings()
    const { suggestions } = useContentSuggestions()
    const { assignments, assignDefaultTrack } = useDevelopmentTracks()
    
    // Notificações para Atribuição
    const { sendNotification } = useNotifications()

    const isLoading = tab === 'meus' ? tLoading : tpLoading
    const hasError = tab === 'meus' ? tError : tpError

    const handleRemindSeller = async (sellerId: string, trainingTitle: string) => {
        setIsAssigning(true)
        const { error } = await sendNotification({
            recipient_id: sellerId,
            title: '⚠️ PENDÊNCIA DE TREINAMENTO',
            message: `Olá! Notamos que o módulo "${trainingTitle}" ainda não foi concluído. Este conteúdo é vital para o seu atingimento de meta esta semana.`,
            type: 'training',
            priority: 'medium',
            link: '/treinamentos'
        })
        setIsAssigning(false)
        if (error) toast.error('Falha ao enviar lembrete.')
        else toast.success('Lembrete enviado ao especialista!')
    }

    const handleRefresh = useCallback(async () => {
        setIsRefetching(true)
        await (tab === 'meus' ? refetchMe() : refetchTeam())
        setIsRefetching(false)
        toast.success('Desenvolvimento sincronizado!')
    }, [tab, refetchMe, refetchTeam])

    const handleAssignTraining = async (trainingId: string) => {
        if (!assigningTo) return
        const seller = teamProgress.find(p => p.seller_id === assigningTo)
        const training = treinamentos.find(t => t.id === trainingId)
        
        setIsAssigning(true)
        const { error } = await sendNotification({
            recipient_id: assigningTo,
            title: '🎯 NOVO TREINAMENTO ATRIBUÍDO',
            message: `Seu gestor solicitou que você assista ao módulo: "${training?.title}". Foco na melhoria do seu gargalo tático.`,
            type: 'training',
            priority: 'high',
            link: '/treinamentos'
        })
        setIsAssigning(false)

        if (error) toast.error('Falha ao atribuir treinamento.')
        else {
            toast.success(`Treinamento atribuído para ${seller?.seller_name}!`)
            setAssigningTo(null)
        }
    }

    const handleAssignOnboarding = async (sellerId: string) => {
        setIsAssigning(true)
        const { error } = await assignDefaultTrack({ sellerId })
        setIsAssigning(false)
        if (error) toast.error(error)
        else toast.success('Trilha de novo colaborador atribuída.')
    }

    const handleCreateInstitutionalContent = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!institutionalForm.title || !institutionalForm.video_url) {
            toast.error('Informe título e link do conteúdo institucional.')
            return
        }
        setSavingInstitutional(true)
        const { error } = await createTraining({
            title: institutionalForm.title,
            description: institutionalForm.description,
            video_url: institutionalForm.video_url,
            type: 'institucional',
            target_audience: 'todos',
            source_kind: 'loja_institucional',
            editorial_status: 'active',
            duration_minutes: 12,
            xp_reward: 80,
            curation_notes: 'Conteúdo institucional publicado pelo gestor da loja.',
        })
        setSavingInstitutional(false)
        if (error) {
            toast.error(error)
            return
        }
        setInstitutionalForm({ title: '', description: '', video_url: '' })
        await refetchMe()
        toast.success('Conteúdo institucional publicado para a loja.')
    }

    const filteredMe = useMemo(() => {
        if (!treinamentos) return []
        return treinamentos.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()) || t.type.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [treinamentos, searchTerm])

    const filteredTeam = useMemo(() => {
        if (!teamProgress) return []
        return teamProgress.filter(p => p.seller_name.toLowerCase().includes(searchTerm.toLowerCase()))
    }, [teamProgress, searchTerm])

    if (role === 'gerente') return (
        <ManagerUniversityReference
            tab={tab === 'meus' ? 'manager' : 'team'}
            onTabChange={(next) => {
                const updated = new URLSearchParams(searchParams)
                updated.set('tab', next)
                setSearchParams(updated, { replace: true })
                setTab(next === 'manager' ? 'meus' : 'equipe')
            }}
            storeName={membership?.store?.name || 'Unidade vinculada'}
            trainings={filteredMe}
            allTrainings={treinamentos}
            teamProgress={filteredTeam}
            allTeamProgress={teamProgress}
            loading={isLoading && !isRefetching}
            progress={progress}
            watched={watched}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onRefresh={handleRefresh}
            isRefetching={isRefetching}
            onMarkWatched={markWatched}
            onRemindSeller={handleRemindSeller}
            isAssigning={isAssigning}
            assigningTo={assigningTo}
            setAssigningTo={setAssigningTo}
            onAssignTraining={handleAssignTraining}
            onAssignOnboarding={handleAssignOnboarding}
            assignments={assignments}
            suggestions={suggestions}
            institutionalForm={institutionalForm}
            setInstitutionalForm={setInstitutionalForm}
            onCreateInstitutionalContent={handleCreateInstitutionalContent}
            savingInstitutional={savingInstitutional}
        />
    )

    if (isLoading && !isRefetching) return (
        <PageTemplate as="div" width="dashboard" className="flex flex-col gap-mx-lg" scrollerClassName="animate-in fade-in duration-500" aria-busy="true" aria-live="polite">
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-mx-lg border-b border-border pb-mx-lg">
                <div className="space-y-mx-xs">
                    <div className="h-mx-10 w-mx-64 bg-border-default rounded animate-pulse" />
                    <div className="h-mx-xs w-mx-48 bg-border-default rounded animate-pulse" />
                </div>
                <div className="flex gap-mx-sm">
                    <div className="h-mx-14 w-mx-64 rounded-mx-full bg-border-default animate-pulse" />
                    <div className="h-mx-14 w-mx-48 rounded-mx-full bg-border-default animate-pulse" />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-mx-lg">
                {[1,2,3].map(i => <div key={i} className="h-mx-64 rounded-2xl bg-white animate-pulse" />)}
            </div>
        </PageTemplate>
    )

    return (
        <PageTemplate as="div" width="dashboard" className="flex flex-col gap-mx-lg">
            
            <SellerPageHeader
                icon={GraduationCap}
                title={isOwner ? 'Treinamentos da Rede' : 'Universidade MX'}
                subtitle={isOwner ? 'Absorção e curadoria da rede' : 'Desenvolvimento gerencial e acompanhamento da equipe'}
                actions={(
                        <div className="flex flex-wrap items-center gap-2">
                            <ContentSuggestionDialog />
                            <TabNavPill
                                tabs={trainingTabs}
                                activeTab={tab}
                                onTabChange={setTab}
                            />
                        </div>
                )}
            />

            <div className="flex items-center gap-mx-sm w-full sm:w-auto sm:self-end">
                            <Button variant="outline" size="icon" onClick={handleRefresh} aria-label="Atualizar" className="h-mx-xl w-mx-xl bg-white hover:bg-surface-alt">
                                <RefreshCw size={20} className={cn(isRefetching && "animate-spin")} />
                            </Button>
                            <div className="relative group flex-1 sm:flex-none">
                                <Search size={16} className="absolute left-mx-sm top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-status-success-text transition-colors" />
                                <Input 
                                    placeholder="BUSCAR CONTEÚDO..." value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="!pl-11 !h-12 text-caption font-bold"
                                />
                            </div>
                        </div>

            <div className="flex-1 min-h-0 pb-32" aria-live="polite">
                {!isOwner && (
                    <Card className="mb-mx-lg border border-status-info/20 bg-status-info-surface p-mx-md">
                        <Typography variant="h3" className="text-status-info-text">Desenvolvimento do gerente</Typography>
                        <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
                            Separe a leitura por tarefa: equipe mostra progresso individual, matriz compara cobertura de conteúdos e minha trilha reúne seus próprios módulos. Conteúdo institucional e sugestões ficam como governança, não como competição.
                        </Typography>
                    </Card>
                )}
                {isOwner && (
                    <Card className="mb-mx-lg border border-status-info/20 bg-status-info-surface p-mx-md">
                        <Typography variant="h3" className="text-status-info-text">Uso executivo dos treinamentos</Typography>
                        <Typography variant="p" className="mt-mx-xs text-sm text-status-info-text">
                            Dono acompanha absorção, gargalos e consistência da trilha. Cobranças, atribuições e publicação de conteúdo institucional devem ser feitas pelo gerente ou Admin MX.
                        </Typography>
                    </Card>
                )}
                <div className="mb-mx-lg">
                    <AulasAoVivoSection />
                </div>
                {suggestions.length > 0 && (
                    <Card className="mb-mx-lg border bg-white p-mx-md">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-mx-md">
                            <div>
                                <Typography variant="h3" className="">Sugestões de conteúdo da equipe</Typography>
                                <Typography variant="p" tone="muted" className="text-sm">Fila de curadoria enviada por vendedores e gestores.</Typography>
                            </div>
                            <div className="flex flex-wrap gap-mx-xs">
                                {suggestions.slice(0, 6).map(suggestion => (
                                    <Badge key={suggestion.id} variant={suggestion.priority === 'high' ? 'danger' : 'brand'} className="rounded-mx-full px-3 py-1">
                                        {suggestion.theme}: {suggestion.title}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </Card>
                )}
                <AnimatePresence mode="wait">
                    {tab === 'meus' ? (
                        <motion.div key="meus" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-mx-lg">
                            {filteredMe.map((t, i) => (
                                <motion.article key={t.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                                    <Card className="border p-mx-md h-full bg-white group hover:shadow-sm transition-all relative overflow-hidden flex flex-col gap-mx-10">
                                        <div className="absolute top-mx-0 right-mx-0 w-mx-4xl h-mx-4xl bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <header className="flex justify-between items-start relative z-[var(--mx-z-sticky)]">
                                            <div className={cn("w-mx-14 h-mx-14 rounded-xl flex items-center justify-center border shadow-none transition-all", t.watched ? "bg-status-success-surface text-status-success border-mx-emerald-100" : "bg-surface-alt text-muted-foreground border-border-subtle group-hover:bg-brand-primary group-hover:text-white")}>
                                                <GraduationCap size={28} strokeWidth={2} />
                                            </div>
                                            {t.watched && <Badge variant="success" className="px-4 py-1 rounded-mx-full text-mx-micro shadow-sm">CONCLUÍDO</Badge>}
                                        </header>
                                        <div className="flex-1 space-y-mx-xs relative z-[var(--mx-z-sticky)]">
                                            <Typography variant="tiny" tone="brand" className="">{t.type}</Typography>
                                            <Typography variant="h3" className="text-lg leading-tight group-hover:text-status-success-text transition-colors">{t.title}</Typography>
                                            <Typography variant="p" tone="muted" className="text-xs font-bold leading-relaxed opacity-60">"{t.description}"</Typography>
                                        </div>
                                        <footer className="pt-8 border-t border-border-subtle flex items-center justify-between mt-auto relative z-[var(--mx-z-sticky)]">
                                            <div className="flex items-center gap-mx-xs text-caption font-bold text-muted-foreground">
                                                <Award size={14} className="text-status-warning-text" /> {t.watched ? 'ABSORVIDO' : 'PENDENTE'}
                                            </div>
                                            <div className="flex items-center gap-mx-tiny text-status-warning-text">
                                                <Star size={14} className="fill-current" />
                                                <Typography variant="tiny" as="span" className="">{t.average_rating || 0} ({t.rating_count || 0})</Typography>
                                            </div>
                                            {!t.watched && (
                                                <Button size="sm" onClick={() => markWatched(t.id)} className="h-mx-10 px-6 rounded-mx-full font-bold text-label shadow-sm">
                                                    ASSISTIR <Play size={14} className="ml-2 fill-white" />
                                                </Button>
                                            )}
                                        </footer>
                                    </Card>
                                </motion.article>
                            ))}
                        </motion.div>
                    ) : tab === 'matriz' ? (
                        <motion.div key="matriz" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                            <Card className="border bg-white overflow-hidden flex flex-col">
                                <header className="p-mx-md border-b border-border-subtle bg-surface-alt/30 flex items-center justify-between">
                                    <div className="flex items-center gap-mx-sm">
                                        <div className="w-mx-10 h-mx-10 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm"><LayoutDashboard size={20} /></div>
                                        <div>
                                            <Typography variant="h3" className="">Matriz de Cobertura</Typography>
                                            <Typography variant="caption" tone="muted" className="">Mapeamento de conteúdo por pessoa</Typography>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="px-4 py-1.5 rounded-mx-full text-mx-micro shadow-sm">
                                        {teamProgress.length} Especialistas Ativos
                                    </Badge>
                                </header>

                                <ScrollableRegion axis="horizontal" label="Matriz de Cobertura" className="flex-1 no-scrollbar">
                                    <table className="w-full text-left min-w-mx-elite-table">
                                        <thead>
                                            <tr className="bg-surface-alt/50 border-b border-border text-caption font-semibold text-muted-foreground">
                                                <th scope="col" className="pl-10 py-6 sticky left-mx-0 bg-surface-alt/50 z-[var(--mx-z-sticky)]">VENDEDOR</th>
                                                {treinamentos.map(t => (
                                                    <th key={t.id} scope="col" className="px-4 py-6 text-center group relative min-w-mx-32">
                                                        <span className="truncate block max-w-mx-20 mx-auto">{t.title}</span>
                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-gray-900 text-white text-caption font-bold rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[var(--mx-z-tooltip)] whitespace-nowrap shadow-sm">
                                                            {t.title}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-default bg-white">
                                            {teamProgress.map((p) => (
                                                <tr key={p.seller_id} className="hover:bg-surface-alt/30 transition-colors h-mx-20 group">
                                                    <td className="pl-10 sticky left-mx-0 bg-white group-hover:bg-surface-alt/30 z-[var(--mx-z-sticky)] border-r border-border">
                                                        <div className="flex items-center gap-mx-sm">
                                                            <Avatar src={p.avatar_url || undefined} alt={`Avatar de ${p.seller_name}`} fallback={p.seller_name} className="w-mx-10 h-mx-10 rounded-2xl shadow-none" />
                                                            <Typography variant="p" className="text-sm  truncate max-w-mx-label-lg">{p.seller_name}</Typography>
                                                        </div>
                                                    </td>
                                                    {treinamentos.map(t => {
                                                        const isWatched = p.watched.includes(t.id)
                                                        return (
                                                            <td key={t.id} className="px-4 text-center">
                                                                <div className="flex flex-col items-center justify-center gap-mx-tiny">
                                                                    <div className={cn("w-mx-9 h-mx-9 rounded-xl flex items-center justify-center border shadow-sm transition-all", 
                                                                        isWatched ? 'bg-status-success-surface text-status-success-text border-mx-emerald-100' : 'bg-surface-alt text-muted-foreground/30'
                                                                    )}>
                                                                        {isWatched ? <CheckCircle size={16} /> : <X size={16} />}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        )
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollableRegion>
                            </Card>
                        </motion.div>
                    ) : (
                        <motion.div key="equipe" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-mx-lg">
                            {filteredTeam.map((p, i) => {
                                const progressPct = treinamentos.length > 0 ? Math.round((p.watched.length / treinamentos.length) * 100) : 0
                                return (
                                <motion.article key={p.seller_id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                                    <Card className="border bg-white p-mx-md group hover:shadow-sm transition-all relative overflow-hidden flex flex-col items-center text-center">
                                        <div className="absolute top-mx-0 right-mx-0 w-mx-32 h-mx-32 bg-brand-primary/5 rounded-mx-full blur-2xl -mr-16 -mt-16" />
                                        
                                        <div className="w-mx-20 h-mx-20 rounded-mx-full border-4 border-white shadow-sm overflow-hidden bg-surface-alt mb-6 group-hover:scale-105 transition-transform relative z-[var(--mx-z-sticky)]">
                                            <Avatar src={p.avatar_url || undefined} alt={`Avatar de ${p.seller_name}`} fallback={p.seller_name} className="w-full h-full rounded-mx-full" />
                                        </div>

                                        <div className="relative z-[var(--mx-z-sticky)] w-full">
                                            <Typography variant="h3" className="text-base truncate">{p.seller_name}</Typography>
                                            <Typography variant="caption" tone="muted" className="text-mx-micro mb-6 block">Especialista da equipe</Typography>
                                            
                                            <div className="space-y-mx-sm mb-8">
                                                <div className="flex justify-between items-end px-2">
                                                    <Typography variant="tiny" className="">Conclusão</Typography>
                                                    <Typography variant="mono" tone="brand" className="text-sm">{progressPct}%</Typography>
                                                </div>
                                                <div className="h-mx-xs w-full bg-surface-alt rounded-mx-full overflow-hidden border border-border-subtle p-mx-px">
                                                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} className="h-full bg-brand-primary rounded-mx-full" />
                                                </div>
                                            </div>

                                            <Badge variant="outline" className="w-full justify-center py-mx-sm">
                                                Acompanhar
                                            </Badge>
                                        </div>
                                    </Card>
                                </motion.article>
                                )
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

        </PageTemplate>
    )
}
