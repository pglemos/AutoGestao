import { supabase } from '@/lib/supabase'

/**
 * Chamada compartilhada da RPC cancelar_venda (backend valida permissão:
 * vendedor só a própria venda em até 7 dias, gerente/dono/admin sem limite).
 * Usada tanto pela carteira do vendedor (useOportunidades) quanto pelo
 * painel de vendas fechadas da loja (useVendasLoja).
 */
export async function cancelarVendaRpc(oportunidadeId: string, motivo: string): Promise<{ error: string | null }> {
  const { data, error: rpcError } = await supabase.rpc('cancelar_venda', {
    p_payload: { oportunidade_id: oportunidadeId, motivo },
  })
  if (rpcError) return { error: rpcError.message }
  const result = data as { ok?: boolean; error?: string } | null
  if (!result?.ok) return { error: result?.error || 'Não foi possível cancelar a venda.' }
  return { error: null }
}
