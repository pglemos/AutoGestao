import { describe, expect, test } from 'bun:test'
import {
  emptyTemplateDraft,
  emptyTemplateItem,
  nextTemplateVersionNumber,
  resolveItemDueDate,
  validateTemplateDraft,
} from './actionPlanTemplates'

describe('templates de plano de ação — validação', () => {
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
})
