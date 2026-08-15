// Draft do wizard de criação de indicador — 100% puro (sem Supabase).
//
// Port do CreateIndicatorWizard do Base44: identificação, formato, meta,
// fórmula, fonte do realizado, visualização e posição. A validação espelha os
// NOT NULL e CHECKs de catalogo_metricas_consultoria.

import { extractParameterDeps, extractIndicatorDeps } from './indicatorFormulas'

export const WIZARD_STEPS = [
  'Identificação',
  'Formato',
  'Meta',
  'Fórmula',
  'Fonte do Realizado',
  'Visualização',
  'Revisão',
] as const

export type WizardStep = (typeof WIZARD_STEPS)[number]

export type IndicatorWizardDraft = {
  name: string
  code: string
  area: string
  description: string
  value_type: 'number' | 'percent' | 'currency'
  direction: 'increase' | 'decrease'
  casas_decimais: number
  frequencia: 'diaria' | 'semanal' | 'mensal' | 'trimestral' | 'anual'
  ano_inicial: number | null
  ano_final: number | null
  source_scope: string
  formula_expression: string
  target_calculation_mode: 'MANUAL' | 'CALCULATED_LOCKED' | 'CALCULATED_ADJUSTABLE'
  visivel_dono: boolean
  posicao: 'last' | 'first' | 'before' | 'after'
  posicao_ref: string
}

export function emptyWizardDraft(): IndicatorWizardDraft {
  return {
    name: '',
    code: '',
    area: '',
    description: '',
    value_type: 'number',
    direction: 'increase',
    casas_decimais: 0,
    frequencia: 'mensal',
    ano_inicial: new Date().getFullYear(),
    ano_final: null,
    source_scope: 'manual',
    formula_expression: '',
    target_calculation_mode: 'MANUAL',
    visivel_dono: true,
    posicao: 'last',
    posicao_ref: '',
  }
}

/** Slug da chave a partir do nome (Base44 slugifyCode). */
export function slugifyCode(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
}

export function validateWizardStep(step: number, draft: IndicatorWizardDraft): string | null {
  switch (step) {
    case 0:
      if (!draft.name.trim()) return 'Informe o nome do indicador.'
      if (!draft.area.trim()) return 'Informe a área do indicador.'
      if (draft.ano_inicial != null && (draft.ano_inicial < 2000 || draft.ano_inicial > 2100)) {
        return 'Ano inicial fora do intervalo suportado.'
      }
      if (draft.ano_final != null && draft.ano_inicial != null && draft.ano_final < draft.ano_inicial) {
        return 'Ano final anterior ao inicial.'
      }
      return null
    case 1:
      if (!Number.isInteger(draft.casas_decimais) || draft.casas_decimais < 0 || draft.casas_decimais > 4) {
        return 'Casas decimais deve ser um inteiro de 0 a 4.'
      }
      return null
    case 2:
      return null
    case 3:
      if (draft.target_calculation_mode !== 'MANUAL') {
        if (!draft.formula_expression.trim()) return 'Informe a fórmula mensal.'
        const deps = extractIndicatorDeps(draft.formula_expression)
        const params = extractParameterDeps(draft.formula_expression)
        if (deps.length === 0 && params.length === 0) {
          return 'A fórmula precisa referenciar IND("CODIGO") ou PAR("CODIGO").'
        }
      }
      return null
    case 4:
      return null
    case 5:
      if ((draft.posicao === 'before' || draft.posicao === 'after') && !draft.posicao_ref) {
        return 'Selecione o indicador de referência da posição.'
      }
      return null
    case 6:
      return null
    default:
      return null
  }
}

export function validateWizardDraft(draft: IndicatorWizardDraft): string | null {
  for (let step = 0; step < WIZARD_STEPS.length; step++) {
    const error = validateWizardStep(step, draft)
    if (error) return error
  }
  if (!/^[a-z0-9_]+$/.test(draft.code)) return 'A chave aceita apenas minúsculas, números e underline.'
  return null
}

export function isWizardCodeEditable(saved: boolean): boolean {
  return !saved
}

export const WIZARD_VALUE_TYPES: Array<{ value: IndicatorWizardDraft['value_type']; label: string }> = [
  { value: 'number', label: 'Número' },
  { value: 'percent', label: 'Percentual' },
  { value: 'currency', label: 'Moeda' },
]

export const WIZARD_FREQUENCIES: Array<{ value: IndicatorWizardDraft['frequencia']; label: string }> = [
  { value: 'diaria', label: 'Diária' },
  { value: 'semanal', label: 'Semanal' },
  { value: 'mensal', label: 'Mensal' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'anual', label: 'Anual' },
]

export const WIZARD_CALC_MODES: Array<{ value: IndicatorWizardDraft['target_calculation_mode']; label: string }> = [
  { value: 'MANUAL', label: 'Manual — o consultor digita' },
  { value: 'CALCULATED_LOCKED', label: 'Calculado bloqueado — sistema calcula' },
  { value: 'CALCULATED_ADJUSTABLE', label: 'Calculado com ajuste — sistema calcula, consultor ajusta' },
]

export const WIZARD_SOURCE_SCOPES: Array<{ value: string; label: string }> = [
  { value: 'manual', label: 'Digitação manual oficial' },
  { value: 'computed', label: 'Cálculo a partir de dados oficiais' },
  { value: 'sales', label: 'Módulo interno de vendas' },
  { value: 'marketing', label: 'Módulo interno de marketing' },
  { value: 'inventory', label: 'Módulo interno de estoque' },
  { value: 'dre', label: 'Módulo interno financeiro/DRE' },
  { value: 'daily_tracking', label: 'Acompanhamento diário' },
  { value: 'diagnostic', label: 'Diagnóstico' },
  { value: 'target', label: 'Metas' },
  { value: 'training', label: 'Treinamento' },
  { value: 'importacao_planilha', label: 'Importação de planilha' },
  { value: 'integracao_externa', label: 'Integração externa' },
]
