import { describe, expect, test } from 'bun:test'
import { fetchAllRows } from './supabasePagination'

function pagedSource(total: number, pageSize: number) {
  const all = Array.from({ length: total }, (_, index) => ({ i: index }))
  const calls: Array<[number, number]> = []
  const build = (from: number, to: number) => {
    calls.push([from, to])
    // Emula o PostgREST: nunca devolve mais que a página pedida.
    return Promise.resolve({ data: all.slice(from, Math.min(to + 1, from + pageSize)), error: null })
  }
  return { build, calls }
}

describe('fetchAllRows', () => {
  test('junta todas as páginas quando o total passa do teto', async () => {
    const { build, calls } = pagedSource(1548, 1000)
    const { rows, error } = await fetchAllRows<{ i: number }>(build, 1000)
    expect(error).toBeNull()
    expect(rows).toHaveLength(1548)
    expect(rows[1547].i).toBe(1547)
    expect(calls).toEqual([[0, 999], [1000, 1999]])
  })

  test('uma página só quando o resultado é menor que o teto', async () => {
    const { build, calls } = pagedSource(540, 1000)
    const { rows } = await fetchAllRows<{ i: number }>(build, 1000)
    expect(rows).toHaveLength(540)
    expect(calls).toHaveLength(1)
  })

  test('total exatamente igual à página pede a próxima e para', async () => {
    const { build, calls } = pagedSource(1000, 1000)
    const { rows } = await fetchAllRows<{ i: number }>(build, 1000)
    expect(rows).toHaveLength(1000)
    expect(calls).toHaveLength(2)
  })

  test('devolve o erro da origem sem descartar o que já veio', async () => {
    let call = 0
    const { rows, error } = await fetchAllRows<{ i: number }>(() => {
      call += 1
      if (call === 1) return Promise.resolve({ data: [{ i: 0 }, { i: 1 }], error: null })
      return Promise.resolve({ data: null, error: { message: 'falhou' } })
    }, 2)
    expect(error).toBe('falhou')
    expect(rows).toHaveLength(2)
  })
})
