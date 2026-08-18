import { describe, expect, test } from 'bun:test'
import {
  calculateCompleteness,
  encounterDisplayName,
  joinRoles,
  nextMethodologyVersion,
  parsePreparationChecklist,
  productMethodologyStatus,
  splitRoles,
  toggleRole,
  validateContentTitle,
  validateDeliverable,
  validateEvidence,
  validateReportTemplateName,
} from './methodology'

describe('methodology — completude do encontro', () => {
  const empty = () => ({
    objective: '',
    expected_result: '',
    guideObjective: '',
    deliverables: 0,
    evidence: 0,
    reportTemplateId: null,
    ownerVisibilitySet: false,
    contentRefs: 0,
  })

  test('vazio vira NAO_INICIADO com 0%', () => {
    const result = calculateCompleteness(empty())
    expect(result.status).toBe('nao_iniciado')
    expect(result.percent).toBe(0)
    expect(result.pending).toBe(8)
  })

  test('com tudo preenchido vira PRONTO_REVISAO com 100%', () => {
    const result = calculateCompleteness({
      objective: 'Objetivo',
      expected_result: 'Resultado',
      guideObjective: 'Orientação',
      deliverables: 1,
      evidence: 1,
      reportTemplateId: 'rt-1',
      ownerVisibilitySet: true,
      contentRefs: 1,
    })
    expect(result.status).toBe('pronto_revisao')
    expect(result.percent).toBe(100)
    expect(result.pending).toBe(0)
  })

  test('parcialmente preenchido vira EM_CONFIGURACAO com percentual correto', () => {
    const result = calculateCompleteness({ ...empty(), objective: 'x', deliverables: 2 })
    expect(result.status).toBe('em_configuracao')
    expect(result.percent).toBe(25)
    expect(result.pending).toBe(6)
  })

  test('checks expõem o que falta por item', () => {
    const result = calculateCompleteness({ ...empty(), objective: 'x' })
    expect(result.checks.objective).toBe(true)
    expect(result.checks.guide).toBe(false)
    expect(result.checks.report).toBe(false)
  })
})

describe('methodology — versão e estado do produto', () => {
  test('próxima versão a partir de publicada soma 0.1', () => {
    expect(nextMethodologyVersion('1.0')).toBe('1.1')
  })

  test('sem versão começa em 1.0', () => {
    expect(nextMethodologyVersion(null)).toBe('1.0')
    expect(nextMethodologyVersion('')).toBe('1.0')
  })

  test('produto sem versões é "Não configurado"', () => {
    const state = productMethodologyStatus([])
    expect(state.configured).toBe(false)
    expect(state.label).toBe('Não configurado')
  })

  test('publicado sem pendência é sucesso', () => {
    const state = productMethodologyStatus([{ status: 'publicado', encounters_pending: 0 }])
    expect(state.label).toBe('Publicado')
    expect(state.tone).toBe('success')
  })

  test('publicado com rascunho vira "Com pendência"', () => {
    const state = productMethodologyStatus([
      { status: 'publicado', encounters_pending: 0 },
      { status: 'rascunho', encounters_pending: 2 },
    ])
    expect(state.label).toBe('Com pendência')
    expect(state.tone).toBe('warning')
  })

  test('só rascunho vira "Em configuração"', () => {
    const state = productMethodologyStatus([{ status: 'rascunho', encounters_pending: 3 }])
    expect(state.label).toBe('Em configuração')
  })
})

describe('methodology — nomes e papéis', () => {
  test('encontro 0 é Onboarding', () => {
    expect(encounterDisplayName(0)).toBe('Onboarding')
  })

  test('encontro numerado usa o número', () => {
    expect(encounterDisplayName(3)).toBe('Encontro 3')
    expect(encounterDisplayName(null)).toBe('Encontro')
  })

  test('splitRoles separa por vírgula e remove vazios', () => {
    expect(splitRoles('Dono, Gerente,  ')).toEqual(['Dono', 'Gerente'])
  })

  test('splitRoles normaliza sinônimos e conjunções', () => {
    expect(splitRoles('Proprietário e Marketing')).toEqual(['Dono', 'Marketing'])
    expect(splitRoles('Vendedor / Gerente')).toEqual(['Vendedor', 'Gerente'])
    expect(splitRoles('Todos')).toEqual(['Dono', 'Gerente Geral', 'Vendedor', 'Marketing'])
  })

  test('joinRoles recompõe a lista', () => {
    expect(joinRoles(['Dono', 'Gerente'])).toBe('Dono, Gerente')
  })

  test('toggleRole adiciona e remove', () => {
    expect(toggleRole('Dono, Gerente', 'Dono')).toBe('Gerente')
    expect(toggleRole('Gerente', 'Dono')).toBe('Gerente, Dono')
  })
})

describe('methodology — validações e checklist', () => {
  test('título de conteúdo obrigatório', () => {
    expect(validateContentTitle('')).toBe('Informe o título do conteúdo.')
    expect(validateContentTitle(' Aula 1 ')).toBeNull()
  })

  test('entrega exige título e descrição', () => {
    expect(validateDeliverable('', 'desc')).toBe('Informe o título da entrega.')
    expect(validateDeliverable('título', '')).toBe('Informe a descrição da entrega.')
    expect(validateDeliverable('título', 'desc')).toBeNull()
  })

  test('evidência exige nome e descrição', () => {
    expect(validateEvidence('', 'desc')).toBe('Informe o nome da evidência.')
    expect(validateEvidence('nome', '')).toBe('Informe a descrição da evidência.')
    expect(validateEvidence('nome', 'desc')).toBeNull()
  })

  test('modelo de relatório exige nome', () => {
    expect(validateReportTemplateName('  ')).toBe('Informe o nome do modelo de relatório.')
    expect(validateReportTemplateName('Relatório PMR')).toBeNull()
  })

  test('parsePreparationChecklist aceita json string e array', () => {
    const viaString = parsePreparationChecklist('[{"name":"A","required":true}]')
    expect(viaString).toHaveLength(1)
    expect(viaString[0].name).toBe('A')
    const viaArray = parsePreparationChecklist([{ name: 'B' }])
    expect(viaArray[0].order).toBe(1)
  })

  test('parsePreparationChecklist devolve vazio em conteúdo inválido', () => {
    expect(parsePreparationChecklist('{quebrado')).toEqual([])
    expect(parsePreparationChecklist(null)).toEqual([])
  })
})
