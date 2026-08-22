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

  test('mantém indicador legado selecionável no editor', () => {
    const options = withPersistedIndicatorOption(
      [{ code: 'employees_total', label: 'Funcionários Ativos', category: 'rh', unit: 'number' }],
      'rh',
      'EMPLOYEE_COUNT',
      'EMPLOYEE_COUNT',
    )

    expect(options[0]).toMatchObject({ code: 'EMPLOYEE_COUNT', label: 'EMPLOYEE_COUNT', category: 'rh' })
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
