import type { ChangeEvent } from 'react'
import { useState } from 'react'
import type { ConsultingJourneyController } from '../useConsultingJourney'
import type { ConsultingJourneyVisit, EvidenceStatus } from '../consultingJourney.types'

const labels: Record<EvidenceStatus, string> = {
  pending: 'Pendente', sent: 'Enviada', under_review: 'Em análise', approved: 'Aprovada', returned: 'Devolvida', replaced: 'Substituída',
}

export function EvidenceTab({ visit, controller }: { visit: ConsultingJourneyVisit; controller: ConsultingJourneyController }) {
  const [mode, setMode] = useState<'file' | 'link' | 'text'>('file')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [note, setNote] = useState('')
  const [previousId, setPreviousId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [returningEvidenceId, setReturningEvidenceId] = useState<string | null>(null)
  const [returnFeedback, setReturnFeedback] = useState('')

  const submit = async () => {
    setError(null)
    try {
      if (mode === 'file') {
        if (!file) throw new Error('Selecione um arquivo.')
        await controller.uploadEvidence({ visitId: visit.id, file, note, previousId })
        setFile(null)
      } else if (mode === 'link') {
        if (!url.trim()) throw new Error('Informe um link.')
        await controller.registerEvidence({ visitId: visit.id, type: 'link', name: 'Link', externalUrl: url.trim(), note, previousId })
        setUrl('')
      } else {
        if (!text.trim()) throw new Error('Informe o texto da evidência.')
        await controller.registerEvidence({ visitId: visit.id, type: 'texto', name: 'Registro em texto', textContent: text.trim(), note, previousId })
        setText('')
      }
      setNote('')
      setPreviousId(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível enviar a evidência.')
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-base font-semibold text-foreground">Nova evidência</h3>
        <div className="mt-3 flex gap-2" role="tablist" aria-label="Tipo da evidência">
          {(['file', 'link', 'text'] as const).map(value => <button key={value} type="button" onClick={() => setMode(value)} className={`rounded-lg px-3 py-2 text-sm ${mode === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{value === 'file' ? 'Arquivo' : value === 'link' ? 'Link' : 'Texto'}</button>)}
        </div>
        <div className="mt-4 space-y-3">
          {mode === 'file' ? <input type="file" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] || null)} /> : null}
          {mode === 'link' ? <input value={url} onChange={(event: ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)} placeholder="https://..." className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /> : null}
          {mode === 'text' ? <textarea value={text} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setText(event.target.value)} rows={4} placeholder="Descreva a evidência" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" /> : null}
          <textarea value={note} onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNote(event.target.value)} rows={2} placeholder="Observação opcional" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
          {previousId ? <p className="text-xs text-amber-700">Este envio substituirá a evidência selecionada.</p> : null}
          {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
          <button type="button" disabled={controller.mutating} onClick={() => void submit()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">Enviar evidência</button>
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Evidências enviadas</h3>
        <div className="mt-3 space-y-3">
          {visit.evidences.map(evidence => (
            <article key={evidence.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div><strong className="text-sm text-foreground">{evidence.name || 'Evidência'}</strong><p className="text-xs text-muted-foreground">{labels[evidence.status]} · {evidence.type}</p></div>
                <button type="button" onClick={() => setPreviousId(evidence.id)} className="text-xs font-medium text-primary hover:underline">Substituir</button>
              </div>
              {evidence.externalUrl ? <a href={evidence.externalUrl} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-primary hover:underline">Abrir link</a> : null}
              {evidence.textContent ? <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{evidence.textContent}</p> : null}
              {evidence.feedback ? <p className="mt-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900">Devolutiva: {evidence.feedback}</p> : null}
              {controller.canReviewEvidence && evidence.status !== 'replaced' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void controller.reviewEvidence(evidence.id, 'under_review')} className="rounded-md border border-border px-2.5 py-1.5 text-xs">Em análise</button>
                  <button type="button" onClick={() => void controller.reviewEvidence(evidence.id, 'approved')} className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs text-white">Aprovar</button>
                  <button type="button" onClick={() => { setReturningEvidenceId(evidence.id); setReturnFeedback(evidence.feedback || '') }} className="rounded-md bg-amber-600 px-2.5 py-1.5 text-xs text-white">Devolver</button>
                </div>
              ) : null}
              {returningEvidenceId === evidence.id ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <label className="text-xs font-semibold text-amber-950" htmlFor={`feedback-${evidence.id}`}>Devolutiva obrigatória</label>
                  <textarea id={`feedback-${evidence.id}`} value={returnFeedback} onChange={(event) => setReturnFeedback(event.target.value)} rows={3} className="mt-2 w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm" placeholder="Explique o que deve ser corrigido ou reenviado." />
                  <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={() => { setReturningEvidenceId(null); setReturnFeedback('') }} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs">Cancelar</button>
                    <button type="button" disabled={!returnFeedback.trim() || controller.mutating} onClick={() => void controller.reviewEvidence(evidence.id, 'returned', returnFeedback.trim()).then(() => { setReturningEvidenceId(null); setReturnFeedback('') })} className="rounded-md bg-amber-700 px-3 py-1.5 text-xs text-white disabled:opacity-50">Enviar devolutiva</button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {!visit.evidences.length ? <p className="text-sm text-muted-foreground">Nenhuma evidência enviada.</p> : null}
        </div>
      </section>
    </div>
  )
}
