import { useContentSuggestions, useTrainings } from '@/hooks/useData'
import { useStores } from '@/hooks/useTeam'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from '@/lib/toast'
import {
  BookOpen,
  ExternalLink,
  GraduationCap,
  Plus,
  Save,
  Star,
  Users,
  Video,
  X,
  RefreshCw,
} from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/atoms/Badge'
import { Typography } from '@/components/atoms/Typography'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Select } from '@/components/atoms/Select'
import { Textarea } from '@/components/atoms/Textarea'
import { Card } from '@/components/molecules/Card'
import {
  MxMetricCard,
  MxMetricGrid,
  MxModuleHeader,
  MxModulePage,
  MxSelect,
  MxToolbar,
} from '@/components/module/MxModuleVisualPrimitives'
import { AulasAoVivoSection } from '@/features/universidade/sections/AulasAoVivoSection'
import type { TrainingWithProgress } from '@/hooks/useTrainings'

const types = ['prospeccao', 'agendamento', 'atendimento', 'apresentacao', 'financiamento', 'carro_de_troca', 'fechamento', 'funil', 'rotina_diaria', 'crm', 'institucional', 'gestao', 'pre-vendas']
const audiences = ['vendedor', 'gerente', 'dono', 'todos']
const sources = ['mx_interno', 'especialista_convidado', 'fornecedor', 'loja_institucional']

const LEVEL_FILTERS = ['todos', 'N1', 'N2', 'N3', 'N4'] as const
const TYPE_FILTERS = ['todos', 'video', 'documento', 'ao_vivo', 'avaliacao'] as const

type LevelFilter = (typeof LEVEL_FILTERS)[number]
type TypeFilter = (typeof TYPE_FILTERS)[number]

function trainingLevel(training: TrainingWithProgress): string {
  switch (training.target_audience) {
    case 'vendedor': return 'N1'
    case 'gerente': return 'N2'
    case 'dono': return 'N3'
    default: return 'N4'
  }
}

function trainingContentType(training: TrainingWithProgress): Exclude<TypeFilter, 'todos'> {
  const title = training.title.toLowerCase()
  if (training.type === 'rotina_diaria' || title.includes('ao vivo')) return 'ao_vivo'
  if (training.type === 'gestao' || title.includes('avalia')) return 'avaliacao'
  if (training.type === 'institucional') return 'documento'
  return 'video'
}

function trainingAuthor(training: TrainingWithProgress): string {
  if (training.source_kind === 'mx_interno') return 'Equipe MX'
  if (training.source_kind === 'especialista_convidado') return 'Especialista convidado'
  if (training.source_kind === 'fornecedor') return 'Fornecedor'
  return 'MX Performance'
}

function ContentTypeIcon({ training }: { training: TrainingWithProgress }) {
  const kind = trainingContentType(training)
  if (kind === 'ao_vivo') return <Users size={18} />
  if (kind === 'avaliacao') return <Star size={18} />
  if (kind === 'documento') return <BookOpen size={18} />
  return <Video size={18} />
}

export default function ConsultorTreinamentos() {
  const { treinamentos, loading, createTraining, refetch } = useTrainings()
  const { suggestions } = useContentSuggestions()
  const { lojas } = useStores()
  const [searchParams, setSearchParams] = useSearchParams()
  const showEditorial = searchParams.get('view') === 'editorial'
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'prospeccao', video_url: '', target_audience: 'todos', source_kind: 'mx_interno', editorial_status: 'active', store_id: '', duration_minutes: 15, xp_reward: 100, curation_notes: '' })
  const [saving, setSaving] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('todos')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos')
  const storeNameById = new Map(lojas.map(loja => [loja.id, loja.name]))
  const resetForm = () => setForm({ title: '', description: '', type: 'prospeccao', video_url: '', target_audience: 'todos', source_kind: 'mx_interno', editorial_status: 'active', store_id: '', duration_minutes: 15, xp_reward: 100, curation_notes: '' })

  const published = useMemo(
    () => treinamentos.filter(item => item.editorial_status === 'active' || item.active !== false),
    [treinamentos],
  )

  const metrics = useMemo(() => ({
    publicados: published.length,
    matriculas: published.reduce((acc, item) => acc + (item.rating_count || 0), 0),
    aoVivo: published.filter(item => trainingContentType(item) === 'ao_vivo').length,
    avaliacoes: published.filter(item => trainingContentType(item) === 'avaliacao').length,
  }), [published])

  const filteredCatalog = useMemo(() => published.filter(item => {
    if (levelFilter !== 'todos' && trainingLevel(item) !== levelFilter) return false
    if (typeFilter !== 'todos' && trainingContentType(item) !== typeFilter) return false
    return true
  }), [levelFilter, published, typeFilter])

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
    toast.success('Conteúdo publicado.')
    setShowForm(false); resetForm()
    refetch()
  }

  if (loading) return (
    <MxModulePage id="consultor-treinamentos-loading" width="dashboard" bottomClearance="navigation">
      <MxModuleHeader icon={GraduationCap} title="Universidade MX" description="Carregando catálogo..." />
      <div className="flex items-center justify-center py-mx-2xl">
        <RefreshCw className="w-mx-xl h-mx-xl animate-spin text-status-success-text" />
      </div>
    </MxModulePage>
  )

  return (
    <MxModulePage id="consultor-treinamentos" width="dashboard" bottomClearance="navigation">
      <MxModuleHeader
        icon={GraduationCap}
        title="Universidade MX"
        description={`${metrics.publicados} conteúdo(s) publicado(s)`}
        actions={(
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setIsRefetching(true); refetch().then(() => setIsRefetching(false)) }}
              aria-label="Atualizar"
            >
              <RefreshCw size={18} className={cn(isRefetching && 'animate-spin')} />
            </Button>
            <Button variant="outline" onClick={() => {
              const next = new URLSearchParams(searchParams)
              if (showEditorial) next.delete('view')
              else next.set('view', 'editorial')
              setSearchParams(next, { replace: true })
            }}
            >
              {showEditorial ? 'Ver catálogo' : 'Ferramentas editoriais'}
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} /> Novo Conteúdo
            </Button>
          </div>
        )}
      />

      <AnimatePresence>
        {showForm ? (
          <motion.section initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="mb-6">
            <form onSubmit={handleSubmit}>
              <Card className="border p-5">
                <header className="mb-4 flex items-center justify-between border-b border-border-subtle pb-4">
                  <Typography variant="h3">Publicar conteúdo</Typography>
                  <Button variant="ghost" size="icon" type="button" onClick={() => setShowForm(false)} aria-label="Fechar"><X size={18} /></Button>
                </header>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3">
                    <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Título" required />
                    <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Descrição" rows={4} />
                    <Input value={form.video_url} onChange={e => setForm(p => ({ ...p, video_url: e.target.value }))} placeholder="URL do material" required />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select aria-label="Pilar" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </Select>
                    <Select aria-label="Público" value={form.target_audience} onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))}>
                      {audiences.map(a => <option key={a} value={a}>{a}</option>)}
                    </Select>
                    <Select aria-label="Origem" value={form.source_kind} onChange={e => setForm(p => ({ ...p, source_kind: e.target.value }))}>
                      {sources.map(source => <option key={source} value={source}>{source}</option>)}
                    </Select>
                    <Input aria-label="Duração" type="number" value={String(form.duration_minutes)} onChange={e => setForm(p => ({ ...p, duration_minutes: Number(e.target.value) || 15 }))} />
                    {form.source_kind === 'loja_institucional' ? (
                      <Select aria-label="Loja" value={form.store_id} onChange={e => setForm(p => ({ ...p, store_id: e.target.value, type: 'institucional' }))}>
                        <option value="">Selecione a loja</option>
                        {lojas.map(loja => <option key={loja.id} value={loja.id}>{loja.name}</option>)}
                      </Select>
                    ) : null}
                    <Input value={form.curation_notes} onChange={e => setForm(p => ({ ...p, curation_notes: e.target.value }))} placeholder="Notas de curadoria" className="sm:col-span-2" />
                  </div>
                </div>
                <footer className="mt-4 flex justify-end">
                  <Button type="submit" disabled={saving}><Save size={16} />{saving ? 'Publicando...' : 'Publicar'}</Button>
                </footer>
              </Card>
            </form>
          </motion.section>
        ) : null}
      </AnimatePresence>

      {!showEditorial ? (
        <>
          <MxMetricGrid>
            <MxMetricCard title="Publicados" value={metrics.publicados} detail="Conteúdos ativos no catálogo" icon={GraduationCap} tone="success" />
            <MxMetricCard title="Total matrículas" value={metrics.matriculas} detail="Inscrições registradas" icon={Users} tone="info" />
            <MxMetricCard title="Ao vivo" value={metrics.aoVivo} detail="Sessões ao vivo" icon={Video} tone="violet" />
            <MxMetricCard title="Avaliações" value={metrics.avaliacoes} detail="Conteúdos de avaliação" icon={Star} tone="warning" />
          </MxMetricGrid>

          <MxToolbar aria-label="Filtros do catálogo">
            <MxSelect value={levelFilter} onChange={event => setLevelFilter(event.target.value as LevelFilter)} aria-label="Filtrar por nível">
              <option value="todos">Todos os níveis</option>
              <option value="N1">N1</option>
              <option value="N2">N2</option>
              <option value="N3">N3</option>
              <option value="N4">N4</option>
            </MxSelect>
            <MxSelect value={typeFilter} onChange={event => setTypeFilter(event.target.value as TypeFilter)} aria-label="Filtrar por tipo">
              <option value="todos">Todos os tipos</option>
              <option value="video">Vídeo</option>
              <option value="documento">Documento</option>
              <option value="ao_vivo">Ao vivo</option>
              <option value="avaliacao">Avaliação</option>
            </MxSelect>
          </MxToolbar>

          <div className="space-y-3" aria-live="polite">
            {filteredCatalog.map(training => (
              <Card key={training.id} className="flex items-center gap-4 border p-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-alt text-muted-foreground">
                  <ContentTypeIcon training={training} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold text-foreground">{training.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{trainingLevel(training)}</Badge>
                    <span>{training.duration_minutes || 15}min</span>
                    <span>por {trainingAuthor(training)}</span>
                    {training.store_id ? <span>{storeNameById.get(training.store_id) || 'Loja'}</span> : null}
                  </div>
                </div>
                <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                  {training.rating_count || 0} matrícula(s)
                </div>
                <Badge variant="success" className="shrink-0 uppercase">Publicado</Badge>
                <Button asChild variant="ghost" size="icon">
                  <a
                    href={training.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir conteúdo: ${training.title}`}
                  >
                    <ExternalLink size={16} aria-hidden="true" />
                  </a>
                </Button>
              </Card>
            ))}
            {!filteredCatalog.length ? (
              <Card className="border p-8 text-center text-sm text-muted-foreground">
                Nenhum conteúdo encontrado com os filtros selecionados.
              </Card>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <AulasAoVivoSection />
          {suggestions.length > 0 ? (
            <Card className="border p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <Typography variant="h3">Backlog editorial</Typography>
                  <Typography variant="caption" tone="muted">Sugestões recebidas da rede para curadoria MX</Typography>
                </div>
                <Badge variant="brand">{suggestions.length} sugestões</Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {suggestions.slice(0, 9).map(suggestion => (
                  <div key={suggestion.id} className="rounded-xl border border-border-subtle bg-surface-alt/50 p-4">
                    <Badge variant={suggestion.priority === 'high' ? 'danger' : 'outline'}>{suggestion.theme}</Badge>
                    <Typography variant="p" className="mt-2 text-sm">{suggestion.title}</Typography>
                    <Typography variant="caption" tone="muted" className="line-clamp-2">{suggestion.description || 'Sem descrição adicional.'}</Typography>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}
    </MxModulePage>
  )
}
