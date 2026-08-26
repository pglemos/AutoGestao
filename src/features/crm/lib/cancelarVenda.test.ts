import { afterAll, beforeEach, describe, expect, mock, test } from 'bun:test'

const rpc = mock(async () => ({ data: { ok: true }, error: null }))

mock.module('@/lib/supabase', () => ({
  supabase: { rpc },
}))

const { buildCancelarVendaPayload, cancelarVendaRpc } = await import('./cancelarVenda')

afterAll(() => mock.restore())

beforeEach(() => rpc.mockClear())

describe('cancelamento de venda por referência', () => {
  test('envia evento_id para uma venda órfã', async () => {
    const result = await cancelarVendaRpc(
      { oportunidadeId: null, eventoId: 'event-orphan-1' },
      'Cliente desistiu após aprovação.',
    )

    expect(result).toEqual({ error: null })
    expect(rpc).toHaveBeenCalledWith('cancelar_venda', {
      p_payload: {
        evento_id: 'event-orphan-1',
        motivo: 'Cliente desistiu após aprovação.',
      },
    })
  })

  test('mantém compatibilidade do caminho legado por oportunidade', () => {
    expect(buildCancelarVendaPayload('opportunity-1', 'Motivo legado válido.')).toEqual({
      oportunidade_id: 'opportunity-1',
      motivo: 'Motivo legado válido.',
    })
  })
})
