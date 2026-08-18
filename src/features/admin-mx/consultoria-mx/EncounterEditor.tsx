import { useCallback, useEffect, useState } from 'react'
import { ExternalLink, Lock } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { TabNav } from '@/components/molecules/TabNav'
import { MxLoadingState, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { ENCOUNTER_INNER_TABS, calculateCompleteness, type EncounterInnerTabId } from './methodology'
import { fetchEncounterEditorData, refreshMethodologyCounters, type ContentReference, type ConsultantGuide, type EncounterActionPlanRef, type EncounterContent, type EncounterDeliverable, type EncounterEvidence, type EncounterReportRef } from './consultoriaMxData'
import type { ConsultoriaMxController } from './useConsultoriaMx'
import { ObjectiveTab } from './encounter/ObjectiveTab'
import { ConsultantGuideTab } from './encounter/ConsultantGuideTab'
import { ContentTab } from './encounter/ContentTab'
import { DeliverableTab } from './encounter/DeliverableTab'
import { EvidenceTab } from './encounter/EvidenceTab'
import { FilesTab } from './encounter/FilesTab'
import { ReportTab } from './encounter/ReportTab'
import { ActionPlansTab } from './encounter/ActionPlansTab'
import { useNavigate } from 'react-router-dom'

export type EncounterSummary = {
  percent: number
  status: string
  pending: number
  checks: Record<string, boolean>
}

export function EncounterEditor(props: {
  versionId: string
  visitNumber: number
  encounterTitle: string
  productName: string
  productVersion: number
  methodologyVersionNumber: string
  controller: ConsultoriaMxController
  onSummaryUpdate: (summary: EncounterSummary) => void
  totalEncounters: number
  onCountersChanged?: () => void
}) {
  const navigate = useNavigate()
  const [activeInner, setActiveInner] = useState<EncounterInnerTabId>('objetivo')
  const [data, setData] = useState<{
    content: EncounterContent | null
    guide: ConsultantGuide | null
    contentRefs: ContentReference[]
    deliverables: EncounterDeliverable[]
    evidence: EncounterEvidence[]
    reportRef: EncounterReportRef | null
    actionPlans: EncounterActionPlanRef[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    const result = await fetchEncounterEditorData(props.versionId, props.visitNumber)
    if (result.error) {
      setError(result.error)
      return
    }
    setData({
      content: result.content,
      guide: result.guide,
      contentRefs: result.contentRefs.filter(ref => ref.status !== 'arquivado'),
      deliverables: result.deliverables.filter(item => item.status !== 'arquivado'),
      evidence: result.evidence.filter(item => item.status !== 'arquivado'),
      reportRef: result.reportRef,
      actionPlans: result.actionPlans.filter(item => item.status === 'ativo'),
    })
    const completeness = calculateCompleteness({
      objective: result.content?.objective ?? null,
      expected_result: result.content?.expected_result ?? null,
      guideObjective: result.guide?.internal_objective ?? null,
      deliverables: result.deliverables.filter(item => item.status !== 'arquivado').length,
      evidence: result.evidence.filter(item => item.status !== 'arquivado').length,
      reportTemplateId: result.reportRef?.report_template_id ?? null,
      ownerVisibilitySet: result.content ? result.content.owner_visibility !== undefined : false,
      contentRefs: result.contentRefs.filter(ref => ref.status !== 'arquivado').length,
    })
    props.onSummaryUpdate(completeness)
  }, [props.versionId, props.visitNumber, props.onSummaryUpdate])

  useEffect(() => {
    setData(null)
    setError(null)
    void loadAll()
  }, [loadAll])

  const reload = useCallback(async () => {
    await loadAll()
    props.onCountersChanged?.()
    if (props.totalEncounters > 0) {
      void refreshMethodologyCounters(props.versionId, props.totalEncounters)
    }
  }, [loadAll, props.onCountersChanged, props.totalEncounters, props.versionId])

  if (error) {
    return <MxStatusBanner tone="danger">Falha ao carregar o encontro: {error}</MxStatusBanner>
  }

  if (!data) {
    return <MxLoadingState label="Carregando encontro" />
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded-full bg-brand-primary px-2 py-0.5 text-xs font-bold text-white">
                Encontro {props.visitNumber}
              </span>
              <h3 className="font-semibold text-foreground">{props.encounterTitle || 'Sem título'}</h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>Produto: <span className="font-medium text-foreground">{props.productName}</span></span>
              <span>v{props.productVersion}</span>
              <span>Metodologia: <span className="font-medium text-foreground">v{props.methodologyVersionNumber}</span></span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/produtos')}>
            <ExternalLink size={16} />Editar estrutura no Produto
          </Button>
        </div>
        <div className="mt-3 flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
          <Lock size={12} />Campos estruturais são editáveis em Produtos de Consultoria
        </div>
      </div>

      <TabNav
        tabs={ENCOUNTER_INNER_TABS.map(tab => {
          let count: number | null = null
          if (tab.id === 'aula') count = data.contentRefs.filter(ref => ref.content_type !== 'FILE').length
          if (tab.id === 'entrega') count = data.deliverables.length
          if (tab.id === 'evidencias') count = data.evidence.length
          if (tab.id === 'arquivos') count = data.contentRefs.filter(ref => ref.content_type === 'FILE').length
          if (tab.id === 'planos') count = data.actionPlans.length
          const label = count !== null && count > 0 ? `${tab.label} (${count})` : tab.label
          return { key: tab.id, label }
        })}
        activeTab={activeInner}
        onTabChange={setActiveInner}
        scrollable
      />

      {activeInner === 'objetivo' && <ObjectiveTab content={data.content} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
      {activeInner === 'orientacao' && <ConsultantGuideTab guide={data.guide} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
      {activeInner === 'aula' && <ContentTab refs={data.contentRefs.filter(ref => ref.content_type !== 'FILE')} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
      {activeInner === 'entrega' && <DeliverableTab deliverables={data.deliverables} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
      {activeInner === 'evidencias' && <EvidenceTab evidence={data.evidence} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
      {activeInner === 'arquivos' && <FilesTab refs={data.contentRefs.filter(ref => ref.content_type === 'FILE')} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
      {activeInner === 'relatorio' && <ReportTab reportRef={data.reportRef} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
      {activeInner === 'planos' && <ActionPlansTab actionPlans={data.actionPlans} versionId={props.versionId} visitNumber={props.visitNumber} onSaved={reload} controller={props.controller} />}
    </div>
  )
}
