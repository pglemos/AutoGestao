import { describe, expect, test } from 'bun:test'
import {
  buildChecklistItems,
  buildPlanPayload,
  buildTemplateItemsFromChecklist,
  calculateWeights,
  emptyWizardForm,
  resolveWizardDueDate,
  sanitizeTextForTemplate,
  suggestTitle,
  validateWizardStep,
  type ClientActionPlanWizardForm,
} from './clientActionPlanWizard'

function filledForm(): ClientActionPlanWizardForm {
  return {
    ...emptyWizardForm(),
    clientId: 'client-1',
    clientName: 'Auto Up',
    department: 'Vendas',
    indicatorId: 'sales_total',
    indicatorName: 'Vendas Totais',
    title: 'Aumentar vendas totais',
    problem: 'Vendas abaixo da meta.',
    actions: [
      { titulo: 'Revisar funil', como: 'Levantar funil por vendedor.' },
      { titulo: 'Campanha de incentivo', como: 'Definir premiação.' },
    ],
    responsibleId: 'user-1',
    responsibleName: 'Consultor MX',
    dueDate: '2026-10-01',
  }
}

describe('clientActionPlanWizard — pesos', () => {
  test('distribui basis points uniformemente com resto nas primeiras', () => {
    const weights = calculateWeights(2)
    expect(weights.reduce((sum, item) => sum + item.weight_basis_points, 0)).toBe(10000)
    expect(weights[0].weight_basis_points).toBe(5000)
    expect(weights[1].weight_percentage_display).toBe('50.00%')
  })

  test('três ações somam 10000', () => {
    const weights = calculateWeights(3)
    expect(weights.reduce((sum, item) => sum + item.weight_basis_points, 0)).toBe(10000)
  })

  test('zero ações não gera pesos', () => {
    expect(calculateWeights(0)).toEqual([])
  })
})

describe('clientActionPlanWizard — título sugerido', () => {
  test('combina direção e indicador', () => {
    expect(suggestTitle('AUMENTAR', 'Vendas Totais')).toBe('Aumentar vendas Totais')
    expect(suggestTitle('DIMINUIR', '% Estoque > 90')).toBe('Reduzir estoque > 90')
  })

  test('indicador vazio devolve título vazio', () => {
    expect(suggestTitle('AUMENTAR', '')).toBe('')
  })
})

describe('clientActionPlanWizard — validação por passo', () => {
  test('passo 1 cobra departamento, indicador e título', () => {
    const errors = validateWizardStep(1, emptyWizardForm())
    expect(errors).toContain('Selecione um departamento.')
    expect(errors).toContain('Selecione um indicador.')
    expect(errors).toContain('Informe o título do plano.')
  })

  test('passo 2 cobra ao menos uma ação nomeada', () => {
    const errors = validateWizardStep(2, { ...filledForm(), actions: [{ titulo: '', como: '' }] })
    expect(errors).toContain('Informe o nome de todas as ações.')
    expect(validateWizardStep(2, filledForm())).toEqual([])
  })

  test('passo 3 cobra responsável e prazo', () => {
    const errors = validateWizardStep(3, { ...filledForm(), responsibleId: '', dueDate: '' })
    expect(errors).toContain('Selecione um responsável.')
    expect(errors).toContain('Informe o prazo final.')
    expect(validateWizardStep(3, filledForm())).toEqual([])
  })
})

describe('clientActionPlanWizard — datas', () => {
  test('usa prazo informado', () => {
    expect(resolveWizardDueDate('2026-08-15', '2026-10-01')).toBe('2026-10-01')
  })

  test('sem prazo soma 30 dias ao início', () => {
    expect(resolveWizardDueDate('2026-08-15', '')).toBe('2026-09-14')
  })
})

describe('clientActionPlanWizard — payload e checklist', () => {
  test('payload mapeia campos do form para planos_acao', () => {
    const payload = buildPlanPayload({ form: filledForm(), storeId: 'store-1', userId: 'user-x' })
    expect(payload.scope_type).toBe('store')
    expect(payload.scope_id).toBe('store-1')
    expect(payload.acao).toBe('Aumentar vendas totais')
    expect(payload.departamento).toBe('Vendas')
    expect(payload.indicador).toBe('Vendas Totais')
    expect(payload.origem).toBe('consultor')
    expect(payload.participants).toBeNull()
    expect(payload.reference_year).toBe(new Date().getFullYear())
    expect((payload.checklist as Array<Record<string, unknown>>)).toHaveLength(2)
  })

  test('checklist ponderado soma 10000 bp e expõe status pendente', () => {
    const items = buildChecklistItems(filledForm().actions)
    const total = items.reduce((sum, item) => sum + Number(item.peso_bp), 0)
    expect(total).toBe(10000)
    expect(items[0].status).toBe('pendente')
    expect(items[1].peso_pct).toBe('50.00%')
  })
})

describe('clientActionPlanWizard — sanitização para promoção', () => {
  test('remove nome do cliente, CNPJ e datas', () => {
    const text = 'Loja Auto Up precisa revisar até 01/09/2026. CNPJ 12.345.678/0001-90.'
    const sanitized = sanitizeTextForTemplate(text, 'Auto Up')
    expect(sanitized).toContain('[cliente]')
    expect(sanitized).toContain('[CNPJ]')
    expect(sanitized).toContain('[data]')
  })

  test('não quebra sem nome de cliente', () => {
    expect(sanitizeTextForTemplate('Revisar funil', '')).toBe('Revisar funil')
  })
})

describe('clientActionPlanWizard — itens de template a partir do checklist', () => {
  test('gera ações sem dados do cliente', () => {
    const items = buildTemplateItemsFromChecklist(buildChecklistItems(filledForm().actions), 'Auto Up')
    expect(items).toHaveLength(2)
    expect(items[0].acao).toContain('Revisar funil')
    expect(items[0].prioridade).toBe('media')
    expect(items[0].prazo_dias).toBe(30)
  })

  test('checklist vazio devolve lista vazia', () => {
    expect(buildTemplateItemsFromChecklist([], 'Cliente')).toEqual([])
  })
})
