export type ActionPlanDepartmentCategory =
  | 'comercial'
  | 'marketing'
  | 'produto'
  | 'rh'
  | 'financeiro'
  | 'operacional'

export const ACTION_PLAN_DEPARTMENT_CARDS: ReadonlyArray<{
  code: ActionPlanDepartmentCategory
  label: string
}> = [
  { code: 'comercial', label: 'Comercial' },
  { code: 'marketing', label: 'Marketing' },
  { code: 'produto', label: 'Produto e Estoque' },
  { code: 'rh', label: 'Pessoas - RH' },
  { code: 'financeiro', label: 'Financeiro' },
  { code: 'operacional', label: 'Operações' },
]

function normalizeDepartment(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

/** Converte os códigos históricos e os códigos canônicos no agrupamento MX. */
export function departmentCategory(value: string | null | undefined): ActionPlanDepartmentCategory | null {
  const normalized = normalizeDepartment(value)
  if (normalized === 'COMERCIAL' || normalized === 'VENDAS') return 'comercial'
  if (normalized === 'MARKETING') return 'marketing'
  if (['PRODUTO', 'PRODUTOESTOQUE', 'ESTOQUE'].includes(normalized)) return 'produto'
  if (['RH', 'PESSOAS', 'PESSOASRH', 'EQUIPE', 'DESENVOLVIMENTO'].includes(normalized)) return 'rh'
  if (normalized === 'FINANCEIRO') return 'financeiro'
  if (['OPERACIONAL', 'OPERACOES'].includes(normalized)) return 'operacional'
  return null
}

/** Permite que um filtro canônico encontre templates com códigos legados. */
export function departmentMatchesFilter(value: string | null | undefined, filter: string | null | undefined): boolean {
  if (!filter) return true
  const left = normalizeDepartment(value)
  const right = normalizeDepartment(filter)
  if (!left || !right) return left === right
  return left === right || (departmentCategory(value) !== null && departmentCategory(value) === departmentCategory(filter))
}

export function departmentLabel(value: string | null | undefined): string {
  const category = departmentCategory(value)
  return ACTION_PLAN_DEPARTMENT_CARDS.find(card => card.code === category)?.label ?? value ?? '—'
}

/** Traduz as áreas legadas do catálogo de métricas para a taxonomia dos cards. */
export function indicatorAreaMatchesDepartment(area: string | null | undefined, department: string | null | undefined): boolean {
  if (!department) return true
  const normalized = normalizeDepartment(area)
  const areaCategory = ['VENDAS', 'FUNIL', 'CRM'].includes(normalized)
    ? 'comercial'
    : ['ESTOQUE', 'TROCA'].includes(normalized)
      ? 'produto'
      : ['EQUIPE', 'DESENVOLVIMENTO'].includes(normalized)
        ? 'rh'
        : departmentCategory(area)
  return areaCategory !== null && areaCategory === departmentCategory(department)
}
