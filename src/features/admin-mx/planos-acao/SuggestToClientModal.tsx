import { useEffect, useMemo, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import type { ActionPlanTemplate } from './actionPlanTemplates'
import type { WizardClient, WizardIndicator } from './clientActionPlanWizardData'

/**
 * Sugere um template ao Dono de um cliente (Base44 `SuggestToClientModal`).
 * Cria uma linha em consultor_solucoes com status 'pendente_validacao',
 * pronta para validar/publicar na aba de sugestões.
 */
export function SuggestToClientModal(props: {
  open: boolean
  template: ActionPlanTemplate | null
  clients: WizardClient[]
  indicators: WizardIndicator[]
  onClose: () => void
  onSuggested: () => void
}) {
  const { supabaseUser } = useAuth()
  const [clientId, setClientId] = useState('')
  const [indicatorKey, setIndicatorKey] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (props.open) {
      setClientId('')
      setIndicatorKey('')
      setReason(props.template?.indicador ?? '')
    }
  }, [props.open, props.template])

  const deptIndicators = useMemo(() => {
    const template = props.template
    return template ? props.indicators.filter(indicator => indicator.area === template.departamento) : []
  }, [props.template, props.indicators])

  if (!props.open || !props.template) return null

  const submit = async () => {
    if (saving || !supabaseUser) return
    if (!clientId) {
      toast.error('Selecione um cliente.')
      return
    }
    const client = props.clients.find(item => item.id === clientId)
    const indicator = deptIndicators.find(item => item.metric_key === indicatorKey)
    setSaving(true)
    try {
      const { error } = await supabase.from('consultor_solucoes').insert({
        scope_type: 'store',
        scope_id: client?.id ?? null,
        rule_code: 'SUGESTAO_DONO_TEMPLATE',
        problem: reason.trim() || 'Indicador com oportunidade de melhoria identificada.',
        recommendation: `Aplicar o plano padrão "${props.template?.nome}" no cliente.`,
        rationale: `Sugestão gerada a partir do template ${props.template?.nome}${indicator ? ` para o indicador ${indicator.label}` : ''}.`,
        priority: 'media',
        rule_version: 'admin-mx-sugestao-2026.08.15',
        metadata: {
          source: 'admin-mx',
          template_id: props.template?.id,
          template_name: props.template?.nome,
          indicator_key: indicatorKey || null,
          client_name: client?.name ?? null,
        },
        status: 'pendente_validacao',
        created_at: new Date().toISOString(),
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Sugestão ao Dono criada.')
      props.onSuggested()
      props.onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Sugerir ao Dono — ${props.template.nome}`}
      size="md"
      closeOnEscape={!saving}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void submit()} disabled={saving || !clientId}>
            <Send size={16} />{saving ? 'Enviando...' : 'Enviar sugestão'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone="info">
          {props.template.departamento} · {props.template.indicador || 'sem indicador'} · versão publicada:
          {' '}{props.template.versions.find(version => version.status === 'publicada')?.versao ?? '—'}
        </MxStatusBanner>
        <MxField label="Cliente">
          <MxSelect aria-label="Cliente" value={clientId} onChange={event => setClientId(event.target.value)}>
            <option value="">Selecione o cliente...</option>
            {props.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Indicador">
          <MxSelect aria-label="Indicador" value={indicatorKey} onChange={event => setIndicatorKey(event.target.value)}>
            <option value="">Indicador principal do plano</option>
            {deptIndicators.map(indicator => <option key={indicator.metric_key} value={indicator.metric_key}>{indicator.label}</option>)}
          </MxSelect>
        </MxField>
        <MxField label="Motivo da sugestão">
          <MxTextarea rows={2} value={reason} onChange={event => setReason(event.target.value)} placeholder="Ex: indicador abaixo da meta" />
        </MxField>
      </div>
    </Modal>
  )
}
