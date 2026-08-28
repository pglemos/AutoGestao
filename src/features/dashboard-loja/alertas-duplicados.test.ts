import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * A Central de Decisões do Dono mostrava o mesmo problema duas vezes, com
 * redações diferentes, porque há dois geradores de alerta:
 *
 *   central-mx-engine  →  "Conversão de lead abaixo do benchmark."
 *   PerformanceAlerts  →  "Baixa conversão de lead" (0% contra benchmark de 20%)
 *
 * Verificado em produção na MX CONSULTORIA: três pares duplicados
 * (conversão de lead, visita→venda, rotina incompleta) inflavam o contador
 * para "Críticas: 5" quando havia 3 problemas distintos.
 *
 * A deduplicação existia, mas comparava texto livre — título, descrição,
 * variante e recomendação — então nunca disparava entre geradores diferentes.
 */
const cockpit = readFileSync(new URL('./sections/OwnerExecutiveCockpit.tsx', import.meta.url), 'utf8')
const perf = readFileSync(new URL('./sections/PerformanceAlerts.tsx', import.meta.url), 'utf8')
const format = readFileSync(new URL('./sections/owner-cockpit/format.tsx', import.meta.url), 'utf8')

describe('alertas do mesmo indicador não aparecem duas vezes', () => {
  test('a identidade usa o indicador quando ele existe', () => {
    expect(cockpit).toContain('if (alert.sourceIndicator) return `indicador::${alert.sourceIndicator}::${alert.variant}`')
  })

  test('o texto continua servindo de reserva', () => {
    expect(cockpit).toContain("[alert.title, alert.description, alert.variant, alert.recommendation].join('::')")
  })

  test('alertFromEngine deixa de descartar o indicador de origem', () => {
    expect(format).toContain('sourceIndicator: (alert.metadata as { sourceIndicator?: string } | null)?.sourceIndicator')
  })

  test('os quatro alertas do outro gerador declaram seu indicador', () => {
    for (const [titulo, indicador] of [
      ['Meta abaixo do ritmo', 'store_attainment'],
      ['Rotina diária incompleta', 'seller_count'],
      ['Baixa conversão de lead', 'lead_to_appointment_rate'],
      ['Visita não vira venda', 'visit_to_sale_rate'],
    ]) {
      const trecho = perf.slice(perf.indexOf(`title: '${titulo}'`), perf.indexOf(`title: '${titulo}'`) + 120)
      expect(trecho).toContain(`sourceIndicator: '${indicador}'`)
    }
  })

  test('os indicadores declarados batem com os que o motor emite', () => {
    const engine = readFileSync(new URL('../../lib/central-mx-engine.ts', import.meta.url), 'utf8')
    for (const indicador of ['lead_to_appointment_rate', 'visit_to_sale_rate', 'seller_count']) {
      expect(engine).toContain(`'${indicador}'`)
    }
  })
})
