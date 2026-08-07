/**
 * Testes Unitários de Configuração Comercial da Loja (TASK 19 / TAREFA C08).
 *
 * Valida os requisitos do contrato comum:
 * 1. Defaults SEGUROS: cada flag opcional é false por padrão.
 * 2. SLA nulo NÃO vira número (nunca vira 30) e devolve o aviso legível.
 * 3. Loja inexistente (sem linha no banco) recebe defaults seguros sem erro.
 */

import { describe, expect, test } from 'bun:test'
import {
  DEFAULT_STORE_COMMERCIAL_SETTINGS,
  SLA_NOT_CONFIGURED_NOTICE,
  getDefaultStoreCommercialSettings,
  getSlaNotice,
  parseStoreCommercialSettings,
  toDatabaseRecord,
  validateStoreCommercialSettings,
} from './storeSettings'

describe('storeSettings — Configuração Comercial da Loja (TASK 19)', () => {
  describe('getDefaultStoreCommercialSettings', () => {
    test('cada flag opcional é false por padrão nos defaults seguros', () => {
      const defaults = getDefaultStoreCommercialSettings('loja-123')

      expect(defaults.storeId).toBe('loja-123')
      expect(defaults.sellerHandlesDelivery).toBe(false)
      expect(defaults.postSaleEnabled).toBe(false)
      expect(defaults.warrantyFollowupEnabled).toBe(false)
      expect(defaults.postSaleD7Enabled).toBe(false)
      expect(defaults.postSaleD30Enabled).toBe(false)
      expect(defaults.postSaleD180Enabled).toBe(false)
      expect(defaults.exchange12MonthsEnabled).toBe(false)
      expect(defaults.exchange18MonthsEnabled).toBe(false)
      expect(defaults.exchange24MonthsEnabled).toBe(false)
    })

    test('SLA nulo não vira número nos defaults seguros', () => {
      const defaults = getDefaultStoreCommercialSettings()

      expect(defaults.sellerResponseSlaMinutes).toBeNull()
      expect(defaults.internalVerificationBusinessDays).toBeNull()
      expect(defaults.timezone).toBe('America/Sao_Paulo')
      expect(defaults.businessDays).toEqual([1, 2, 3, 4, 5, 6])
    })

    test('loja inexistente (sem parâmetro de id) devolve defaults com storeId null sem erro', () => {
      const defaults = getDefaultStoreCommercialSettings()
      expect(defaults).toEqual({
        ...DEFAULT_STORE_COMMERCIAL_SETTINGS,
        storeId: null,
      })
    })
  })

  describe('getSlaNotice', () => {
    test('SLA nulo devolve aviso legível: "SLA de resposta ainda não configurado"', () => {
      expect(getSlaNotice(null)).toBe(SLA_NOT_CONFIGURED_NOTICE)
      expect(getSlaNotice(undefined)).toBe(SLA_NOT_CONFIGURED_NOTICE)
    })

    test('SLA numérico <= 0 ou NaN devolve aviso legível de não configurado', () => {
      expect(getSlaNotice(0)).toBe(SLA_NOT_CONFIGURED_NOTICE)
      expect(getSlaNotice(-10)).toBe(SLA_NOT_CONFIGURED_NOTICE)
      expect(getSlaNotice(NaN)).toBe(SLA_NOT_CONFIGURED_NOTICE)
    })

    test('SLA válido devolve mensagem com valor em minutos', () => {
      expect(getSlaNotice(30)).toBe('SLA de resposta configurado em 30 minutos')
      expect(getSlaNotice(15)).toBe('SLA de resposta configurado em 15 minutos')
    })
  })

  describe('parseStoreCommercialSettings', () => {
    test('loja sem linha na tabela (null ou undefined) recebe os defaults seguros', () => {
      const fromNull = parseStoreCommercialSettings(null, 'loja-404')
      expect(fromNull.storeId).toBe('loja-404')
      expect(fromNull.sellerResponseSlaMinutes).toBeNull()
      expect(fromNull.sellerHandlesDelivery).toBe(false)
      expect(fromNull.postSaleEnabled).toBe(false)

      const fromUndefined = parseStoreCommercialSettings(undefined)
      expect(fromUndefined.storeId).toBeNull()
      expect(fromUndefined.sellerResponseSlaMinutes).toBeNull()
    })

    test('SLA nulo em linha do Supabase não vira 30', () => {
      const rawDbRow = {
        loja_id: 'loja-555',
        timezone: 'America/Sao_Paulo',
        business_days: [1, 2, 3, 4, 5],
        seller_response_sla_minutes: null,
        seller_handles_delivery: false,
        post_sale_enabled: false,
      }

      const settings = parseStoreCommercialSettings(rawDbRow)
      expect(settings.sellerResponseSlaMinutes).toBeNull()
      expect(settings.sellerResponseSlaMinutes).not.toBe(30)
    })

    test('parseia corretamente linha do Supabase em snake_case', () => {
      const rawDbRow = {
        loja_id: 'loja-777',
        timezone: 'America/Manaus',
        business_days: [1, 2, 3, 4, 5],
        seller_response_sla_minutes: 45,
        internal_verification_business_days: 2,
        seller_handles_delivery: true,
        post_sale_enabled: true,
        warranty_followup_enabled: true,
        post_sale_d7_enabled: true,
        post_sale_d30_enabled: false,
        post_sale_d180_enabled: false,
        exchange_12_months_enabled: true,
        exchange_18_months_enabled: false,
        exchange_24_months_enabled: false,
      }

      const settings = parseStoreCommercialSettings(rawDbRow)

      expect(settings.storeId).toBe('loja-777')
      expect(settings.timezone).toBe('America/Manaus')
      expect(settings.businessDays).toEqual([1, 2, 3, 4, 5])
      expect(settings.sellerResponseSlaMinutes).toBe(45)
      expect(settings.internalVerificationBusinessDays).toBe(2)
      expect(settings.sellerHandlesDelivery).toBe(true)
      expect(settings.postSaleEnabled).toBe(true)
      expect(settings.warrantyFollowupEnabled).toBe(true)
      expect(settings.postSaleD7Enabled).toBe(true)
      expect(settings.postSaleD30Enabled).toBe(false)
      expect(settings.exchange12MonthsEnabled).toBe(true)
    })

    test('garante que flags opcionais não viram true com valores falsy ou estranhos', () => {
      const rawDbRow = {
        loja_id: 'loja-888',
        seller_handles_delivery: 'sim', // string não é boolean true
        post_sale_enabled: 1, // number não é boolean true
        warranty_followup_enabled: null,
      }

      const settings = parseStoreCommercialSettings(rawDbRow as Record<string, unknown>)

      expect(settings.sellerHandlesDelivery).toBe(false)
      expect(settings.postSaleEnabled).toBe(false)
      expect(settings.warrantyFollowupEnabled).toBe(false)
    })
  })

  describe('validateStoreCommercialSettings', () => {
    test('emite aviso quando SLA é nulo e mantém resultado válido', () => {
      const result = validateStoreCommercialSettings({
        sellerResponseSlaMinutes: null,
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toBe(SLA_NOT_CONFIGURED_NOTICE)
      expect(result.notice).toBe(SLA_NOT_CONFIGURED_NOTICE)
    })

    test('rejeita SLA numérico inválido (<= 0 ou não inteiro)', () => {
      const invalidZero = validateStoreCommercialSettings({ sellerResponseSlaMinutes: 0 })
      expect(invalidZero.isValid).toBe(false)
      expect(invalidZero.errors[0].field).toBe('sellerResponseSlaMinutes')

      const invalidFloat = validateStoreCommercialSettings({ sellerResponseSlaMinutes: 12.5 })
      expect(invalidFloat.isValid).toBe(false)
    })

    test('rejeita timezone vazio ou dias úteis inválidos', () => {
      const invalidTz = validateStoreCommercialSettings({ timezone: '' })
      expect(invalidTz.isValid).toBe(false)

      const emptyDays = validateStoreCommercialSettings({ businessDays: [] })
      expect(emptyDays.isValid).toBe(false)
    })
  })

  describe('toDatabaseRecord', () => {
    test('mapeia campos camelCase para a estrutura snake_case do banco', () => {
      const settings = getDefaultStoreCommercialSettings('loja-999')
      settings.sellerResponseSlaMinutes = 30
      settings.postSaleEnabled = true

      const dbRecord = toDatabaseRecord(settings)

      expect(dbRecord.loja_id).toBe('loja-999')
      expect(dbRecord.seller_response_sla_minutes).toBe(30)
      expect(dbRecord.post_sale_enabled).toBe(true)
      expect(dbRecord.seller_handles_delivery).toBe(false)
      expect(dbRecord.post_sale_d7_enabled).toBe(false)
    })
  })
})
