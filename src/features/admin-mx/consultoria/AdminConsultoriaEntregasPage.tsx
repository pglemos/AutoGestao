import { useState, useEffect } from 'react'
import {
  ArrowLeft,
  CalendarDays,
  FileText,
  Video,
  UploadCloud,
  CheckCircle2,
  Clock,
  Plus,
  Download,
  Eye,
  FileCheck,
} from 'lucide-react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { resolveRouteLayout } from '@/design-system/page'
import { Button } from '@/components/atoms/Button'
import {
  MxLoadingState,
  MxModuleHeader,
  MxModulePage,
  MxSectionCard,
} from '@/components/module/MxModuleVisualPrimitives'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { toast } from '@/lib/toast'

interface JourneyEncounter {
  id: string
  encounter_number: number
  title: string
  modality: 'presencial' | 'online' | 'a_definir'
  status: 'agendado' | 'em_andamento' | 'concluido' | 'cancelado' | 'pendente'
  scheduled_date?: string | null
  responsible_consultant_name?: string | null
  applied_time_hours?: number
  is_onboarding?: boolean
  description?: string
}

const MODALITY_LABELS: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  a_definir: 'A Definir',
}

const STATUS_LABELS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  agendado: { label: 'Agendado', bg: 'bg-status-info-bg', text: 'text-status-info-text', border: 'border-status-info-border' },
  em_andamento: { label: 'Em Andamento', bg: 'bg-status-warning-bg', text: 'text-status-warning-text', border: 'border-status-warning-border' },
  concluido: { label: 'Concluído', bg: 'bg-status-success-bg', text: 'text-status-success-text', border: 'border-status-success-border' },
  cancelado: { label: 'Cancelado', bg: 'bg-status-danger-bg', text: 'text-status-danger-text', border: 'border-status-danger-border' },
  pendente: { label: 'Pendente', bg: 'bg-surface-neutral', text: 'text-muted-foreground', border: 'border-border' },
}

export function AdminConsultoriaEntregasPage() {
  const { clientSlug } = useParams<{ clientSlug: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { width, bottomClearance } = resolveRouteLayout(location.pathname)

  const [client, setClient] = useState<{ id: string; name: string; slug: string } | null>(null)
  const [encounters, setEncounters] = useState<JourneyEncounter[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEncounter, setSelectedEncounter] = useState<JourneyEncounter | null>(null)

  useEffect(() => {
    if (!clientSlug) return
    let active = true
    setLoading(true)

    void (async () => {
      // Find client by slug or id
      const { data: clientData, error: clientErr } = await supabase
        .from('clientes_consultoria')
        .select('id, name, slug')
        .or(`slug.eq.${clientSlug},id.eq.${clientSlug}`)
        .maybeSingle()

      if (!active) return
      if (clientErr || !clientData) {
        toast.error('Cliente não encontrado.')
        setLoading(false)
        return
      }

      setClient(clientData)

      // Fetch journey encounters
      const { data: encData } = await supabase
        .from('visitas_consultoria')
        .select('*')
        .eq('client_id', clientData.id)

      if (!active) return

      if (encData && encData.length > 0) {
        const sorted = [...encData].sort((a, b) => ((a.visit_number ?? a.numero_visita ?? 0) - (b.visit_number ?? b.numero_visita ?? 0)))
        setEncounters(
          sorted.map((v: Record<string, unknown>) => {
            const vNum = (v.visit_number ?? v.numero_visita ?? 0) as number
            return {
              id: String(v.id),
              encounter_number: vNum,
              title: (v.title || v.titulo || (vNum === 0 ? 'Onboarding Inicial' : `Encontro ${vNum}`)) as string,
              modality: (v.modality || v.modalidade || 'online') as JourneyEncounter['modality'],
              status: (v.status === 'concluida' || v.status === 'concluido' ? 'concluido' : v.status === 'em_andamento' ? 'em_andamento' : v.status === 'cancelada' ? 'cancelado' : 'agendado') as JourneyEncounter['status'],
              scheduled_date: (v.scheduled_at || v.data_agendada || null) as string | null,
              responsible_consultant_name: (v.consultant_name || v.consultor_responsavel_nome || null) as string | null,
              applied_time_hours: ((v.duration_hours ?? v.horas_aplicadas ?? 2) as number),
              is_onboarding: vNum === 0,
              description: (v.objective || v.objetivo || '') as string,
            }
          })
        )
      } else {
        // Standard methodology 12 visits roadmap
        const defaultEncounters: JourneyEncounter[] = [
          {
            id: 'enc-0',
            encounter_number: 0,
            title: 'Onboarding e Alinhamento Executivo',
            modality: 'online',
            status: 'concluido',
            is_onboarding: true,
            applied_time_hours: 2,
            description: 'Apresentação do programa, definição do Dono Master e alinhamento de expectativas.',
          },
          ...Array.from({ length: 11 }, (_, i) => ({
            id: `enc-${i + 1}`,
            encounter_number: i + 1,
            title: `Encontro ${i + 1} — Metodologia PMR`,
            modality: (i === 1 || i === 5 ? 'presencial' : 'online') as JourneyEncounter['modality'],
            status: (i === 0 ? 'em_andamento' : 'pendente') as JourneyEncounter['status'],
            is_onboarding: false,
            applied_time_hours: i === 1 || i === 5 ? 8 : 2,
            description: `Execução do cronograma metodológico do Encontro ${i + 1}.`,
          })),
        ]
        setEncounters(defaultEncounters)
      }

      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [clientSlug])

  return (
    <MxModulePage id="admin-mx-consultoria-entregas" width={width} bottomClearance={bottomClearance}>
      <div className="w-full space-y-5">
        <MxModuleHeader
          icon={CalendarDays}
          eyebrow="Consultoria e Metodologia"
          title={`Consultoria e Entregas — ${client?.name || 'Cliente'}`}
          description={`${encounters.length} encontros cadastrados na jornada de consultoria`}
          actions={
            <Button variant="outline" onClick={() => navigate(client ? `/clientes/${client.slug || client.id}` : '/clientes')}>
              <ArrowLeft size={16} /> Voltar à Ficha 360
            </Button>
          }
        />

        {loading ? (
          <MxLoadingState label="Carregando cronograma de entregas..." />
        ) : (
          <MxSectionCard>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">
                Cronograma de Encontros da Metodologia
              </h3>
              <span className="text-xs text-muted-foreground">
                {encounters.filter(e => e.status === 'concluido').length} de {encounters.length} concluídos
              </span>
            </div>

            <div className="divide-y divide-border">
              {encounters.map(encounter => {
                const statusConfig = STATUS_LABELS[encounter.status] || STATUS_LABELS.pendente
                return (
                  <div
                    key={encounter.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedEncounter(encounter)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedEncounter(encounter)
                      }
                    }}
                    className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-surface-alt cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          encounter.is_onboarding
                            ? 'bg-status-info-bg text-status-info-text'
                            : encounter.status === 'concluido'
                              ? 'bg-status-success-bg text-status-success-text'
                              : 'bg-surface-neutral text-foreground'
                        }`}
                      >
                        {encounter.is_onboarding ? '0' : encounter.encounter_number}
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {encounter.is_onboarding ? 'Onboarding' : `Encontro ${encounter.encounter_number}`} — {encounter.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2">
                          <span>{MODALITY_LABELS[encounter.modality] || encounter.modality}</span>
                          <span>•</span>
                          <span>{encounter.responsible_consultant_name || 'Consultor a definir'}</span>
                          <span>•</span>
                          <span>{encounter.applied_time_hours || 2}h</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-auto">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                        {statusConfig.label}
                      </span>
                      <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold">
                        Abrir
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </MxSectionCard>
        )}

        {/* Modal de Detalhes do Encontro (Canonical Dialog) */}
        <Dialog open={Boolean(selectedEncounter)} onOpenChange={open => { if (!open) setSelectedEncounter(null) }}>
          {selectedEncounter ? (
            <DialogContent className="max-w-2xl rounded-2xl p-6">
              <DialogHeader>
                <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                  {client?.name} • {selectedEncounter.is_onboarding ? 'Onboarding' : `Encontro ${selectedEncounter.encounter_number}`}
                </div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedEncounter.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Detalhes, entregáveis, aula e evidências do encontro.
                </DialogDescription>
              </DialogHeader>

              <EncounterDetailContent encounter={selectedEncounter} />

              <div className="flex justify-end pt-3">
                <Button variant="primary" size="sm" onClick={() => setSelectedEncounter(null)}>
                  Concluir
                </Button>
              </div>
            </DialogContent>
          ) : null}
        </Dialog>
      </div>
    </MxModulePage>
  )
}

function EncounterDetailContent({ encounter }: { encounter: JourneyEncounter }) {
  const [activeTab, setActiveTab] = useState<'geral' | 'aula' | 'entrega' | 'evidencias' | 'arquivos' | 'relatorio'>('geral')

  const tabs = [
    { id: 'geral', label: 'Geral', icon: FileText },
    { id: 'aula', label: 'Aula', icon: Video },
    { id: 'entrega', label: 'Entrega', icon: FileCheck },
    { id: 'evidencias', label: 'Evidências', icon: UploadCloud },
    { id: 'arquivos', label: 'Arquivos', icon: Download },
    { id: 'relatorio', label: 'Relatório', icon: CheckCircle2 },
  ] as const

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex border-b border-border bg-surface-default overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors shrink-0 cursor-pointer ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Body Content */}
      <div data-mx-scroll-region className="space-y-4 text-xs pr-1">
        {activeTab === 'geral' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface-alt p-3 rounded-lg border border-border">
                <span className="font-semibold text-muted-foreground uppercase">Modalidade</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{MODALITY_LABELS[encounter.modality]}</p>
              </div>
              <div className="bg-surface-alt p-3 rounded-lg border border-border">
                <span className="font-semibold text-muted-foreground uppercase">Carga Horária</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{encounter.applied_time_hours || 2} horas</p>
              </div>
              <div className="bg-surface-alt p-3 rounded-lg border border-border">
                <span className="font-semibold text-muted-foreground uppercase">Status</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{encounter.status.toUpperCase()}</p>
              </div>
              <div className="bg-surface-alt p-3 rounded-lg border border-border">
                <span className="font-semibold text-muted-foreground uppercase">Consultor Responsável</span>
                <p className="text-sm font-bold text-foreground mt-0.5">{encounter.responsible_consultant_name || 'Não atribuído'}</p>
              </div>
            </div>

            <div>
              <span className="font-semibold text-foreground">Objetivo Metodológico:</span>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {encounter.description || 'Alinhamento prático de indicadores, execução de rituais e acompanhamento de metas.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'aula' && (
          <div className="space-y-3">
            <div className="bg-status-info-bg border border-status-info-border rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video size={20} className="text-status-info-text shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-status-info-text">Vídeo-aula do Encontro</h4>
                  <p className="text-xs text-status-info-text">Treinamento preparatório e roteiro de boas práticas.</p>
                </div>
              </div>
              <Button variant="primary" size="sm" className="text-xs">
                <Eye size={12} /> Assistir
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'entrega' && (
          <div className="space-y-3">
            <div className="border border-border rounded-xl p-4 space-y-2">
              <h4 className="font-bold text-sm text-foreground">Checklist de Entregáveis</h4>
              <ul className="space-y-2 text-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-status-success-text" />
                  Validação do Plano Estratégico da Unidade
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-status-success-text" />
                  Alinhamento com Gestores e Vendedores
                </li>
                <li className="flex items-center gap-2">
                  <Clock size={14} className="text-status-warning-text" />
                  Acompanhamento do Fechamento Diário
                </li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'evidencias' && (
          <div className="text-center py-6 border-2 border-dashed border-border rounded-xl space-y-2">
            <UploadCloud size={24} className="mx-auto text-muted-foreground" />
            <div className="text-sm font-semibold text-foreground">Adicionar Evidências da Visita</div>
            <p className="text-xs text-muted-foreground">Faça upload de fotos, atas assinadas e lista de presença.</p>
            <Button variant="outline" size="sm" className="mt-2 text-xs">
              <Plus size={12} /> Selecionar Arquivos
            </Button>
          </div>
        )}

        {activeTab === 'arquivos' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-surface-alt">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-foreground" />
                <span className="font-medium text-foreground">Guia_do_Consultor_Encontro.pdf</span>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-primary">
                <Download size={12} /> Baixar
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'relatorio' && (
          <div className="space-y-3">
            <label htmlFor="consultant-report-notes" className="block font-semibold text-foreground">Parecer e Ata do Consultor</label>
            <textarea
              id="consultant-report-notes"
              rows={4}
              defaultValue="Encontro executado conforme o cronograma. Equipe alinhada e metas desdobradas com sucesso."
              className="w-full border border-border rounded-lg p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary bg-surface-default"
            />
            <div className="flex justify-end">
              <Button variant="primary" size="sm" className="text-xs" onClick={() => toast.success('Parecer salvo com sucesso.')}>
                Salvar Relatório
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminConsultoriaEntregasPage
