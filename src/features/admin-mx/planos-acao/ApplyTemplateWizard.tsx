import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, FileCheck, Layers3, Target, Users } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner } from '@/components/module/MxModuleVisualPrimitives'
import { useAuth } from '@/hooks/useAuth'
import { toast } from '@/lib/toast'
import type { ClientUnit } from '@/features/strategic-plan/clientUnits'
import type { ActionPlanTemplate } from './actionPlanTemplates'
import { ACTION_PLAN_DEPARTMENT_CARDS, departmentCategory, departmentLabel, departmentMatchesFilter, indicatorAreaMatchesDepartment } from './departmentTaxonomy'
import {
  applyTemplateToStoresIdempotent,
  buildTemplateApplicationStorageKey,
  createTemplateApplicationRequestId,
  resolveClientApplicationTargets,
} from './templateApplicationIdempotency'
import type { WizardClient, WizardIndicator, WizardResponsible } from './clientActionPlanWizardData'

type ApplyStep = 1 | 2 | 3 | 4 | 5 | 6 | 7
type ScopeMode = 'cliente' | 'unidade'

const APPLY_STEPS: Array<{ id: ApplyStep; label: string; short: string }> = [
  { id: 1, label: 'Selecionar cliente', short: 'Cliente' },
  { id: 2, label: 'Ano do plano estratégico', short: 'Ano' },
  { id: 3, label: 'Departamento', short: 'Depto' },
  { id: 4, label: 'Indicador', short: 'Indicador' },
  { id: 5, label: 'Plano padrão', short: 'Plano' },
  { id: 6, label: 'Escopo e responsável', short: 'Escopo' },
  { id: 7, label: 'Revisar e criar', short: 'Revisar' },
]

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1]

function unitLabel(unit: ClientUnit): string {
  return `${unit.name} · ${unit.store_type === 'MATRIZ' ? 'Matriz' : 'Filial'}`
}

/**
 * Fluxo completo do Base44 para aplicação de um plano padrão.
 *
 * A decisão é registrada no cliente, enquanto o schema MX materializa os
 * itens nas unidades selecionadas. O resumo deixa essa diferença explícita
 * para que uma aplicação em uma rede nunca pareça uma aplicação isolada.
 */
export function ApplyTemplateWizard(props: {
  open: boolean
  template?: ActionPlanTemplate | null
  templates: ActionPlanTemplate[]
  clients: WizardClient[]
  indicators: WizardIndicator[]
  responsibles: WizardResponsible[]
  initialClientId?: string
  onClose: () => void
  onCreated: () => void
}) {
  const { supabaseUser } = useAuth()
  const [step, setStep] = useState<ApplyStep>(1)
  const [clientId, setClientId] = useState('')
  const [referenceYear, setReferenceYear] = useState(CURRENT_YEAR)
  const [department, setDepartment] = useState('')
  const [indicatorKey, setIndicatorKey] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [deadlineDays, setDeadlineDays] = useState(30)
  const [scopeMode, setScopeMode] = useState<ScopeMode>('cliente')
  const [unitId, setUnitId] = useState('')
  const [units, setUnits] = useState<ClientUnit[]>([])
  const [unitsLoading, setUnitsLoading] = useState(false)
  const [unitsError, setUnitsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [requestIds] = useState(() => new Map<string, string>())

  const activeClient = useMemo(
    () => props.clients.find(client => client.id === clientId) ?? null,
    [clientId, props.clients],
  )

  const departments = useMemo(() => {
    const values = ACTION_PLAN_DEPARTMENT_CARDS.map(card => card.code)
    const templateCategory = departmentCategory(props.template?.departamento)
    if (templateCategory && !values.includes(templateCategory)) values.push(templateCategory)
    return values
  }, [props.indicators, props.template?.departamento])

  const departmentIndicators = useMemo(
    () => props.indicators.filter(indicator => indicatorAreaMatchesDepartment(indicator.area, department)),
    [department, props.indicators],
  )

  const availableTemplates = useMemo(() => {
    const source = props.template ? [props.template] : props.templates
    return source.filter(template => {
      if (!template.active || !template.manual_application_enabled) return false
      if (!template.versions.some(version => version.status === 'publicada')) return false
      if (department && !departmentMatchesFilter(template.departamento, department)) return false
      if (indicatorKey) {
        const selectedIndicator = props.indicators.find(indicator => indicator.metric_key === indicatorKey)
        const indicatorValues = [selectedIndicator?.metric_key, selectedIndicator?.label].filter(Boolean).map(value => value?.toLowerCase())
        const templateValues = [template.indicador, template.primary_indicator_code].filter(Boolean).map(value => value?.toLowerCase())
        if (templateValues.length && !templateValues.some(value => indicatorValues.includes(value))) return false
      }
      return true
    })
  }, [department, indicatorKey, props.indicators, props.template, props.templates])

  const selectedTemplate = availableTemplates.find(template => template.id === templateId) ?? null
  const publishedVersion = selectedTemplate?.versions.find(version => version.status === 'publicada') ?? null
  const selectedIndicator = props.indicators.find(indicator => indicator.metric_key === indicatorKey)
  const activeUnits = units.filter(unit => unit.active)
  const targetUnits = scopeMode === 'cliente' ? activeUnits : activeUnits.filter(unit => unit.id === unitId)

  useEffect(() => {
    if (!props.open) return
    const nextTemplate = props.template ?? null
    const matchingIndicator = nextTemplate?.indicador
      ? props.indicators.find(indicator => indicator.label === nextTemplate.indicador)
      : null
    setStep(1)
    setClientId(props.initialClientId ?? '')
    setReferenceYear(CURRENT_YEAR)
    setDepartment(departmentCategory(nextTemplate?.departamento) ?? nextTemplate?.departamento ?? '')
    setIndicatorKey(matchingIndicator?.metric_key ?? (nextTemplate?.primary_indicator_code ?? ''))
    setTemplateId(nextTemplate?.id ?? '')
    setResponsibleId('')
    setDeadlineDays(30)
    setScopeMode('cliente')
    setUnitId('')
    setUnits([])
    setUnitsLoading(false)
    setUnitsError(null)
  }, [props.initialClientId, props.indicators, props.open, props.template])

  useEffect(() => {
    if (!props.open || !clientId) {
      setUnits([])
      setUnitId('')
      setUnitsLoading(false)
      setUnitsError(null)
      return
    }
    let cancelled = false
    setUnits([])
    setUnitId('')
    setUnitsError(null)
    setUnitsLoading(true)
    void resolveClientApplicationTargets(clientId)
      .then(result => {
        if (cancelled) return
        setUnits(result.units)
        setUnitsError(result.error)
        setUnitId(result.units.find(unit => unit.active)?.id ?? '')
      })
      .catch(error => {
        if (cancelled) return
        setUnits([])
        setUnitId('')
        setUnitsError(error instanceof Error ? error.message : 'Não foi possível carregar as unidades do cliente.')
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false)
      })
    return () => { cancelled = true }
  }, [clientId, props.open])

  if (!props.open) return null

  const validateStep = (target: ApplyStep): string | null => {
    if (target === 1 && !activeClient) return 'Selecione um cliente.'
    if (target === 2 && !referenceYear) return 'Selecione o ano do plano estratégico.'
    if (target === 3 && !department) return 'Selecione um departamento.'
    if (target === 4 && !indicatorKey && !props.template?.indicador) return 'Selecione um indicador.'
    if (target === 5 && !selectedTemplate) return 'Selecione um plano padrão publicado.'
    if (target === 6 && unitsLoading) return 'Aguarde o carregamento das unidades do cliente.'
    if (target === 6 && unitsError) return 'Não foi possível carregar as unidades do cliente. Tente novamente.'
    if (target === 6 && !targetUnits.length) return 'Selecione ao menos uma unidade ativa.'
    return null
  }

  const next = () => {
    const error = validateStep(step)
    if (error) {
      toast.error(error)
      return
    }
    setStep(current => Math.min(7, current + 1) as ApplyStep)
  }

  const back = () => setStep(current => Math.max(1, current - 1) as ApplyStep)

  const apply = async () => {
    const firstError = ([1, 2, 3, 4, 5, 6] as ApplyStep[]).map(validateStep).find(Boolean)
    if (firstError || !supabaseUser || !activeClient || !selectedTemplate || !publishedVersion) {
      if (firstError) toast.error(firstError)
      return
    }

    setSaving(true)
    try {
      const scopeKey = scopeMode === 'cliente'
        ? `year:${referenceYear}:client:${activeClient.id}:all-active`
        : `year:${referenceYear}:client:${activeClient.id}:unit:${unitId}`
      const storageKey = buildTemplateApplicationStorageKey(publishedVersion.id, scopeKey)
      let requestId = requestIds.get(storageKey) ?? null
      try { requestId ||= window.sessionStorage.getItem(storageKey) } catch { /* usa o mapa em memória */ }
      requestId ||= createTemplateApplicationRequestId()
      requestIds.set(storageKey, requestId)
      try { window.sessionStorage.setItem(storageKey, requestId) } catch { /* o banco continua idempotente */ }

      const result = await applyTemplateToStoresIdempotent({
        versionId: publishedVersion.id,
        storeIds: targetUnits.map(unit => unit.id),
        userId: supabaseUser.id,
        requestId,
        title: selectedTemplate.nome,
        referenceYear,
        responsibleId: responsibleId || null,
        deadlineDays,
        department: selectedTemplate.departamento,
        indicator: selectedIndicator?.label || selectedTemplate.indicador || null,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }

      requestIds.delete(storageKey)
      try { window.sessionStorage.removeItem(storageKey) } catch { /* aplicação confirmada */ }
      toast.success(
        result.replayed
          ? 'Aplicação já confirmada. Nenhum plano foi duplicado.'
          : scopeMode === 'cliente'
            ? `Aplicação registrada no cliente · ${result.created} plano(s) materializado(s) em ${targetUnits.length} unidade(s).`
            : `${result.created} plano(s) criado(s) na unidade selecionada.`,
      )
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
      title={`Aplicar plano padrão${activeClient ? ` — ${activeClient.name}` : ''}`}
      size="3xl"
      closeOnEscape={!saving}
      footer={(
        <div className="flex w-full items-center justify-between gap-3">
          <Button variant="outline" onClick={back} disabled={step === 1 || saving}><ChevronLeft size={16} />Voltar</Button>
          <div className="flex items-center gap-2">
            {step < 7 ? <Button onClick={next} disabled={saving || (step === 6 && unitsLoading)}>Continuar <ChevronRight size={16} /></Button> : <Button onClick={() => void apply()} disabled={saving}><FileCheck size={16} />{saving ? 'Criando...' : 'Revisar e criar plano'}</Button>}
          </div>
        </div>
      )}
    >
      <div className="mt-5 space-y-5">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-7" aria-label="Etapas da aplicação">
          {APPLY_STEPS.map(item => (
            <li key={item.id} className="flex min-w-0 items-center gap-2 sm:block">
              <span className={`mx-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${step === item.id ? 'border-primary bg-primary text-primary-foreground' : step > item.id ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-disabled'}`}>
                {step > item.id ? <Check size={12} /> : item.id}
              </span>
              <span className={`truncate text-[11px] ${step === item.id ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>{item.short}</span>
            </li>
          ))}
        </ol>

        {unitsError ? <MxStatusBanner tone="warning">Não foi possível resolver as unidades do cliente: {unitsError}</MxStatusBanner> : null}

        {step === 1 ? (
          <div className="space-y-4">
            <MxStatusBanner tone="info"><Users size={14} />A aplicação é uma decisão do cliente e pode ser materializada em todas as unidades ativas.</MxStatusBanner>
            {props.template ? <MxStatusBanner tone="neutral">Template selecionado: <strong>{props.template.nome}</strong></MxStatusBanner> : null}
            {props.initialClientId ? <div className="rounded-lg border border-border bg-surface-alt p-4 text-sm font-medium text-foreground">{activeClient?.name ?? 'Cliente selecionado'}</div> : (
              <MxField label="Cliente">
                <MxSelect aria-label="Cliente da aplicação" value={clientId} onChange={event => setClientId(event.target.value)}>
                  <option value="">Selecione o cliente...</option>
                  {props.clients.map(client => <option key={client.id} value={client.id}>{client.name}</option>)}
                </MxSelect>
              </MxField>
            )}
          </div>
        ) : null}

        {step === 2 ? (
          <MxField label="Ano do plano estratégico" hint="O ano fica gravado em cada materialização para manter o vínculo com o ciclo do cliente.">
            <MxSelect aria-label="Ano do plano estratégico" value={String(referenceYear)} onChange={event => setReferenceYear(Number(event.target.value))}>
              {YEAR_OPTIONS.map(year => <option key={year} value={year}>{year}</option>)}
            </MxSelect>
          </MxField>
        ) : null}

        {step === 3 ? (
          <MxField label="Departamento">
            <MxSelect aria-label="Departamento da aplicação" value={department} onChange={event => { setDepartment(event.target.value); setIndicatorKey(''); setTemplateId('') }}>
              <option value="">Selecione...</option>
              {departments.map(value => <option key={value} value={value}>{departmentLabel(value)}</option>)}
            </MxSelect>
          </MxField>
        ) : null}

        {step === 4 ? (
          <MxField label="Indicador">
            <MxSelect aria-label="Indicador da aplicação" value={indicatorKey} onChange={event => { setIndicatorKey(event.target.value); setTemplateId('') }} disabled={!department}>
              <option value="">{department ? 'Selecione um indicador...' : 'Selecione primeiro o departamento'}</option>
              {departmentIndicators.map(indicator => <option key={indicator.metric_key} value={indicator.metric_key}>{indicator.label}</option>)}
            </MxSelect>
          </MxField>
        ) : null}

        {step === 5 ? (
          <div className="space-y-3">
            <MxField label="Plano padrão publicado">
              <MxSelect aria-label="Plano padrão publicado" value={templateId} onChange={event => setTemplateId(event.target.value)}>
                <option value="">Selecione o plano padrão...</option>
                {availableTemplates.map(template => <option key={template.id} value={template.id}>{template.nome}</option>)}
              </MxSelect>
            </MxField>
            {!availableTemplates.length ? <MxStatusBanner tone="neutral">Nenhum plano padrão publicado e disponível para o departamento e indicador escolhidos.</MxStatusBanner> : null}
            {selectedTemplate && publishedVersion ? <div className="rounded-lg border border-border bg-surface-alt p-4 text-sm"><div className="flex items-center gap-2 font-semibold text-foreground"><Target size={16} />{selectedTemplate.nome}</div><div className="mt-1 text-xs text-muted-foreground">{departmentLabel(selectedTemplate.departamento)} · versão publicada v{publishedVersion.versao}</div></div> : null}
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-4">
            <MxStatusBanner tone="info"><Layers3 size={14} />O escopo abaixo é explícito. “Cliente consolidado” materializa o mesmo plano em cada unidade ativa; não cria clientes para filiais.</MxStatusBanner>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={`cursor-pointer rounded-lg border p-4 ${scopeMode === 'cliente' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="apply-scope" value="cliente" checked={scopeMode === 'cliente'} onChange={() => setScopeMode('cliente')} className="sr-only" />
                <span className="font-semibold text-foreground">Cliente consolidado</span>
                <span className="mt-1 block text-xs text-muted-foreground">Todas as unidades ativas ({activeUnits.length})</span>
              </label>
              <label className={`cursor-pointer rounded-lg border p-4 ${scopeMode === 'unidade' ? 'border-primary bg-primary/5' : 'border-border'}`}>
                <input type="radio" name="apply-scope" value="unidade" checked={scopeMode === 'unidade'} onChange={() => setScopeMode('unidade')} className="sr-only" />
                <span className="font-semibold text-foreground">Uma unidade</span>
                <span className="mt-1 block text-xs text-muted-foreground">Materializa somente na unidade escolhida</span>
              </label>
            </div>
            {scopeMode === 'unidade' ? <MxField label="Unidade de destino"><MxSelect aria-label="Unidade de destino" value={unitId} onChange={event => setUnitId(event.target.value)}><option value="">Selecione uma unidade...</option>{activeUnits.map(unit => <option key={unit.id} value={unit.id}>{unitLabel(unit)}</option>)}</MxSelect></MxField> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <MxField label="Responsável real"><MxSelect aria-label="Responsável pela aplicação" value={responsibleId} onChange={event => setResponsibleId(event.target.value)}><option value="">Não definido agora</option>{props.responsibles.map(responsible => <option key={responsible.id} value={responsible.id}>{responsible.name} ({responsible.role})</option>)}</MxSelect></MxField>
              <MxField label="Prazo padrão (dias)"><input type="number" min={1} value={deadlineDays} onChange={event => setDeadlineDays(Math.max(1, Number(event.target.value) || 1))} className="flex h-[var(--mx-input-height)] w-full rounded-[var(--mx-input-radius)] border border-border bg-surface-default px-3 py-2 text-sm outline-none focus-visible:border-primary focus-visible:ring-focus-ring/25" /></MxField>
            </div>
            <div className="rounded-lg border border-border bg-surface-alt p-4 text-sm"><div className="font-semibold text-foreground">Unidades que receberão o plano</div><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{targetUnits.map(unit => <li key={unit.id}>✓ {unitLabel(unit)}</li>)}</ul></div>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-4">
            <MxStatusBanner tone="success"><Check size={14} />Confira o resumo antes de materializar o plano.</MxStatusBanner>
            <dl className="grid gap-3 rounded-lg border border-border bg-surface-alt p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted-foreground">Cliente</dt><dd className="font-semibold text-foreground">{activeClient?.name ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Ano</dt><dd className="font-semibold text-foreground">{referenceYear}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Departamento</dt><dd className="font-semibold text-foreground">{departmentLabel(department) || '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Indicador</dt><dd className="font-semibold text-foreground">{selectedIndicator?.label || selectedTemplate?.indicador || '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Plano padrão</dt><dd className="font-semibold text-foreground">{selectedTemplate?.nome ?? '—'} · v{publishedVersion?.versao ?? '—'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Escopo materializado</dt><dd className="font-semibold text-foreground">{targetUnits.length} unidade(s)</dd></div>
              <div><dt className="text-xs text-muted-foreground">Responsável</dt><dd className="font-semibold text-foreground">{props.responsibles.find(item => item.id === responsibleId)?.name ?? 'Não definido agora'}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Prazo</dt><dd className="font-semibold text-foreground">{deadlineDays} dias</dd></div>
            </dl>
            <div className="rounded-lg border border-border p-4 text-xs text-muted-foreground">A aplicação será idempotente: se a mesma confirmação for reenviada, o MX reconhece o plano já materializado e não duplica.</div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
