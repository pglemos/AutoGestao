/**
 * Serviço de Deduplicação de Clientes do Mentor Comercial (TASK 22).
 *
 * Responsável por evitar duplicidades de cadastro de clientes seguindo regras
 * determinísticas e conservadoras.
 *
 * Ordem de busca ao criar/avaliar cliente novo:
 * 1. Telefone normalizado
 * 2. WhatsApp
 * 3. Email
 * 4. Nome + telefone parcial — SOMENTE como confirmação, NUNCA como decisão isolada
 *
 * Regras Duras:
 * - PROIBIDO merge fuzzy destrutivo.
 * - PROIBIDO mesclar automaticamente por nome parecido.
 * - Duplicidade histórica suspeita é REPORTADA, não resolvida.
 * - Nada é apagado nesta implementação.
 * - Nomes parecidos com telefones diferentes NÃO casam.
 * - Mesmo telefone em lojas diferentes exige confirmação humana.
 */

export type ClientRecord = {
  id?: string
  nome?: string | null
  name?: string | null
  telefone?: string | null
  telefone_normalizado?: string | null
  telefoneNormalizado?: string | null
  phone?: string | null
  whatsapp?: string | null
  whats_app?: string | null
  whatsApp?: string | null
  email?: string | null
  e_mail?: string | null
  loja_id?: string | null
  lojaId?: string | null
  store_id?: string | null
  storeId?: string | null
  [key: string]: unknown
}

export type DeduplicationConfidence = 'exact' | 'high' | 'medium' | 'low' | 'none'

export type DeduplicationMatchBy =
  | 'phone'
  | 'whatsapp'
  | 'email'
  | 'name_and_partial_phone'

export type DeduplicationResult<T = ClientRecord> = {
  match: T | null
  confidence: DeduplicationConfidence
  requiresHumanConfirmation: boolean
  matchedBy: DeduplicationMatchBy | null
  reason: string | null
}

export type HistoricalDuplicateReport<T = ClientRecord> = {
  clientA: T
  clientB: T
  reason: string
  confidence: DeduplicationConfidence
  requiresHumanConfirmation: boolean
  matchedBy: DeduplicationMatchBy
}

/**
 * Normaliza número de telefone removendo pontuação e DDI nacional (55) quando aplicável.
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')
  // Se tiver 12 ou 13 dígitos e começar com 55 (código DDI do Brasil), remove o DDI 55
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  return digits
}

/**
 * Normaliza email para caixa baixa e remove espaços nas pontas.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return ''
  return email.trim().toLowerCase()
}

/**
 * Normaliza nome removendo acentos, pontuação e múltiplos espaços.
 */
export function normalizeName(name?: string | null): string {
  if (!name) return ''
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Extrai o ID da loja do objeto de cliente.
 */
export function getClientStoreId(client: ClientRecord): string | null {
  const store = client.loja_id ?? client.lojaId ?? client.store_id ?? client.storeId
  return store ? String(store) : null
}

/**
 * Extrai o telefone normalizado do cliente.
 */
export function getClientPhone(client: ClientRecord): string {
  return normalizePhone(
    client.telefone ??
      client.telefone_normalizado ??
      client.telefoneNormalizado ??
      (client.phone as string | null | undefined),
  )
}

/**
 * Extrai o WhatsApp normalizado do cliente.
 */
export function getClientWhatsapp(client: ClientRecord): string {
  return normalizePhone(
    client.whatsapp ?? client.whats_app ?? (client.whatsApp as string | null | undefined),
  )
}

/**
 * Extrai o email normalizado do cliente.
 */
export function getClientEmail(client: ClientRecord): string {
  return normalizeEmail(client.email ?? (client.e_mail as string | null | undefined))
}

/**
 * Extrai o nome normalizado do cliente.
 */
export function getClientName(client: ClientRecord): string {
  return normalizeName(client.nome ?? (client.name as string | null | undefined))
}

/**
 * Verifica se há match de telefone parcial (ex.: número sem DDD ou sufixo comum de 8/9 dígitos).
 */
export function isPartialPhoneMatch(phoneA?: string | null, phoneB?: string | null): boolean {
  const pA = normalizePhone(phoneA)
  const pB = normalizePhone(phoneB)
  if (!pA || !pB) return false

  // Se ambos são telefones completos (>= 10 dígitos) e são diferentes, NÃO é match parcial.
  if (pA.length >= 10 && pB.length >= 10 && pA !== pB) {
    return false
  }

  // Pelo menos 8 dígitos coincidentes no final (ex: número local)
  const minLength = Math.min(pA.length, pB.length)
  if (minLength < 8) return false

  return pA.endsWith(pB) || pB.endsWith(pA)
}

/**
 * Avalia similaridade de nomes (ex: "João Silva" vs "João da Silva").
 */
export function areNamesSimilar(nameA?: string | null, nameB?: string | null): boolean {
  const nA = normalizeName(nameA)
  const nB = normalizeName(nameB)
  if (!nA || !nB) return false
  if (nA === nB) return true

  const wordsA = nA.split(' ').filter((w) => w.length > 1 && !['da', 'de', 'do', 'dos', 'das', 'e'].includes(w))
  const wordsB = nB.split(' ').filter((w) => w.length > 1 && !['da', 'de', 'do', 'dos', 'das', 'e'].includes(w))

  if (wordsA.length === 0 || wordsB.length === 0) return false

  const commonWords = wordsA.filter((w) => wordsB.includes(w))
  const minWords = Math.min(wordsA.length, wordsB.length)

  // Se compartilham pelo menos 2 palavras relevantes ou todas as palavras do nome mais curto
  if (commonWords.length >= 2) return true
  if (minWords > 0 && commonWords.length / minWords >= 0.7) return true

  return false
}

/**
 * Busca por duplicidade ao criar/avaliar um cliente novo contra uma lista de existentes.
 */
export function findClientMatch<T extends ClientRecord = ClientRecord>(
  newClient: T,
  existingClients: T[],
): DeduplicationResult<T> {
  const newStoreId = getClientStoreId(newClient)
  const newPhone = getClientPhone(newClient)
  const newWhatsapp = getClientWhatsapp(newClient)
  const newEmail = getClientEmail(newClient)
  const newName = getClientName(newClient)

  // 1. Busca por Telefone Normalizado
  if (newPhone) {
    const matchedByPhone = existingClients.find((c) => {
      const existingPhone = getClientPhone(c)
      return existingPhone !== '' && existingPhone === newPhone
    })

    if (matchedByPhone) {
      const existingStoreId = getClientStoreId(matchedByPhone)
      const isDifferentStore =
        newStoreId !== null && existingStoreId !== null && newStoreId !== existingStoreId

      return {
        match: matchedByPhone,
        confidence: isDifferentStore ? 'high' : 'exact',
        requiresHumanConfirmation: isDifferentStore,
        matchedBy: 'phone',
        reason: isDifferentStore
          ? 'Mesmo telefone em lojas diferentes exige confirmação humana.'
          : 'Coincidência exata de telefone normalizado na mesma loja.',
      }
    }
  }

  // 2. Busca por WhatsApp
  if (newWhatsapp) {
    const matchedByWa = existingClients.find((c) => {
      const existingWa = getClientWhatsapp(c)
      const existingPhone = getClientPhone(c)
      return (
        (existingWa !== '' && existingWa === newWhatsapp) ||
        (existingPhone !== '' && existingPhone === newWhatsapp)
      )
    })

    if (matchedByWa) {
      const existingStoreId = getClientStoreId(matchedByWa)
      const isDifferentStore =
        newStoreId !== null && existingStoreId !== null && newStoreId !== existingStoreId

      return {
        match: matchedByWa,
        confidence: isDifferentStore ? 'high' : 'exact',
        requiresHumanConfirmation: isDifferentStore,
        matchedBy: 'whatsapp',
        reason: isDifferentStore
          ? 'Mesmo WhatsApp em lojas diferentes exige confirmação humana.'
          : 'Coincidência exata de WhatsApp na mesma loja.',
      }
    }
  }

  // 3. Busca por Email
  if (newEmail) {
    const matchedByEmail = existingClients.find((c) => {
      const existingEmail = getClientEmail(c)
      return existingEmail !== '' && existingEmail === newEmail
    })

    if (matchedByEmail) {
      const existingStoreId = getClientStoreId(matchedByEmail)
      const isDifferentStore =
        newStoreId !== null && existingStoreId !== null && newStoreId !== existingStoreId

      return {
        match: matchedByEmail,
        confidence: isDifferentStore ? 'high' : 'exact',
        requiresHumanConfirmation: isDifferentStore,
        matchedBy: 'email',
        reason: isDifferentStore
          ? 'Mesmo email em lojas diferentes exige confirmação humana.'
          : 'Coincidência exata de email na mesma loja.',
      }
    }
  }

  // 4. Nome + Telefone parcial — SOMENTE como confirmação, nunca como decisão isolada
  // ATENÇÃO: Nomes parecidos com telefones diferentes NÃO casam.
  if (newName) {
    const matchedByNameAndPartialPhone = existingClients.find((c) => {
      const existingName = getClientName(c)
      const existingPhone = getClientPhone(c)
      const existingWa = getClientWhatsapp(c)

      const namesMatch = areNamesSimilar(newName, existingName)
      if (!namesMatch) return false

      const hasPartialPhoneMatch =
        isPartialPhoneMatch(newPhone, existingPhone) ||
        isPartialPhoneMatch(newPhone, existingWa) ||
        isPartialPhoneMatch(newWhatsapp, existingPhone)

      return hasPartialPhoneMatch
    })

    if (matchedByNameAndPartialPhone) {
      return {
        match: matchedByNameAndPartialPhone,
        confidence: 'medium',
        requiresHumanConfirmation: true,
        matchedBy: 'name_and_partial_phone',
        reason: 'Coincidência de nome com telefone parcial. Exige confirmação humana.',
      }
    }
  }

  // Nenhum match encontrado
  return {
    match: null,
    confidence: 'none',
    requiresHumanConfirmation: false,
    matchedBy: null,
    reason: null,
  }
}

/**
 * Examina um catálogo existente de clientes e reporta duplicidades históricas suspeitas.
 * NADA é alterado ou apagado.
 */
export function findHistoricalDuplicates<T extends ClientRecord = ClientRecord>(
  clients: T[],
): HistoricalDuplicateReport<T>[] {
  const reports: HistoricalDuplicateReport<T>[] = []
  const seenPairs = new Set<string>()

  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const clientA = clients[i]
      const clientB = clients[j]

      const idA = String(clientA.id ?? i)
      const idB = String(clientB.id ?? j)
      const pairKey = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`

      if (seenPairs.has(pairKey)) continue
      seenPairs.add(pairKey)

      const res = findClientMatch(clientA, [clientB])
      if (res.match && res.matchedBy) {
        reports.push({
          clientA,
          clientB,
          reason: res.reason ?? 'Duplicidade histórica detectada',
          confidence: res.confidence,
          requiresHumanConfirmation: res.requiresHumanConfirmation,
          matchedBy: res.matchedBy,
        })
      }
    }
  }

  return reports
}
