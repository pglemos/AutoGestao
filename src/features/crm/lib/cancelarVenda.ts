import { supabase } from '@/lib/supabase'

/**
 * Chamada compartilhada da RPC cancelar_venda (backend valida permissão:
 * vendedor só a própria venda no mês, gerente/dono/admin sem limite dentro do
 * próprio escopo). A referência pode ser a oportunidade legada ou o evento
 * oficial quando a venda não tem oportunidade materializada.
 * Usada tanto pela carteira do vendedor (useOportunidades) quanto pelo
 * painel de vendas fechadas da loja (useVendasLoja).
 */
export type CancelarVendaReferencia = {
  oportunidadeId?: string | null
  eventoId?: string | null
}

export type CancelarVendaPayload = {
  oportunidade_id?: string
  evento_id?: string
  motivo: string
}

export function buildCancelarVendaPayload(
  referencia: string | CancelarVendaReferencia,
  motivo: string,
): CancelarVendaPayload {
  return typeof referencia === 'string'
    ? { oportunidade_id: referencia, motivo }
    : {
        ...(referencia.oportunidadeId ? { oportunidade_id: referencia.oportunidadeId } : {}),
        ...(referencia.eventoId ? { evento_id: referencia.eventoId } : {}),
        motivo,
      }
}

export async function cancelarVendaRpc(
  referencia: string | CancelarVendaReferencia,
  motivo: string,
): Promise<{ error: string | null }> {
  const payload = buildCancelarVendaPayload(referencia, motivo)

  if (!payload.oportunidade_id && !payload.evento_id) {
    return { error: 'Venda não identificada para cancelamento.' }
  }

  const { data, error: rpcError } = await supabase.rpc('cancelar_venda', {
    p_payload: payload,
  })
  if (rpcError) return { error: rpcError.message }
  const result = data as { ok?: boolean; error?: string } | null
  if (!result?.ok) return { error: result?.error || 'Não foi possível cancelar a venda.' }
  return { error: null }
}
