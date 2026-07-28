import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { useSellerGoals } from './useSellerGoals'

type QueryResult = { data: unknown[] | null; error: { message: string } | null }

const pendingQueries: { table: string; resolve: (result: QueryResult) => void }[] = []

function createQuery(table: string) {
  let resolveQuery!: (result: QueryResult) => void
  const promise = new Promise<QueryResult>((resolve) => { resolveQuery = resolve })
  pendingQueries.push({ table, resolve: resolveQuery })

  const builder = {
    select: () => builder,
    eq: () => builder,
    neq: () => builder,
    maybeSingle: () => builder,
    then: (resolve: (value: QueryResult) => unknown, reject: (reason: unknown) => unknown) =>
      promise.then(resolve, reject),
  }
  return builder
}

function resolveTable(table: string, result: QueryResult) {
  const index = pendingQueries.findIndex((q) => q.table === table)
  if (index < 0) throw new Error(`Consulta pendente não encontrada: ${table}`)
  const [q] = pendingQueries.splice(index, 1)
  q.resolve(result)
}

async function flush() {
  await act(async () => {
    await Promise.resolve()
  })
}

let fromSpy: ReturnType<typeof spyOn>

beforeEach(() => {
  pendingQueries.length = 0
  fromSpy = spyOn(supabase, 'from').mockImplementation((table: string) => createQuery(table))
})

afterEach(() => {
  fromSpy.mockRestore()
  cleanup()
})

describe('useSellerGoals', () => {
  test('fetchGoals carrega metas da store para o mês/ano', async () => {
    const { result } = renderHook(() => useSellerGoals('store-1', 7, 2026))

    expect(result.current.loading).toBe(true)
    expect(result.current.goals).toEqual({})

    await act(async () => {
      resolveTable('metas', {
        data: [
          { id: 'm1', store_id: 'store-1', user_id: 'u1', month: 7, year: 2026, target: 10 },
          { id: 'm2', store_id: 'store-1', user_id: 'u2', month: 7, year: 2026, target: 8 },
        ],
        error: null,
      })
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.goals).toEqual({ u1: 10, u2: 8 })
  })

  test('fetchGoals retorna vazio quando storeId é null', async () => {
    const { result } = renderHook(() => useSellerGoals(null, 7, 2026))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.goals).toEqual({})
  })

  test('fetchGoals retorna vazio em caso de erro', async () => {
    const { result } = renderHook(() => useSellerGoals('store-1', 7, 2026))

    await act(async () => {
      resolveTable('metas', { data: null, error: { message: 'Erro de rede' } })
      await Promise.resolve()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.goals).toEqual({})
  })
})
