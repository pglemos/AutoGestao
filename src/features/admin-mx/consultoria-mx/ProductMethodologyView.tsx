import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, BookOpen, CheckCircle2, ChevronLeft, Eye, FileBarChart, FileText, Lock, Plus, Video } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { MxProgress, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { encounterDisplayName, ENCOUNTER_COMPLETENESS, METHODOLOGY_STATUS, nextMethodologyVersion } from './methodology'
import { EncounterEditor } from './EncounterEditor'
import { EncounterPreview } from './EncounterPreview'
import { fetchProductEncounters, refreshMethodologyCounters, type ProductWithMethodology } from './consultoriaMxData'
import type { ConsultoriaMxController } from './useConsultoriaMx'
import { VersionsCompareModal, VersionsHistoryModal } from './VersionsModals'

type EncounterItem = {
  visit_number: number
  objective: string
  duration: string | null
  active: boolean
}

export function ProductMethodologyView(props: {
  product: ProductWithMethodology
  controller: ConsultoriaMxController
  compareVersions?: boolean
  showHistory?: boolean
  onCloseCompare?: () => void
  onCloseHistory?: () => void
  onBack: () => void
}) {
  const { product, controller } = props
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null)
  const [encounters, setEncounters] = useState<EncounterItem[]>([])
  const [selectedEncounter, setSelectedEncounter] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [summary, setSummary] = useState<{ percent: number; status: string; pending: number; checks: Record<string, boolean> } | null>(null)

  // Determina a versão ativa
  const activeVersion = useMemo(() => {
    if (selectedVersionId) {
      const found = product.versions.find(v => v.id === selectedVersionId)
      if (found) return found
    }
    const editable = product.versions.find(version => version.status === 'rascunho')
      ?? product.versions.find(version => version.status === 'em_revisao')
    return editable ?? product.versions.find(version => version.status === 'publicado') ?? product.versions[0] ?? null
  }, [product.versions, selectedVersionId])

  const draftVersion = useMemo(() => {
    return activeVersion
      ? { id: activeVersion.id, status: activeVersion.status, methodology_version_number: activeVersion.methodology_version_number }
      : null
  }, [activeVersion])

  const loadEncounters = useCallback(async () => {
    const result = await fetchProductEncounters(product.program_key, draftVersion?.id ?? null)
    if (result.rows.length === 0 && product.total_visits) {
      const generated = Array.from({ length: product.total_visits }, (_, index) => ({
        visit_number: index + 1,
        objective: '',
        duration: null,
        active: true,
      }))
      setEncounters(generated)
      setSelectedEncounter(current => current ?? (generated[0]?.visit_number ?? null))
      return
    }
    setEncounters(result.rows)
    setSelectedEncounter(current => current ?? (result.rows[0]?.visit_number ?? null))
  }, [product.program_key, product.total_visits, draftVersion?.id])

  useEffect(() => {
    void loadEncounters()
  }, [loadEncounters])

  const published = product.versions.find(version => version.status === 'publicado')

  const createDraft = async () => {
    if (creating) return
    setCreating(true)
    try {
      const version = await controller.createVersion(
        product,
        nextMethodologyVersion(published?.methodology_version_number ?? null),
        draftVersion?.id || published?.id || null
      )
      if (version) {
        setSelectedVersionId(version.id)
        void refreshMethodologyCounters(version.id, encounters.length)
        void loadEncounters()
      }
    } finally {
      setCreating(false)
    }
  }

  const publishDraft = async () => {
    if (!draftVersion) return
    const version = product.versions.find(item => item.id === draftVersion.id)
    if (!version) return
    const ok = await controller.publish(version, product.name)
    if (ok) {
      void loadEncounters()
    }
  }

  const summaryRows = useMemo(() => [
    { icon: CheckCircle2, label: 'Objetivo', ok: summary?.checks.objective ?? false },
    { icon: CheckCircle2, label: 'Resultado esperado', ok: summary?.checks.expectedResult ?? false },
    { icon: BookOpen, label: 'Orientação consultor', ok: summary?.checks.guide ?? false },
    { icon: FileText, label: 'Entrega', ok: summary?.checks.deliverable ?? false },
    { icon: AlertCircle, label: 'Evidência', ok: summary?.checks.evidence ?? false },
    { icon: FileBarChart, label: 'Relatório', ok: summary?.checks.report ?? false },
    { icon: Eye, label: 'Visibilidade no Dono', ok: summary?.checks.visibility ?? false },
    { icon: Video, label: 'Conteúdo', ok: summary?.checks.contentReviewed ?? false },
  ], [summary])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={props.onBack}><ChevronLeft size={16} />Voltar</Button>
          <div>
            <h3 className="font-semibold text-foreground">{product.name ?? product.program_key}</h3>
            <div className="text-xs text-muted-foreground">v{product.versao} · {encounters.length} encontros</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product.versions.length > 1 && (
            <select
              value={draftVersion?.id ?? ''}
              onChange={event => setSelectedVersionId(event.target.value)}
              className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground outline-none"
              aria-label="Selecionar versão da metodologia"
            >
              {product.versions.map(v => (
                <option key={v.id} value={v.id}>
                  v{v.methodology_version_number} — {METHODOLOGY_STATUS[v.status as keyof typeof METHODOLOGY_STATUS]?.label ?? v.status}
                </option>
              ))}
            </select>
          )}
          {draftVersion && (
            <MxStatusBanner tone={METHODOLOGY_STATUS[draftVersion.status as keyof typeof METHODOLOGY_STATUS]?.tone ?? 'neutral'}>
              Metodologia v{draftVersion.methodology_version_number} — {METHODOLOGY_STATUS[draftVersion.status as keyof typeof METHODOLOGY_STATUS]?.label ?? draftVersion.status}
            </MxStatusBanner>
          )}
          {draftVersion?.status === 'rascunho' && (
            <Button size="sm" onClick={() => void publishDraft()}>Publicar Metodologia</Button>
          )}
          {draftVersion?.status === 'publicado' && (
            <Button size="sm" variant="outline" onClick={() => void createDraft()} disabled={creating}>
              <Plus size={16} />{creating ? 'Criando...' : 'Nova Versão'}
            </Button>
          )}
          {!draftVersion && (
            <Button size="sm" onClick={() => void createDraft()} disabled={creating}>
              <Plus size={16} />{creating ? 'Criando...' : 'Criar Versão Metodológica'}
            </Button>
          )}
        </div>
      </div>

      {!draftVersion ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-surface-alt/40 p-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-alt"><BookOpen size={24} className="text-muted-foreground" /></div>
          <h4 className="mb-1 font-semibold text-foreground">Nenhuma versão metodológica</h4>
          <p className="mb-4 max-w-md text-sm text-muted-foreground">Crie a primeira versão da metodologia para começar a configurar os encontros.</p>
          <Button onClick={() => void createDraft()} disabled={creating}><Plus size={16} />{creating ? 'Criando...' : 'Criar Versão Metodológica'}</Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr_270px]">
          <div className="rounded-xl border border-border bg-surface-alt/40 p-3">
            <div className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Jornada</div>
            <div className="max-h-[640px] space-y-1 overflow-y-auto pr-1">
              {encounters.map(encounter => (
                <button
                  key={encounter.visit_number}
                  type="button"
                  onClick={() => setSelectedEncounter(encounter.visit_number)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${selectedEncounter === encounter.visit_number ? 'bg-brand-primary text-white shadow-sm' : 'text-foreground hover:bg-surface-alt'}`}
                >
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${selectedEncounter === encounter.visit_number ? 'bg-white/20 text-white' : 'bg-surface-alt text-muted-foreground'}`}>
                    {encounter.visit_number}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{encounterDisplayName(encounter.visit_number)}</div>
                    <div className={`truncate text-caption ${selectedEncounter === encounter.visit_number ? 'text-white/80' : 'text-muted-foreground'}`}>{encounter.objective || 'Sem título'}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            {selectedEncounter !== null ? (
              <EncounterEditor
                key={`${draftVersion.id}-${selectedEncounter}`}
                versionId={draftVersion.id}
                visitNumber={selectedEncounter}
                encounterTitle={encounters.find(item => item.visit_number === selectedEncounter)?.objective ?? ''}
                productName={product.name ?? product.program_key}
                productVersion={product.versao}
                methodologyVersionNumber={draftVersion.methodology_version_number}
                controller={controller}
                onSummaryUpdate={setSummary}
                totalEncounters={encounters.length}
                onCountersChanged={() => {
                  if (draftVersion?.id) void refreshMethodologyCounters(draftVersion.id, encounters.length)
                  void loadEncounters()
                }}
              />
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">Selecione um encontro.</div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border p-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completude</div>
              {summary ? (
                <>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <MxStatusBanner tone={ENCOUNTER_COMPLETENESS[summary.status as keyof typeof ENCOUNTER_COMPLETENESS]?.tone ?? 'neutral'}>
                      {ENCOUNTER_COMPLETENESS[summary.status as keyof typeof ENCOUNTER_COMPLETENESS]?.label ?? '—'}
                    </MxStatusBanner>
                    <span className="text-xs font-semibold text-foreground">{summary.percent}%</span>
                  </div>
                  <MxProgress value={summary.percent} />
                </>
              ) : <p className="text-xs text-muted-foreground">Carregando...</p>}
            </div>

            {summary && (
              <div className="rounded-xl border border-border p-4">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resumo</div>
                <div className="space-y-1.5">
                  {summaryRows.map(row => (
                    <div key={row.label} className="flex items-center gap-2 text-xs">
                      <row.icon size={13} className={row.ok ? 'text-status-success-text shrink-0' : 'text-muted-foreground/40 shrink-0'} />
                      <span className={row.ok ? 'text-foreground' : 'text-muted-foreground'}>{row.label}</span>
                      <span className={`ml-auto text-xs font-semibold ${row.ok ? 'text-status-success-text' : 'text-muted-foreground'}`}>{row.ok ? '✓' : '○'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border p-4">
              <Button className="w-full" onClick={() => setShowPreview(true)}><Eye size={16} />Visualizar como Dono</Button>
            </div>

            <div className="rounded-xl border border-border bg-surface-alt/40 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-foreground"><Lock size={12} />Campos estruturais</div>
              <p className="text-xs text-muted-foreground">Nome, número, modalidade e duração são editáveis em Produtos de Consultoria.</p>
            </div>
          </div>
        </div>
      )}

      {showPreview && selectedEncounter !== null && draftVersion && (
        <EncounterPreview
          versionId={draftVersion.id}
          visitNumber={selectedEncounter}
          productName={product.name ?? product.program_key}
          onClose={() => setShowPreview(false)}
        />
      )}

      {props.compareVersions && (
        <VersionsCompareModal
          versions={product.versions}
          productName={product.name ?? product.program_key}
          onClose={() => props.onCloseCompare?.()}
        />
      )}
      {props.showHistory && (
        <VersionsHistoryModal
          versions={product.versions}
          productName={product.name ?? product.program_key}
          onClose={() => props.onCloseHistory?.()}
        />
      )}
    </div>
  )
}

