import { useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Plus, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Modal } from '@/components/organisms/Modal'
import { MxField, MxSelect, MxStatusBanner, MxTextarea } from '@/components/module/MxModuleVisualPrimitives'
import type { IndicatorInput } from '../hooks/useAdminMxLists'
import {
  WIZARD_CALC_MODES,
  WIZARD_FREQUENCIES,
  WIZARD_SOURCE_SCOPES,
  WIZARD_STEPS,
  WIZARD_VALUE_TYPES,
  isWizardCodeEditable,
  slugifyCode,
  type IndicatorWizardDraft,
  type WizardStep,
} from '../indicadores/indicatorWizard'

const AREAS = ['Comercial', 'Marketing', 'Produto e Estoque', 'Financeiro', 'Operações', 'Pessoas - RH']

export function CreateIndicatorWizard(props: {
  open: boolean
  areas: string[]
  initial?: Partial<IndicatorWizardDraft>
  submitting: boolean
  onSave: (draft: IndicatorWizardDraft, publish: boolean) => void
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [savedCode, setSavedCode] = useState(false)
  const [publish, setPublish] = useState(false)
  const [draft, setDraft] = useState<IndicatorWizardDraft>(() => ({
    name: props.initial?.name ?? '',
    code: props.initial?.code ?? '',
    area: props.initial?.area ?? '',
    description: props.initial?.description ?? '',
    value_type: props.initial?.value_type ?? 'number',
    direction: props.initial?.direction ?? 'increase',
    casas_decimais: props.initial?.casas_decimais ?? 0,
    frequencia: props.initial?.frequencia ?? 'mensal',
    ano_inicial: props.initial?.ano_inicial ?? new Date().getFullYear(),
    ano_final: props.initial?.ano_final ?? null,
    source_scope: props.initial?.source_scope ?? 'manual',
    formula_expression: props.initial?.formula_expression ?? '',
    target_calculation_mode: props.initial?.target_calculation_mode ?? 'MANUAL',
    visivel_dono: props.initial?.visivel_dono ?? true,
    posicao: props.initial?.posicao ?? 'last',
    posicao_ref: props.initial?.posicao_ref ?? '',
  }))

  const areas = props.areas.length > 0 ? props.areas : AREAS
  const patch = (values: Partial<IndicatorWizardDraft>) => setDraft(current => ({ ...current, ...values }))

  const canNext = (current: number): boolean => {
    switch (current) {
      case 0:
        return Boolean(draft.name.trim() && draft.area.trim())
      case 1:
        return Number.isInteger(draft.casas_decimais) && draft.casas_decimais >= 0 && draft.casas_decimais <= 4
      case 3:
        return draft.target_calculation_mode === 'MANUAL' || Boolean(draft.formula_expression.trim())
      case 5:
        return !(draft.posicao === 'before' || draft.posicao === 'after') || Boolean(draft.posicao_ref)
      default:
        return true
    }
  }

  const submit = (willPublish: boolean) => {
    setPublish(willPublish)
    props.onSave(draft, willPublish)
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Criar indicador"
      size="xl"
      closeOnEscape={!props.submitting}
      footer={(
        <>
          <Button variant="outline" onClick={props.onClose} disabled={props.submitting}>Cancelar</Button>
          {step > 0 ? (
            <Button variant="outline" onClick={() => setStep(current => current - 1)} disabled={props.submitting}>
              <ChevronLeft size={14} />Voltar
            </Button>
          ) : null}
          {step < WIZARD_STEPS.length - 1 ? (
            <Button onClick={() => setStep(current => current + 1)} disabled={props.submitting || !canNext(step)}>
              Continuar<ChevronRight size={14} />
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => submit(false)} disabled={props.submitting}>
                {props.submitting && !publish ? 'Salvando...' : 'Salvar rascunho'}
              </Button>
              <Button onClick={() => submit(true)} disabled={props.submitting || !draft.name.trim() || !draft.code.trim()}>
                {props.submitting && publish ? 'Publicando...' : 'Publicar indicador'}
              </Button>
            </>
          )}
        </>
      )}
    >
      <div className="mt-5 space-y-5">
        {/* Stepper */}
        <ol className="flex flex-wrap items-center gap-1" aria-label="Etapas do wizard">
          {WIZARD_STEPS.map((label, index) => (
            <li key={label} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStep(index)}
                disabled={props.submitting}
                aria-current={step === index ? 'step' : undefined}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
                  step === index
                    ? 'border-border-strong bg-background-muted font-semibold text-foreground'
                    : index < step
                      ? 'border-border bg-success/10 text-foreground'
                      : 'border-border text-muted-foreground'
                }`}
              >
                {index < step ? <Check size={12} /> : <span>{index + 1}</span>}
                {label}
              </button>
            </li>
          ))}
        </ol>

        <MxStatusBanner tone="info">Crie o indicador com o ciclo de vida do catálogo. A chave é gerada do nome e congela após a primeira gravação.</MxStatusBanner>

        {step === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <MxField label="Nome" hint="Obrigatório.">
              <Input
                value={draft.name}
                onChange={event => patch({ name: event.target.value, code: savedCode ? draft.code : slugifyCode(event.target.value) })}
                placeholder="Vendas Internet Premium"
              />
            </MxField>
            <MxField label="Código interno" hint="Gerado automaticamente. Congela após a primeira gravação.">
              <div className="flex gap-2">
                <Input value={draft.code} readOnly={!isWizardCodeEditable(savedCode)} onChange={event => patch({ code: event.target.value })} />
                {!savedCode ? (
                  <Button variant="outline" size="sm" aria-label="Regenerar código" onClick={() => patch({ code: slugifyCode(draft.name) })}>
                    <RotateCcw size={14} />
                  </Button>
                ) : null}
              </div>
            </MxField>
            <MxField label="Área" hint="Obrigatório." className="sm:col-span-2">
              <MxSelect aria-label="Área do indicador" value={draft.area} onChange={event => patch({ area: event.target.value })}>
                <option value="">Selecionar...</option>
                {areas.map(area => <option key={area} value={area}>{area}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Descrição" className="sm:col-span-2">
              <MxTextarea rows={2} value={draft.description} onChange={event => patch({ description: event.target.value })} />
            </MxField>
          </div>
        ) : step === 1 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <MxField label="Tipo de valor">
              <MxSelect aria-label="Tipo de valor" value={draft.value_type} onChange={event => patch({ value_type: event.target.value as IndicatorWizardDraft['value_type'] })}>
                {WIZARD_VALUE_TYPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Casas decimais">
              <Input type="number" min={0} max={4} value={String(draft.casas_decimais)} onChange={event => patch({ casas_decimais: Number(event.target.value) })} />
            </MxField>
            <MxField label="Direção padrão">
              <MxSelect aria-label="Direção padrão" value={draft.direction} onChange={event => patch({ direction: event.target.value as IndicatorWizardDraft['direction'] })}>
                <option value="increase">Aumentar — maior é melhor</option>
                <option value="decrease">Diminuir — menor é melhor</option>
              </MxSelect>
            </MxField>
            <MxField label="Frequência">
              <MxSelect aria-label="Frequência" value={draft.frequencia} onChange={event => patch({ frequencia: event.target.value as IndicatorWizardDraft['frequencia'] })}>
                {WIZARD_FREQUENCIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </MxSelect>
            </MxField>
            <MxField label="Ano inicial" hint="Vigência do indicador.">
              <Input type="number" min={2000} max={2100} value={draft.ano_inicial === null ? '' : String(draft.ano_inicial)} onChange={event => patch({ ano_inicial: event.target.value === '' ? null : Number(event.target.value) })} />
            </MxField>
            <MxField label="Ano final (opcional)" hint="Vazio = sem fim.">
              <Input type="number" min={2000} max={2100} value={draft.ano_final === null ? '' : String(draft.ano_final)} onChange={event => patch({ ano_final: event.target.value === '' ? null : Number(event.target.value) })} />
            </MxField>
          </div>
        ) : step === 2 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <MxField label="Modo de cálculo da meta">
              <MxSelect aria-label="Modo de cálculo da meta" value={draft.target_calculation_mode} onChange={event => patch({ target_calculation_mode: event.target.value as IndicatorWizardDraft['target_calculation_mode'] })}>
                {WIZARD_CALC_MODES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </MxSelect>
            </MxField>
          </div>
        ) : step === 3 ? (
          <div className="space-y-4">
            <MxField label="Fórmula mensal" hint={draft.target_calculation_mode === 'MANUAL' ? 'Modo manual — não há fórmula.' : 'Use IND("CODIGO") para indicadores e PAR("CODIGO") para parâmetros.'}>
              <MxTextarea
                rows={3}
                disabled={draft.target_calculation_mode === 'MANUAL'}
                value={draft.formula_expression}
                onChange={event => patch({ formula_expression: event.target.value })}
                placeholder='IND("SALES_INTERNET") * PAR("LEAD_TO_APPOINTMENT_RATE")'
              />
            </MxField>
            <MxStatusBanner tone="neutral">Sintaxe: <code>IND("CODIGO")</code> para indicadores e <code>PAR("CODIGO")</code> para parâmetros. Operadores: +, -, *, /.</MxStatusBanner>
          </div>
        ) : step === 4 ? (
          <div className="space-y-4">
            <MxField label="Como o Realizado será atualizado?">
              <MxSelect aria-label="Fonte do realizado" value={draft.source_scope} onChange={event => patch({ source_scope: event.target.value })}>
                {WIZARD_SOURCE_SCOPES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </MxSelect>
            </MxField>
            <MxStatusBanner tone="warning">O Realizado não é inventado pela fórmula da Meta. Sem fonte oficial = "Sem dado oficial".</MxStatusBanner>
          </div>
        ) : step === 5 ? (
          <div className="space-y-4">
            <MxField label="Posição no catálogo">
              <MxSelect aria-label="Posição no catálogo" value={draft.posicao} onChange={event => patch({ posicao: event.target.value as IndicatorWizardDraft['posicao'] })}>
                <option value="last">Último da área</option>
                <option value="first">Primeiro da área</option>
                <option value="before">Antes de um indicador</option>
                <option value="after">Depois de um indicador</option>
              </MxSelect>
            </MxField>
            {(draft.posicao === 'before' || draft.posicao === 'after') ? (
              <MxField label={draft.posicao === 'before' ? 'Antes de' : 'Depois de'}>
                <Input value={draft.posicao_ref} onChange={event => patch({ posicao_ref: event.target.value })} placeholder="Chave do indicador de referência" />
              </MxField>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={draft.visivel_dono} onChange={event => patch({ visivel_dono: event.target.checked })} />
              <span>Mostrar no Módulo Dono</span>
            </label>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Nome', draft.name || '—'],
              ['Código', draft.code || '—'],
              ['Área', draft.area || '—'],
              ['Tipo de valor', draft.value_type],
              ['Casas decimais', String(draft.casas_decimais)],
              ['Frequência', draft.frequencia],
              ['Vigência', `${draft.ano_inicial ?? '—'} a ${draft.ano_final ?? 'sem fim'}`],
              ['Modo da meta', draft.target_calculation_mode],
              ['Visível no Dono', draft.visivel_dono ? 'Sim' : 'Não'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="font-semibold text-foreground">{value}</dd>
              </div>
            ))}
            {draft.formula_expression ? (
              <div className="rounded-lg border border-border p-3 sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Fórmula</dt>
                <dd className="font-mono text-xs text-foreground">{draft.formula_expression}</dd>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function toIndicatorInput(draft: IndicatorWizardDraft): IndicatorInput {
  return {
    metric_key: draft.code,
    label: draft.name,
    area: draft.area,
    value_type: draft.value_type,
    direction: draft.direction,
    source_scope: draft.source_scope,
    active: true,
    descricao: draft.description || null,
    casas_decimais: draft.casas_decimais,
    frequencia: draft.frequencia,
    ano_inicial: draft.ano_inicial,
    ano_final: draft.ano_final,
    formula_expression: draft.formula_expression || null,
    target_calculation_mode: draft.target_calculation_mode,
    visivel_dono: draft.visivel_dono,
  }
}

export function fromIndicatorToWizard(metric: {
  metric_key: string
  label: string
  area: string
  descricao: string | null
  value_type: string
  direction: string
  source_scope: string
  frequencia: string
  casas_decimais: number
  ano_inicial: number | null
  ano_final: number | null
  formula_expression: string | null
  target_calculation_mode: string | null
  visivel_dono: boolean
}): IndicatorWizardDraft {
  return {
    name: metric.label,
    code: metric.metric_key,
    area: metric.area,
    description: metric.descricao ?? '',
    value_type: (metric.value_type === 'percent' || metric.value_type === 'currency' ? metric.value_type : 'number') as IndicatorWizardDraft['value_type'],
    direction: (metric.direction === 'decrease' ? 'decrease' : 'increase') as IndicatorWizardDraft['direction'],
    casas_decimais: metric.casas_decimais,
    frequencia: (['diaria', 'semanal', 'mensal', 'trimestral', 'anual'].includes(metric.frequencia) ? metric.frequencia : 'mensal') as IndicatorWizardDraft['frequencia'],
    ano_inicial: metric.ano_inicial,
    ano_final: metric.ano_final,
    source_scope: metric.source_scope,
    formula_expression: metric.formula_expression ?? '',
    target_calculation_mode: (metric.target_calculation_mode === 'CALCULATED_LOCKED' || metric.target_calculation_mode === 'CALCULATED_ADJUSTABLE' ? metric.target_calculation_mode : 'MANUAL') as IndicatorWizardDraft['target_calculation_mode'],
    visivel_dono: metric.visivel_dono,
    posicao: 'last',
    posicao_ref: '',
  }
}

export { Plus, type WizardStep }
