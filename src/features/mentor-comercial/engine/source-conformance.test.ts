import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'bun:test'

import { classifyPriority, computePriority, POTENTIAL_POINTS } from './priority'
import { advanceCadence, parseOffset, planCadence } from './cadence'
import { classifyScore, SCORE_PILLAR_WEIGHTS } from './score'
import { OFFICIAL_PLACEHOLDERS, renderScript, resolveScriptRef } from './script'
import { buildTransitionIndex, resolveTransition } from './transition'

/**
 * Conformidade do motor contra a PRÓPRIA FONTE.
 *
 * A aba `09 Teste_Clientes` da matriz v1 traz 100 oportunidades com score,
 * risco, índice de prioridade e classificações já calculados pelo autor da
 * metodologia. Estes testes provam que a implementação reproduz exatamente
 * esses números — o que é uma evidência muito mais forte do que testes
 * escritos contra a minha própria leitura do prompt.
 *
 * Conforme §66, os dados são usados como FIXTURE de teste. Nenhum destes
 * clientes é inserido em produção.
 */

const RULES_DIR = path.resolve(import.meta.dir, '../../../../rules/mentor-comercial/v1')

type TestClient = {
  client: string | null
  scoreStatus: number | string | null
  scoreNextStep: number | string | null
  scoreExecution: number | string | null
  scoreCadence: number | string | null
  scoreHistory: number | string | null
  score: number | string | null
  scoreClass: string | null
  urgencyPoints: number | string | null
  potentialPoints: number | string | null
  conductionRisk: number | string | null
  priorityIndex: number | string | null
  priorityClass: string | null
  potential: string | null
}

function loadTestClients(): TestClient[] {
  const raw = readFileSync(path.join(RULES_DIR, 'test-clients.json'), 'utf8')
  return JSON.parse(raw).records as TestClient[]
}

const num = (value: number | string | null): number => Number(value)

const clients = loadTestClients().filter((c) =>
  [c.scoreStatus, c.scoreNextStep, c.scoreExecution, c.scoreCadence, c.scoreHistory, c.score].every(
    (v) => Number.isFinite(Number(v)),
  ),
)

describe('conformidade com a aba 09 Teste_Clientes', () => {
  it('carrega as 100 oportunidades de referência', () => {
    expect(clients.length).toBe(100)
  })

  it('o score da planilha é sempre a soma dos cinco pilares', () => {
    const divergences = clients.filter((c) => {
      const sum =
        num(c.scoreStatus) +
        num(c.scoreNextStep) +
        num(c.scoreExecution) +
        num(c.scoreCadence) +
        num(c.scoreHistory)
      return sum !== num(c.score)
    })
    expect(divergences.map((c) => c.client)).toEqual([])
  })

  it('nenhum pilar excede seu peso máximo', () => {
    const offenders = clients.filter(
      (c) =>
        num(c.scoreStatus) > SCORE_PILLAR_WEIGHTS.status ||
        num(c.scoreNextStep) > SCORE_PILLAR_WEIGHTS.nextStep ||
        num(c.scoreExecution) > SCORE_PILLAR_WEIGHTS.execution ||
        num(c.scoreCadence) > SCORE_PILLAR_WEIGHTS.cadence ||
        num(c.scoreHistory) > SCORE_PILLAR_WEIGHTS.history,
    )
    expect(offenders.map((c) => c.client)).toEqual([])
  })

  it('classifyScore reproduz a coluna Classificação em todas as linhas', () => {
    const divergences = clients
      .filter((c) => classifyScore(num(c.score)) !== c.scoreClass)
      .map((c) => `${c.client}: calc=${classifyScore(num(c.score))} fonte=${c.scoreClass}`)
    expect(divergences).toEqual([])
  })

  it('o risco de condução é sempre 100 menos o score', () => {
    const divergences = clients
      .filter((c) => num(c.conductionRisk) !== 100 - num(c.score))
      .map((c) => `${c.client}: calc=${100 - num(c.score)} fonte=${c.conductionRisk}`)
    expect(divergences).toEqual([])
  })

  it('a fórmula 45/35/20 reproduz a coluna Índice Prioridade em todas as linhas', () => {
    const divergences = clients
      .filter((c) => {
        const expected = Math.floor(
          num(c.urgencyPoints) * 0.45 +
            num(c.potentialPoints) * 0.35 +
            num(c.conductionRisk) * 0.2 +
            0.5,
        )
        return expected !== num(c.priorityIndex)
      })
      .map((c) => c.client)
    expect(divergences).toEqual([])
  })

  it('classifyPriority reproduz a coluna Prioridade em todas as linhas', () => {
    const divergences = clients
      .filter((c) => classifyPriority(num(c.priorityIndex)) !== c.priorityClass)
      .map((c) => `${c.client}: calc=${classifyPriority(num(c.priorityIndex))} fonte=${c.priorityClass}`)
    expect(divergences).toEqual([])
  })

  it('a escala de potencial da planilha casa com POTENTIAL_POINTS', () => {
    const divergences = clients
      .filter((c) => {
        const level = c.potential as keyof typeof POTENTIAL_POINTS
        if (!(level in POTENTIAL_POINTS)) return false
        return POTENTIAL_POINTS[level] !== num(c.potentialPoints)
      })
      .map((c) => `${c.client}: ${c.potential} → fonte=${c.potentialPoints}`)
    expect(divergences).toEqual([])
  })

  it('computePriority reproduz índice e classe de cada linha da fonte', () => {
    const byUrgencyPoints = new Map(
      Object.entries({
        100: 'clientRespondedAwaitingSeller',
        95: 'actionOverdue',
        90: 'actionToday',
        75: 'actionTomorrow',
        55: 'actionWithin3Days',
        25: 'actionFuture',
      }),
    )

    const divergences: string[] = []
    for (const c of clients) {
      const urgency = byUrgencyPoints.get(String(num(c.urgencyPoints)))
      const potential = c.potential as keyof typeof POTENTIAL_POINTS
      if (!urgency || !(potential in POTENTIAL_POINTS)) continue

      const result = computePriority({
        urgency: urgency as Parameters<typeof computePriority>[0]['urgency'],
        potential,
        score: num(c.score),
      })
      if (result.index !== num(c.priorityIndex)) {
        divergences.push(`${c.client}: índice calc=${result.index} fonte=${c.priorityIndex}`)
      }
      if (result.classification !== c.priorityClass) {
        divergences.push(
          `${c.client}: classe calc=${result.classification} fonte=${c.priorityClass}`,
        )
      }
    }
    expect(divergences).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Conformidade dos motores contra o CATÁLOGO REAL (não fixtures).
// ---------------------------------------------------------------------------


const readCatalog = (name: string) =>
  JSON.parse(readFileSync(path.join(RULES_DIR, name), 'utf8')).records as Array<Record<string, unknown>>

describe('motores contra o catálogo real v1', () => {
  const statuses = readCatalog('statuses.json')
  const transitions = readCatalog('transitions.json')
  const cadences = readCatalog('cadences.json')
  const steps = readCatalog('cadence-steps.json')
  const scripts = readCatalog('scripts.json')
  const scriptCatalog = new Set<string>(scripts.map((s) => s.scriptId))

  it('as 52 transições reais resolvem para o destino declarado na fonte', () => {
    const index = buildTransitionIndex(transitions)
    const divergences: string[] = []
    for (const t of transitions) {
      const isWildcard = /^qualquer\b/i.test(t.fromStatusOrContext ?? '')
      const outcome = resolveTransition(index, {
        statusLabel: isWildcard ? '<<status arbitrário>>' : t.fromStatusOrContext,
        family: t.family,
        result: t.result,
        contexts: [t.fromStatusOrContext],
      })
      if (!outcome.matched || outcome.toStatus !== t.toStatus) {
        divergences.push(`${t.family}/${t.result}: got=${outcome.toStatus} want=${t.toStatus}`)
      }
    }
    expect(divergences).toEqual([])
  })

  it('as 13 cadências reais percorrem até o fim sem virar perda', () => {
    const divergences: string[] = []
    for (const c of cadences) {
      const cadenceSteps = steps
        .filter((s) => s.cadenceId === c.cadenceId)
        .map((s) => ({ attempt: String(s.attempt), offset: String(s.offset) }))

      const unknown = cadenceSteps.filter((s) => parseOffset(s.offset).kind === 'unknown')
      if (unknown.length > 0) {
        divergences.push(`${c.cadenceId}: offset desconhecido ${unknown.map((u) => u.offset)}`)
        continue
      }

      let state = planCadence({
        cadenceId: c.cadenceId,
        steps: cadenceSteps,
        startedAt: new Date('2026-08-10T09:00:00.000Z'),
      })
      for (let i = 0; i < cadenceSteps.length; i += 1) {
        state = advanceCadence(state, { executed: true })
      }
      if (state.status !== 'completedWithoutResponse' || !state.attackEligible) {
        divergences.push(`${c.cadenceId}: status=${state.status} attack=${state.attackEligible}`)
      }
    }
    expect(divergences).toEqual([])
  })

  it('os 86 status resolvem script ou reportam SOURCE_BLOCKER — nunca falham em silêncio', () => {
    const tally: Record<string, number> = {}
    for (const s of statuses) {
      const r = resolveScriptRef(s.scriptId, {
        catalog: scriptCatalog,
        attempt: 1,
        statusId: s.statusId,
      })
      tally[r.reason] = (tally[r.reason] ?? 0) + 1
    }
    expect(tally).toEqual({ RESOLVED: 81, SOURCE_BLOCKER: 5 })
  })

  it('os 77 scripts renderizam com as 15 variáveis oficiais', () => {
    const variables = Object.fromEntries(
      [...OFFICIAL_PLACEHOLDERS].map((p) => [p.slice(1, -1), 'X']),
    )
    const divergences: string[] = []
    for (const s of scripts) {
      const r = renderScript(s.text ?? '', variables, { scriptId: s.scriptId })
      if (!r.scriptReady || r.unknownPlaceholders.length > 0) {
        divergences.push(`${s.scriptId}: missing=${r.missingVariables} unknown=${r.unknownPlaceholders}`)
      }
    }
    expect(divergences).toEqual([])
  })
})
