import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, FileBarChart, FileText, GraduationCap, Video } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxSectionCard, MxSectionHeader, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { METHODOLOGY_STATUS } from './methodology'
import { fetchLibraryMaterials, fetchReportTemplates, fetchUniversityLessons } from './consultoriaMxData'
import type { ProductWithMethodology } from './consultoriaMxData'
import type { ConsultoriaMxTab } from './useConsultoriaMx'

type SummaryMetric = {
  label: string
  value: number
  detail: string
  actionLabel: string
  icon: LucideIcon
  onAction: () => void
}

function SummaryMetricRow({ metric }: { metric: SummaryMetric }) {
  const Icon = metric.icon
  return (
    <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-alt text-status-success-text">
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{metric.label}</p>
          <p className="mt-0.5 break-words text-xs text-muted-foreground">{metric.detail}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <strong className="text-xl font-bold tabular-nums text-foreground">{metric.value}</strong>
        <Button variant="ghost" size="sm" className="justify-between px-0 text-status-success-text sm:justify-end" onClick={metric.onAction}>
          {metric.actionLabel}<ChevronRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export function OverviewTab(props: {
  rows: ProductWithMethodology[]
  onNavigate: (tab: ConsultoriaMxTab) => void
}) {
  const [libraryCount, setLibraryCount] = useState<{ total: number; published: number }>({ total: 0, published: 0 })
  const [reportCount, setReportCount] = useState<{ total: number; published: number }>({ total: 0, published: 0 })
  const [lessonsCount, setLessonsCount] = useState(0)
  const [contentLoading, setContentLoading] = useState(true)
  const [contentError, setContentError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const [library, reports, lessons] = await Promise.all([
          fetchLibraryMaterials(),
          fetchReportTemplates(),
          fetchUniversityLessons(),
        ])
        if (!active) return
        const hasError = library.error || reports.error || lessons.error
        setContentError(hasError ? 'Não foi possível atualizar todas as contagens de conteúdo.' : null)
        setLibraryCount({
          total: library.rows.length,
          published: library.rows.filter(item => item.status === 'publicado').length,
        })
        setReportCount({
          total: reports.rows.length,
          published: reports.rows.filter(item => item.status === 'publicado').length,
        })
        setLessonsCount(lessons.rows.length)
      } catch {
        if (active) setContentError('Não foi possível atualizar as contagens de conteúdo.')
      } finally {
        if (active) setContentLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const summary = useMemo(() => {
    const versions = props.rows.flatMap(product => product.versions)
    return {
      publishedProducts: new Set(versions.filter(v => v.status === 'publicado').map(v => v.program_key)).size,
      configuredEncounters: versions.reduce((acc, v) => acc + v.encounters_configured, 0),
      pendingEncounters: versions.reduce((acc, v) => acc + v.encounters_pending, 0),
      pendingChanges: versions.filter(v => v.status === 'rascunho' || v.status === 'em_revisao').length,
      pendingVersions: versions.filter(v => v.status === 'rascunho' || v.status === 'em_revisao' || v.encounters_pending > 0),
      publishedVideos: versions.reduce((acc, v) => acc + (v.videos_count ?? 0), 0),
      publishedFiles: versions.reduce((acc, v) => acc + (v.files_count ?? 0), 0),
    }
  }, [props.rows])

  const contentDetail = (value: number, singular: string, plural: string) => {
    if (contentLoading) return 'Carregando contagem'
    return value === 0 ? `Nenhum ${singular}` : `${value} ${value === 1 ? singular : plural}`
  }

  const groups: Array<{ title: string; description: string; metrics: SummaryMetric[] }> = [
    {
      title: 'Metodologia',
      description: 'Produtos, jornadas e pendências de configuração.',
      metrics: [
        { label: 'Produtos publicados', value: summary.publishedProducts, detail: 'Vigentes para novas jornadas', actionLabel: 'Ver produtos', icon: CheckCircle2, onAction: () => props.onNavigate('produtos') },
        { label: 'Encontros configurados', value: summary.configuredEncounters, detail: 'Estrutura pronta por produto', actionLabel: 'Ver encontros', icon: BookOpen, onAction: () => props.onNavigate('produtos') },
        { label: 'Encontros com pendência', value: summary.pendingEncounters, detail: 'Precisam de revisão', actionLabel: 'Revisar pendências', icon: AlertTriangle, onAction: () => props.onNavigate('produtos') },
      ],
    },
    {
      title: 'Conteúdo',
      description: 'Materiais de apoio usados nos encontros.',
      metrics: [
        { label: 'Vídeos publicados', value: summary.publishedVideos, detail: 'Referências vinculadas à metodologia', actionLabel: 'Gerenciar vídeos', icon: Video, onAction: () => props.onNavigate('biblioteca') },
        { label: 'Materiais publicados', value: libraryCount.published, detail: contentDetail(libraryCount.published, 'material publicado', 'materiais publicados'), actionLabel: 'Ver materiais', icon: FileText, onAction: () => props.onNavigate('biblioteca') },
        { label: 'Aulas da Universidade', value: lessonsCount, detail: contentDetail(lessonsCount, 'aula disponível', 'aulas disponíveis'), actionLabel: 'Ver aulas', icon: GraduationCap, onAction: () => props.onNavigate('biblioteca') },
        { label: 'Arquivos vinculados', value: summary.publishedFiles, detail: 'Arquivos associados às versões', actionLabel: 'Ver conteúdos', icon: FileText, onAction: () => props.onNavigate('biblioteca') },
      ],
    },
    {
      title: 'Publicação',
      description: 'Modelos e mudanças que chegam à operação.',
      metrics: [
        { label: 'Modelos de relatório', value: reportCount.published, detail: contentDetail(reportCount.published, 'modelo publicado', 'modelos publicados'), actionLabel: 'Ver modelos', icon: FileBarChart, onAction: () => props.onNavigate('relatorios') },
        { label: 'Alterações aguardando publicação', value: summary.pendingChanges, detail: 'Rascunhos e revisões em aberto', actionLabel: 'Revisar mudanças', icon: BookOpen, onAction: () => props.onNavigate('produtos') },
      ],
    },
  ]

  return (
    <div className="space-y-5">
      <MxSectionCard>
        <MxSectionHeader title="Pendências para revisar" description="Comece pelo que pode bloquear a publicação de uma metodologia." />
        <div className="p-5">
          {summary.pendingVersions.length === 0 ? (
            <MxStatusBanner tone="success">Nenhuma pendência identificada. As metodologias estão publicadas ou sem alterações abertas.</MxStatusBanner>
          ) : (
            <div className="space-y-2">
              {summary.pendingVersions.slice(0, 5).map(version => {
                const product = props.rows.find(item => item.program_key === version.program_key)
                const status = METHODOLOGY_STATUS[version.status]
                const reason = version.encounters_pending > 0
                  ? `${version.encounters_pending} encontro(s) com pendência`
                  : 'Alteração aguardando publicação ou revisão'
                return (
                  <div key={version.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-xs font-bold text-muted-foreground">{product?.name?.charAt(0) ?? 'P'}</div>
                      <div className="min-w-0">
                        <div className="break-words text-sm font-medium text-foreground">{product?.name ?? version.program_key} — Metodologia v{version.methodology_version_number}</div>
                        <div className="mt-0.5 break-words text-xs text-muted-foreground">{reason}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <MxStatusBanner tone={status?.tone ?? 'neutral'} className="px-3 py-2 text-xs">{status?.label ?? version.status}</MxStatusBanner>
                      <Button size="sm" onClick={() => props.onNavigate('produtos')}>Configurar</Button>
                    </div>
                  </div>
                )
              })}
              {summary.pendingVersions.length > 5 ? <p className="pt-1 text-xs text-muted-foreground">Mostrando 5 de {summary.pendingVersions.length} pendências. Abra a metodologia por produto para ver todas.</p> : null}
            </div>
          )}
        </div>
      </MxSectionCard>

      {contentError ? <MxStatusBanner tone="warning">{contentError} As ações continuam disponíveis; atualize a aba Conteúdo para tentar novamente.</MxStatusBanner> : null}

      <section className="grid gap-4 lg:grid-cols-3" aria-label="Resumo da metodologia">
        {groups.map(group => (
          <MxSectionCard key={group.title} className="overflow-hidden">
            <MxSectionHeader title={group.title} description={group.description} />
            <div className="divide-y divide-border">
              {group.metrics.map(metric => <SummaryMetricRow key={metric.label} metric={metric} />)}
            </div>
          </MxSectionCard>
        ))}
      </section>
    </div>
  )
}
