import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'bun:test'

import type { StatusDefinition } from '../engine/engine'
import {
  getCompatibleStatuses,
  getGuidedOptions,
  GUIDED_OPTION_FAMILIES_MAP,
  GUIDED_STATUS_OPTIONS,
} from './guidedStatusOptions'

const RULES_DIR = path.resolve(
  import.meta.dir,
  '../../../../rules/mentor-comercial/v1',
)

function loadCatalogStatuses(): StatusDefinition[] {
  const raw = readFileSync(path.join(RULES_DIR, 'statuses.json'), 'utf8')
  return JSON.parse(raw).records as StatusDefinition[]
}

describe('guidedStatusOptions (TASK 24)', () => {
  const catalogStatuses = loadCatalogStatuses()

  it('deve possuir exatamente as 8 opções de primeiro nível especificadas', () => {
    expect(GUIDED_STATUS_OPTIONS).toHaveLength(8)
    expect(GUIDED_STATUS_OPTIONS).toEqual([
      'Ainda não consegui falar com o cliente',
      'Estou entendendo o que ele procura',
      'Preciso gerar ou confirmar uma visita',
      'O cliente visitou e estamos negociando',
      'Existe uma pendência do carro da troca',
      'Existe uma pendência de financiamento',
      'A venda foi concluída ou perdida',
      'É uma ação de relacionamento',
    ])
  })

  it('deve mapear cada uma das 8 opções para famílias válidas do catálogo', () => {
    const catalogFamilies = new Set(catalogStatuses.map((s) => s.family))
    for (const option of GUIDED_STATUS_OPTIONS) {
      const families = GUIDED_OPTION_FAMILIES_MAP[option]
      expect(families).toBeDefined()
      expect(families.length).toBeGreaterThan(0)
      for (const fam of families) {
        expect(catalogFamilies.has(fam)).toBe(true)
      }
    }
  })

  it('cada uma das 8 opções deve resolver para pelo menos um status real do catálogo (sem lista vazia)', () => {
    for (const optionText of GUIDED_STATUS_OPTIONS) {
      const compatible = getCompatibleStatuses({
        catalogStatuses,
        optionText,
      })
      expect(compatible.length).toBeGreaterThan(0)
      expect(compatible[0].statusId).toBeTruthy()
    }
  })

  it('nenhuma opção resolve para lista vazia para qualquer canal (Internet, Porta, Carteira, Compartilhado, null)', () => {
    const channels = ['Internet', 'Porta', 'Carteira', 'Compartilhado', null, undefined]
    for (const channel of channels) {
      for (const optionText of GUIDED_STATUS_OPTIONS) {
        const compatible = getCompatibleStatuses({
          catalogStatuses,
          optionText,
          channel,
        })
        expect(compatible.length).toBeGreaterThan(0)
      }
    }
  })

  it('getGuidedOptions deve retornar descritores válidos com contagem positiva para todas as opções', () => {
    const options = getGuidedOptions(catalogStatuses, 'Internet')
    expect(options).toHaveLength(8)
    for (const opt of options) {
      expect(opt.compatibleCount).toBeGreaterThan(0)
      expect(opt.compatibleStatuses.length).toBe(opt.compatibleCount)
    }
  })

  it('deve priorizar status relacionados quando houver pendingFlags', () => {
    const options = getCompatibleStatuses({
      catalogStatuses,
      optionText: 'Existe uma pendência do carro da troca',
      pendingFlags: ['carro_troca'],
    })
    expect(options.length).toBeGreaterThan(0)
    expect(options.some((s) => s.family === 'Troca')).toBe(true)
  })
})
