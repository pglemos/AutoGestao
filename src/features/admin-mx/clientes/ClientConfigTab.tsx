import { useEffect, useMemo, useState } from 'react'
import { Bell, Clock, Pencil, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { toast } from '@/lib/toast'
import { clientConfigSummary, emptyClientConfigDraft, validateClientConfigDraft, type ClientConfigCanal, type ClientConfigDraft } from './clientConfig'
import { fetchClientConfig, saveClientConfig } from './configMutations'
import { StoreOperatingHoursEditor } from './StoreOperatingHoursEditor'

export type ConfigUnit = { id: string; name: string; store_type?: string | null }

type ConfigSection = 'parametros' | 'notificacoes'

export function ClientConfigTab(props: {
  clientId: string
  units: ConfigUnit[]
  updatedBy: string
}) {
  const [draft, setDraft] = useState<ClientConfigDraft>(emptyClientConfigDraft())
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<ConfigSection | null>(null)
  const [hoursUnitId, setHoursUnitId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      const { draft: loaded, error } = await fetchClientConfig(props.clientId)
      if (!active) return
      if (error) toast.error(error)
      setDraft(loaded)
      setLoading(false)
    })()
    return () => { active = false }
  }, [props.clientId])

  const summary = useMemo(() => clientConfigSummary(draft), [draft])
  const patch = (values: Partial<ClientConfigDraft>) => setDraft(current => ({ ...current, ...values }))

  const saveSection = async () => {
    const invalid = validateClientConfigDraft(draft)
    if (invalid) {
      toast.error(invalid)
      return
    }
    setSaving(true)
    try {
      const { error } = await saveClientConfig(props.clientId, draft, props.updatedBy)
      if (error) {
        toast.error(error)
        return
      }
      toast.success('Configuração salva.')
      setSection(null)
    } finally {
      setSaving(false)
    }
  }

  const cards: Array<{ key: ConfigSection | 'horario'; icon: typeof Clock; title: string; desc: string }> = [
    { key: 'horario', icon: Clock, title: 'Horário de Funcionamento', desc: 'Dias e horários regulares de funcionamento de cada loja.' },
    { key: 'parametros', icon: SlidersHorizontal, title: 'Parâmetros Estatísticos', desc: 'Tolerância de fechamento, limite de vendedores e retenção.' },
    { key: 'notificacoes', icon: Bell, title: 'Notificações', desc: 'Política de notificações por prioridade e canal.' },
  ]

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando configurações...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(card => {
              const Icon = card.icon
              const isConfigured = card.key === 'horario' ? props.units.length > 0 : true
              return (
                <div key={card.key} className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2"><Icon size={16} className="text-primary" /><h4 className="text-sm font-medium text-foreground">{card.title}</h4></div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isConfigured ? 'bg-status-success-bg text-status-success-text' : 'bg-surface-alt text-muted-foreground'}`}>
                      {isConfigured ? 'Configurado' : 'Não configurado'}
                    </span>
                  </div>
                  <p className="mb-3 text-xs text-muted-foreground">{card.desc}</p>
                  {card.key === 'horario' ? (
                    <Button variant="outline" size="sm" disabled={props.units.length === 0} onClick={() => setHoursUnitId(props.units[0]?.id ?? null)}>
                      <Pencil size={14} />Editar por loja
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setSection(card.key as ConfigSection)}>
                      <Pencil size={14} />Editar
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          {hoursUnitId ? (
            <div className="rounded-xl border border-border p-5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock size={14} className="text-primary" />
                  Horário de Funcionamento — {props.units.find(unit => unit.id === hoursUnitId)?.name ?? 'Loja'}
                </h4>
                <div className="flex items-center gap-2">
                  <MxSelect aria-label="Loja para editar horário" value={hoursUnitId} onChange={event => setHoursUnitId(event.target.value)}>
                    {props.units.map(unit => <option key={unit.id} value={unit.id}>{unit.name}{unit.store_type === 'matriz' ? ' (Matriz)' : ''}</option>)}
                  </MxSelect>
                  <Button variant="ghost" size="sm" onClick={() => setHoursUnitId(null)}>Fechar</Button>
                </div>
              </div>
              <StoreOperatingHoursEditor unitId={hoursUnitId} unitName={props.units.find(unit => unit.id === hoursUnitId)?.name ?? ''} origin="Visão 360 — Configurações" />
            </div>
          ) : null}

          <div className="rounded-lg border border-border p-3">
            <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {summary.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}

      <Modal
        open={Boolean(section)}
        onClose={() => setSection(null)}
        title={section === 'parametros' ? 'Parâmetros Estatísticos' : section === 'notificacoes' ? 'Notificações' : ''}
        description="Configuração operacional do cliente."
        size="md"
        closeOnEscape={!saving}
        footer={(
          <>
            <Button variant="outline" onClick={() => setSection(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={() => void saveSection()} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </>
        )}
      >
        <div className="mt-5 space-y-4">
          {validateClientConfigDraft(draft) ? <MxStatusBanner tone="warning">{validateClientConfigDraft(draft)}</MxStatusBanner> : null}
          {section === 'parametros' ? (
            <>
              <MxField label="Tolerância de fechamento (min)">
                <Input type="number" min={0} max={240} value={String(draft.tolerancia_fechamento_min)} onChange={event => patch({ tolerancia_fechamento_min: Number(event.target.value) })} />
              </MxField>
              <MxField label="Limite de vendedores por loja">
                <Input type="number" min={1} max={100} value={String(draft.limite_vendedores)} onChange={event => patch({ limite_vendedores: Number(event.target.value) })} />
              </MxField>
              <MxField label="Retenção de snapshots (dias)">
                <Input type="number" min={1} max={365} value={String(draft.retencao_snapshots_dias)} onChange={event => patch({ retencao_snapshots_dias: Number(event.target.value) })} />
              </MxField>
            </>
          ) : null}
          {section === 'notificacoes' ? (
            <>
              <MxField label="Canal para crítico">
                <MxSelect aria-label="Canal para alertas críticos" value={draft.canal_critico} onChange={event => patch({ canal_critico: event.target.value as ClientConfigCanal })}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                  <option value="ambos">Ambos</option>
                </MxSelect>
              </MxField>
              <MxField label="Canal para atenção">
                <MxSelect aria-label="Canal para alertas de atenção" value={draft.canal_atencao} onChange={event => patch({ canal_atencao: event.target.value as ClientConfigCanal })}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">E-mail</option>
                  <option value="ambos">Ambos</option>
                </MxSelect>
              </MxField>
              <MxField label="Janela de envio">
                <Input value={draft.janela_envio} onChange={event => patch({ janela_envio: event.target.value })} placeholder="08h às 19h" />
              </MxField>
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  )
}
