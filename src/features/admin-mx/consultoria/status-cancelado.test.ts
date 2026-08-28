import { describe, expect, test } from 'bun:test'
import { CONSULTING_STATUS_LABELS, type ConsultingOverviewStatus } from './consultingOverview'
import { readFileSync } from 'node:fs'

/**
 * O normalizador de status tratava três famílias (concluído, reagendado,
 * agendado) e jogava todo o resto no default `nao_iniciado`. Visita
 * **cancelada** virava "Não iniciado" — o oposto do que é: quem lê vê trabalho
 * pendente onde houve desistência.
 *
 * Verificado em produção: `visitas_consultoria` tem 374 registros, sendo
 * 360 `agendada`, 6 `concluida`, 4 `em_andamento` e **4 `cancelada`**.
 * (Não há `reagendado` na base — esse ramo do tipo é preventivo.)
 */
const source = readFileSync(new URL('./consultingOverview.ts', import.meta.url), 'utf8')

describe('visita cancelada não vira "Não iniciado"', () => {
  test('o normalizador reconhece a família cancelado', () => {
    expect(source).toContain("['cancelado', 'cancelada', 'canceled', 'cancelled'].includes(normalized)")
    expect(source).toContain("return 'cancelado'")
  })

  test('o ramo vem ANTES do default nao_iniciado', () => {
    const posCancelado = source.indexOf("return 'cancelado'")
    const posDefault = source.indexOf("return 'nao_iniciado'")
    expect(posCancelado).toBeGreaterThan(0)
    expect(posCancelado).toBeLessThan(posDefault)
  })

  test('cancelado tem rótulo próprio', () => {
    expect(CONSULTING_STATUS_LABELS.cancelado).toBe('Cancelado')
  })

  test('todos os status do tipo têm rótulo', () => {
    const status: ConsultingOverviewStatus[] = ['nao_iniciado', 'agendado', 'concluido', 'reagendado', 'cancelado']
    for (const s of status) expect(CONSULTING_STATUS_LABELS[s]).toBeTruthy()
  })

  test('o motivo fica registrado no arquivo', () => {
    expect(source).toContain("'cancelada' caía no default")
  })
})
