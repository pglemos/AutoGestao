// Ciclo de vida do plano estratégico: rascunho → validação → publicado → revisão.
//
// Publicar é o ato que torna a meta oficial para o Dono. Sem ciclo não há como
// responder se um plano está publicado, quem publicou, nem impedir que um plano
// pela metade vire meta oficial — que é o estado de hoje.
//
// A validação aqui é a do Base44 adaptada ao formato MX: lá o roster vem de
// `StrategicTarget` e os valores de `StrategicTargetMonthlyValue`; aqui o roster
// vem do pacote do produto e os valores de `valores_indicadores_planejamento`,
// que são por loja. Por isso a completude é verificada por unidade.

import { isUnitPolicyDefined, type UnitPolicy } from './unitPolicy'

export type PlanCycleStatus = 'rascunho' | 'em_validacao' | 'publicado' | 'revisado'

export const PLAN_CYCLE_STATUS_LABEL: Record<PlanCycleStatus, string> = {
  rascunho: 'Rascunho',
  em_validacao: 'Em validação',
  publicado: 'Publicado',
  revisado: 'Revisado',
}

/**
 * Transições permitidas.
 *
 * De `publicado` só se sai por revisão, que cria um ciclo novo — um plano
 * publicado não volta a rascunho, senão a meta que o Dono viu muda debaixo dele.
 */
const ALLOWED_TRANSITIONS: Record<PlanCycleStatus, PlanCycleStatus[]> = {
  rascunho: ['em_validacao'],
  em_validacao: ['rascunho', 'publicado'],
  publicado: ['revisado'],
  revisado: [],
}

export function canTransition(from: PlanCycleStatus, to: PlanCycleStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function allowedTransitions(from: PlanCycleStatus): PlanCycleStatus[] {
  return [...(ALLOWED_TRANSITIONS[from] ?? [])]
}

export type PlanIssueType =
  | 'PLANO_VAZIO'
  | 'PLANO_INCOMPLETO'
  | 'POLITICA_AUSENTE'
  | 'MES_SEM_META'
  | 'CLIENTE_SEM_MATRIZ'
  | 'UNIDADES_AUSENTES'
  | 'PACOTE_INVALIDO'

export type PlanIssueSeverity = 'critico' | 'pendencia'

export type PlanIssue = {
  type: PlanIssueType
  severity: PlanIssueSeverity
  message: string
  indicatorCode?: string
  unitId?: string
  month?: number
}

export type PlanReadiness = {
  total: number
  ready: number
  pending: number
  issues: PlanIssue[]
  /** Só publica plano sem crítico e sem pendência. */
  canPublish: boolean
}

const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

/** Roster mínimo: abaixo disto o plano não foi montado, foi esboçado. */
const MIN_ROSTER = 3

/**
 * Verifica se o plano está pronto para publicação.
 *
 * `metaByUnit`: { [indicatorCode]: { [unitId]: { [mes]: meta } } }
 *
 * Indicador cadastrado apenas na empresa (`COMPANY_ONLY`, `SHARED_COMPANY_VALUE`)
 * não é cobrado por unidade — cobrar geraria pendência impossível de resolver na
 * tela da loja.
 */
export function validatePlanReadiness(input: {
  indicatorCodes: string[]
  activeUnitIds: string[]
  policies: Record<string, UnitPolicy>
  metaByUnit: Record<string, Record<string, Record<number, number | null>>>
}): PlanReadiness {
  const { indicatorCodes, activeUnitIds, policies, metaByUnit } = input

  if (indicatorCodes.length === 0) {
    return {
      total: 0,
      ready: 0,
      pending: 0,
      canPublish: false,
      issues: [{
        type: 'PLANO_VAZIO',
        severity: 'critico',
        message: 'Plano sem indicadores. Verifique o pacote do produto contratado.',
      }],
    }
  }

  if (indicatorCodes.length < MIN_ROSTER) {
    return {
      total: indicatorCodes.length,
      ready: 0,
      pending: 1,
      canPublish: false,
      issues: [{
        type: 'PLANO_INCOMPLETO',
        severity: 'critico',
        message: `Plano com apenas ${indicatorCodes.length} indicador(es). Sincronize com o pacote do produto.`,
      }],
    }
  }

  const issues: PlanIssue[] = []
  let ready = 0

  for (const code of indicatorCodes) {
    const policy = policies[code]

    if (!isUnitPolicyDefined(policy)) {
      issues.push({
        type: 'POLITICA_AUSENTE',
        severity: 'critico',
        indicatorCode: code,
        message: `${code}: sem política de consolidação definida.`,
      })
      continue
    }

    const isCompanyScoped =
      policy.unit_entry_mode === 'COMPANY_ONLY' || policy.unit_entry_mode === 'SHARED_COMPANY_VALUE'
    const scopes = isCompanyScoped ? ['__empresa__'] : activeUnitIds

    let indicatorHasIssue = false
    for (const unitId of scopes) {
      for (let month = 1; month <= 12; month += 1) {
        const value = metaByUnit[code]?.[unitId]?.[month]
        if (value == null) {
          indicatorHasIssue = true
          issues.push({
            type: 'MES_SEM_META',
            severity: 'pendencia',
            indicatorCode: code,
            unitId,
            month,
            message: `${code} — ${MONTH_LABELS[month - 1]}: meta não preenchida.`,
          })
        }
      }
    }

    if (!indicatorHasIssue) ready += 1
  }

  const pending = issues.length

  return {
    total: indicatorCodes.length,
    ready,
    pending,
    issues,
    canPublish: pending === 0,
  }
}

/** Resumo curto para banner de tela. */
export function readinessSummary(readiness: PlanReadiness): string {
  if (readiness.total === 0) return 'Plano sem indicadores.'
  if (readiness.canPublish) return `${readiness.ready} de ${readiness.total} indicadores prontos. Plano pode ser publicado.`

  const criticos = readiness.issues.filter(issue => issue.severity === 'critico').length
  if (criticos > 0) return `${criticos} impedimento(s) crítico(s) antes de publicar.`

  const mesesFaltando = readiness.issues.filter(issue => issue.type === 'MES_SEM_META').length
  return `${readiness.ready} de ${readiness.total} indicadores prontos. ${mesesFaltando} meta(s) mensal(is) por preencher.`
}
