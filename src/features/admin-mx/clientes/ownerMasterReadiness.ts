/**
 * Fonte única Dono Master (Base44 resolveClientOwnerMaster).
 * Card, checklist, Corrigir e carteira devem passar por aqui.
 */

import { fetchClientPersons, type PersonAccessRow } from './personMutations'
import {
  resolveOwnerMaster,
  type OwnerMasterResolution,
} from './personAccess'

export type OwnerMasterReadiness = OwnerMasterResolution & {
  persons: PersonAccessRow[]
  correctionAction:
    | 'CREATE_OWNER'
    | 'DEFINE_MASTER'
    | 'RECONCILE_DUPLICATE'
    | 'ACTIVATE_OR_ADD_DONO'
    | 'NONE'
}

function correctionActionFor(status: OwnerMasterResolution['status']): OwnerMasterReadiness['correctionAction'] {
  if (status === 'NOT_CONFIGURED') return 'CREATE_OWNER'
  if (status === 'OWNER_WITHOUT_MASTER') return 'DEFINE_MASTER'
  if (status === 'DUPLICATE_MASTER') return 'RECONCILE_DUPLICATE'
  if (status === 'INACTIVE') return 'ACTIVATE_OR_ADD_DONO'
  return 'NONE'
}

/** Avalia Dono Master com a mesma lista que Pessoas e Acessos. */
export async function evaluateOwnerMasterReadiness(
  clientAccountId: string,
): Promise<{ readiness: OwnerMasterReadiness; error: string | null }> {
  const { rows, error } = await fetchClientPersons(clientAccountId)
  if (error) {
    return {
      readiness: {
        status: 'NOT_CONFIGURED',
        count: 0,
        persons: [],
        correctionAction: 'CREATE_OWNER',
      },
      error,
    }
  }

  const resolution = resolveOwnerMaster(rows)

  return {
    readiness: {
      ...resolution,
      persons: rows,
      correctionAction: correctionActionFor(resolution.status),
    },
    error: null,
  }
}
