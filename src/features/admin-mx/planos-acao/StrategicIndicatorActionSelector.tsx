import { useEffect, useMemo, useState } from 'react'
import { FileCheck, Target, Zap } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import type { ActionPlanTemplate } from './actionPlanTemplates'
import { applyTemplateToStore } from './actionPlanTemplates'
import type { WizardClient, WizardIndicator, WizardResponsible } from './clientActionPlanWizardData'

/**
 * Seletor de indicador estratégico + template compatível + responsável para
 * aplicar um plano padrão a um cliente (Base44 `StrategicIndicatorActionSelector`).
 */
export function StrategicIndicatorActionSelector(props: {
  open: boolean
  client: WizardClient | null
  clients?: WizardClient[]
  templates: ActionPlanTemplate[]
  indicators: WizardIndicator[]
  responsibles: WizardResponsible[]
  stores: Array<{ id: string; name: string }>
  onClose: () => void
  onCreated: () => void
}) {
  const { supabaseUser } = useAuth()
  const [indicatorKey, setIndicatorKey] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [storeId, setStoreId] = useState('')
  const [deadlineDays, setDeadlineDays] = useState(30)
  const [saving, setSaving] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')

  const activeClient = props.client ?? (props.clients ?? []).find(client => client.id === selectedClientId) ?? null

  useEffect(() => {
    if (props.open) {
      setIndicatorKey('')
      setTemplateId('')
      setResponsibleId('')
      setStoreId('')
      setDeadlineDays(30)
      setSelectedClientId(props.client?.id ?? '')
    }
  }, [props.open, props.client])

  const compatibleTemplates = useMemo(
    () => props.templates.filter(template => {
      if (!indicatorKey) return true
      if (!template.indicador) return true
      return template.indicador === props.indicators.find(indicator => indicator.metric_key === indicatorKey)?.label
    }),
    [props.templates, indicatorKey, props.indicators],
  )

  if (!props.open) return null

  const selectedTemplate = compatibleTemplates.find(template => template.id === templateId)

  const apply = async () => {
    if (saving || !supabaseUser || !activeClient) return
    if (!templateId) {
      toast.error('Selecione um template.')
      return
    }
    const version = selectedTemplate?.versions.find(item => item.status === 'publicada')
    if (!version) {
      toast.error('Este template não tem versão publicada.')
      return
    }
    if (!storeId) {
      toast.error('Selecione a loja de destino.')
      return
    }
    setSaving(true)
    try {
      const result = await applyTemplateToStore({
        versionId: version.id,
        storeId,
        userId: supabaseUser.id,
        appliedAt: new Date(),
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success(`${result.created} ação(ões) criada(s) no cliente.`)
      props.onCreated()
      props.onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Criar plano de ação — ${activeClient?.name ?? 'cliente'}`}
      size="md"
      closeOnEscape={!saving}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void apply()} disabled={saving || !activeClient || !templateId || !storeId}>
            <FileCheck size={16} />{saving ? 'Criando...' : 'Criar plano de ação'}
          </Button>
        </>
      )}
    >
      <div className="mt-5 space-y-4">
        <MxStatusBanner tone="info"><Zap size={14} />Aplicar um plano padrão da metodologia MX ao cliente.</MxStatusBanner>

        {!props.client ? (
          <MxField label="Cliente">
            <MxSelect aria-label="Cliente" value={selectedClientId} onChange={event => setSelectedClientId(event.target.value)}>
              <option value="">Selecione o cliente...</option>
              {(props.clients ?? []).map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
            </MxSelect>
          </MxField>
        ) : null}

        <MxField label="Indicador ativo">
          <MxSelect aria-label="Indicador ativo" value={indicatorKey} onChange={event => { setIndicatorKey(event.target.value); setTemplateId('') }}>
            <option value="">Selecionar indicador...</option>
            {props.indicators.map(indicator => <option key={indicator.metric_key} value={indicator.metric_key}>{indicator.label}</option>)}
          </MxSelect>
        </MxField>

        <MxField label="Templates compatíveis">
          <MxSelect aria-label="Template compatível" value={templateId} onChange={event => setTemplateId(event.target.value)}>
            <option value="">Selecione o template...</option>
            {compatibleTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.nome}{template.versions.some(version => version.status === 'publicada') ? '' : ' (sem versão publicada)'}
              </option>
            ))}
          </MxSelect>
          {compatibleTemplates.length === 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">Nenhum template compatível com o indicador escolhido.</p>
          ) : null}
        </MxField>

        <div className="grid gap-4 sm:grid-cols-2">
          <MxField label="Responsável real">
            <MxSelect aria-label="Responsável real" value={responsibleId} onChange={event => setResponsibleId(event.target.value)}>
              <option value="">Selecionar...</option>
              {props.responsibles.map(responsible => <option key={responsible.id} value={responsible.id}>{responsible.name}</option>)}
            </MxSelect>
          </MxField>
          <MxField label="Prazo (dias)">
            <input
              type="number"
              min={1}
              value={deadlineDays}
              onChange={event => setDeadlineDays(Number(event.target.value))}
              className="flex h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border border-border bg-surface-default px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-focus-ring/25"
            />
          </MxField>
          <MxField label="Loja de destino" className="sm:col-span-2">
            <MxSelect aria-label="Loja de destino" value={storeId} onChange={event => setStoreId(event.target.value)}>
              <option value="">Selecione a loja...</option>
              {props.stores.map(store => <option key={store.id} value={store.id}>{store.name}</option>)}
            </MxSelect>
          </MxField>
        </div>

        {selectedTemplate ? (
          <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground"><Target size={12} />{selectedTemplate.nome}</div>
            <p className="text-muted-foreground">{selectedTemplate.departamento} · {selectedTemplate.indicador || 'sem indicador'}</p>
            {selectedTemplate.versions.filter(version => version.status === 'publicada').map(version => (
              <p key={version.id} className="text-muted-foreground">Versão publicada: v{version.versao}</p>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
