import { describe, expect, test } from 'bun:test'
import { availableTemplateLifecycleActions } from './TemplateActionsMenu'
import type { ActionPlanTemplate } from './actionPlanTemplates'

const template = (active: boolean, statuses: Array<'rascunho' | 'publicada' | 'arquivada'>): ActionPlanTemplate => ({
  id: 'tpl', template_key: 'tpl', nome: 'Template', departamento: 'Comercial', indicador: null,
  descricao: null, program_key: null, active, primary_indicator_code: null, improvement_direction: null, default_responsible_role: null, manual_application_enabled: true, owner_suggestion_enabled: false,
  versions: statuses.map((status, index) => ({
    id: `v${index}`, template_id: 'tpl', versao: index + 1, status, improvement_direction: null, default_responsible_role: null, notas: null, published_at: null,
  })),
})

describe('ações de ciclo de vida do template', () => {
  test('publicado sem rascunho permite nova versão', () => {
    expect(availableTemplateLifecycleActions(template(true, ['publicada']))).toEqual(['nova-versao', 'desativar', 'arquivar'])
  })

  test('rascunho aberto impede versão concorrente', () => {
    expect(availableTemplateLifecycleActions(template(true, ['publicada', 'rascunho']))).toEqual(['desativar', 'arquivar'])
  })

  test('inativo pode ser reativado', () => {
    expect(availableTemplateLifecycleActions(template(false, ['publicada']))).toEqual(['reativar', 'arquivar'])
  })

  test('arquivado não oferece mutações adicionais', () => {
    expect(availableTemplateLifecycleActions(template(false, ['arquivada']))).toEqual([])
  })
})
