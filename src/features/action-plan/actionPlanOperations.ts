// Operações puras e auxiliares do Plano de Ação (paridade Base44).
//
// Centraliza regras de cálculo de progresso ponderado, geração de códigos de template,
// sugestão de títulos, promoção de plano a modelo e reordenação de cartões.

export type WeightedActionItem = {
  id?: string
  status?: string | null
  weight_basis_points?: number | null
  weight_percentage_display?: string | null
}

export type PlanProgressResult = {
  percentage: number
  completedCount: number
  totalCount: number
}

/**
 * Calcula o progresso do plano com base nos pesos em basis points (total = 10000).
 * Se os itens não possuírem pesos preenchidos, distribui igualmente.
 */
export function calculatePlanProgress(actionItems: WeightedActionItem[] | null | undefined): PlanProgressResult {
  if (!actionItems || actionItems.length === 0) {
    return { percentage: 0, completedCount: 0, totalCount: 0 }
  }

  const isCompleted = (status?: string | null) => {
    const s = String(status ?? '').trim().toLowerCase()
    return s === 'concluido' || s === 'concluida'
  }

  const completed = actionItems.filter(item => isCompleted(item.status))
  const hasBasisPoints = actionItems.some(item => (item.weight_basis_points ?? 0) > 0)

  if (hasBasisPoints) {
    const completedWeight = completed.reduce((sum, item) => sum + (item.weight_basis_points ?? 0), 0)
    const percentage = Number((completedWeight / 100).toFixed(2))
    return {
      percentage: Math.min(100, Math.max(0, percentage)),
      completedCount: completed.length,
      totalCount: actionItems.length,
    }
  }

  // Fallback: cálculo simples pela proporção de itens concluídos
  const percentage = Number(((completed.length / actionItems.length) * 100).toFixed(2))
  return {
    percentage,
    completedCount: completed.length,
    totalCount: actionItems.length,
  }
}

/**
 * Calcula pesos em basis points distribuindo 10000 pontos igualmente entre as ações.
 */
export function calculateWeights(actionCount: number): Array<{ weight_basis_points: number; weight_percentage_display: string }> {
  if (actionCount <= 0) return []
  const base = Math.floor(10000 / actionCount)
  const remainder = 10000 - base * actionCount
  const weights: Array<{ weight_basis_points: number; weight_percentage_display: string }> = []

  for (let i = 0; i < actionCount; i++) {
    const bp = base + (i < remainder ? 1 : 0)
    weights.push({
      weight_basis_points: bp,
      weight_percentage_display: `${(bp / 100).toFixed(2)}%`,
    })
  }

  return weights
}

const DIRECTION_LABELS: Record<string, string> = {
  increase: 'Aumentar',
  decrease: 'Reduzir',
  AUMENTAR: 'Aumentar',
  DIMINUIR: 'Reduzir',
  MANTER: 'Manter',
}

/**
 * Sugere título do Plano com base na direção de melhoria e nome do indicador.
 */
export function suggestTitle(direction: string | null | undefined, indicatorName: string | null | undefined): string {
  if (!indicatorName) return ''
  const dirLabel = DIRECTION_LABELS[String(direction)] || 'Melhorar'
  const cleanName = indicatorName.replace(/%/g, '').replace(/^[\s%]+/, '').trim()
  if (!cleanName) return ''
  const lowerName = cleanName.charAt(0).toLowerCase() + cleanName.slice(1)
  return `${dirLabel} ${lowerName}`
}

/**
 * Gera código automático para um modelo de plano de ação no padrão `PA_{DEPT}_{INDICATOR}_{SEQ}`.
 */
export function generateTemplateCode(
  departmentId: string,
  indicatorCode?: string | null,
  existingCodes: string[] = [],
): string {
  const cleanDept = (departmentId || 'GERAL').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const indPart = indicatorCode
    ? indicatorCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 30)
    : 'GENERIC'
  const prefix = `PA_${cleanDept}_${indPart}`

  let maxSeq = 0
  for (const code of existingCodes) {
    if (code && code.startsWith(`${prefix}_`)) {
      const match = code.match(/_(\d+)$/)
      if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10))
    }
  }

  const seq = String(maxSeq + 1).padStart(3, '0')
  return `${prefix}_${seq}`
}

/**
 * Reordena uma lista imutavelmente movendo um item de uma posição para outra.
 */
export function reorderItems<T>(list: readonly T[], sourceIndex: number, destinationIndex: number): T[] {
  if (sourceIndex < 0 || sourceIndex >= list.length) return [...list]
  if (destinationIndex < 0 || destinationIndex >= list.length) return [...list]
  if (sourceIndex === destinationIndex) return [...list]

  const result = [...list]
  const [removed] = result.splice(sourceIndex, 1)
  result.splice(destinationIndex, 0, removed)
  return result
}
