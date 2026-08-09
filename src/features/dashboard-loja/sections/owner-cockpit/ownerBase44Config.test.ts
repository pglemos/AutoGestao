import { describe, expect, test } from 'bun:test'
import {
  OWNER_BASE44_NAVIGATION,
  OWNER_BASE44_SECTION_VALUES,
  OWNER_LEGACY_SECTION_VALUES,
  ownerNavigationCanonicalPath,
  ownerNavigationActivePaths,
  ownerNavigationSectionValue,
  resolveOwnerDepartmentFromPath,
  resolveOwnerLocation,
  resolveOwnerSection,
} from './ownerBase44Config'

describe('contrato do módulo Dono inspirado no Base44', () => {
  const flattenItems = (items: (typeof OWNER_BASE44_NAVIGATION)[number]['items']): typeof items =>
    items.flatMap(item => [item, ...(item.children ? flattenItems(item.children) : [])])

  test('mantém a arquitetura de informação aprovada em cinco grupos', () => {
    expect(OWNER_BASE44_NAVIGATION.map(section => section.label)).toEqual([
      'GESTÃO',
      'ESTRATÉGIA',
      'NEGÓCIO',
      'DESENVOLVIMENTO',
      'AÇÃO GLOBAL',
    ])

    expect(OWNER_BASE44_NAVIGATION.flatMap(section => flattenItems(section.items).map(item => item.label))).toEqual([
      'Início',
      'Rotina do Dia',
      'Central de Decisões',
      'Plano Estratégico',
      'Plano de Ação',
      'Consultoria',
      'Departamentos',
      'Visão Geral',
      'Comercial',
      'Marketing',
      'Produto e Estoque',
      'Pessoas — RH',
      'Financeiro',
      'Operações',
      'Mercado',
      'Universidade MX',
      'Falar com Consultor',
    ])
  })

  test('gera um destino único para cada item de negócio', () => {
    const business = OWNER_BASE44_NAVIGATION.find(section => section.label === 'NEGÓCIO')
    const departmentGroup = business?.items.find(item => item.label === 'Departamentos')
    const values = departmentGroup?.children?.map(ownerNavigationSectionValue) ?? []
    expect(new Set(values).size).toBe(values.length)
    expect(values).toContain('departamentos-visao-geral')
  })

  test('mantém departamentos como grupo expansível e filhos semânticos', () => {
    const business = OWNER_BASE44_NAVIGATION.find(section => section.label === 'NEGÓCIO')
    expect(business?.items.map(item => item.label)).toEqual(['Departamentos', 'Mercado'])

    const departments = business?.items[0]
    expect(departments?.defaultExpanded).toBe(true)
    expect(departments?.children?.map(item => item.label)).toEqual([
      'Visão Geral',
      'Comercial',
      'Marketing',
      'Produto e Estoque',
      'Pessoas — RH',
      'Financeiro',
      'Operações',
    ])
    expect(business?.items[1]?.badge).toBeUndefined()
    expect(OWNER_BASE44_NAVIGATION.find(section => section.label === 'DESENVOLVIMENTO')?.items[0]?.badge).toBeUndefined()

    const development = OWNER_BASE44_NAVIGATION.find(section => section.label === 'DESENVOLVIMENTO')
    expect(development?.items[0]?.section).toBe('universidade')
  })

  test('liga o sidebar universal às rotas canônicas do módulo Dono', () => {
    const paths = OWNER_BASE44_NAVIGATION.flatMap(section =>
      flattenItems(section.items).map(item => [item.label, ownerNavigationCanonicalPath(item)] as const),
    )

    expect(Object.fromEntries(paths)).toEqual({
      'Início': '/dono',
      'Rotina do Dia': '/dono/rotina',
      'Central de Decisões': '/dono/decisoes',
      'Plano Estratégico': '/dono/plano-estrategico',
      'Plano de Ação': '/dono/plano-acao',
      Consultoria: '/dono/consultoria',
      Departamentos: '/dono/departamentos',
      'Visão Geral': '/dono/departamentos',
      Comercial: '/dono/departamentos/comercial',
      Marketing: '/dono/departamentos/marketing',
      'Produto e Estoque': '/dono/departamentos/produto-e-estoque',
      'Pessoas — RH': '/dono/departamentos/pessoas-rh',
      Financeiro: '/dono/departamentos/financeiro',
      Operações: '/dono/departamentos/operacoes',
      Mercado: '/dono/mercado',
      'Universidade MX': '/dono/universidade',
      'Falar com Consultor': '/dono/consultoria?openConsultant=1',
    })
  })

  test('mantém um único item ativo nas rotas canônicas e nos aliases legados', () => {
    const activePaths = Object.fromEntries(
      OWNER_BASE44_NAVIGATION.flatMap(section =>
        flattenItems(section.items).map(item => [item.label, ownerNavigationActivePaths(item)] as const),
      ),
    )

    expect(activePaths['Início']).toEqual(['/dono', '/home'])
    expect(activePaths['Plano Estratégico']).toEqual(['/dono/plano-estrategico', '/plano-estrategico'])
    expect(activePaths['Produto e Estoque']).toEqual([
      '/dono/departamentos/produto-e-estoque',
      '/departamentos/produto-e-estoque',
    ])
    expect(activePaths['Universidade MX']).toEqual(['/dono/universidade', '/universidade-mx'])
    expect(activePaths['Falar com Consultor']).toEqual([
      '/dono/consultoria?openConsultant=1',
      '/consultoria?openConsultant=1',
    ])
  })

  test('resolve todas as seções sem criar nova árvore de rotas', () => {
    for (const section of OWNER_BASE44_SECTION_VALUES) {
      expect(resolveOwnerSection(`?ownerSection=${section}`)).toBe(section)
    }
    expect(resolveOwnerSection('')).toBe('home')
    expect(resolveOwnerSection('?ownerSection=inexistente')).toBe('home')
  })

  test('preserva links legados em vez de redirecioná-los silenciosamente', () => {
    for (const section of OWNER_LEGACY_SECTION_VALUES) {
      expect(resolveOwnerSection(`?ownerSection=${section}`)).toBe(section)
    }
  })

  test('resolve as rotas canônicas do Dono para o cockpit de dados reais', () => {
    expect(resolveOwnerLocation('/dono', '')).toBe('home')
    expect(resolveOwnerLocation('/dono/rotina', '')).toBe('rotina')
    expect(resolveOwnerLocation('/dono/decisoes', '')).toBe('decisoes')
    expect(resolveOwnerLocation('/dono/plano-estrategico', '')).toBe('planejamento')
    expect(resolveOwnerLocation('/dono/plano-acao', '')).toBe('plano-acao')
    expect(resolveOwnerLocation('/dono/consultoria', '')).toBe('consultoria')
    expect(resolveOwnerLocation('/dono/departamentos/marketing', '')).toBe('departamentos')
    expect(resolveOwnerLocation('/dono/mercado', '')).toBe('mercado')
    expect(resolveOwnerLocation('/dono/universidade', '')).toBe('universidade')
    expect(resolveOwnerDepartmentFromPath('/dono/departamentos/produto-e-estoque')).toBe('produto')
    expect(resolveOwnerDepartmentFromPath('/dono/departamentos/pessoas-rh')).toBe('rh')
    expect(resolveOwnerDepartmentFromPath('/dono/departamentos')).toBeNull()
  })

  test('resolve os aliases legados da raiz para o mesmo cockpit de dados reais', () => {
    expect(resolveOwnerLocation('/home', '')).toBe('home')
    expect(resolveOwnerLocation('/rotina', '')).toBe('rotina')
    expect(resolveOwnerLocation('/decisoes', '')).toBe('decisoes')
    expect(resolveOwnerLocation('/plano-estrategico', '')).toBe('planejamento')
    expect(resolveOwnerLocation('/plano-acao', '')).toBe('plano-acao')
    expect(resolveOwnerLocation('/consultoria', '')).toBe('consultoria')
    expect(resolveOwnerLocation('/departamentos/financeiro', '')).toBe('departamentos')
    expect(resolveOwnerLocation('/mercado', '')).toBe('mercado')
    expect(resolveOwnerLocation('/universidade-mx', '')).toBe('universidade')
    expect(resolveOwnerDepartmentFromPath('/departamentos/financeiro')).toBe('financeiro')
  })

  test('mantém apenas departamentos canônicos no contexto executivo', () => {
    expect(resolveOwnerSection('?ownerSection=departamentos-visao-geral')).toBe('departamentos')
    expect(resolveOwnerSection('?ownerSection=departamentos-comercial')).toBe('departamentos')
    expect(resolveOwnerSection('?ownerSection=departamentos-marketing')).toBe('departamentos')
    expect(resolveOwnerSection('?ownerSection=departamentos-produto')).toBe('departamentos')
    expect(resolveOwnerSection('?ownerSection=departamentos-rh')).toBe('departamentos')
    expect(resolveOwnerSection('?ownerSection=departamentos-financeiro')).toBe('departamentos')
    expect(resolveOwnerSection('?ownerSection=departamentos-operacional')).toBe('departamentos')
    expect(resolveOwnerSection('?ownerSection=departamentos-inexistente')).toBe('home')
  })
})
