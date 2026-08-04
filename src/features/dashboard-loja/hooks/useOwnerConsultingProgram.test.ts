import { afterEach, describe, expect, spyOn, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { supabase } from '@/lib/supabase'
import { useOwnerConsultingProgram } from './useOwnerConsultingProgram'

afterEach(() => {
  cleanup()
})

describe('useOwnerConsultingProgram — escopo exclusivo do Dono', () => {
  test('não chama a RPC exclusiva quando o consumidor não habilita o escopo do Dono', async () => {
    const rpcSpy = spyOn(supabase, 'rpc').mockImplementation(
      (() => ({ maybeSingle: async () => ({ data: null, error: null }) })) as typeof supabase.rpc,
    )

    try {
      const { result } = renderHook(() => useOwnerConsultingProgram('store-manager', false))
      await act(async () => { await Promise.resolve() })

      const ownerSummaryCalls = rpcSpy.mock.calls.filter(
        ([rpcName]) => rpcName === 'get_owner_consulting_program_summary',
      )
      expect(ownerSummaryCalls).toHaveLength(0)
      expect(result.current).toMatchObject({
        program: null,
        loading: false,
        error: null,
      })
    } finally {
      rpcSpy.mockRestore()
    }
  })
})
