import { useState } from 'react'
import { AlertTriangle, RefreshCw, ShieldCheck, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Textarea } from '@/components/atoms/Textarea'
import {
  MxErrorState,
  MxSectionCard,
  MxSectionHeader,
  MxStatusBanner,
} from '@/components/module/MxModuleVisualPrimitives'
import {
  detectPartialApplications,
  detectPotentialDuplicateApplications,
  detectDuplicatedActionPlanDrafts,
  reconcileDuplicatedActionPlanDrafts,
  reconcileDuplicatedTemplateApplications,
  type DuplicateDraftGroup,
  type PartialTemplateApplication,
  type PotentialDuplicateApplicationGroup,
} from './actionPlanReconciliation'

type DiagnosticResult = {
  partial: PartialTemplateApplication[]
  potentialDuplicates: PotentialDuplicateApplicationGroup[]
  duplicateDrafts: DuplicateDraftGroup[]
}

type ReviewSelection =
  | { kind: 'applications'; group: PotentialDuplicateApplicationGroup }
  | { kind: 'drafts'; group: DuplicateDraftGroup }

type ReconciliationPreview = {
  candidateCount: number
  targetIds: string[]
}

const ISSUE_LABELS = {
  MISSING_TEMPLATE_VERSION: 'Versão do template ausente',
  MISSING_RESPONSIBLE: 'Responsável ausente',
  NO_ITEMS: 'Itens ausentes ou incompletos',
} as const

function shortId(value: string) {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

/** Diagnóstico explicitamente read-only. Nenhuma reconciliação é executada nesta superfície. */
export function ActionPlanDiagnosticsPanel() {
  const [result, setResult] = useState<DiagnosticResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [review, setReview] = useState<ReviewSelection | null>(null)
  const [canonicalId, setCanonicalId] = useState('')
  const [duplicateIds, setDuplicateIds] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [preview, setPreview] = useState<ReconciliationPreview | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [reconciling, setReconciling] = useState(false)
  const [reconciliationError, setReconciliationError] = useState<string | null>(null)

  const closeReview = () => {
    setReview(null)
    setCanonicalId('')
    setDuplicateIds([])
    setReason('')
    setPreview(null)
    setConfirmed(false)
    setReconciliationError(null)
  }

  const openApplicationReview = (group: PotentialDuplicateApplicationGroup) => {
    closeReview()
    setReview({ kind: 'applications', group })
    setCanonicalId(group.requestIds[0] ?? '')
  }

  const openDraftReview = (group: DuplicateDraftGroup) => {
    closeReview()
    setReview({ kind: 'drafts', group })
    setCanonicalId(group.canonicalId)
  }

  const changeCanonical = (nextCanonicalId: string) => {
    setCanonicalId(nextCanonicalId)
    setDuplicateIds(ids => ids.filter(id => id !== nextCanonicalId))
    setPreview(null)
    setConfirmed(false)
  }

  const toggleDuplicate = (id: string) => {
    setDuplicateIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
    setPreview(null)
    setConfirmed(false)
  }

  const runReconciliation = async (dryRun: boolean) => {
    if (!review || !canonicalId || !duplicateIds.length || !reason.trim() || reconciling) return
    setReconciling(true)
    setReconciliationError(null)

    const response = review.kind === 'applications'
      ? await reconcileDuplicatedTemplateApplications({
          versionId: review.group.versionId,
          storeIds: [review.group.storeId],
          canonicalRequestId: canonicalId,
          duplicateRequestIds: duplicateIds,
          reason,
          dryRun,
        })
      : await reconcileDuplicatedActionPlanDrafts({
          templateId: review.group.templateId,
          canonicalId,
          duplicateIds,
          reason,
          dryRun,
        })

    if (response.error) {
      setReconciliationError(response.error)
    } else if (dryRun) {
      setPreview({
        candidateCount: response.candidateCount,
        targetIds: 'planIds' in response ? response.planIds : response.versionIds,
      })
      setConfirmed(false)
    } else {
      closeReview()
      await runDiagnostic()
    }
    setReconciling(false)
  }

  const runDiagnostic = async () => {
    if (running) return
    setRunning(true)
    setError(null)
    const [partial, duplicates, drafts] = await Promise.all([
      detectPartialApplications(),
      detectPotentialDuplicateApplications(),
      detectDuplicatedActionPlanDrafts(),
    ])
    const nextError = partial.error || duplicates.error || drafts.error
    if (nextError) {
      setError(nextError)
      setResult(null)
    } else {
      setResult({ partial: partial.partial, potentialDuplicates: duplicates.groups, duplicateDrafts: drafts.groups })
    }
    setRunning(false)
  }

  const findingCount = result
    ? result.partial.length + result.potentialDuplicates.length + result.duplicateDrafts.length
    : 0

  return (
    <MxSectionCard>
      <MxSectionHeader
        title="Integridade das aplicações"
        description="Diagnóstico manual e somente leitura. Nenhum plano ou rascunho é alterado automaticamente."
        actions={(
          <Button variant="outline" size="sm" onClick={() => void runDiagnostic()} disabled={running}>
            <RefreshCw size={16} aria-hidden="true" />
            {running ? 'Analisando…' : result ? 'Analisar novamente' : 'Executar diagnóstico'}
          </Button>
        )}
      />
      <div className="space-y-4 p-5">
        {error ? <MxErrorState description={error} retry={() => void runDiagnostic()} /> : null}

        {!error && !result ? (
          <MxStatusBanner tone="neutral">
            O diagnóstico compara aplicações materializadas, request IDs e rascunhos. Resultados semelhantes continuam sujeitos à revisão humana.
          </MxStatusBanner>
        ) : null}

        {result && findingCount === 0 ? (
          <MxStatusBanner tone="success" className="flex items-start gap-2">
            <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
            <span>Nenhuma aplicação parcial, possível duplicidade ou rascunho duplicado foi encontrado no recorte analisado.</span>
          </MxStatusBanner>
        ) : null}

        {result && findingCount > 0 ? (
          <>
            <MxStatusBanner tone="warning" className="flex items-start gap-2">
              <AlertTriangle size={20} aria-hidden="true" className="mt-0.5 shrink-0" />
              <span>{findingCount} grupo(s) exigem revisão. Este resultado não executou nenhuma alteração.</span>
            </MxStatusBanner>

            {result.partial.length ? (
              <section aria-labelledby="partial-applications-title" className="space-y-2">
                <h3 id="partial-applications-title" className="text-sm font-semibold text-foreground">Aplicações parciais ({result.partial.length})</h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {result.partial.map(application => (
                    <li key={application.applicationKey} className="space-y-1 p-3 text-sm">
                      <div className="font-medium text-foreground">Unidade {shortId(application.storeId)}</div>
                      <div className="text-muted-foreground">
                        {application.issues.map(issue => ISSUE_LABELS[issue]).join(' · ')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {application.materializedItemCount}/{application.expectedItemCount} item(ns) materializado(s) · {application.planIds.length} linha(s)
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.potentialDuplicates.length ? (
              <section aria-labelledby="potential-duplicates-title" className="space-y-2">
                <h3 id="potential-duplicates-title" className="text-sm font-semibold text-foreground">Possíveis duplicidades ({result.potentialDuplicates.length})</h3>
                <p className="text-xs text-muted-foreground">Request IDs diferentes podem ser reaplicações deliberadas; nenhum canônico foi inferido.</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {result.potentialDuplicates.map(group => (
                    <li key={group.groupKey} className="space-y-1 p-3 text-sm">
                      <div className="font-medium text-foreground">Unidade {shortId(group.storeId)}</div>
                      <div className="text-muted-foreground">Versão {shortId(group.versionId)} · {group.requestIds.length} solicitações</div>
                      <div className="text-xs text-muted-foreground">Requests: {group.requestIds.map(shortId).join(', ')}</div>
                      <Button variant="outline" size="xs" onClick={() => openApplicationReview(group)}>Revisar reconciliação</Button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.duplicateDrafts.length ? (
              <section aria-labelledby="duplicate-drafts-title" className="space-y-2">
                <h3 id="duplicate-drafts-title" className="text-sm font-semibold text-foreground">Rascunhos duplicados ({result.duplicateDrafts.length})</h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {result.duplicateDrafts.map(group => (
                    <li key={group.templateId} className="space-y-1 p-3 text-sm">
                      <div className="font-medium text-foreground">Template {shortId(group.templateId)}</div>
                      <div className="text-muted-foreground">Canônico sugerido pelo dry-run: {shortId(group.canonicalId)}</div>
                      <div className="text-xs text-muted-foreground">Revisar {group.duplicateIds.length} rascunho(s) antes de qualquer arquivamento.</div>
                      <Button variant="outline" size="xs" onClick={() => openDraftReview(group)}>Revisar reconciliação</Button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {review ? (
              <section aria-labelledby="reconciliation-review-title" className="space-y-4 rounded-xl border border-border bg-surface-alt p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 id="reconciliation-review-title" className="text-sm font-semibold text-foreground">Revisão de reconciliação</h3>
                    <p className="text-xs text-muted-foreground">Selecione manualmente o registro canônico e os duplicados. A prévia não altera dados.</p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label="Fechar revisão" onClick={closeReview}><X size={16} /></Button>
                </div>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">Registro canônico</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(review.kind === 'applications'
                      ? review.group.requestIds
                      : [review.group.canonicalId, ...review.group.duplicateIds]
                    ).map(id => (
                      <label key={`canonical-${id}`} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-default px-3 py-2 text-sm text-foreground">
                        <input
                          type="radio"
                          name="reconciliation-canonical"
                          value={id}
                          checked={canonicalId === id}
                          onChange={() => changeCanonical(id)}
                          className="h-4 w-4 accent-brand-primary"
                        />
                        <span>{shortId(id)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="space-y-2">
                  <legend className="text-sm font-medium text-foreground">Registros duplicados</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(review.kind === 'applications'
                      ? review.group.requestIds
                      : [review.group.canonicalId, ...review.group.duplicateIds]
                    ).filter(id => id !== canonicalId).map(id => (
                      <label key={`duplicate-${id}`} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface-default px-3 py-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={duplicateIds.includes(id)}
                          onChange={() => toggleDuplicate(id)}
                          className="h-4 w-4 rounded accent-brand-primary"
                        />
                        <span>{shortId(id)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block space-y-2 text-sm font-medium text-foreground">
                  Motivo obrigatório
                  <Textarea
                    value={reason}
                    onChange={event => { setReason(event.target.value); setPreview(null); setConfirmed(false) }}
                    placeholder="Explique por que estes registros representam uma duplicidade."
                    maxLength={500}
                  />
                </label>

                {reconciliationError ? <MxErrorState description={reconciliationError} /> : null}

                {preview ? (
                  <MxStatusBanner tone={preview.candidateCount > 0 ? 'warning' : 'neutral'}>
                    Prévia concluída: {preview.candidateCount} registro(s) serão {review.kind === 'applications' ? 'cancelados' : 'arquivados'}. IDs: {preview.targetIds.map(shortId).join(', ') || 'nenhum'}.
                  </MxStatusBanner>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => void runReconciliation(true)}
                    loading={reconciling && !preview}
                    disabled={!canonicalId || !duplicateIds.length || !reason.trim() || reconciling}
                  >
                    Gerar prévia
                  </Button>
                  {preview && preview.candidateCount > 0 ? (
                    <div className="flex flex-col gap-3 sm:items-end">
                      <label className="flex items-start gap-2 text-sm text-foreground">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          onChange={event => setConfirmed(event.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded accent-brand-primary"
                        />
                        Confirmo a seleção e o motivo acima.
                      </label>
                      <Button
                        variant="danger"
                        onClick={() => void runReconciliation(false)}
                        loading={reconciling}
                        disabled={!confirmed || reconciling}
                      >
                        Confirmar reconciliação
                      </Button>
                    </div>
                  ) : null}
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </MxSectionCard>
  )
}
