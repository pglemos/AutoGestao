import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'

/**
 * A tela Desenvolvimento do vendedor mostrava TODO feedback com a data de
 * hoje. O adaptador `base44Client.entities.Feedback` não mapeava
 * `created_date`, então `moment(f.created_date)` recebia `undefined` — e
 * `moment(undefined)` devolve o instante atual em vez de falhar.
 *
 * Verificado em produção: a única devolutiva da rede tem
 * `created_at = 2026-05-30`. O admin em /devolutivas mostrava 30/05/2026
 * (correto) e o vendedor via 28/08/2026 (a data em que a tela foi aberta).
 *
 * O mesmo campo também era usado em `list('-created_date', 50)`, ou seja, a
 * ordenação apontava para um campo inexistente e não ordenava nada.
 */
const client = readFileSync(new URL('../../api/base44Client.js', import.meta.url), 'utf8')
const tab = readFileSync(new URL('./FeedbackTab.jsx', import.meta.url), 'utf8')

describe('feedback do vendedor mostra a data real', () => {
  test('a entidade Feedback mapeia created_date a partir de created_at', () => {
    const bloco = client.slice(client.indexOf('Feedback: {'), client.indexOf('Feedback: {') + 1800)
    expect(bloco).toContain('created_date: r.created_at')
  })

  test('a tela continua lendo created_date', () => {
    expect(tab).toContain('moment(f.created_date).format("DD/MM/YYYY")')
  })

  test('a ordenação por -created_date passa a ter campo real', () => {
    expect(tab).toContain("list('-created_date', 50)")
    const bloco = client.slice(client.indexOf('Feedback: {'), client.indexOf('Feedback: {') + 1800)
    expect(bloco).toContain('created_date')
  })

  test('o motivo fica registrado junto do mapeamento', () => {
    expect(client).toContain('devolvia a data de HOJE')
  })
})
