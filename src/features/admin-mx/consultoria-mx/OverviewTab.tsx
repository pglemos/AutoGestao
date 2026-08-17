import { useMemo } from 'react'
import { BookOpen, CheckCircle2, FileBarChart, FileText, GraduationCap, Video } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/atoms/Button'
import { MxMetricCard, MxMetricGrid, MxSectionCard, MxSectionHeader, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { METHODOLOGY_STATUS } from './methodology'
import { fetchLibraryMaterials, fetchReportTemplates } from './consultoriaMxData'
import type { ProductWithMethodology } from './consultoriaMxData'
import { useEffect, useState } from 'react'
import type { ConsultoriaMxTab } from './useConsultoriaMx'

export function OverviewTab(props: {
  rows: ProductWithMethodology[]
  onNavigate: (tab: ConsultoriaMxTab) => void
}) {
  const navigate = useNavigate()
  const [libraryCount, setLibraryCount] = useState<{ total: number; published: number }>({ total: 0, published: 0 })
  const [reportCount, setReportCount] = useState<{ total: number; published: number }>({ total: 0, published: 0 })

  useEffect(() => {
    void (async () => {
      const [library, reports] = await Promise.all([fetchLibraryMaterials(), fetchReportTemplates()])
      setLibraryCount({
        total: library.rows.length,
        published: library.rows.filter(item => item.status === 'publicado').length,
      })
      setReportCount({
        total: reports.rows.length,
        published: reports.rows.filter(item => item.status === 'publicado').length,
      })
    })()
  }, [])

  const summary = useMemo(() => {
    const versions = props.rows.flatMap(product => product.versions)
    return {
      publishedProducts: new Set(versions.filter(v => v.status === 'publicado').map(v => v.program_key)).size,
      configuredEncounters: versions.reduce((acc, v) => acc + v.encounters_configured, 0),
      pendingEncounters: versions.reduce((acc, v) => acc + v.encounters_pending, 0),
      pendingChanges: versions.filter(v => v.status === 'rascunho' || v.status === 'em_revisao').length,
      drafts: versions.filter(v => v.status === 'rascunho'),
      publishedVideos: versions.reduce((acc, v) => acc + (v.videos_count ?? 0), 0),
      publishedFiles: versions.reduce((acc, v) => acc + (v.files_count ?? 0), 0),
    }
  }, [props.rows])

  const cards = [
    { label: 'Produtos com metodologia publicada', value: summary.publishedProducts, icon: CheckCircle2, tone: 'success' as const, action: () => props.onNavigate('produtos') },
    { label: 'Encontros configurados', value: summary.configuredEncounters, icon: BookOpen, tone: 'info' as const, action: () => props.onNavigate('produtos') },
    { label: 'Encontros com pendência', value: summary.pendingEncounters, icon: Video, tone: 'warning' as const, action: () => props.onNavigate('produtos') },
    { label: 'Vídeos publicados', value: summary.publishedVideos, icon: Video, tone: 'info' as const, action: () => props.onNavigate('biblioteca') },
    { label: 'Materiais publicados', value: libraryCount.published, icon: FileText, tone: 'warning' as const, action: () => props.onNavigate('biblioteca') },
    { label: 'Aulas da Universidade', value: 0, icon: GraduationCap, tone: 'violet' as const, action: () => props.onNavigate('biblioteca') },
    { label: 'Arquivos na biblioteca', value: libraryCount.total, icon: FileText, tone: 'warning' as const, action: () => props.onNavigate('biblioteca') },
    { label: 'Modelos de relatório', value: reportCount.published, icon: FileBarChart, tone: 'info' as const, action: () => props.onNavigate('relatorios') },
    { label: 'Alterações aguardando publicação', value: summary.pendingChanges, icon: BookOpen, tone: 'neutral' as const, action: () => props.onNavigate('produtos') },
  ]

  return (
    <div className="space-y-5">
      <MxMetricGrid>
        {cards.map((card, index) => (
          <MxMetricCard
            key={index}
            title={card.label}
            value={card.value}
            detail={card.tone === 'success' ? 'Vigente para novas jornadas' : 'Acesse a aba para gerenciar'}
            icon={card.icon}
            tone={card.tone}
            actionLabel="Abrir"
            onAction={card.action}
          />
        ))}
      </MxMetricGrid>

      <MxSectionCard>
        <MxSectionHeader title="Próximas pendências de metodologia" description="Rascunhos aguardando configuração ou revisão dos encontros." />
        <div className="p-5">
          {summary.drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma pendência. Todas as metodologias estão publicadas ou em revisão.</p>
          ) : (
            <div className="space-y-2">
              {summary.drafts.slice(0, 5).map(version => {
                const product = props.rows.find(item => item.program_key === version.program_key)
                const status = METHODOLOGY_STATUS[version.status as keyof typeof METHODOLOGY_STATUS]
                return (
                  <div key={version.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-alt text-xs font-bold text-muted-foreground">
                        {product?.name?.charAt(0) ?? 'P'}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{product?.name ?? version.program_key} — Metodologia v{version.methodology_version_number}</div>
                        <div className="text-xs text-muted-foreground">{version.encounters_pending} encontro(s) com pendência</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MxStatusBanner tone={status?.tone ?? 'neutral'}>{status?.label ?? version.status}</MxStatusBanner>
                      <Button size="sm" onClick={() => props.onNavigate('produtos')}>Configurar</Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </MxSectionCard>

      <MxSectionCard>
        <MxSectionHeader title="Configuração rápida" description="Acesse a metodologia por produto ou edite a estrutura dos encontros." />
        <div className="flex flex-wrap gap-2 p-5">
          <Button onClick={() => props.onNavigate('produtos')}>Metodologia por produto</Button>
          <Button variant="outline" onClick={() => props.onNavigate('biblioteca')}>Biblioteca de conteúdos</Button>
          <Button variant="outline" onClick={() => props.onNavigate('relatorios')}>Modelos de relatório</Button>
          <Button variant="outline" onClick={() => navigate('/produtos')}>Editar estrutura no Produto</Button>
        </div>
      </MxSectionCard>
    </div>
  )
}
