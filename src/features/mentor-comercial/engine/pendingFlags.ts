/**
 * CommercialMentorEngine — Pending Flags e Return Status (TASK 13 e 27).
 *
 * Módulo determinístico para gestão de sub-processos e pendências complementares.
 * Pendências complementares NUNCA geram status combinatórios. O status principal
 * da oportunidade permanece único (catálogo v1); as pendências coexistem em `pendingFlags`.
 *
 * Fluxo determinístico de sub-processo:
 * status A
 *  -> entra financiamento/troca/decisão
 *  -> salva return_status = A
 *  -> status vira o de pendência (ex.: FIN-01 ou TR-01)
 *  -> resolve a pendência
 *  -> ainda existe outra pending bloqueante?
 *       sim -> permanece em pendência
 *       não -> volta para A se A ainda for válido
 *  -> se A não for mais válido -> o engine resolve o próximo status
 */

import {
  resolveMentorDecision,
  type OpportunityFacts,
  type RuleCatalog,
  type StoreSettings,
} from './engine'

export type EnterSubProcessInput = {
  currentStatusCode: string
  returnStatusCode: string | null
  pendingFlags: string[]
  flagToAdd: string | string[]
  targetStatusCode?: string | null
  catalog: RuleCatalog
}

export type ResolveSubProcessInput = {
  currentStatusCode: string
  returnStatusCode: string | null
  pendingFlags: string[]
  flagToResolve: string | string[]
  catalog: RuleCatalog
  facts?: OpportunityFacts
  storeSettings?: StoreSettings
  now?: Date
}

export type SubProcessStepResult = {
  statusCode: string
  returnStatusCode: string | null
  pendingFlags: string[]
  hasActivePendingFlags: boolean
  explanations: string[]
}

/**
 * Verifica se um código de status é válido e existe no catálogo de regras.
 */
export function isStatusValidInCatalog(
  statusCode: string | null | undefined,
  catalog: RuleCatalog,
): boolean {
  if (!statusCode || typeof statusCode !== 'string') return false
  const trimmed = statusCode.trim()
  if (!trimmed) return false
  return catalog.statuses.some((s) => s.statusId === trimmed)
}

/**
 * Identifica se o status atual pertence a uma família ou código de pendência/sub-processo.
 */
export function isPendingStatus(statusCode: string, catalog: RuleCatalog): boolean {
  const statusDef = catalog.statuses.find((s) => s.statusId === statusCode)
  if (!statusDef) return false
  return (
    statusDef.family === 'Financiamento' ||
    statusDef.family === 'Troca' ||
    statusCode === 'INT-N10' ||
    statusCode === 'INT-N11'
  )
}

/**
 * Registra a entrada em um sub-processo de pendência.
 *
 * Preserva o status de origem `returnStatusCode = status A` e adiciona a flag bloqueante.
 * Nunca combina rótulos ou inventa status inexistentes no catálogo.
 */
export function enterSubProcess(input: EnterSubProcessInput): SubProcessStepResult {
  const {
    currentStatusCode,
    returnStatusCode,
    pendingFlags,
    flagToAdd,
    targetStatusCode,
    catalog,
  } = input

  const flagsToAddArray = Array.isArray(flagToAdd) ? flagToAdd : [flagToAdd]
  const updatedFlags = Array.from(new Set([...pendingFlags, ...flagsToAddArray]))

  const explanations: string[] = []

  let targetCode = currentStatusCode
  if (targetStatusCode) {
    if (isStatusValidInCatalog(targetStatusCode, catalog)) {
      targetCode = targetStatusCode
    } else {
      explanations.push(
        `Status alvo "${targetStatusCode}" não existe no catálogo. Preservando status atual "${currentStatusCode}".`,
      )
    }
  }

  let newReturnStatus = returnStatusCode
  if (newReturnStatus === null || newReturnStatus === undefined) {
    if (targetCode !== currentStatusCode || isPendingStatus(targetCode, catalog)) {
      if (isStatusValidInCatalog(currentStatusCode, catalog)) {
        newReturnStatus = currentStatusCode
        explanations.push(
          `Entrada em sub-processo: status original "${currentStatusCode}" salvo em returnStatusCode.`,
        )
      }
    }
  } else {
    explanations.push(`Preservando returnStatusCode existente "${newReturnStatus}".`)
  }

  explanations.push(`Pendência adicionada. Flags ativas: [${updatedFlags.join(', ')}].`)

  return {
    statusCode: targetCode,
    returnStatusCode: newReturnStatus,
    pendingFlags: updatedFlags,
    hasActivePendingFlags: updatedFlags.length > 0,
    explanations,
  }
}

/**
 * Processa a resolução de uma pendência em um sub-processo.
 *
 * Se ainda houver outras pendências bloqueantes abertas:
 *   -> permanece em pendência.
 * Se todas as pendências foram resolvidas:
 *   -> tenta retornar ao status A (returnStatusCode) se A ainda for válido.
 *   -> se A não for mais válido -> o engine resolve o próximo status.
 */
export function resolveSubProcess(input: ResolveSubProcessInput): SubProcessStepResult {
  const {
    currentStatusCode,
    returnStatusCode,
    pendingFlags,
    flagToResolve,
    catalog,
    facts,
    storeSettings,
    now,
  } = input

  const flagsToClear = Array.isArray(flagToResolve) ? flagToResolve : [flagToResolve]
  const updatedFlags = pendingFlags.filter((f) => !flagsToClear.includes(f))
  const explanations: string[] = []

  explanations.push(`Resolvendo pendência(s): [${flagsToClear.join(', ')}].`)

  // 1. Ainda existe outra pendência bloqueante aberta?
  if (updatedFlags.length > 0) {
    explanations.push(
      `Outras pendências bloqueantes seguem abertas: [${updatedFlags.join(', ')}]. Permanecendo no status de pendência.`,
    )
    return {
      statusCode: currentStatusCode,
      returnStatusCode,
      pendingFlags: updatedFlags,
      hasActivePendingFlags: true,
      explanations,
    }
  }

  // 2. Nenhuma pendência bloqueante restante. Tentar retornar para status A.
  const targetReturnStatus = returnStatusCode
  const isReturnValid = isStatusValidInCatalog(targetReturnStatus, catalog)

  if (targetReturnStatus && isReturnValid) {
    explanations.push(
      `Todas as pendências foram resolvidas. Retornando ao status original "${targetReturnStatus}".`,
    )
    return {
      statusCode: targetReturnStatus,
      returnStatusCode: null,
      pendingFlags: [],
      hasActivePendingFlags: false,
      explanations,
    }
  }

  // 3. Se status A não for mais válido ou não existir: o engine resolve o próximo status determinístico.
  explanations.push(
    `Todas as pendências foram resolvidas. Status original (${targetReturnStatus ?? 'nulo'}) não é válido no catálogo.`,
  )

  let resolvedStatusCode = currentStatusCode

  if (facts && storeSettings && now) {
    const updatedFacts: OpportunityFacts = {
      ...facts,
      statusCode: currentStatusCode,
      pendingFlags: [],
      returnStatusCode: null,
    }

    const decision = resolveMentorDecision({
      facts: updatedFacts,
      storeSettings,
      catalog,
      now,
    })

    resolvedStatusCode = decision.statusCode
    explanations.push(
      `Engine determinou o próximo status "${decision.statusCode}" (${decision.statusLabel}).`,
    )
  } else {
    explanations.push(
      `Mantendo status atual "${currentStatusCode}" pois dados para engine não foram fornecidos.`,
    )
  }

  return {
    statusCode: resolvedStatusCode,
    returnStatusCode: null,
    pendingFlags: [],
    hasActivePendingFlags: false,
    explanations,
  }
}
