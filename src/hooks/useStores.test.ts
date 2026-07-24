import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { useSellersByStore } from './useStores'

type QueryError = { message: string } | null
type QueryResult = { data: unknown[] | null; error: QueryError }

type PendingQuery = {
  table: string
  resolve: (result: QueryResult) => void
}

const pendingQueries: PendingQuery[] = []

function createQuery(table: string) {
  let resolveQuery!: (result: QueryResult) => void
  const promise = new Promise<QueryResult>((resolve) => {
    resolveQuery = resolve
  })
  pendingQueries.push({ table, resolve: resolveQuery })

  const builder = {
    select: () => builder,
    eq: () => builder,
    neq: () => builder,
    then: (
      resolve: (value: QueryResult) => unknown,
      reject: (reason: unknown) => unknown,
    ) => promise.then(resolve, reject),
  }
  return builder
}

let fromSpy: ReturnType<typeof spyOn>
let rpcSpy: ReturnType<typeof spyOn>

function resolveTable(table: string, result: QueryResult) {
  const index = pendingQueries.findIndex((query) => query.table === table)
  if (index < 0) throw new Error(`Consulta pendente não encontrada: ${table}`)
  const [query] = pendingQueries.splice(index, 1)
  query.resolve(result)
}

async function resolveCurrentStoreSuccess() {
  await act(async () => {
    resolveTable('vendedores_loja', { data: [], error: null })
    resolveTable('vinculos_loja', { data: [], error: null })
    await Promise.resolve()
  })
  await act(async () => {
    const checkinQuery = pendingQueries.find((query) =>
      query.table === 'lancamentos_diarios' || query.table === 'rpc')
    if (!checkinQuery) throw new Error('Consulta de fechamentos pendente não encontrada')
    resolveTable(checkinQuery.table, { data: [], error: null })
    await Promise.resolve()
  })
}

beforeEach(() => {
  pendingQueries.length = 0
  fromSpy = spyOn(supabase, 'from').mockImplementation(
    ((table: string) => createQuery(table)) as typeof supabase.from,
  )
  rpcSpy = spyOn(supabase, 'rpc').mockImplementation(
    (() => createQuery('rpc')) as typeof supabase.rpc,
  )
})

afterEach(() => {
  cleanup()
  fromSpy.mockRestore()
  rpcSpy.mockRestore()
})

describe('useSellersByStore — ciclo de vida das consultas', () => {
  test('ignora erro de uma consulta obsoleta depois que a loja muda', async () => {
    const consoleError = mock(() => {})
    const originalConsoleError = console.error
    console.error = consoleError

    try {
      const { result, rerender } = renderHook(
        ({ storeId }) => useSellersByStore(storeId),
        { initialProps: { storeId: 'store-old' } },
      )

      rerender({ storeId: 'store-current' })

      await act(async () => {
        resolveTable('vendedores_loja', { data: null, error: { message: 'Failed to fetch' } })
        resolveTable('vinculos_loja', { data: null, error: { message: 'Failed to fetch' } })
        await Promise.resolve()
      })

      await resolveCurrentStoreSuccess()
      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.error).toBeNull()
      expect(consoleError).not.toHaveBeenCalled()
    } finally {
      console.error = originalConsoleError
    }
  })

  test('mantém visível um erro da consulta vigente', async () => {
    const consoleError = mock(() => {})
    const originalConsoleError = console.error
    console.error = consoleError

    try {
      const { result } = renderHook(() => useSellersByStore('store-current'))

      await act(async () => {
        resolveTable('vendedores_loja', { data: null, error: { message: 'Falha real atual' } })
        resolveTable('vinculos_loja', { data: [], error: null })
        await Promise.resolve()
      })

      await waitFor(() => expect(result.current.loading).toBe(false))
      expect(result.current.error).toBe('Não foi possível carregar os vendedores.')
      expect(consoleError).toHaveBeenCalledTimes(1)
      expect(consoleError.mock.calls[0]?.[1]).toBe('Falha real atual')
    } finally {
      console.error = originalConsoleError
    }
  })
})
