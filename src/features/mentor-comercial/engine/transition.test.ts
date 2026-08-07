import { describe, expect, it } from 'bun:test'

import { buildTransitionIndex, resolveTransition } from './transition'
import type { TransitionRule } from './transition'

/**
 * Transition Engine (TASK 14). Fonte: aba `06 Transições` da matriz v1.
 *
 * Precedência obrigatória (§28):
 *   1. status exato
 *   2. contexto / família
 *   3. `Qualquer`
 *
 * Sem match: NÃO inventar status. Retornar resultado estruturado exigindo
 * `Atualizar situação`.
 */

const rules: TransitionRule[] = [
  {
    family: 'Contato',
    fromStatusOrContext: 'Primeiro contato pendente',
    result: 'Mensagem enviada',
    toStatus: 'Sem resposta — cadência ativa',
    decisionNotes: 'Avança para CAD-01',
  },
  {
    family: 'Contato',
    fromStatusOrContext: 'Qualquer',
    result: 'Número inválido',
    toStatus: 'Contato inválido',
    decisionNotes: null,
  },
  {
    family: 'Negociação',
    fromStatusOrContext: 'Negociação ativa',
    result: 'Questionou preço',
    toStatus: 'Objeção de preço',
    decisionNotes: null,
  },
  {
    family: 'Visita',
    fromStatusOrContext: 'Qualquer visita',
    result: 'Reagendou',
    toStatus: 'Visita agendada',
    decisionNotes: 'Mantém a mesma oportunidade',
  },
]

const index = buildTransitionIndex(rules)

describe('precedência 1 — status exato vence', () => {
  it('resolve pelo rótulo exato do status de origem', () => {
    const r = resolveTransition(index, {
      statusLabel: 'Primeiro contato pendente',
      family: 'Contato',
      result: 'Mensagem enviada',
    })
    expect(r.matched).toBe(true)
    expect(r.toStatus).toBe('Sem resposta — cadência ativa')
    expect(r.precedence).toBe('exact_status')
  })

  it('prefere o match exato ao curinga quando ambos servem', () => {
    const withBoth = buildTransitionIndex([
      ...rules,
      {
        family: 'Contato',
        fromStatusOrContext: 'Qualquer',
        result: 'Mensagem enviada',
        toStatus: 'DESTINO CURINGA',
        decisionNotes: null,
      },
    ])
    const r = resolveTransition(withBoth, {
      statusLabel: 'Primeiro contato pendente',
      family: 'Contato',
      result: 'Mensagem enviada',
    })
    expect(r.toStatus).toBe('Sem resposta — cadência ativa')
    expect(r.precedence).toBe('exact_status')
  })
})

describe('precedência 2 — contexto/família', () => {
  it('resolve por contexto quando o rótulo exato não casa', () => {
    const r = resolveTransition(index, {
      statusLabel: 'Negociação ativa — bloqueador não definido',
      family: 'Negociação',
      result: 'Questionou preço',
      contexts: ['Negociação ativa'],
    })
    expect(r.matched).toBe(true)
    expect(r.toStatus).toBe('Objeção de preço')
    expect(r.precedence).toBe('context')
  })
})

describe('precedência 3 — curinga', () => {
  it('resolve por "Qualquer" dentro da mesma família', () => {
    const r = resolveTransition(index, {
      statusLabel: 'Status que não aparece em nenhuma regra',
      family: 'Contato',
      result: 'Número inválido',
    })
    expect(r.matched).toBe(true)
    expect(r.toStatus).toBe('Contato inválido')
    expect(r.precedence).toBe('wildcard')
  })

  it('reconhece curinga qualificado como "Qualquer visita"', () => {
    const r = resolveTransition(index, {
      statusLabel: 'Visita confirmada',
      family: 'Visita',
      result: 'Reagendou',
    })
    expect(r.matched).toBe(true)
    expect(r.toStatus).toBe('Visita agendada')
    expect(r.precedence).toBe('wildcard')
  })

  it('curinga não vaza para outra família', () => {
    const r = resolveTransition(index, {
      statusLabel: 'Qualquer coisa',
      family: 'Negociação',
      result: 'Número inválido',
    })
    expect(r.matched).toBe(false)
  })
})

describe('sem match — nunca inventa status', () => {
  it('retorna resultado estruturado exigindo Atualizar situação', () => {
    const r = resolveTransition(index, {
      statusLabel: 'Primeiro contato pendente',
      family: 'Contato',
      result: 'Resultado que não existe na matriz',
    })
    expect(r.matched).toBe(false)
    expect(r.toStatus).toBeNull()
    expect(r.requiresManualUpdate).toBe(true)
    expect(r.observability).toBe('transition_not_found')
  })

  it('nunca devolve um status inventado', () => {
    const r = resolveTransition(index, {
      statusLabel: 'X',
      family: 'Y',
      result: 'Z',
    })
    expect(r.toStatus).toBeNull()
  })
})

describe('determinismo', () => {
  it('mesma entrada produz o mesmo resultado', () => {
    const input = {
      statusLabel: 'Primeiro contato pendente',
      family: 'Contato',
      result: 'Mensagem enviada',
    }
    expect(resolveTransition(index, input)).toEqual(resolveTransition(index, input))
  })
})
