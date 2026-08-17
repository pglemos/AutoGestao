import { useContentSuggestions, useTrainings } from '@/hooks/useData'
import { useStores } from '@/hooks/useTeam'
import { useState } from 'react'
import { toast } from '@/lib/toast'
import {
    GraduationCap, Plus, X, Save, ExternalLink, CheckCircle, 
    Play, Filter, Sparkles, BookOpen, Clock, Target, 
    Users, LayoutDashboard, ChevronRight, RefreshCw, Smartphone, Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/molecules/Card'
import { MxModuleHeader, MxModulePage } from '@/components/module/MxModuleVisualPrimitives'
import { AulasAoVivoSection } from '@/features/universidade/sections/AulasAoVivoSection'

const types = ['prospeccao', 'agendamento', 'atendimento', 'apresentacao', 'financiamento', 'carro_de_troca', 'fechamento', 'funil', 'rotina_diaria', 'crm', 'institucional', 'gestao', 'pre-vendas']
const audiences = ['vendedor', 'gerente', 'dono', 'todos']
const sources = ['mx_interno', 'especialista_convidado', 'fornecedor', 'loja_institucional']

export default function ConsultorTreinamentos() {
    const { treinamentos, loading, error, createTraining, refetch } = useTrainings()
    const { suggestions } = useContentSuggestions()
    const { lojas } = useStores()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', type: 'prospeccao', video_url: '', target_audience: 'todos', source_kind: 'mx_interno', editorial_status: 'active', store_id: '', duration_minutes: 15, xp_reward: 100, curation_notes: '' })
    const [saving, setSaving] = useState(false)
    const [isRefetching, setIsRefetching] = useState(false)
    const storeNameById = new Map(lojas.map(loja => [loja.id, loja.name]))
    const resetForm = () => setForm({ title: '', description: '', type: 'prospeccao', video_url: '', target_audience: 'todos', source_kind: 'mx_interno', editorial_status: 'active', store_id: '', duration_minutes: 15, xp_reward: 100, curation_notes: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title || !form.video_url) { toast.error('Preencha os campos obrigatórios.'); return }
        if (form.source_kind === 'loja_institucional' && !form.store_id) {
            toast.error('Selecione a loja para publicar conteúdo institucional.')
            return
        }
        setSaving(true)
        const { error: createError } = await createTraining({
            ...form,
            store_id: form.source_kind === 'loja_institucional' ? form.store_id : null,
            type: form.source_kind === 'loja_institucional' ? 'institucional' : form.type,
        })
        setSaving(false)
        if (createError) { toast.error(createError); return }
        toast.success('Novo módulo de aprendizado publicado!')
        setShowForm(false); resetForm()
        refetch()
    }

    if (loading) return (
        <MxModulePage id="consultor-treinamentos-loading" width="dashboard" bottomClearance="navigation">
            <MxModuleHeader icon={GraduationCap} eyebrow="Academy MX" title="Curadoria Academy" description="Auditando conteúdo..." />
            <div className="flex items-center justify-center py-mx-2xl">
                <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-status-success-text" />
            </div>
        </MxModulePage>
    )

    return (
        <MxModulePage id="consultor-treinamentos" width="dashboard" bottomClearance="navigation">
            
            <MxModuleHeader
                icon={GraduationCap}
                eyebrow="Academy MX"
                title={<span>Curadoria <span className="text-status-success-text">Academy</span></span>}
                description="GESTÃO DE CONHECIMENTO & ALTA PERFORMANCE"
                actions={
                    <div className="flex items-center gap-mx-sm shrink-0">
                        <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {setIsRefetching(true); refetch().then(()=>setIsRefetching(false))}} 
                            aria-label="Atualizar" 
                            className="w-mx-xl h-mx-xl"
                        >
                            <RefreshCw size={20} className={cn(isRefetching && "animate-spin")} />
                        </Button>
                        <Button 
                            onClick={() => setShowForm(true)} 
                            className="h-mx-xl px-8 shadow-sm bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold"
                        >
                            <Plus size={18} className="mr-2" /> NOVO CONTEÚDO
                        </Button>
                    </div>
                }
            />

            <AnimatePresence>
                {showForm && (
                    <motion.section initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="shrink-0 mb-10">
                        <form onSubmit={handleSubmit}>
                            <Card className="border p-mx-md bg-white relative">
                                <div className="absolute top-mx-0 right-mx-0 w-mx-96 h-mx-96 bg-brand-primary/5 rounded-mx-full blur-mx-xl -mr-48 -mt-48" />
                                
                                <header className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4 relative z-[var(--mx-z-sticky)]">
                                    <div className="flex items-center gap-mx-md">
                                        <div className="w-mx-14 h-mx-14 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm transform rotate-2"><GraduationCap size={24} /></div>
                                        <div>
                                            <Typography variant="h3">Publicar Treinamento</Typography>
                                            <Typography variant="caption" tone="muted" className="mt-1">EXPANSÃO DE BASE TÉCNICA</Typography>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} aria-label="Fechar" className="rounded-mx-full w-mx-xl h-mx-xl bg-surface-alt hover:bg-white shadow-sm"><X size={24} /></Button>
                                </header>

                                <div className="grid lg:grid-cols-2 gap-mx-14 relative z-[var(--mx-z-sticky)]">
                                    <div className="space-y-mx-lg">
                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">Título da Aula</Typography>
                                            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Masterizando o Script de Fechamento" required className="h-[var(--mx-input-height-lg)] px-6 font-bold" />
                                        </div>
                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">Ementa / Descrição</Typography>
                                            <Textarea 
                                                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                                placeholder="Descreva detalhadamente os objetivos desta aula..."
                                                rows={4}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-mx-10">
                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">URL do Material (Vídeo)</Typography>
                                            <Input value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} placeholder="https://youtube.com/v/..." required className="h-[var(--mx-input-height-lg)] px-6 font-medium" />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-mx-md">
                                            <div className="space-y-mx-sm">
                                                <Typography variant="caption" tone="muted" className="ml-2">Pilar de Vendas</Typography>
                                                <Select aria-label="Pilar de Vendas" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                                                    {types.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                                </Select>
                                            </div>
                                            <div className="space-y-mx-sm">
                                                <Typography variant="caption" tone="muted" className="ml-2">Público Alvo</Typography>
                                                <Select aria-label="Público Alvo" value={form.target_audience} onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}>
                                                    {audiences.map(a => <option key={a} value={a}>{a.toUpperCase()}</option>)}
                                                </Select>
                                            </div>
                                            <div className="space-y-mx-sm">
                                                <Typography variant="caption" tone="muted" className="ml-2">Origem / Curadoria</Typography>
                                                <Select aria-label="Origem / Curadoria" value={form.source_kind} onChange={e => setForm(p => ({ ...p, source_kind: e.target.value }))}>
                                                    {sources.map(source => <option key={source} value={source}>{source.toUpperCase()}</option>)}
                                                </Select>
                                            </div>
                                            {form.source_kind === 'loja_institucional' && (
                                                <div className="space-y-mx-sm">
                                                    <Typography variant="caption" tone="muted" className="ml-2">Loja vinculada</Typography>
                                                    <Select aria-label="Loja vinculada" value={form.store_id} onChange={e => setForm(p => ({ ...p, store_id: e.target.value, type: 'institucional' }))}>
                                                        <option value="">SELECIONE A LOJA</option>
                                                        {lojas.map(loja => <option key={loja.id} value={loja.id}>{loja.name.toUpperCase()}</option>)}
                                                    </Select>
                                                </div>
                                            )}
                                            <div className="space-y-mx-sm">
                                                <Typography variant="caption" tone="muted" className="ml-2">Duração / XP</Typography>
                                                <Input aria-label="Duração / XP" type="number" value={String(form.duration_minutes)} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) || 15 }))} className="h-[var(--mx-input-height-lg)] px-6 font-bold" />
                                            </div>
                                        </div>
                                        <div className="space-y-mx-sm">
                                            <Typography variant="caption" tone="muted" className="ml-2">Notas de Curadoria</Typography>
                                            <Input value={form.curation_notes} onChange={e => setForm(p => ({ ...p, curation_notes: e.target.value }))} placeholder="Fonte, specialist, fornecedor ou revisão necessária" className="h-[var(--mx-input-height-lg)] px-6 font-bold" />
                                        </div>
                                    </div>
                                </div>

                                <footer className="pt-10 flex justify-end gap-mx-sm border-t border-border-subtle mt-10 relative z-[var(--mx-z-sticky)]">
                                    <Button type="submit" disabled={saving} className="h-mx-2xl px-14 hover:bg-brand-primary-hover text-white">
                                        {saving ? <RefreshCw className="animate-spin mr-3" /> : <Save size={20} className="mr-3" />} <Typography variant="caption" as="span">PUBLICAR TREINAMENTO</Typography>
                                    </Button>
                                </footer>
                            </Card>
                        </form>
                    </motion.section>
                )}
            </AnimatePresence>

            <AulasAoVivoSection />

            {suggestions.length > 0 && (
                <Card className="border bg-white p-mx-md">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-mx-md mb-mx-md">
                        <div>
                            <Typography variant="h3" className="">Backlog editorial</Typography>
                            <Typography variant="caption" tone="muted" className="">Sugestões recebidas da rede para curadoria MX</Typography>
                        </div>
                        <Badge variant="brand" className="px-4 py-1">{suggestions.length} sugestões</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-mx-sm">
                        {suggestions.slice(0, 9).map(suggestion => (
                            <div key={suggestion.id} className="rounded-xl border border-border-subtle bg-surface-alt/50 p-mx-md">
                                <Badge variant={suggestion.priority === 'high' ? 'danger' : 'outline'} className="">{suggestion.theme}</Badge>
                                <Typography variant="p" className="text-sm mt-mx-xs">{suggestion.title}</Typography>
                                <Typography variant="caption" tone="muted" className="line-clamp-2">{suggestion.description || 'Sem descrição adicional.'}</Typography>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* Academy Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-mx-lg" aria-live="polite">
                {treinamentos.map((t, i) => (
                    <motion.article key={t.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                        <Card className="border bg-white p-mx-md hover:shadow-sm transition-all relative flex flex-col">
                            <div className="absolute top-mx-0 right-mx-0 w-mx-4xl h-mx-4xl bg-brand-primary/5 rounded-mx-full blur-mx-huge -mr-16 -mt-16 opacity-0 group-hover:opacity-100 transition-opacity" />
                            
                            <div className="flex items-start justify-between mb-8 border-b border-border-subtle pb-6 relative z-[var(--mx-z-sticky)]">
                                <div className={cn("w-mx-xl h-mx-xl rounded-xl flex items-center justify-center transition-all shadow-none transform group-hover:rotate-6", t.watched ? "bg-status-success-surface text-status-success" : "bg-surface-alt text-muted-foreground group-hover:bg-brand-primary group-hover:text-white")}>
                                    {t.watched ? <CheckCircle size={20} /> : <Play size={20} className="ml-1" />}
                                </div>
                                <div className="flex flex-col items-end gap-mx-xs">
                                    <Badge variant="brand" className="px-4 py-1">{t.type}</Badge>
                                    {t.store_id && <Badge variant="outline" className="px-4 py-1 max-w-mx-40 truncate">{storeNameById.get(t.store_id) || 'Loja institucional'}</Badge>}
                                    {t.watched && <Typography variant="tiny" tone="success" className="">CONCLUÍDO</Typography>}
                                </div>
                            </div>

                            <div className="flex-1 mb-8 relative z-[var(--mx-z-sticky)] space-y-mx-xs">
                                <Typography variant="h3" className="leading-tight group-hover:text-status-success-text transition-colors line-clamp-2">{t.title}</Typography>
                                <Typography variant="p" tone="muted" className="leading-relaxed line-clamp-3 italic">"{t.description}"</Typography>
                                
                                <div className="flex flex-wrap gap-mx-xs pt-4">
                                    <Badge variant="outline" className="px-3"><Typography variant="tiny" as="span">{t.target_audience?.toUpperCase()}</Typography></Badge>
                                    <Badge variant="outline" className="px-3"><Typography variant="tiny" as="span">12 MIN</Typography></Badge>
                                    <Badge variant={t.needs_review ? 'danger' : 'outline'} className="px-3"><Typography variant="tiny" as="span">{t.average_rating || 0} ({t.rating_count || 0})</Typography></Badge>
                                </div>
                            </div>

                            <footer className="pt-6 border-t border-border-subtle flex items-center justify-between mt-auto relative z-[var(--mx-z-sticky)]">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(j => (
                                        <div key={j} className="w-mx-lg h-mx-lg rounded-xl border-2 border-white bg-surface-alt flex items-center justify-center text-muted-foreground">
                                            <Typography variant="caption" as="span">{String.fromCharCode(64 + j)}</Typography>
                                        </div>
                                    ))}
                                    <div className="w-mx-lg h-mx-lg rounded-xl border border-border-subtle bg-brand-primary-subtle flex items-center justify-center text-status-success-text shadow-sm">
                                        <Typography variant="tiny" as="span">+12</Typography>
                                    </div>
                                </div>
                                <Button asChild size="icon" variant="outline" className="w-mx-xl h-mx-xl hover:bg-brand-primary-hover text-white group-hover:scale-110 transition-transform">
                                    <a href={t.video_url} target="_blank" rel="noopener noreferrer" aria-label={`Assistir treinamento: ${t.title}`}>
                                        <ExternalLink size={20} aria-hidden="true" />
                                    </a>
                                </Button>
                            </footer>
                        </Card>
                    </motion.article>
                ))}
            </div>
        </MxModulePage>
    )
}
