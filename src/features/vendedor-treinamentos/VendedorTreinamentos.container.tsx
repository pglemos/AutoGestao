import {
    useEffect, useMemo, useRef, useState,
    type ComponentType, type InputHTMLAttributes, type PropsWithChildren, type ReactNode,
} from 'react'
import { toast } from '@/lib/toast'
import {
    BookOpen, Star, BarChart3, CheckCircle2, ClipboardCheck, Search, Play,
    Video, Calendar, Download, MessageSquare, X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/molecules/Card'
import { Typography } from '@/components/atoms/Typography'
import PageHeaderBase from '@/components/ui/PageHeader'
import LegacyStatCardBase from '@/components/ui/StatCard'
import { Tabs, TabsContent as TabsContentBase, TabsList as TabsListBase, TabsTrigger as TabsTriggerBase } from '@/components/ui/tabs'
import { Input as InputBase } from '@/components/ui/input'
import { Select, SelectContent as SelectContentBase, SelectItem as SelectItemBase, SelectTrigger as SelectTriggerBase, SelectValue as SelectValueBase } from '@/components/ui/select'
import {
    useVendedorTreinamentos,
    type Treinamento,
    type TarefaTreinamento,
} from './hooks/useVendedorTreinamentos'
import {
    YouTubeCompliancePlayer,
    HTML5CompliancePlayer,
    getYoutubeEmbed,
    getYoutubeThumbnail,
} from './components/CompliancePlayers'
import { QuizTreinamento } from './components/QuizTreinamento'
import { confirmarPresencaTreinamento, listarPresencasTreinamentos } from '@/features/universidade/services/universidade-service'
import { ContentSuggestionDialog } from '@/features/universidade/components/ContentSuggestionDialog'

const CATEGORIES = ['Atendimento', 'Prospecção', 'WhatsApp', 'Negociação', 'Financiamento', 'Fechamento', 'Pós-venda', 'Carteira', 'Mentalidade']
const LEVELS = ['N1 Iniciante', 'N2 Intermediário', 'N3 Performance', 'N4 Alta Performance']

const LEVEL_COLORS: Record<string, string> = {
    'N1 Iniciante': 'bg-mx-green-light text-mx-green',
    'N2 Intermediário': 'bg-mx-blue-light text-mx-blue',
    'N3 Performance': 'bg-mx-amber-light text-mx-amber',
    'N4 Alta Performance': 'bg-purple-100 text-purple-700',
}

// Os componentes visuais legados são JavaScript e não expõem props TypeScript.
// Os aliases mantêm o layout anterior tipado sem alterar os componentes globais.
const PageHeader = PageHeaderBase as ComponentType<{ title: string; subtitle?: string; children?: ReactNode }>
const LegacyStatCard = LegacyStatCardBase as ComponentType<{
    label: string
    value: ReactNode
    sublabel?: string
    icon?: ComponentType<{ className?: string }>
    color?: string
    children?: ReactNode
}>
const TabsList = TabsListBase as ComponentType<PropsWithChildren<{ className?: string }>>
const TabsTrigger = TabsTriggerBase as ComponentType<PropsWithChildren<{ value: string; className?: string }>>
const TabsContent = TabsContentBase as ComponentType<PropsWithChildren<{ value: string; className?: string }>>
const Input = InputBase as ComponentType<InputHTMLAttributes<HTMLInputElement>>
const SelectTrigger = SelectTriggerBase as ComponentType<PropsWithChildren<{ className?: string }>>
const SelectContent = SelectContentBase as ComponentType<PropsWithChildren>
const SelectItem = SelectItemBase as ComponentType<PropsWithChildren<{ value: string }>>
const SelectValue = SelectValueBase as ComponentType<{ placeholder?: string }>

type TabKey = 'biblioteca' | 'trilha' | 'aovivo'

function TrainingCard({ training, completed, onOpen, large = false }: { training: Treinamento; completed: boolean; onOpen: () => void; large?: boolean }) {
    const thumbUrl = getYoutubeThumbnail(training.video_url)
    return (
        <button
            type="button"
            onClick={onOpen}
            className="group overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all duration-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-mx-blue"
        >
            <div className={`relative overflow-hidden bg-slate-900 ${large ? 'h-40' : 'h-28'}`}>
                {thumbUrl ? (
                    <img src={thumbUrl} alt={training.title} className="absolute inset-0 h-full w-full object-cover opacity-75 transition-all duration-300 group-hover:scale-105 group-hover:opacity-90" />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-mx-navy to-mx-blue" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play className="h-10 w-10 text-white/80 transition-all duration-300 group-hover:scale-110 group-hover:text-white" />
                </div>
                {completed && (
                    <div className="absolute right-3 top-3 z-10">
                        <CheckCircle2 className="h-6 w-6 fill-white text-mx-green" />
                    </div>
                )}
            </div>
            <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_COLORS[training.level] || 'bg-slate-100 text-slate-500'}`}>{training.level}</span>
                    <span className="text-[10px] text-slate-400">{training.duration_minutes} min</span>
                </div>
                <h4 className="line-clamp-2 text-sm font-semibold text-mx-navy">{training.title}</h4>
                <p className="mt-1 text-xs text-slate-400">{training.category}</p>
            </div>
        </button>
    )
}

export default function VendedorTreinamentosContainer() {
    const {
        trainings, loading, completedIds, completedCount, tarefas,
        nivelMaturidade, nivelMaturidadeLabel, recomendacoes, toggleTarefa, markCompleted, refetch,
    } = useVendedorTreinamentos()

    const [tab, setTab] = useState<TabKey>('biblioteca')
    const [search, setSearch] = useState('')
    const [filterCat, setFilterCat] = useState('all')
    const [filterLevel, setFilterLevel] = useState('all')
    const [selectedTraining, setSelectedTraining] = useState<Treinamento | null>(null)
    const [comment, setComment] = useState('')
    const [savingInteraction, setSavingInteraction] = useState(false)
    const [watchedPercent, setWatchedPercent] = useState(0)
    // UNIV-6: quando a aula tem prova oficial (5+ questões), o quiz é o único
    // caminho de conclusão; a conclusão manual fica desabilitada.
    const [quizQuestoes, setQuizQuestoes] = useState(0)
    const [presencas, setPresencas] = useState<Set<string>>(new Set())
    const lastOpenedTrainingIdRef = useRef<string | null>(null)

    useEffect(() => {
        let ativo = true
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return
            listarPresencasTreinamentos(supabase, user.id)
                .then(ids => { if (ativo) setPresencas(new Set(ids)) })
                .catch(err => {
                    console.warn('[VendedorTreinamentos] Failed to load presencas:', err)
                    if (ativo) setPresencas(new Set())
                })
        })
        return () => { ativo = false }
    }, [])

    const confirmarPresenca = async (trainingId: string) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        try {
            await confirmarPresencaTreinamento(supabase, user.id, trainingId)
            setPresencas(atual => new Set(atual).add(trainingId))
            toast.success('Presença confirmada.')
        } catch (error) {
            toast.error('Erro ao confirmar presença', { description: error instanceof Error ? error.message : undefined })
        }
    }

    const filtered = useMemo(() => trainings.filter(t => {
        if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
        if (filterCat !== 'all' && t.category !== filterCat) return false
        if (filterLevel !== 'all' && t.level !== filterLevel) return false
        return true
    }), [trainings, search, filterCat, filterLevel])

    const liveTrainings = trainings.filter(t => t.is_live)
    const upcomingLive = liveTrainings.filter(t => t.live_date && new Date(t.live_date) > new Date())
    const pastLive = liveTrainings.filter(t => t.live_date && new Date(t.live_date) <= new Date())

    const tarefasDaAula = selectedTraining ? tarefas.filter(t => t.training_id === selectedTraining.id) : []
    const totalTarefasConcluidas = tarefas.filter(t => t.concluida).length
    const recommendedTrainings = recomendacoes.length > 0
        ? recomendacoes.map(item => item.training).filter((t): t is Treinamento => t !== undefined)
        : trainings.filter(item => !completedIds.has(item.id)).slice(0, 4)

    const openTraining = async (training: Treinamento) => {
        lastOpenedTrainingIdRef.current = training.id
        setSelectedTraining(training)
        setComment('')
        setQuizQuestoes(0)
        setWatchedPercent(completedIds.has(training.id) ? 100 : 0)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('treinamento_avaliacoes').select('comment').eq('training_id', training.id).eq('user_id', user.id).maybeSingle()
        if (lastOpenedTrainingIdRef.current === training.id) {
            setComment((data as { comment?: string } | null)?.comment || '')
        }
    }

    const saveComment = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user || !selectedTraining || !comment.trim()) return
        setSavingInteraction(true)
        const { error } = await supabase.from('treinamento_avaliacoes').upsert({
            training_id: selectedTraining.id, user_id: user.id, rating: 5, comment: comment.trim(), updated_at: new Date().toISOString(),
        }, { onConflict: 'training_id,user_id' })
        setSavingInteraction(false)
        if (error) {
            toast.error(error.message)
        } else {
            toast.success('Comentário e sugestão salvos.')
        }
    }

    const handleMarkCompleted = async () => {
        if (!selectedTraining) return
        setSavingInteraction(true)
        const { error } = await markCompleted(selectedTraining.id)
        setSavingInteraction(false)
        if (error) {
            toast.error(error)
        } else {
            toast.success('Aula concluída e progresso atualizado.')
        }
    }

    const handleToggleTask = async (tarefa: TarefaTreinamento, checked: boolean) => {
        const { error } = await toggleTarefa(tarefa, checked)
        if (error) toast.error(error)
    }

    if (loading) {
        return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-100 border-t-brand-primary" /></div>
    }

    const progressoPercent = trainings.length > 0 ? Math.round((completedCount / trainings.length) * 100) : 0

    return (
        <main className="h-full w-full min-w-0 overflow-y-auto bg-gray-50 font-body no-scrollbar px-mx-sm py-mx-md sm:px-mx-md lg:px-mx-lg pb-12">
          <div className="mx-auto w-full max-w-[1500px] space-y-8">
            <PageHeader title="Treinamentos" subtitle="Desenvolva suas habilidades de vendas">
                <ContentSuggestionDialog />
            </PageHeader>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <LegacyStatCard label="Minha Trilha" value={nivelMaturidade} sublabel={nivelMaturidadeLabel} icon={Star} color="blue" />
                <LegacyStatCard label="Progresso" value={`${progressoPercent}%`} icon={BarChart3} color="green" />
                <LegacyStatCard label="Aulas Concluídas" value={completedCount} icon={CheckCircle2} color="blue" />
                <LegacyStatCard label="Tarefas Concluídas" value={totalTarefasConcluidas} icon={ClipboardCheck} color="amber" />
                <LegacyStatCard label="Conteúdos Disponíveis" value={trainings.length} icon={BookOpen} color="navy" />
            </div>

            <Tabs value={tab} onValueChange={value => setTab(value as TabKey)} className="w-full">
                <TabsList className="bg-white border border-slate-100 rounded-xl p-1">
                    <TabsTrigger value="biblioteca" className="rounded-lg data-[state=active]:bg-mx-blue data-[state=active]:text-white">Biblioteca</TabsTrigger>
                    <TabsTrigger value="trilha" className="rounded-lg data-[state=active]:bg-mx-blue data-[state=active]:text-white">Trilha</TabsTrigger>
                    <TabsTrigger value="aovivo" className="rounded-lg data-[state=active]:bg-mx-blue data-[state=active]:text-white">Aulas ao Vivo</TabsTrigger>
                </TabsList>

                <TabsContent value="biblioteca" className="mt-6 space-y-6">
                    {recommendedTrainings.length > 0 && (
                        <section aria-label="Recomendado para você">
                            <h3 className="mb-4 text-base font-semibold text-mx-navy">Recomendado para Você</h3>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {recommendedTrainings.slice(0, 4).map(training => (
                                    <TrainingCard key={training.id} training={training} completed={completedIds.has(training.id)} large onOpen={() => void openTraining(training)} />
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="flex flex-wrap gap-3">
                        <div className="relative min-w-[200px] flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar treinamento..." className="rounded-xl bg-white pl-9" />
                        </div>
                        <Select value={filterCat} onValueChange={setFilterCat}>
                            <SelectTrigger className="w-[160px] rounded-xl bg-white"><SelectValue placeholder="Categoria" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                {CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterLevel} onValueChange={setFilterLevel}>
                            <SelectTrigger className="w-[180px] rounded-xl bg-white"><SelectValue placeholder="Nível" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {LEVELS.map(level => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {filtered.length === 0 ? (
                        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
                            <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                            <p className="text-sm text-slate-400">Nenhum treinamento encontrado.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {filtered.map(training => <TrainingCard key={training.id} training={training} completed={completedIds.has(training.id)} onOpen={() => void openTraining(training)} />)}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="trilha" className="mt-6 space-y-6">
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                        <h3 className="mb-2 text-base font-semibold text-mx-navy">Sua Maturidade Profissional</h3>
                        <p className="mb-6 text-xs text-slate-400">
                            A trilha reflete tempo de mercado, experiência declarada e cargo — não apenas quantas aulas você assistiu.
                        </p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                            {LEVELS.map((level, idx) => {
                                const isActive = level.startsWith(nivelMaturidade)
                                return (
                                    <div key={level} className={`rounded-xl border-2 p-4 text-center transition-all ${isActive ? 'border-mx-blue bg-mx-blue-light/50' : 'border-slate-100'}`}>
                                        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${isActive ? 'bg-mx-blue text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <p className={`text-sm font-semibold ${isActive ? 'text-mx-navy' : 'text-slate-400'}`}>{level}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {LEVELS.map(level => {
                        const levelTrainings = trainings.filter(t => t.level === level)
                        if (levelTrainings.length === 0) return null
                        return (
                            <div key={level}>
                                <h3 className="mb-3 text-sm font-semibold text-mx-navy">{level}</h3>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    {levelTrainings.map(t => <TrainingCard key={t.id} training={t} completed={completedIds.has(t.id)} onOpen={() => void openTraining(t)} />)}
                                </div>
                            </div>
                        )
                    })}
                </TabsContent>

                <TabsContent value="aovivo" className="mt-6 space-y-6">
                    {upcomingLive.length > 0 && (
                        <div>
                            <Typography variant="h3" className="mb-3">Próximas Aulas</Typography>
                            <div className="space-y-3">
                                {upcomingLive.map(t => (
                                    <Card key={t.id} className="flex items-center gap-4 p-mx-md">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-status-error/10">
                                            <Video className="h-5 w-5 text-status-error" />
                                        </div>
                                        <div className="flex-1">
                                            <Typography variant="p" className="text-sm font-semibold">{t.title}</Typography>
                                            <Typography variant="caption" tone="muted" className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {t.live_date ? new Date(t.live_date).toLocaleDateString('pt-BR') : '—'}
                                            </Typography>
                                        </div>
                                        {presencas.has(t.id) ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-status-success/10 px-3 py-1.5 text-xs font-semibold text-status-success">
                                                <CheckCircle2 size={14} /> Presença confirmada
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => void confirmarPresenca(t.id)}
                                                className="rounded-2xl border border-brand-primary px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-600/5"
                                            >
                                                Confirmar presença
                                            </button>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {pastLive.length > 0 && (
                        <div>
                            <Typography variant="h3" className="mb-3">Gravações</Typography>
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {pastLive.map(t => <TrainingCard key={t.id} training={t} completed={completedIds.has(t.id)} onOpen={() => void openTraining(t)} />)}
                            </div>
                        </div>
                    )}

                    {liveTrainings.length === 0 && (
                        <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center">
                            <Video className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                            <p className="text-sm text-slate-400">Nenhuma aula ao vivo agendada.</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {selectedTraining && (
                <div className="fixed inset-0 z-[160] grid place-items-center bg-black/55 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedTraining(null) }}>
                    <div role="dialog" aria-modal="true" aria-labelledby="training-detail-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <header className="flex items-start justify-between border-b border-slate-200 p-5">
                            <div>
                                <h2 id="training-detail-title" className="text-xl font-bold text-mx-navy">{selectedTraining.title}</h2>
                                {selectedTraining.description && <p className="mt-1 text-sm text-slate-500">{selectedTraining.description}</p>}
                            </div>
                            <button type="button" onClick={() => setSelectedTraining(null)} aria-label="Fechar aula" className="rounded-lg p-2 hover:bg-slate-100"><X /></button>
                        </header>
                        <div className="space-y-5 overflow-y-auto p-5">
                            <div className="aspect-video overflow-hidden rounded-xl bg-slate-950">
                                {getYoutubeEmbed(selectedTraining.video_url) ? (
                                    <YouTubeCompliancePlayer videoUrl={selectedTraining.video_url} onProgressUpdate={setWatchedPercent} onCompleted={() => setWatchedPercent(100)} />
                                ) : selectedTraining.video_url ? (
                                    <HTML5CompliancePlayer videoUrl={selectedTraining.video_url} onProgressUpdate={setWatchedPercent} onCompleted={() => setWatchedPercent(100)} />
                                ) : (
                                    <div className="grid h-full place-items-center text-sm text-white/70">Vídeo ainda não publicado.</div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {selectedTraining.material_url && (
                                    <a href={selectedTraining.material_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-mx-blue">
                                        <Download size={16} /> Abrir material complementar
                                    </a>
                                )}
                                <button
                                    type="button"
                                    disabled={savingInteraction || (!completedIds.has(selectedTraining.id) && (quizQuestoes >= 5 || (Boolean(selectedTraining.video_url) && watchedPercent < 95)))}
                                    onClick={() => void handleMarkCompleted()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-mx-green px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    <CheckCircle2 size={16} />
                                    {completedIds.has(selectedTraining.id)
                                        ? 'Concluída'
                                        : quizQuestoes >= 5
                                            ? 'Conclusão pela Prova Oficial'
                                            : watchedPercent >= 95
                                                ? 'Concluir Aula'
                                                : `Concluir Aula (${Math.round(watchedPercent)}%)`}
                                </button>
                            </div>
                            <QuizTreinamento
                                trainingId={selectedTraining.id}
                                onCarregado={setQuizQuestoes}
                                onAprovado={() => void refetch()}
                            />
                            {tarefasDaAula.length > 0 && (
                                <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    <Typography variant="p" className="flex items-center gap-2 text-sm font-bold tracking-wide text-mx-navy">
                                        <CheckCircle2 size={16} className="text-mx-blue" />
                                        Plano de Ação — Tarefa Prática da Aula
                                    </Typography>
                                    <Typography variant="caption" tone="muted" className="mb-3 mt-1 block">
                                        Execute estas ações hoje para consolidar o aprendizado da aula:
                                    </Typography>
                                    <div className="space-y-2">
                                        {tarefasDaAula.map(tarefa => (
                                            <label key={tarefa.id} className="flex cursor-pointer select-none items-start gap-2.5 rounded-lg border border-slate-100 bg-white p-2.5 transition-colors hover:border-slate-200">
                                                <input
                                                    type="checkbox"
                                                    checked={tarefa.concluida}
                                                    onChange={e => void handleToggleTask(tarefa, e.target.checked)}
                                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-mx-blue focus:ring-mx-blue"
                                                />
                                                <span className={`text-xs ${tarefa.concluida ? 'font-medium text-gray-500 line-through' : 'font-semibold text-gray-800'}`}>
                                                    {tarefa.descricao}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </section>
                            )}
                            <section className="rounded-xl border border-slate-200 p-4">
                                <Typography variant="p" className="flex items-center gap-2 font-semibold text-mx-navy"><MessageSquare size={16} /> Comentário ou sugestão</Typography>
                                <textarea
                                    value={comment}
                                    onChange={event => setComment(event.target.value)}
                                    maxLength={1000}
                                    rows={4}
                                    className="mt-3 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-mx-blue"
                                    placeholder="Compartilhe uma dúvida, comentário ou sugestão de conteúdo."
                                />
                                <div className="mt-3 flex justify-end">
                                    <button type="button" disabled={savingInteraction || !comment.trim()} onClick={() => void saveComment()} className="rounded-xl bg-mx-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                                        Salvar comentário
                                    </button>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}
          </div>
        </main>
    )
}
