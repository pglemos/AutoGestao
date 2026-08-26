import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { availableTemplateLifecycleActions } from './TemplateActionsMenu'
import { type ActionPlanTemplate, type ActionPlanTemplateVersion } from './actionPlanTemplates'

const version = (status: ActionPlanTemplateVersion['status'], index: number): ActionPlanTemplateVersion => ({
  id: `v${index}`,
  template_id: 'tpl',
  versao: index + 1,
  status,
  improvement_direction: null,
  default_responsible_role: null,
  notas: null,
  published_at: null,
  problem: null,
  objective: null,
  when_to_apply: null,
  owner_suggestion_title: null,
  owner_suggestion_problem: null,
  owner_suggestion_recommendation: null,
  effectiveness_indicator_code: null,
  itens: [],
})

const template = (active: boolean, statuses: Array<'rascunho' | 'publicada' | 'arquivada'>): ActionPlanTemplate => ({
  id: 'tpl', template_key: 'tpl', nome: 'Template', departamento: 'Comercial', indicador: null,
  descricao: null, program_key: null, active, primary_indicator_code: null, improvement_direction: null, default_responsible_role: null, manual_application_enabled: true, owner_suggestion_enabled: false,
  versions: statuses.map((status, index) => version(status, index)),
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

describe('botão Sugerir ao Dono respeita a disponibilidade', () => {
  // A tabela usava só `published && active`, então a flag
  // `owner_suggestion_enabled` não valia nada no caminho principal: um plano
  // marcado como indisponível continuava sugerível pela linha.
  const podeSugerir = (t: { publicada: boolean; active: boolean; owner_suggestion_enabled: boolean }) =>
    t.publicada && t.active && t.owner_suggestion_enabled

  test('só oferece quando publicado, ativo e disponível para sugestão', () => {
    expect(podeSugerir({ publicada: true, active: true, owner_suggestion_enabled: true })).toBe(true)
    expect(podeSugerir({ publicada: true, active: true, owner_suggestion_enabled: false })).toBe(false)
    expect(podeSugerir({ publicada: false, active: true, owner_suggestion_enabled: true })).toBe(false)
    expect(podeSugerir({ publicada: true, active: false, owner_suggestion_enabled: true })).toBe(false)
  })

  test('a fonte da tabela usa as três condições', () => {
    const src = readFileSync('src/features/admin-mx/AdminPlanosAcaoGlobalPage.tsx', 'utf8')
    expect(src).toContain('published && template.active && template.owner_suggestion_enabled')
  })
})
