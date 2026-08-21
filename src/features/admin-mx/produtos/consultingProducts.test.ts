import { describe, expect, test } from 'bun:test'
import {
  allowedProductTransitions,
  canDeleteProduct,
  emptyProductDraft,
  encounterTimeStatus,
  nextVersionKey,
  patchProductModule,
  productRequiresNewVersion,
  restoreProductCapabilityDefaults,
  summarizeTimes,
  toggleProductModuleGroup,
  validateProductPublication,
  validateProductDraft,
  type EncounterTime,
  type ProductModule,
} from './consultingProducts'
import { buildDefaultCapabilities } from './capabilityCatalog'

function time(overrides: Partial<EncounterTime> = {}): EncounterTime {
  return { visit_number: 1, horas_online: null, horas_presencial: null, origem: 'manual', observacao: null, ...overrides }
}

describe('produto de consultoria — validação', () => {
  test('cobra chave e nome', () => {
    expect(validateProductDraft(emptyProductDraft())).toBe('Informe a chave do programa.')
    expect(validateProductDraft({ ...emptyProductDraft(), program_key: 'pmr_7' })).toBe('Informe o nome do produto.')
  })

  test('faixa de presenciais precisa caber na jornada', () => {
    const base = { ...emptyProductDraft(), program_key: 'pmr_7', name: 'PMR 7', total_visits: 7 }
    expect(validateProductDraft({ ...base, min_presenciais: 9 })).toBe('Mínimo de presenciais maior que o total de encontros.')
    expect(validateProductDraft({ ...base, max_presenciais: 9 })).toBe('Máximo de presenciais maior que o total de encontros.')
    expect(validateProductDraft({ ...base, min_presenciais: 4, max_presenciais: 2 })).toBe('Máximo de presenciais menor que o mínimo.')
    expect(validateProductDraft({ ...base, min_presenciais: 2, max_presenciais: 4 })).toBeNull()
  })
})

describe('ciclo de vida do produto', () => {
  test('ciclo expõe revisão, publicação, suspensão e arquivamento', () => {
    expect(allowedProductTransitions('rascunho')).toEqual(['em_revisao', 'arquivado'])
    expect(allowedProductTransitions('em_revisao')).toEqual(['rascunho', 'publicado', 'arquivado'])
    expect(allowedProductTransitions('publicado')).toEqual(['suspenso_novas_contratacoes', 'arquivado'])
    expect(allowedProductTransitions('suspenso_novas_contratacoes')).toEqual(['publicado', 'arquivado'])
    expect(allowedProductTransitions('arquivado')).toEqual(['rascunho'])
  })

  test('só exclui rascunho sem cliente', () => {
    expect(canDeleteProduct({ status: 'rascunho', clients: 0 })).toBe(true)
    expect(canDeleteProduct({ status: 'rascunho', clients: 3 })).toBe(false)
    expect(canDeleteProduct({ status: 'publicado', clients: 0 })).toBe(false)
  })

  test('produto publicado exige nova versão para edição', () => {
    expect(productRequiresNewVersion({ status: 'rascunho' })).toBe(false)
    expect(productRequiresNewVersion({ status: 'publicado' })).toBe(true)
    expect(productRequiresNewVersion({ status: 'suspenso_novas_contratacoes' })).toBe(true)
  })

  test('impede dois produtos ativos no mesmo grupo', () => {
    const candidates = [{ program_key: 'pmr_online', evolution_group: 'CONSULTORIA_EVOLUTIVA_PRINCIPAL', modalidade: 'online', status: 'publicado' as const, active: true }]
    expect(validateProductPublication({
      target: { program_key: 'pmr_plus', evolution_group: 'CONSULTORIA_EVOLUTIVA_PRINCIPAL', modalidade: 'presencial' },
      targetStatus: 'publicado',
      currentStatus: 'em_revisao',
      candidates,
    })).toContain('já possui um produto publicado')
    expect(validateProductPublication({
      target: { program_key: 'pmr_plus', evolution_group: 'OUTRO_GRUPO', modalidade: 'presencial' },
      targetStatus: 'publicado',
      currentStatus: 'em_revisao',
      candidates,
    })).toBeNull()
  })

  test('nova versão gera chave sem empilhar sufixo', () => {
    expect(nextVersionKey('pmr_7', 1)).toBe('pmr_7_v2')
    expect(nextVersionKey('pmr_7_v2', 2)).toBe('pmr_7_v3')
  })
})

describe('tempos por encontro', () => {
  test('situação espelha as combinações do Base44', () => {
    expect(encounterTimeStatus(time())).toBe('Pendente')
    expect(encounterTimeStatus(time({ horas_online: 2 }))).toBe('Só Online')
    expect(encounterTimeStatus(time({ horas_presencial: 4 }))).toBe('Só Presencial')
    expect(encounterTimeStatus(time({ horas_online: 2, horas_presencial: 4 }))).toBe('Completo')
  })

  test('resumo soma horas e conta pendências', () => {
    const resumo = summarizeTimes([
      time({ visit_number: 1, horas_online: 2, horas_presencial: 4 }),
      time({ visit_number: 2, horas_online: 1.5 }),
      time({ visit_number: 3 }),
    ])
    expect(resumo).toEqual({ totalOnline: 3.5, totalPresencial: 4, encontros: 3, pendencias: 1 })
  })
})

describe('origem da matriz de capacidades', () => {
  const reference = buildDefaultCapabilities()[0]
  const module = (): ProductModule => ({
    module_key: reference.moduleKey,
    label: reference.label,
    module_code: reference.moduleCode,
    module_label: reference.moduleLabel,
    menu_code: reference.code,
    menu_label: reference.label,
    incluido: true,
    obrigatorio: reference.mandatory,
    etapa: null,
    visibilidade: 'dono',
    release_stage: reference.releaseStage,
    visibility: reference.visibility,
    technical_status: reference.technicalStatus,
    display_order: reference.displayOrder,
    status: 'ATIVO',
    configuration_origin: 'PADRAO_PRODUTO',
  })

  test('marca alteração personalizada e restaura o padrão', () => {
    const customized = patchProductModule(module(), { incluido: false })
    expect(customized.configuration_origin).toBe('PERSONALIZADO_PRODUTO')

    const restored = restoreProductCapabilityDefaults([customized])[0]
    expect(restored).toMatchObject({
      incluido: true,
      obrigatorio: reference.mandatory,
      release_stage: reference.releaseStage,
      visibility: reference.visibility,
      technical_status: reference.technicalStatus,
      configuration_origin: 'PADRAO_PRODUTO',
    })
  })

  test('mantém itens sem referência oficial como personalizados', () => {
    const legacy: ProductModule = {
      ...module(),
      module_key: 'legado__menu_customizado',
      module_code: 'LEGADO',
      module_label: 'Módulos legados',
      menu_code: 'MENU_CUSTOMIZADO',
      menu_label: 'Menu customizado',
      configuration_origin: 'PADRAO_PRODUTO',
    }

    expect(patchProductModule(legacy, { incluido: true }).configuration_origin).toBe('PERSONALIZADO_PRODUTO')
    expect(restoreProductCapabilityDefaults([legacy])[0].configuration_origin).toBe('PERSONALIZADO_PRODUTO')
  })

  test('alterna o grupo sem desligar obrigatórios ou indisponíveis', () => {
    const references = buildDefaultCapabilities().filter(item => item.moduleCode === 'DONO').slice(0, 3)
    const modules = references.map((reference, index): ProductModule => ({
      module_key: reference.moduleKey,
      label: reference.label,
      module_code: reference.moduleCode,
      module_label: reference.moduleLabel,
      menu_code: reference.code,
      menu_label: reference.label,
      incluido: index === 0,
      obrigatorio: index === 0,
      etapa: null,
      visibilidade: 'dono',
      release_stage: reference.releaseStage,
      visibility: reference.visibility,
      technical_status: index === 2 ? 'TEMPORARIAMENTE_INDISPONIVEL' : reference.technicalStatus,
      display_order: reference.displayOrder,
      status: 'ATIVO',
      configuration_origin: 'PADRAO_PRODUTO',
    }))

    const enabled = toggleProductModuleGroup(modules, 'DONO')
    expect(enabled.map(item => item.incluido)).toEqual([true, true, false])

    const disabled = toggleProductModuleGroup(enabled, 'DONO')
    expect(disabled.map(item => item.incluido)).toEqual([true, false, false])

    const lockedOnly = modules.filter(item => item.obrigatorio || item.technical_status === 'TEMPORARIAMENTE_INDISPONIVEL')
    expect(toggleProductModuleGroup(lockedOnly, 'DONO')).toEqual(lockedOnly)
  })
})
