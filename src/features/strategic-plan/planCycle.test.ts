import { describe, expect, test } from 'bun:test'
import {
  allowedTransitions,
  buildPublicationCardFromRows,
  canTransition,
  readinessSummary,
  summarizePublicationCard,
  validatePlanReadiness,
  type PlanCycleStatus,
} from './planCycle'
import { resolveUnitPolicy, type UnitPolicy } from './unitPolicy'

const policies = (codes: string[]): Record<string, UnitPolicy> =>
  Object.fromEntries(codes.map(code => [code, resolveUnitPolicy(code)]))

/** Meta preenchida nos 12 meses para cada unidade informada. */
const fullYear = (codes: string[], unitIds: string[]) => {
  const map: Record<string, Record<string, Record<number, number | null>>> = {}
  for (const code of codes) {
    map[code] = {}
    for (const unitId of unitIds) {
      map[code][unitId] = Object.fromEntries(
        Array.from({ length: 12 }, (_, index) => [index + 1, 10]),
      )
    }
  }
  return map
}

describe('transições do ciclo', () => {
  test('o caminho normal é rascunho → validação → publicado → revisado', () => {
    expect(canTransition('rascunho', 'em_validacao')).toBe(true)
    expect(canTransition('em_validacao', 'publicado')).toBe(true)
    expect(canTransition('publicado', 'revisado')).toBe(true)
  })

  test('validação pode voltar para rascunho', () => {
    expect(canTransition('em_validacao', 'rascunho')).toBe(true)
  })

  test('plano publicado não volta a rascunho', () => {
    // A meta que o Dono já viu não pode mudar debaixo dele; corrigir exige revisão.
    expect(canTransition('publicado', 'rascunho')).toBe(false)
    expect(canTransition('publicado', 'em_validacao')).toBe(false)
  })

  test('rascunho não pula a validação', () => {
    expect(canTransition('rascunho', 'publicado')).toBe(false)
  })

  test('ciclo revisado é terminal', () => {
    expect(allowedTransitions('revisado')).toEqual([])
  })

  test('nenhum estado transiciona para si mesmo', () => {
    const estados: PlanCycleStatus[] = ['rascunho', 'em_validacao', 'publicado', 'revisado']
    for (const estado of estados) {
      expect(canTransition(estado, estado)).toBe(false)
    }
  })
})

describe('validatePlanReadiness', () => {
  const codes = ['sales_goal', 'visits', 'leads_received']
  const units = ['matriz', 'filialA']

  test('plano completo pode publicar', () => {
    const readiness = validatePlanReadiness({
      indicatorCodes: codes,
      activeUnitIds: units,
      policies: policies(codes),
      metaByUnit: fullYear(codes, units),
    })
    expect(readiness.canPublish).toBe(true)
    expect(readiness.ready).toBe(3)
    expect(readiness.pending).toBe(0)
  })

  test('roster vazio é impedimento crítico', () => {
    const readiness = validatePlanReadiness({
      indicatorCodes: [], activeUnitIds: units, policies: {}, metaByUnit: {},
    })
    expect(readiness.canPublish).toBe(false)
    expect(readiness.issues[0].type).toBe('PLANO_VAZIO')
  })

  test('roster raso é impedimento crítico', () => {
    const readiness = validatePlanReadiness({
      indicatorCodes: ['visits'], activeUnitIds: units, policies: policies(['visits']), metaByUnit: {},
    })
    expect(readiness.issues[0].type).toBe('PLANO_INCOMPLETO')
    expect(readiness.canPublish).toBe(false)
  })

  test('mês sem meta em uma unidade impede a publicação', () => {
    const metaByUnit = fullYear(codes, units)
    delete metaByUnit.visits.filialA[7]
    const readiness = validatePlanReadiness({
      indicatorCodes: codes, activeUnitIds: units, policies: policies(codes), metaByUnit,
    })
    expect(readiness.canPublish).toBe(false)
    expect(readiness.pending).toBe(1)
    expect(readiness.issues[0]).toMatchObject({
      type: 'MES_SEM_META', indicatorCode: 'visits', unitId: 'filialA', month: 7,
    })
    expect(readiness.ready).toBe(2)
  })

  test('meta zero conta como preenchida', () => {
    const metaByUnit = fullYear(codes, units)
    metaByUnit.visits.matriz[3] = 0
    const readiness = validatePlanReadiness({
      indicatorCodes: codes, activeUnitIds: units, policies: policies(codes), metaByUnit,
    })
    expect(readiness.canPublish).toBe(true)
  })

  test('indicador de empresa não é cobrado por unidade', () => {
    // instagram_followers é COMPANY_ONLY: exigir preenchimento por loja criaria
    // pendência que ninguém consegue resolver na tela da unidade.
    const comEmpresa = [...codes, 'instagram_followers']
    const metaByUnit = fullYear(codes, units)
    metaByUnit.instagram_followers = { __empresa__: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 500])) }
    const readiness = validatePlanReadiness({
      indicatorCodes: comEmpresa, activeUnitIds: units, policies: policies(comEmpresa), metaByUnit,
    })
    expect(readiness.canPublish).toBe(true)
    expect(readiness.ready).toBe(4)
  })

  test('indicador sem política declarada bloqueia como crítico', () => {
    const comDesconhecido = [...codes, 'indicador_inexistente']
    const readiness = validatePlanReadiness({
      indicatorCodes: comDesconhecido,
      activeUnitIds: units,
      policies: policies(comDesconhecido),
      metaByUnit: fullYear(codes, units),
    })
    expect(readiness.issues.some(issue => issue.type === 'POLITICA_AUSENTE')).toBe(true)
    expect(readiness.canPublish).toBe(false)
  })

  test('unidade nova sem metas gera pendência para o ano inteiro', () => {
    const readiness = validatePlanReadiness({
      indicatorCodes: codes,
      activeUnitIds: [...units, 'filialNova'],
      policies: policies(codes),
      metaByUnit: fullYear(codes, units),
    })
    expect(readiness.pending).toBe(36)
    expect(readiness.ready).toBe(0)
  })
})

describe('readinessSummary', () => {
  const codes = ['sales_goal', 'visits', 'leads_received']

  test('anuncia que pode publicar', () => {
    const readiness = validatePlanReadiness({
      indicatorCodes: codes, activeUnitIds: ['matriz'], policies: policies(codes), metaByUnit: fullYear(codes, ['matriz']),
    })
    expect(readinessSummary(readiness)).toContain('pode ser publicado')
  })

  test('crítico é anunciado antes das pendências', () => {
    const readiness = validatePlanReadiness({
      indicatorCodes: [], activeUnitIds: [], policies: {}, metaByUnit: {},
    })
    expect(readinessSummary(readiness)).toBe('Plano sem indicadores.')
  })

  test('conta as metas mensais que faltam', () => {
    const metaByUnit = fullYear(codes, ['matriz'])
    delete metaByUnit.visits.matriz[1]
    delete metaByUnit.visits.matriz[2]
    const readiness = validatePlanReadiness({
      indicatorCodes: codes, activeUnitIds: ['matriz'], policies: policies(codes), metaByUnit,
    })
    expect(readinessSummary(readiness)).toContain('2 meta(s)')
  })
})

describe('card de metas publicadas', () => {
  test('publicado conta distinct indicadores com meta, não células', () => {
    const card = buildPublicationCardFromRows({
      cycleStatus: 'publicado',
      rosterCodes: ['a', 'b', 'c'],
      rows: [
        { indicator_code: 'a', meta: 10 },
        { indicator_code: 'a', meta: 20 },
        { indicator_code: 'b', meta: 5 },
        { indicator_code: 'c', meta: 1 },
      ],
    })
    expect(card).toMatchObject({
      indicadoresComMeta: 3,
      metasPublicadas: 3,
      metasPendentes: 0,
      statusLabel: 'Publicado',
    })
  })

  test('rascunho não conta como meta publicada', () => {
    const card = summarizePublicationCard({
      cycleStatus: 'rascunho',
      rosterCodes: Array.from({ length: 46 }, (_, index) => `i${index}`),
      indicatorsWithMeta: Array.from({ length: 46 }, (_, index) => `i${index}`),
    })
    expect(card.indicadoresComMeta).toBe(46)
    expect(card.metasPublicadas).toBe(0)
    expect(card.metasPendentes).toBe(0)
  })
})
