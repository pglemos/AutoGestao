import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import { supabase } from '@/lib/supabase'
import {
  calculateWeights,
  createClientActionPlans,
  DIRECTION_OPTIONS,
  DIRECTION_LABELS,
  emptyWizardForm,
  resolveActionPlanTargetStoreIds,
  suggestTitle,
  validateWizardStep,
  WIZARD_PRIORITIES,
  WIZARD_STEPS,
  type ClientActionPlanWizardForm,
  type WizardAction,
  type WizardStep,
} from './actionPlanWizardLogic'
import {
  fetchWizardClients,
  fetchWizardIndicators,
  fetchWizardResponsibles,
  fetchWizardStores,
  type WizardClient,
  type WizardIndicator,
  type WizardResponsible,
  type WizardStore,
} from './clientActionPlanWizardData'

export function ClientActionPlanWizard(props: {
  open: boolean
  clientId?: string
  clientName?: string
  onClose: () => void
  onSaved: () => void
}) {
  const { supabaseUser } = useAuth()
  const [step, setStep] = useState<WizardStep>(1)
  const [form, setForm] = useState<ClientActionPlanWizardForm>(emptyWizardForm)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [clients, setClients] = useState<WizardClient[]>([])
  const [stores, setStores] = useState<WizardStore[]>([])
  const [storesLoading, setStoresLoading] = useState(false)
  const [storesError, setStoresError] = useState<string | null>(null)
  const [indicators, setIndicators] = useState<WizardIndicator[]>([])
  const [responsibles, setResponsibles] = useState<WizardResponsible[]>([])
  const [titleCustomized, setTitleCustomized] = useState(false)

  useEffect(() => {
    if (!props.open) return
    setStep(1)
    setErrors([])
    setTitleCustomized(false)
    setStores([])
    setStoresLoading(Boolean(props.clientId))
    setStoresError(null)
    setForm({ ...emptyWizardForm(), clientId: props.clientId ?? '', clientName: props.clientName ?? '' })
    void Promise.all([fetchWizardClients(), fetchWizardIndicators(props.clientId), fetchWizardResponsibles()]).then(([c, i, r]) => {
      setClients(c.rows)
      setIndicators(i.rows)
      setResponsibles(r.rows)
      if (props.clientId) void loadStores(props.clientId)
    })
  }, [props.open, props.clientId, props.clientName])

  const loadStores = useCallback(async (clientId: string) => {
    setStoresLoading(true)
    setStoresError(null)
    try {
      const result = await fetchWizardStores(clientId)
      setStores(result.rows)
      setStoresError(result.error)
      setForm(current => ({ ...current, storeId: result.rows[0]?.id ?? '' }))
    } finally {
      setStoresLoading(false)
    }
  }, [])

  const patch = (field: keyof ClientActionPlanWizardForm, value: unknown) => {
    setForm(current => ({ ...current, [field]: value }))
    setErrors([])
  }

  const patchAction = (index: number, field: keyof WizardAction, value: string) => {
    setForm(current => ({
      ...current,
      actions: current.actions.map((action, position) => (position === index ? { ...action, [field]: value } : action)),
    }))
  }

  const addAction = () => setForm(current => ({ ...current, actions: [...current.actions, { titulo: '', como: '' }] }))
  const duplicateAction = (index: number) => setForm(current => {
    const actions = [...current.actions]
    actions.splice(index + 1, 0, { ...actions[index] })
    return { ...current, actions }
  })
  const removeAction = (index: number) => setForm(current => ({
    ...current,
    actions: current.actions.length > 1 ? current.actions.filter((_, position) => position !== index) : current.actions,
  }))
  const moveAction = (index: number, direction: -1 | 1) => setForm(current => {
    const target = index + direction
    if (target < 0 || target >= current.actions.length) return current
    const actions = [...current.actions]
    ;[actions[index], actions[target]] = [actions[target], actions[index]]
    return { ...current, actions }
  })

  const deptIndicators = useMemo(
    () => form.department ? indicators.filter(indicator => indicator.area === form.department) : [],
    [form.department, indicators],
  )
  const weights = useMemo(() => calculateWeights(form.actions.length), [form.actions.length])

  const onClientChange = (clientId: string) => {
    const client = clients.find(item => item.id === clientId)
    patch('clientId', clientId)
    patch('clientName', client?.name ?? '')
    setStores([])
    setStoresError(null)
    if (clientId) void loadStores(clientId)
    void fetchWizardIndicators(clientId).then(result => setIndicators(result.rows))
  }

  const onIndicatorChange = (metricKey: string) => {
    const indicator = deptIndicators.find(item => item.metric_key === metricKey)
    const direction = (indicator?.direction === 'increase' ? 'AUMENTAR' : indicator?.direction === 'decrease' ? 'DIMINUIR' : 'AUMENTAR') as ClientActionPlanWizardForm['direction']
    const nextTitle = titleCustomized ? form.title : suggestTitle(direction, indicator?.label ?? '')
    setForm(current => ({
      ...current,
      indicatorId: metricKey,
      indicatorName: indicator?.label ?? '',
      direction,
      efficacyIndicatorName: indicator?.label ?? '',
      title: nextTitle || current.title,
    }))
    setErrors([])
  }

  const onTitleChange = (value: string) => {
    setTitleCustomized(true)
    patch('title', value)
  }

  const useSuggestedTitle = () => {
    setTitleCustomized(false)
    patch('title', suggestTitle(form.direction, form.indicatorName))
  }

  const validateAndNext = () => {
    const stepErrors = validateWizardStep(step, form)
    if (stepErrors.length) {
      setErrors(stepErrors)
      return
    }
    setErrors([])
    setStep(current => Math.min(4, current + 1) as WizardStep)
  }

  const back = () => setStep(current => Math.max(1, current - 1) as WizardStep)

  const create = async () => {
    if (submitting || !supabaseUser) return
    const finalErrors = [
      ...validateWizardStep(1, form),
      ...validateWizardStep(2, form),
      ...validateWizardStep(3, form),
    ]
    if (finalErrors.length) {
      setErrors([...new Set(finalErrors)])
      return
    }
    const targetStoreIds = resolveActionPlanTargetStoreIds(form, stores.map(store => store.id))
    if (!targetStoreIds.length) {
      setErrors([form.scopeMode === 'single_unit' ? 'Selecione a unidade operacional do cliente.' : 'Este cliente ainda não tem unidades operacionais ativas.'])
      return
    }
    setSubmitting(true)
    try {
      const created = await createClientActionPlans({ form, storeIds: targetStoreIds, userId: supabaseUser.id })
      if (created.error || !created.ids.length) {
        toast.error(created.error ?? 'Falha ao criar o plano de ação.')
        return
      }

      if (form.alsoCreateTemplate && form.actions.length) {
        const templateKey = `plano_${form.department.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
        const { error: templateError } = await supabase.from('planos_acao_templates').insert({
          template_key: templateKey,
          nome: form.title.trim(),
          departamento: form.department.trim(),
          indicador: form.indicatorName.trim() || null,
          descricao: form.problem.trim() || null,
          program_key: null,
          active: true,
          created_by: supabaseUser.id,
        })
        if (!templateError) {
          const { data: template } = await supabase
            .from('planos_acao_templates')
            .select('id')
            .eq('template_key', templateKey)
            .maybeSingle()
          if (template) {
            const { data: version } = await supabase
              .from('planos_acao_template_versoes')
              .insert({ template_id: template.id, versao: 1, status: 'rascunho', created_by: supabaseUser.id })
              .select('id')
              .single()
            if (version) {
              await supabase.from('planos_acao_template_itens').insert(
                form.actions.map((action, index) => ({
                  version_id: version.id,
                  ordem: index + 1,
                  problema: form.problem.trim() || 'Problema identificado na loja.',
                  acao: action.titulo.trim(),
                  como: action.como.trim() || null,
                  departamento: form.department.trim(),
                  indicador: form.indicatorName.trim() || null,
                  prioridade: form.priority,
                  prazo_dias: 30,
                  evidencia_requerida: false,
                })),
              )
            }
          }
        }
      }

      toast.success(targetStoreIds.length === 1
        ? `Plano "${form.title}" criado.`
        : `Plano "${form.title}" criado para ${targetStoreIds.length} unidades.`)
      props.onSaved()
      props.onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!props.open) return null

  const stepActive = (stepNumber: WizardStep) => step === stepNumber
  const stepDone = (stepNumber: WizardStep) => step > stepNumber

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={`Criar plano de ação para ${form.clientName || 'o cliente'}`}
      size="3xl"
      closeOnEscape={!submitting}
      footer={(
        <div className="flex w-full items-center justify-between">
          <Button variant="outline" onClick={back} disabled={step === 1 || submitting}>
            <ChevronLeft size={16} />Voltar
          </Button>
          <div className="flex items-center gap-2">
            {step < 4 ? (
              <Button onClick={validateAndNext} disabled={submitting}>
                Continuar <ChevronRight size={16} />
              </Button>
            ) : (
              <Button onClick={() => void create()} disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar plano de ação'}
              </Button>
            )}
          </div>
        </div>
      )}
    >
      <div className="mt-5 space-y-5">
        <ol className="flex items-center gap-2" aria-label="Etapas do wizard">
          {WIZARD_STEPS.map((item, index) => (
            <li key={item.id} className="flex flex-1 items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                  stepActive(item.id)
                    ? 'border-primary bg-primary text-white'
                    : stepDone(item.id)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {stepDone(item.id) ? <Check size={12} /> : item.id}
              </span>
              <span className={stepActive(item.id) ? 'text-sm font-semibold text-foreground' : 'text-xs text-muted-foreground'}>{item.label}</span>
              {index < WIZARD_STEPS.length - 1 ? <span className={`h-0.5 flex-1 ${stepDone(item.id) ? 'bg-primary' : 'bg-border'}`} /> : null}
            </li>
          ))}
        </ol>

        {errors.length ? <MxStatusBanner tone="warning">{errors[0]}</MxStatusBanner> : null}

        {step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <MxField label="Cliente">
              <MxSelect aria-label="Cliente" value={form.clientId} onChange={event => onClientChange(event.target.value)} disabled={Boolean(props.clientId)}>
                <option value="">Selecione o cliente</option>
                {clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Escopo do plano">
              <MxSelect aria-label="Escopo do plano" value={form.scopeMode} onChange={event => patch('scopeMode', event.target.value)} disabled={!form.clientId}>
                <option value="all_units">Todas as unidades ativas</option>
                <option value="single_unit">Uma unidade específica</option>
              </MxSelect>
              <p className="mt-1 text-xs text-muted-foreground">Padrão Base44: a ação é materializada na matriz e nas filiais ativas.</p>
            </MxField>
            {form.scopeMode === 'single_unit' ? (
              <MxField label="Unidade operacional">
                <MxSelect aria-label="Unidade operacional" value={form.storeId} onChange={event => patch('storeId', event.target.value)} disabled={!form.clientId || storesLoading}>
                  <option value="">{storesLoading ? 'Carregando unidades...' : form.clientId ? 'Selecione a unidade' : 'Selecione um cliente'}</option>
                  {stores.map(store => <option key={`${store.source}-${store.id}`} value={store.id}>{store.name}</option>)}
                </MxSelect>
              </MxField>
            ) : (
              <div className="rounded-lg border border-border bg-surface-alt p-3 text-sm">
                <div className="font-semibold text-foreground">{storesLoading ? 'Carregando unidades ativas…' : `${stores.length} unidade(s) ativa(s)`}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {storesLoading
                    ? 'Consultando a matriz e as filiais operacionais do cliente.'
                    : stores.map(store => store.name).join(' · ') || (form.clientId ? 'Este cliente ainda não tem unidades operacionais ativas.' : 'Selecione um cliente para carregar a matriz e as filiais.')}
                </div>
                {storesError ? <div className="mt-2 text-xs text-status-error-text">Não foi possível carregar as unidades: {storesError}</div> : null}
              </div>
            )}
            <MxField label="Departamento">
              <MxSelect
                aria-label="Departamento"
                value={form.department}
                onChange={event => {
                  patch('department', event.target.value)
                  patch('indicatorId', '')
                  patch('indicatorName', '')
                }}
              >
                <option value="">Selecionar...</option>
                {[...new Set(indicators.map(indicator => indicator.area).filter(Boolean))].map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </MxSelect>
            </MxField>
            <MxField label="Indicador principal">
              <MxSelect aria-label="Indicador principal" value={form.indicatorId} onChange={event => onIndicatorChange(event.target.value)} disabled={!form.department}>
                <option value="">{form.department ? 'Selecione um indicador' : 'Selecione um departamento'}</option>
                {deptIndicators.map(indicator => <option key={indicator.metric_key} value={indicator.metric_key}>{indicator.label}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Título do plano">
              <Input value={form.title} onChange={event => onTitleChange(event.target.value)} placeholder="Título do plano de ação" />
            </MxField>
            {titleCustomized && form.indicatorName ? (
              <div className="flex items-end pb-1">
                <Button variant="ghost" size="sm" onClick={useSuggestedTitle}>Usar título sugerido</Button>
              </div>
            ) : null}
            <MxField label="Direção de melhoria">
              <MxSelect aria-label="Direção de melhoria" value={form.direction} onChange={event => {
                const direction = event.target.value as ClientActionPlanWizardForm['direction']
                patch('direction', direction)
                if (!titleCustomized) patch('title', suggestTitle(direction, form.indicatorName))
              }}>
                {DIRECTION_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Origem">
              <MxSelect aria-label="Origem" value={form.origin} onChange={event => patch('origin', event.target.value)}>
                <option value="consultor">Consultor</option>
                <option value="manual">Manual</option>
              </MxSelect>
            </MxField>
            <MxField label="Problema identificado" className="sm:col-span-2">
              <MxTextarea rows={2} value={form.problem} onChange={event => patch('problem', event.target.value)} placeholder="O que motivou este plano..." />
            </MxField>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3">
            {form.actions.map((action, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-border p-4">
                <div className="flex items-start gap-2">
                  <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">{index + 1}</span>
                  <div className="flex-1 space-y-2">
                    <Input value={action.titulo} onChange={event => patchAction(index, 'titulo', event.target.value)} placeholder="Nome da ação *" />
                    <MxTextarea rows={2} value={action.como} onChange={event => patchAction(index, 'como', event.target.value)} placeholder="Como executar esta ação" />
                    <p className="text-xs text-muted-foreground">
                      Peso: <span className="font-semibold text-foreground">{weights[index]?.weight_percentage_display ?? '—'}</span>
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button variant="outline" size="icon" aria-label={`Mover ação ${index + 1} para cima`} disabled={index === 0} onClick={() => moveAction(index, -1)}>
                      <ArrowUp size={14} />
                    </Button>
                    <Button variant="outline" size="icon" aria-label={`Mover ação ${index + 1} para baixo`} disabled={index === form.actions.length - 1} onClick={() => moveAction(index, 1)}>
                      <ArrowDown size={14} />
                    </Button>
                    <Button variant="outline" size="icon" aria-label={`Duplicar ação ${index + 1}`} onClick={() => duplicateAction(index)}>
                      <Copy size={14} />
                    </Button>
                    <Button variant="outline" size="icon" aria-label={`Remover ação ${index + 1}`} disabled={form.actions.length <= 1} onClick={() => removeAction(index)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={addAction}><Plus size={16} />Adicionar ação</Button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <MxField label="Responsável">
              <MxSelect aria-label="Responsável" value={form.responsibleId} onChange={event => {
                const responsible = responsibles.find(item => item.id === event.target.value)
                patch('responsibleId', event.target.value)
                patch('responsibleName', responsible?.name ?? '')
              }}>
                <option value="">Selecionar...</option>
                {responsibles.map(responsible => <option key={responsible.id} value={responsible.id}>{responsible.name} ({responsible.role})</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Participantes">
              <Input value={form.participants} onChange={event => patch('participants', event.target.value)} placeholder="Quem participa da execução" />
            </MxField>
            <MxField label="Data de início">
              <Input type="date" value={form.startDate} onChange={event => patch('startDate', event.target.value)} />
            </MxField>
            <MxField label="Prazo final">
              <Input type="date" value={form.dueDate} onChange={event => patch('dueDate', event.target.value)} />
            </MxField>
            <MxField label="Prioridade">
              <MxSelect aria-label="Prioridade" value={form.priority} onChange={event => patch('priority', event.target.value)}>
                {WIZARD_PRIORITIES.map(priority => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Indicador de eficácia">
              <MxSelect aria-label="Indicador de eficácia" value={form.efficacyIndicatorName} onChange={event => patch('efficacyIndicatorName', event.target.value)}>
                <option value="">Mesmo indicador</option>
                {deptIndicators.map(indicator => <option key={indicator.metric_key} value={indicator.label}>{indicator.label}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Resultado esperado" className="sm:col-span-2">
              <Input value={form.expectedImpact} onChange={event => patch('expectedImpact', event.target.value)} placeholder="O que se espera ao concluir este plano" />
            </MxField>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="font-semibold text-foreground">{form.clientName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Escopo:</span><span className="font-semibold text-foreground">{form.scopeMode === 'all_units' ? `${stores.length} unidade(s) ativa(s)` : stores.find(store => store.id === form.storeId)?.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Departamento:</span><span className="font-semibold text-foreground">{form.department || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Indicador:</span><span className="font-semibold text-foreground">{form.indicatorName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Direção:</span><span className="font-semibold text-foreground">{DIRECTION_LABELS[form.direction]}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Responsável:</span><span className="font-semibold text-foreground">{form.responsibleName || '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Prazo:</span><span className="font-semibold text-foreground">{form.dueDate ? new Date(`${form.dueDate}T12:00:00`).toLocaleDateString('pt-BR') : '30 dias'}</span></div>
            </div>
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <h4 className="text-xs font-semibold uppercase text-muted-foreground">Ações ({form.actions.length})</h4>
              {form.actions.map((action, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="font-medium text-foreground">{index + 1}. {action.titulo || '—'}</span>
                  <span className="text-muted-foreground">{weights[index]?.weight_percentage_display}</span>
                </div>
              ))}
              <div className="flex justify-between border-t border-border pt-2">
                <span className="font-medium text-foreground">Peso total</span>
                <span className="font-semibold text-primary">100.00%</span>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.alsoCreateTemplate} onChange={event => patch('alsoCreateTemplate', event.target.checked)} className="rounded" />
              <span>Criar também um template (rascunho na biblioteca) a partir deste plano</span>
            </label>
            <p className="text-xs text-muted-foreground">O template não é publicado automaticamente; fica em rascunho para revisão.</p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
