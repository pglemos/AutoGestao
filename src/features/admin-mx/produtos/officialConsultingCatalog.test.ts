import { describe, expect, test } from 'bun:test'
import type { ConsultingProduct } from './consultingProducts'
import {
  formatPresenciaisRange,
  isLegacyConsultingProductKey,
  isOfficialConsultingProductKey,
  OFFICIAL_CONSULTING_PRODUCT_KEYS,
  partitionConsultingCatalog,
  visibleProductActions,
} from './officialConsultingCatalog'

function product(overrides: Partial<ConsultingProduct> & Pick<ConsultingProduct, 'program_key'>): ConsultingProduct {
  return {
    name: overrides.program_key,
    descricao: null,
    modalidade: null,
    status: 'publicado',
    versao: 1,
    total_visits: 12,
    min_presenciais: 0,
    max_presenciais: 0,
    usa_plano_estrategico: true,
    indicator_package_version_id: null,
    evolution_group: 'CONSULTORIA_EVOLUTIVA_PRINCIPAL',
    modality_variant: null,
    change_summary: null,
    effective_from: null,
    active: true,
    published_at: null,
    clients: 0,
    ...overrides,
  }
}

describe('catálogo oficial de consultoria', () => {
  test('expõe exatamente os quatro programas Base44', () => {
    expect(OFFICIAL_CONSULTING_PRODUCT_KEYS).toEqual(['pmr_online', 'pmr_hibrido', 'pmr_plus', 'ppa'])
    expect(isOfficialConsultingProductKey('pmr_hibrido')).toBe(true)
    expect(isOfficialConsultingProductKey('pmr_7')).toBe(false)
    expect(isLegacyConsultingProductKey('pmr_7')).toBe(true)
    expect(isLegacyConsultingProductKey('pmr_online')).toBe(false)
  })

  test('particiona oficial, versões derivadas e legado', () => {
    const rows = [
      product({ program_key: 'pmr_online' }),
      product({ program_key: 'pmr_hibrido' }),
      product({ program_key: 'pmr_7', status: 'arquivado' }),
      product({ program_key: 'pmr_hibrido_v2', status: 'rascunho', versao: 2 }),
      product({ program_key: 'mx_start', status: 'rascunho' }),
    ]
    const partitioned = partitionConsultingCatalog(rows)
    expect(partitioned.official.map(item => item.program_key)).toEqual(['pmr_online', 'pmr_hibrido'])
    expect(partitioned.versionDrafts.map(item => item.program_key)).toEqual(['pmr_hibrido_v2'])
    expect(partitioned.legacy.map(item => item.program_key)).toEqual(['mx_start', 'pmr_7'])
  })

  test('ações visíveis seguem ciclo de vida Base44, sem CRUD genérico', () => {
    expect(visibleProductActions({ status: 'rascunho', clients: 0 }).map(item => item.action)).toEqual([
      'abrir', 'editar', 'enviar_revisao', 'excluir_rascunho',
    ])
    expect(visibleProductActions({ status: 'publicado', clients: 2 }, { requiresNewVersion: true }).map(item => item.label)).toContain('Editar / nova versão')
    expect(visibleProductActions({ status: 'publicado', clients: 2 }).map(item => item.action)).toEqual([
      'abrir', 'editar', 'suspender', 'arquivar', 'nova_versao',
    ])
    expect(visibleProductActions({ status: 'rascunho', clients: 3 }).some(item => item.action === 'excluir_rascunho')).toBe(false)
  })

  test('faixa de presenciais formata mínimo e máximo', () => {
    expect(formatPresenciaisRange({ min_presenciais: 2, max_presenciais: 9 })).toBe('2 a 9')
    expect(formatPresenciaisRange({ min_presenciais: 0, max_presenciais: 0 })).toBe('0')
    expect(formatPresenciaisRange({ min_presenciais: null, max_presenciais: null })).toBe('—')
  })
})
