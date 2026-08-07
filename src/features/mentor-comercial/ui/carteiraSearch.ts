/**
 * Busca determinística para a Carteira do Mentor Comercial (TASK 28 / TAREFA C07).
 *
 * Requisitos:
 * 1. Função pura de busca sobre `CarteiraOportunidade[]`.
 * 2. Busca por: nome (`cliente_nome`), telefone (`cliente_telefone`), WhatsApp (`cliente_whatsapp`),
 *    veículo (`veiculo_interesse`) e placa (`placa_veiculo`).
 * 3. A Carteira Ativa lista SÓ oportunidades ativas que exigem desenvolvimento (sem busca).
 * 4. A BUSCA deve encontrar também as ENCERRADAS (`closed_at` preenchido ou etapa terminal)
 *    e marcá-las claramente como encerradas (`is_encerrada: true`) no resultado.
 * 5. Telefone: casar mesmo com formatação diferente (parênteses, traço, espaço, +55).
 * 6. Nome: insensível a caixa e a acento (buscar "jose" acha "José").
 * 7. Placa: insensível a caixa e a hífen (ABC1D23 acha ABC-1D23).
 */

import { isEtapaTerminal } from '../../../lib/schemas/crm.schema'
import type { CarteiraOportunidade } from './OportunidadeCard'

export type MatchedField = 'nome' | 'telefone' | 'whatsapp' | 'veiculo' | 'placa'

export type CarteiraSearchResultItem = {
  oportunidade: CarteiraOportunidade
  is_encerrada: boolean
  matched_fields: MatchedField[]
}

/**
 * Determina se uma oportunidade está encerrada (closed_at preenchido ou etapa terminal).
 */
export function isOportunidadeEncerrada(op: CarteiraOportunidade): boolean {
  if (op.closed_at !== undefined && op.closed_at !== null) {
    if (typeof op.closed_at === 'string' && op.closed_at.trim() !== '') {
      return true
    }
    if (op.closed_at instanceof Date && !Number.isNaN(op.closed_at.getTime())) {
      return true
    }
  }
  if (op.etapa && isEtapaTerminal(op.etapa)) {
    return true
  }
  return false
}

/**
 * Normaliza texto realizando remoção de acentos e conversão para minúsculas.
 */
export function normalizeText(str?: string | null): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Normaliza número de telefone extraindo apenas os dígitos.
 */
export function normalizeDigits(str?: string | null): string {
  if (!str) return ''
  return str.replace(/\D/g, '')
}

/**
 * Normaliza placa veicular removendo hífens, espaços e caracteres não alfanuméricos e convertendo para minúsculas.
 */
export function normalizePlate(str?: string | null): string {
  if (!str) return ''
  return str.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

/**
 * Verifica se a busca casa com o nome do cliente (insensível a caixa e acento).
 */
export function matchName(name?: string | null, query?: string): boolean {
  if (!name || !query) return false
  return normalizeText(name).includes(normalizeText(query))
}

/**
 * Verifica se a busca casa com telefone ou whatsapp (tolera +55, parênteses, traços, espaços).
 */
export function matchPhone(phone?: string | null, query?: string): boolean {
  if (!phone || !query) return false

  const normPhone = normalizeText(phone)
  const normQuery = normalizeText(query)
  if (normPhone && normQuery && normPhone.includes(normQuery)) return true

  const qDigits = normalizeDigits(query)
  if (!qDigits) return false

  const pDigits = normalizeDigits(phone)
  if (!pDigits) return false

  if (pDigits.includes(qDigits)) return true

  // Trata prefixo internacional (+55 / 55)
  const pNoCountry =
    pDigits.startsWith('55') && (pDigits.length === 12 || pDigits.length === 13)
      ? pDigits.slice(2)
      : pDigits
  const qNoCountry =
    qDigits.startsWith('55') && (qDigits.length === 12 || qDigits.length === 13)
      ? qDigits.slice(2)
      : qDigits

  if (pNoCountry.includes(qDigits)) return true
  if (pDigits.includes(qNoCountry)) return true
  if (pNoCountry.includes(qNoCountry)) return true

  return false
}

/**
 * Verifica se a busca casa com o veículo de interesse (insensível a caixa e acento).
 */
export function matchVehicle(vehicle?: string | null, query?: string): boolean {
  if (!vehicle || !query) return false
  return normalizeText(vehicle).includes(normalizeText(query))
}

/**
 * Verifica se a busca casa com a placa do veículo (insensível a caixa e hífen).
 */
export function matchPlaca(placa?: string | null, query?: string): boolean {
  if (!placa || !query) return false
  const normPlaca = normalizePlate(placa)
  const normQuery = normalizePlate(query)
  if (normPlaca && normQuery && normPlaca.includes(normQuery)) return true
  return normalizeText(placa).includes(normalizeText(query))
}

/**
 * Retorna quais campos da oportunidade casaram com o termo de busca.
 */
export function getMatchedFields(op: CarteiraOportunidade, query: string): MatchedField[] {
  const q = query.trim()
  if (!q) return []
  const matched: MatchedField[] = []

  if (matchName(op.cliente_nome, q)) matched.push('nome')
  if (matchPhone(op.cliente_telefone, q)) matched.push('telefone')
  if (matchPhone(op.cliente_whatsapp, q)) matched.push('whatsapp')
  if (matchVehicle(op.veiculo_interesse, q)) matched.push('veiculo')
  if (matchPlaca(op.placa_veiculo, q)) matched.push('placa')

  return matched
}

/**
 * Verifica se a oportunidade casa com a busca em qualquer um dos 5 campos.
 */
export function matchesCarteiraQuery(op: CarteiraOportunidade, query: string): boolean {
  return getMatchedFields(op, query).length > 0
}

/**
 * Filtra oportunidades ativas que exigem desenvolvimento (sem filtro de busca).
 */
export function getCarteiraAtivaOportunidades(
  oportunidades: CarteiraOportunidade[]
): CarteiraOportunidade[] {
  return oportunidades.filter((op) => !isOportunidadeEncerrada(op))
}

/**
 * Realiza a busca detalhada sobre uma lista de oportunidades.
 *
 * Se a busca estiver vazia:
 *   - Retorna APENAS as oportunidades ativas (não encerradas).
 * Se houver termo de busca:
 *   - Busca em TODAS as oportunidades (ativas e encerradas).
 *   - Marca cada resultado com `is_encerrada`.
 */
export function searchCarteira(
  oportunidades: CarteiraOportunidade[],
  query: string
): CarteiraSearchResultItem[] {
  const q = query.trim()

  if (!q) {
    return oportunidades
      .filter((op) => !isOportunidadeEncerrada(op))
      .map((op) => ({
        oportunidade: op,
        is_encerrada: false,
        matched_fields: [],
      }))
  }

  const results: CarteiraSearchResultItem[] = []

  for (const op of oportunidades) {
    const matchedFields = getMatchedFields(op, q)
    if (matchedFields.length > 0) {
      results.push({
        oportunidade: op,
        is_encerrada: isOportunidadeEncerrada(op),
        matched_fields: matchedFields,
      })
    }
  }

  return results
}

/**
 * Função pura conveniente que retorna a lista filtrada de `CarteiraOportunidade`.
 * - Sem busca: apenas ativas.
 * - Com busca: ativas e encerradas que casarem com o termo.
 */
export function filterCarteiraOportunidades(
  oportunidades: CarteiraOportunidade[],
  query: string
): CarteiraOportunidade[] {
  return searchCarteira(oportunidades, query).map((res) => res.oportunidade)
}
