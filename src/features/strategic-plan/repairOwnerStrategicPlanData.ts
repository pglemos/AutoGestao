// Reparo idempotente do plano do Dono: Vendas — Outros vazio em competência
// encerrada, quando os outros canais já têm base. Não duplica, não sobrescreve
// valor oficial/manual.

import { isActualMonthClosed } from '@/components/owner/strategic/strategicUtils'
import { catalogAliasKeys, matchCanonicalIndicator } from '@/features/admin-mx/indicadores/canonicalBase44Catalog'
import { saveIndicatorActuals } from '@/features/admin-mx/indicadores/indicatorData'
import { fetchClientOfStore, fetchClientUnits, fetchUnitsPlanningValues } from './clientPlanningRepository'
import { invalidateOwnerStrategicPlanCaches } from './ownerStrategicPlanQueryKey'
import type { PlanningValueRow } from './clientPlanningConsolidation'

const CHANNEL_CODES = [
  'SALES_WALKIN',
  'SALES_REFERRAL',
  'SALES_COMPANY_PORTFOLIO',
  'SALES_SELLER_PORTFOLIO',
  'SALES_INTERNET',
] as const

const OTHER_CODE = 'SALES_OTHER'

function codeKeys(code: string): Set<string> {
  const canon = matchCanonicalIndicator(code)
  return new Set([code, ...(canon ? catalogAliasKeys(canon.code) : [])].map(key => key.toLowerCase()))
}

const OTHER_KEYS = codeKeys(OTHER_CODE)
const CHANNEL_KEYS = new Set(CHANNEL_CODES.flatMap(code => [...codeKeys(code)]))

export type SalesOtherRepairCell = {
  storeId: string
  month: number
  indicatorCode: string
}

export type RepairOwnerPlanResult = {
  clientAccountId: string | null
  referenceYear: number
  cellsWritten: SalesOtherRepairCell[]
  alreadyZero: number
  skippedOpenMonths: number
}

function rowCode(row: PlanningValueRow): string {
  return String(row.indicator_code || '').toLowerCase()
}

/** Decide quais células de Vendas — Outros devem virar zero. Puro. */
export function planSalesOtherRepairs(
  rows: PlanningValueRow[],
  unitIds: string[],
  year: number,
  now = new Date(),
): { write: SalesOtherRepairCell[]; alreadyZero: number; skippedOpenMonths: number } {
  const write: SalesOtherRepairCell[] = []
  let alreadyZero = 0
  let skippedOpenMonths = 0

  for (const storeId of unitIds) {
    const storeRows = rows.filter(row => row.loja_id === storeId)
    const otherCode = storeRows.find(row => OTHER_KEYS.has(rowCode(row)))?.indicator_code ?? OTHER_CODE

    for (let month = 1; month <= 12; month += 1) {
      if (!isActualMonthClosed(month - 1, year, now)) {
        skippedOpenMonths += 1
        continue
      }

      const monthRows = storeRows.filter(row => row.month === month)
      const other = monthRows.find(row => OTHER_KEYS.has(rowCode(row)))
      const channelsPresent = monthRows.some(row => CHANNEL_KEYS.has(rowCode(row)) && row.realizado != null)
      if (!channelsPresent) continue

      if (other?.realizado === 0) {
        alreadyZero += 1
        continue
      }
      if (other?.realizado != null) continue

      write.push({ storeId, month, indicatorCode: otherCode })
    }
  }

  return { write, alreadyZero, skippedOpenMonths }
}

export async function repairOwnerStrategicPlanData(input: {
  clientAccountId?: string | null
  storeId?: string | null
  strategicPlanVersionId?: string | null
  referenceYear: number
  now?: Date
  persist?: boolean
  values?: PlanningValueRow[]
  unitIds?: string[]
}): Promise<RepairOwnerPlanResult> {
  let clientAccountId = input.clientAccountId ?? null
  if (!clientAccountId && input.storeId) {
    const found = await fetchClientOfStore(input.storeId)
    clientAccountId = found.clientId
  }

  let unitIds = input.unitIds ?? []
  let rows = input.values ?? []

  if (clientAccountId && (!input.unitIds || !input.values)) {
    const units = await fetchClientUnits(clientAccountId)
    unitIds = units.units.filter(unit => unit.active).map(unit => unit.id)
    const loaded = await fetchUnitsPlanningValues(unitIds, input.referenceYear)
    rows = loaded.rows
  }

  const planned = planSalesOtherRepairs(rows, unitIds, input.referenceYear, input.now)
  const cellsWritten: SalesOtherRepairCell[] = []

  if (input.persist !== false) {
    const byStore = new Map<string, SalesOtherRepairCell[]>()
    for (const cell of planned.write) {
      const list = byStore.get(cell.storeId) ?? []
      list.push(cell)
      byStore.set(cell.storeId, list)
    }

    for (const [storeId, cells] of byStore) {
      const code = cells[0].indicatorCode
      const current = Array.from({ length: 12 }, (_, index) => {
        const month = index + 1
        const row = rows.find(item => item.loja_id === storeId && item.month === month && OTHER_KEYS.has(rowCode(item)))
        return row?.realizado ?? null
      })
      const next = [...current]
      for (const cell of cells) next[cell.month - 1] = 0
      if (next.every((value, index) => value === current[index])) continue

      const result = await saveIndicatorActuals({
        lojaId: storeId,
        indicatorCode: code,
        year: input.referenceYear,
        values: next,
        source: 'sistema',
        note: 'repairOwnerStrategicPlanData',
      })
      if (!result.error) cellsWritten.push(...cells)
    }

    if (cellsWritten.length) invalidateOwnerStrategicPlanCaches()
  } else {
    cellsWritten.push(...planned.write)
  }

  return {
    clientAccountId,
    referenceYear: input.referenceYear,
    cellsWritten,
    alreadyZero: planned.alreadyZero,
    skippedOpenMonths: planned.skippedOpenMonths,
  }
}
