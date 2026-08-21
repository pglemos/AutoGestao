import { describe, expect, test } from 'bun:test'
import { summarizeTemplate } from './templateTableMetrics'
import type { ActionPlanTemplate } from './actionPlanTemplates'

const template = (overrides: Partial<ActionPlanTemplate> = {}): ActionPlanTemplate => ({
  id: 'template-1',
  template_key: 'template_1',
  nome: 'Template',
  departamento: 'COMERCIAL',
  indicador: 'SALES_TOTAL',
  descricao: null,
  program_key: null,
  active: true,
  primary_indicator_code: null,
  improvement_direction: null,
  default_responsible_role: null,
  manual_application_enabled: true,
  owner_suggestion_enabled: true,
  application_count: 3,
  versions: [{
    id: 'version-1',
    template_id: 'template-1',
    versao: 2,
    status: 'publicada',
    improvement_direction: null,
    default_responsible_role: 'GERENTE_COMERCIAL',
    notas: null,
    published_at: null,
    problem: null,
    objective: null,
    when_to_apply: null,
    owner_suggestion_title: null,
    owner_suggestion_problem: null,
    owner_suggestion_recommendation: null,
    effectiveness_indicator_code: null,
    itens: [
      { id: 'item-1', ordem: 1, problema: 'p', acao: 'a', como: '', departamento: 'COMERCIAL', indicador: 'SALES_TOTAL', prioridade: 'alta', prazo_dias: 3, evidencia_requerida: true, support_material_type: 'nenhum', file_asset_path: null, file_asset_name: null, treinamento_id: null, treinamento_titulo: null, recommended_responsible_role: null, peso_bp: 5000 },
      { id: 'item-2', ordem: 2, problema: 'p', acao: 'b', como: '', departamento: 'COMERCIAL', indicador: 'SALES_TOTAL', prioridade: 'critica', prazo_dias: 5, evidencia_requerida: false, support_material_type: 'nenhum', file_asset_path: null, file_asset_name: null, treinamento_id: null, treinamento_titulo: null, recommended_responsible_role: null, peso_bp: 5000 },
    ],
  }],
  ...overrides,
})

describe('resumo da tabela de templates', () => {
  test('expõe ações, prioridades, responsável, status e contadores operacionais', () => {
    expect(summarizeTemplate(template())).toMatchObject({
      actions: 2,
      priority: 'Alta, Crítica',
      responsibleRole: 'GERENTE_COMERCIAL',
      version: 2,
      status: 'publicada',
      statusLabel: 'Publicado',
      applications: 3,
      suggestion: 'Ativo',
    })
  })

  test('distingue rascunho, inativo e arquivado da versão publicada', () => {
    expect(summarizeTemplate(template({ active: false })).statusLabel).toBe('Inativo')
    expect(summarizeTemplate(template({ versions: [{ ...template().versions[0], status: 'rascunho' }] })).statusLabel).toBe('Rascunho')
    expect(summarizeTemplate(template({ versions: [{ ...template().versions[0], status: 'arquivada' }] })).statusLabel).toBe('Arquivado')
  })
})
