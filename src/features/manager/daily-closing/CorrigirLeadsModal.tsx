import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/organisms/Modal'
import type { CheckinWithTotals } from '@/types/database'
import {
  LEAD_FIELDS,
  buildLeadCorrectionPayload,
  buildLeadCorrectionReason,
  computeLeadDiff,
  getLeadOriginals,
  validateLeadCorrection,
  type LeadFieldKey,
} from './corrigir-leads'

export interface CorrigirLeadsModalProps {
  open: boolean
  onClose: () => void
  sellerName: string
  checkin: CheckinWithTotals | null
  onSubmit: (payload: ReturnType<typeof buildLeadCorrectionPayload>, reason: string) => Promise<{ error: string | null }>
}

/**
 * Correção controlada de leads pelo gerente (§13.2 Corrigir Leads).
 * Exibe valor anterior, novo e diferença; exige motivo; toda a aplicação
 * acontece server-side pelas RPCs canônicas de regularização (auditadas).
 */
export function CorrigirLeadsModal({ open, onClose, sellerName, checkin, onSubmit }: CorrigirLeadsModalProps) {
  const originals = useMemo(() => checkin ? getLeadOriginals(checkin) : { leads_prev_day: 0, leads_net_prev_day: 0 }, [checkin])
  const [values, setValues] = useState<Record<LeadFieldKey, number>>(originals)
  const [motivo, setMotivo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setValues(originals)
      setMotivo('')
      setObservacao('')
      setError(null)
    }
  }, [open, originals])

  const diffs = useMemo(() => computeLeadDiff(originals, values), [originals, values])

  const submit = async () => {
    const validation = validateLeadCorrection(originals, { ...values, motivo, observacao })
    if (validation) {
      setError(validation)
      return
    }
    setSaving(true)
    setError(null)
    const result = await onSubmit(buildLeadCorrectionPayload(values), buildLeadCorrectionReason({ motivo, observacao }))
    setSaving(false)
    if (result.error) setError(result.error)
    else onClose()
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title={`Corrigir leads — ${sellerName}`} description="Somente leads por canal podem ser alterados. Vendas, atendimentos, agendamentos, qualificados e garantia permanecem intocados."
      referenceStyle
      footer={<div className="flex justify-end gap-2"><button type="button" className="h-9 rounded-[8px] px-3 text-sm font-medium text-muted-foreground hover:bg-gray-100" onClick={onClose}>Cancelar</button><button type="button" className="h-9 rounded-[8px] bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40" disabled={saving || !checkin} onClick={() => void submit()}>{saving ? 'Aplicando…' : 'Aplicar correção auditada'}</button></div>}>
      {!checkin ? (
        <p className="text-sm text-muted-foreground">Este vendedor ainda não enviou o fechamento do dia — não há leads para corrigir.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEAD_FIELDS.map(field => (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor={`corrigir-${field.key}`}>{field.label}</label>
                <input className="h-10 w-full rounded-[12px] border border-border px-3 text-sm" id={`corrigir-${field.key}`} type="number" min={0} step={1} value={values[field.key]} onChange={event => setValues(prev => ({ ...prev, [field.key]: Number(event.target.value) }))} />
                <p className="mt-1 text-xs text-muted-foreground">Valor anterior: {originals[field.key]}</p>
              </div>
            ))}
          </div>
          {diffs.length > 0 && (
            <div className="rounded-[12px] border border-border bg-gray-50 p-3" role="status">
              {diffs.map(diff => (
                <p key={diff.key} className="text-xs text-muted-foreground">{diff.label}: {diff.anterior} → {diff.novo} (diferença {diff.diferenca > 0 ? `+${diff.diferenca}` : diff.diferenca})</p>
              ))}
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="corrigir-motivo">Motivo (obrigatório)</label>
            <input className="h-10 w-full rounded-[12px] border border-border px-3 text-sm" id="corrigir-motivo" value={motivo} onChange={event => setMotivo(event.target.value)} placeholder="Ex.: lead contado em duplicidade no canal internet" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="corrigir-observacao">Observação (opcional)</label>
            <textarea className="w-full resize-none rounded-[12px] border border-border px-3 py-2 text-sm" id="corrigir-observacao" rows={2} value={observacao} onChange={event => setObservacao(event.target.value)} placeholder="Contexto adicional para a auditoria" />
          </div>
          <p className="text-xs text-muted-foreground">A correção registra gerente, data/hora, valores anteriores e novos no log de auditoria do fechamento.</p>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        </div>
      )}
    </Modal>
  )
}
