import { describe, expect, test } from 'bun:test'
import {
  buildTemplateDraftFromTemplate,
  emptyTemplateDraft,
  emptyTemplateItem,
  nextTemplateVersionNumber,
  prepareTemplateDraftForSave,
  resolveItemDueDate,
  suggestTemplateKey,
  validateTemplateDraft,
  officialActionPlanIndicatorCatalog,
  formatTemplateWizardEffectivenessOption,
  formatTemplateWizardPrimaryOption,
  withPersistedIndicatorOption,
} from './actionPlanTemplates'

const persistedTemplate = {
  id: 'template-1',
  template_key: 'adequacao_quadro_colab',
  nome: 'Adequação do Quadro de Colaboradores',
  departamento: 'PESSOAS_RH',
  indicador: 'EMPLOYEE_COUNT',
  descricao: null,
  program_key: null,
  active: true,
  primary_indicator_code: null,
  improvement_direction: null,
  default_responsible_role: null,
  manual_application_enabled: true,
  owner_suggestion_enabled: false,
  versions: [],
} as const

describe('templates de plano de ação — validação', () => {
  test('rehidrata valores legados no contrato do editor', () => {
    const draft = buildTemplateDraftFromTemplate(persistedTemplate, null, [])

    expect(draft.departamento).toBe('rh')
    expect(draft.primary_indicator_code).toBe('EMPLOYEE_COUNT')
    expect(draft.items).toHaveLength(1)
  })

  test('usa os 45 indicadores oficiais do Base44 no wizard', () => {
    const rows = officialActionPlanIndicatorCatalog()
    const comercial = rows.filter(row => row.category === 'comercial')

    expect(rows).toHaveLength(45)
    expect(comercial).toHaveLength(22)
    expect(comercial.map(row => row.label)).toEqual([
      'Conversão de Visitas em Vendas',
      'Conversão de Agendamentos em Visitas',
      'Conversão de Leads em Agendamentos',
      'Volume de Agendamentos por Venda',
      'Volume de Visitas',
      'Volume de Agendamentos',
      '% Vendas Financiadas',
      'Volume de Fichas Pagas',
      'Volume de Fichas Aprovadas',
      '% Venda com Troca',
      'Volume de Vendas com Troca',
      'Volume de Carros Avaliados',
      'Média de Leads por Vendedor',
      'Média de Vendas por Vendedor',
      'Volume de Vendedores',
      'Vendas - Outros',
      'Vendas - Internet',
      'Vendas - Carteira Vendedor',
      'Vendas - Carteira Empresa',
      'Vendas - Indicação',
      'Vendas - Fluxo de Porta',
      'Vendas Total',
    ])
    expect(rows.some(row => /meta de vendas|volume de vendas —|vendas total —/i.test(row.label))).toBe(false)
    expect(comercial[0]).toMatchObject({ label: 'Conversão de Visitas em Vendas', unit: 'Percentual', direction: 'AUMENTAR' })
    expect(comercial.find(row => row.code === 'APPOINTMENTS_PER_INTERNET_SALE')).toMatchObject({
      label: 'Volume de Agendamentos por Venda',
      unit: 'Número decimal',
      direction: 'DIMINUIR',
    })
    expect(rows.every(row => row.unit !== 'number' && row.unit !== 'percent' && row.unit !== 'veículos')).toBe(true)
    expect(withPersistedIndicatorOption(rows, 'comercial', 'SALES_WALKIN', 'Vendas - Fluxo de Porta').map(row => row.code)).toEqual(comercial.map(row => row.code))
    expect(comercial.map(row => formatTemplateWizardPrimaryOption(row))).toEqual([
      'Conversão de Visitas em Vendas — Percentual (Aumentar)',
      'Conversão de Agendamentos em Visitas — Percentual (Aumentar)',
      'Conversão de Leads em Agendamentos — Percentual (Aumentar)',
      'Volume de Agendamentos por Venda — Número decimal (Aumentar)',
      'Volume de Visitas — Número decimal (Aumentar)',
      'Volume de Agendamentos — Número decimal (Aumentar)',
      '% Vendas Financiadas — Percentual (Aumentar)',
      'Volume de Fichas Pagas — Número decimal (Aumentar)',
      'Volume de Fichas Aprovadas — Número decimal (Aumentar)',
      '% Venda com Troca — Percentual (Aumentar)',
      'Volume de Vendas com Troca — Número decimal (Aumentar)',
      'Volume de Carros Avaliados — Número decimal (Aumentar)',
      'Média de Leads por Vendedor — Número decimal (Aumentar)',
      'Média de Vendas por Vendedor — Número decimal (Aumentar)',
      'Volume de Vendedores — Número inteiro (Aumentar)',
      'Vendas - Outros — Número inteiro (Aumentar)',
      'Vendas - Internet — Número inteiro (Aumentar)',
      'Vendas - Carteira Vendedor — Número inteiro (Aumentar)',
      'Vendas - Carteira Empresa — Número inteiro (Aumentar)',
      'Vendas - Indicação — Número inteiro (Aumentar)',
      'Vendas - Fluxo de Porta — Número inteiro (Aumentar)',
      'Vendas Total — Número inteiro (Aumentar)',
    ])
    expect(formatTemplateWizardEffectivenessOption(comercial[0])).toBe('Conversão de Visitas em Vendas — Percentual')
  })

  test('mantém indicador legado selecionável no editor', () => {
    const options = withPersistedIndicatorOption(
      officialActionPlanIndicatorCatalog(),
      'rh',
      'quadro_legado',
      'Funcionários Ativos',
    )

    expect(options[0]).toMatchObject({ code: 'quadro_legado', label: 'Funcionários Ativos', category: 'rh' })
    expect(options.some(option => option.code === 'EMPLOYEE_COUNT' && option.label === 'Quadro de Colaboradores')).toBe(true)
  })

  test('cobra chave, nome, departamento e ao menos um item', () => {
    const errors = validateTemplateDraft(emptyTemplateDraft())
    expect(errors).toContain('Informe a chave do template.')
    expect(errors).toContain('Informe o nome do template.')
    expect(errors).toContain('Informe o departamento.')
    expect(errors).toContain('Cadastre ao menos um item.')
  })

  test('rejeita chave fora do padrão', () => {
    const draft = { ...emptyTemplateDraft(), template_key: 'Ruptura Estoque' }
    expect(validateTemplateDraft(draft)).toContain('A chave aceita apenas minúsculas, números e underline.')
  })

  test('aceita template completo', () => {
    const draft = {
      ...emptyTemplateDraft(),
      template_key: 'ruptura_estoque',
      nome: 'Ruptura de estoque',
      departamento: 'Produto e Estoque',
      items: [{ ...emptyTemplateItem(1), problema: 'Ruptura em modelos A', acao: 'Revisar curva de compra' }],
    }
    expect(validateTemplateDraft(draft)).toEqual([])
  })

  test('item pela metade é reportado por posição', () => {
    const draft = {
      ...emptyTemplateDraft(),
      template_key: 'ruptura_estoque',
      nome: 'Ruptura',
      departamento: 'Estoque',
      items: [
        { ...emptyTemplateItem(1), problema: 'Ruptura', acao: 'Comprar' },
        { ...emptyTemplateItem(2), problema: 'Sem ação definida' },
      ],
    }
    expect(validateTemplateDraft(draft)).toContain('Item 2: informe a ação.')
  })

  test('prazo negativo é bloqueado', () => {
    const draft = {
      ...emptyTemplateDraft(),
      template_key: 'x',
      nome: 'X',
      departamento: 'Y',
      items: [{ ...emptyTemplateItem(1), problema: 'P', acao: 'A', prazo_dias: -5 }],
    }
    expect(validateTemplateDraft(draft)).toContain('Item 1: prazo em dias não pode ser negativo.')
  })
})

describe('ciclo de vida das versões do template', () => {
  test('primeira versão começa em 1', () => {
    expect(nextTemplateVersionNumber([])).toBe(1)
  })

  test('usa o maior número existente mesmo com retorno fora de ordem', () => {
    expect(nextTemplateVersionNumber([{ versao: 2 }, { versao: 7 }, { versao: 3 }])).toBe(8)
  })
})

describe('aplicação de template', () => {
  test('prazo em dias vira data a partir da aplicação', () => {
    expect(resolveItemDueDate(new Date('2026-08-15T12:00:00Z'), 30)).toBe('2026-09-14')
  })

  test('item sem prazo não gera vencimento', () => {
    expect(resolveItemDueDate(new Date('2026-08-15T12:00:00Z'), null)).toBeNull()
  })

  test('prazo zero vence no mesmo dia', () => {
    expect(resolveItemDueDate(new Date('2026-08-15T12:00:00Z'), 0)).toBe('2026-08-15')
  })

  test('gera chave canônica e copia a ação para o problema oculto', () => {
    expect(suggestTemplateKey({ departamento: 'comercial', primary_indicator_code: 'SALES_TOTAL', nome: 'Aumentar vendas' })).toBe('comercial_sales_total_aumentar_vendas')
    const prepared = prepareTemplateDraftForSave({
      ...emptyTemplateDraft(),
      departamento: 'comercial',
      primary_indicator_code: 'SALES_TOTAL',
      nome: 'Aumentar vendas',
      items: [{ ...emptyTemplateItem(1), acao: 'Treinar fechamento' }],
    })
    expect(prepared.template_key).toBe('comercial_sales_total_aumentar_vendas')
    expect(prepared.items[0]?.problema).toBe('Treinar fechamento')
    expect(validateTemplateDraft(prepared)).toEqual([])
  })
})
