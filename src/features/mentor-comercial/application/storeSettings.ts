/**
 * Configuração Comercial da Loja — Mentor Comercial (TASK 19 / TAREFA C08).
 *
 * Módulo determinístico para leitura, normalização, defaults seguros e validação
 * das configurações comerciais de loja (`store_commercial_settings`).
 *
 * Regras Duras:
 * - Defaults SEGUROS: todo processo opcional nasce DESLIGADO (false).
 *   Nunca habilite automaticamente entrega, pós-venda, garantia, D7, D30, D180 ou troca programada.
 * - `sellerResponseSlaMinutes = null` significa NÃO CONFIGURADO. Nunca vira 30.
 *   Nunca penaliza score. A função devolve o aviso legível "SLA de resposta ainda não configurado".
 * - Loja sem linha na tabela recebe os defaults seguros, sem lançar erro.
 */

import type { StoreSettings } from '../engine/engine'

export const SLA_NOT_CONFIGURED_NOTICE = 'SLA de resposta ainda não configurado'

/**
 * Estrutura completa de configurações comerciais de uma loja.
 * Estende `StoreSettings` do motor determinístico.
 */
export type StoreCommercialSettings = StoreSettings & {
  storeId: string | null
  timezone: string
  businessDays: number[]
  sellerResponseSlaMinutes: number | null
  internalVerificationBusinessDays: number | null
  sellerHandlesDelivery: boolean
  postSaleEnabled: boolean
  warrantyFollowupEnabled: boolean
  postSaleD7Enabled: boolean
  postSaleD30Enabled: boolean
  postSaleD180Enabled: boolean
  exchange12MonthsEnabled: boolean
  exchange18MonthsEnabled: boolean
  exchange24MonthsEnabled: boolean
}

/**
 * Defaults seguros para loja sem configurações cadastradas.
 * Todo processo opcional é explicitamente DESLIGADO (false).
 */
export const DEFAULT_STORE_COMMERCIAL_SETTINGS: Readonly<StoreCommercialSettings> = Object.freeze({
  storeId: null,
  timezone: 'America/Sao_Paulo',
  businessDays: [1, 2, 3, 4, 5, 6],
  sellerResponseSlaMinutes: null,
  internalVerificationBusinessDays: null,
  sellerHandlesDelivery: false,
  postSaleEnabled: false,
  warrantyFollowupEnabled: false,
  postSaleD7Enabled: false,
  postSaleD30Enabled: false,
  postSaleD180Enabled: false,
  exchange12MonthsEnabled: false,
  exchange18MonthsEnabled: false,
  exchange24MonthsEnabled: false,
})

export type StoreSettingsValidationError = {
  field: string
  message: string
}

export type StoreSettingsValidationWarning = {
  field: string
  message: string
}

export type StoreSettingsValidationResult = {
  isValid: boolean
  errors: StoreSettingsValidationError[]
  warnings: StoreSettingsValidationWarning[]
  notice: string | null
}

/**
 * Retorna uma cópia dos defaults seguros para uma loja.
 *
 * @param storeId Identificador opcional da loja.
 */
export function getDefaultStoreCommercialSettings(storeId?: string | null): StoreCommercialSettings {
  return {
    ...DEFAULT_STORE_COMMERCIAL_SETTINGS,
    storeId: storeId ?? null,
    businessDays: [...DEFAULT_STORE_COMMERCIAL_SETTINGS.businessDays],
  }
}

/**
 * Retorna o aviso legível sobre a situação do SLA de resposta do vendedor.
 *
 * @param sellerResponseSlaMinutes Minutos de SLA configurados ou null/undefined.
 */
export function getSlaNotice(sellerResponseSlaMinutes: number | null | undefined): string {
  if (
    sellerResponseSlaMinutes === null ||
    sellerResponseSlaMinutes === undefined ||
    typeof sellerResponseSlaMinutes !== 'number' ||
    Number.isNaN(sellerResponseSlaMinutes) ||
    sellerResponseSlaMinutes <= 0
  ) {
    return SLA_NOT_CONFIGURED_NOTICE
  }
  return `SLA de resposta configurado em ${sellerResponseSlaMinutes} minutos`
}

/**
 * Converte/normaliza um registro bruto (do banco Supabase ou parcial JS)
 * para um objeto `StoreCommercialSettings` completo com defaults seguros.
 *
 * @param raw Objeto bruto vindo da tabela `store_commercial_settings` ou input parcial.
 * @param fallbackStoreId ID da loja caso não esteja presente no objeto bruto.
 */
export function parseStoreCommercialSettings(
  raw?: Record<string, unknown> | null,
  fallbackStoreId?: string | null
): StoreCommercialSettings {
  if (!raw || typeof raw !== 'object') {
    return getDefaultStoreCommercialSettings(fallbackStoreId)
  }

  const defaults = getDefaultStoreCommercialSettings(fallbackStoreId)

  const storeIdRaw = raw.storeId ?? raw.lojaId ?? raw.loja_id ?? fallbackStoreId ?? null
  const storeId = typeof storeIdRaw === 'string' && storeIdRaw.trim().length > 0 ? storeIdRaw.trim() : null

  const timezoneRaw = raw.timezone
  const timezone = typeof timezoneRaw === 'string' && timezoneRaw.trim().length > 0 ? timezoneRaw.trim() : defaults.timezone

  let businessDays = defaults.businessDays
  const daysRaw = raw.businessDays ?? raw.business_days
  if (Array.isArray(daysRaw)) {
    const parsedDays = daysRaw
      .map((d) => (typeof d === 'number' ? Math.floor(d) : parseInt(String(d), 10)))
      .filter((d) => !Number.isNaN(d) && d >= 0 && d <= 7)
    if (parsedDays.length > 0) {
      businessDays = Array.from(new Set(parsedDays)).sort((a, b) => a - b)
    }
  }

  const slaRaw = raw.sellerResponseSlaMinutes ?? raw.seller_response_sla_minutes
  let sellerResponseSlaMinutes: number | null = null
  if (typeof slaRaw === 'number' && !Number.isNaN(slaRaw) && slaRaw > 0) {
    sellerResponseSlaMinutes = Math.floor(slaRaw)
  } else if (typeof slaRaw === 'string') {
    const parsed = parseInt(slaRaw, 10)
    if (!Number.isNaN(parsed) && parsed > 0) {
      sellerResponseSlaMinutes = parsed
    }
  }

  const internalVerificationRaw = raw.internalVerificationBusinessDays ?? raw.internal_verification_business_days
  let internalVerificationBusinessDays: number | null = null
  if (typeof internalVerificationRaw === 'number' && !Number.isNaN(internalVerificationRaw) && internalVerificationRaw >= 0) {
    internalVerificationBusinessDays = Math.floor(internalVerificationRaw)
  } else if (typeof internalVerificationRaw === 'string') {
    const parsed = parseInt(internalVerificationRaw, 10)
    if (!Number.isNaN(parsed) && parsed >= 0) {
      internalVerificationBusinessDays = parsed
    }
  }

  const parseBool = (camelKey: string, snakeKey: string): boolean => {
    return raw[camelKey] === true || raw[snakeKey] === true
  }

  return {
    storeId,
    timezone,
    businessDays,
    sellerResponseSlaMinutes,
    internalVerificationBusinessDays,
    sellerHandlesDelivery: parseBool('sellerHandlesDelivery', 'seller_handles_delivery'),
    postSaleEnabled: parseBool('postSaleEnabled', 'post_sale_enabled'),
    warrantyFollowupEnabled: parseBool('warrantyFollowupEnabled', 'warranty_followup_enabled'),
    postSaleD7Enabled: parseBool('postSaleD7Enabled', 'post_sale_d7_enabled'),
    postSaleD30Enabled: parseBool('postSaleD30Enabled', 'post_sale_d30_enabled'),
    postSaleD180Enabled: parseBool('postSaleD180Enabled', 'post_sale_d180_enabled'),
    exchange12MonthsEnabled: parseBool('exchange12MonthsEnabled', 'exchange_12_months_enabled'),
    exchange18MonthsEnabled: parseBool('exchange18MonthsEnabled', 'exchange_18_months_enabled'),
    exchange24MonthsEnabled: parseBool('exchange24MonthsEnabled', 'exchange_24_months_enabled'),
  }
}

/**
 * Valida um conjunto de configurações comerciais de loja.
 *
 * @param settings Configurações a serem validadas.
 */
export function validateStoreCommercialSettings(
  settings: Partial<StoreCommercialSettings>
): StoreSettingsValidationResult {
  const errors: StoreSettingsValidationError[] = []
  const warnings: StoreSettingsValidationWarning[] = []

  const sla = settings.sellerResponseSlaMinutes
  if (sla === null || sla === undefined) {
    warnings.push({
      field: 'sellerResponseSlaMinutes',
      message: SLA_NOT_CONFIGURED_NOTICE,
    })
  } else if (typeof sla !== 'number' || Number.isNaN(sla) || sla <= 0 || !Number.isInteger(sla)) {
    errors.push({
      field: 'sellerResponseSlaMinutes',
      message: 'SLA de resposta deve ser um número inteiro positivo de minutos ou nulo.',
    })
  }

  if (settings.timezone !== undefined) {
    if (typeof settings.timezone !== 'string' || settings.timezone.trim().length === 0) {
      errors.push({
        field: 'timezone',
        message: 'Fuso horário (timezone) inválido.',
      })
    }
  }

  if (settings.businessDays !== undefined) {
    if (!Array.isArray(settings.businessDays) || settings.businessDays.length === 0) {
      errors.push({
        field: 'businessDays',
        message: 'A lista de dias úteis da loja não pode ser vazia.',
      })
    } else {
      const invalidDays = settings.businessDays.filter(
        (d) => typeof d !== 'number' || !Number.isInteger(d) || d < 0 || d > 7
      )
      if (invalidDays.length > 0) {
        errors.push({
          field: 'businessDays',
          message: 'Dias úteis devem conter inteiros válidos de 0 a 7.',
        })
      }
    }
  }

  const internalDays = settings.internalVerificationBusinessDays
  if (internalDays !== null && internalDays !== undefined) {
    if (typeof internalDays !== 'number' || Number.isNaN(internalDays) || internalDays < 0 || !Number.isInteger(internalDays)) {
      errors.push({
        field: 'internalVerificationBusinessDays',
        message: 'Dias para verificação interna devem ser um número inteiro não negativo.',
      })
    }
  }

  const notice = getSlaNotice(sla)

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    notice,
  }
}

/**
 * Converte o objeto de domínio camelCase para a estrutura snake_case do banco de dados Supabase.
 *
 * @param settings Configurações no formato de domínio.
 */
export function toDatabaseRecord(settings: Partial<StoreCommercialSettings>): Record<string, unknown> {
  const payload: Record<string, unknown> = {}

  if (settings.storeId !== undefined) payload.loja_id = settings.storeId
  if (settings.timezone !== undefined) payload.timezone = settings.timezone
  if (settings.businessDays !== undefined) payload.business_days = settings.businessDays
  if (settings.sellerResponseSlaMinutes !== undefined) payload.seller_response_sla_minutes = settings.sellerResponseSlaMinutes
  if (settings.internalVerificationBusinessDays !== undefined) payload.internal_verification_business_days = settings.internalVerificationBusinessDays
  if (settings.sellerHandlesDelivery !== undefined) payload.seller_handles_delivery = settings.sellerHandlesDelivery
  if (settings.postSaleEnabled !== undefined) payload.post_sale_enabled = settings.postSaleEnabled
  if (settings.warrantyFollowupEnabled !== undefined) payload.warranty_followup_enabled = settings.warrantyFollowupEnabled
  if (settings.postSaleD7Enabled !== undefined) payload.post_sale_d7_enabled = settings.postSaleD7Enabled
  if (settings.postSaleD30Enabled !== undefined) payload.post_sale_d30_enabled = settings.postSaleD30Enabled
  if (settings.postSaleD180Enabled !== undefined) payload.post_sale_d180_enabled = settings.postSaleD180Enabled
  if (settings.exchange12MonthsEnabled !== undefined) payload.exchange_12_months_enabled = settings.exchange12MonthsEnabled
  if (settings.exchange18MonthsEnabled !== undefined) payload.exchange_18_months_enabled = settings.exchange18MonthsEnabled
  if (settings.exchange24MonthsEnabled !== undefined) payload.exchange_24_months_enabled = settings.exchange24MonthsEnabled

  return payload
}
