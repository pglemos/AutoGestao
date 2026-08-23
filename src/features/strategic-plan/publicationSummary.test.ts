import { describe, expect, test } from 'bun:test'
import { buildPublicationCardFromRows } from './planCycle'

/**
 * Contrato do card: versão publicada manda no status/contagens even se
 * existir rascunho paralelo (coberto em publicationSummary via fetch).
 */
describe('publicação do card (contrato)', () => {
  test('publicado com metas no snapshot → publicadas = indicadores com meta', () => {
    const card = buildPublicationCardFromRows({
      cycleStatus: 'publicado',
      rosterCodes: Array.from({ length: 46 }, (_, i) => `i${i}`),
      rows: Array.from({ length: 46 }, (_, i) => ({ indicator_code: `i${i}`, meta: 10 })),
    })
    expect(card).toMatchObject({
      indicadoresComMeta: 46,
      metasPublicadas: 46,
      metasPendentes: 0,
      statusLabel: 'Publicado',
    })
  })

  test('rascunho com metas preenchidas não conta como publicada', () => {
    const card = buildPublicationCardFromRows({
      cycleStatus: 'rascunho',
      rosterCodes: Array.from({ length: 46 }, (_, i) => `i${i}`),
      rows: Array.from({ length: 46 }, (_, i) => ({ indicator_code: `i${i}`, meta: 10 })),
    })
    expect(card.metasPublicadas).toBe(0)
    expect(card.indicadoresComMeta).toBe(46)
  })
})
