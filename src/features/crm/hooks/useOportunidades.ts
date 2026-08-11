import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import {
  OportunidadeSchema,
  CRM_ETAPAS_FUNIL,
  CRM_ETAPAS_ATIVAS,
  isEtapaTerminal,
  type Oportunidade,
  type CrmEtapaFunil,
  type CrmCanal,
  type CrmFinanciamento,
  type CrmTipoVeiculo,
} from '@/lib/schemas/crm.schema'
import { z } from 'zod'
import { cancelarVendaRpc } from '@/features/crm/lib/cancelarVenda'
import type { Json } from '@/types/database.generated'

/** Retorno normalizado das RPCs transacionais do CRM. */
type CrmRpcResult = {
  ok?: boolean
  error?: string
  code?: string
  data?: { id?: string; etapa?: string; status?: string }
}

const OportunidadeComClienteSchema = OportunidadeSchema.extend({
  cliente: z.object({ nome: z.string(), telefone: z.string().nullable() }).nullable().optional(),
})
export type OportunidadeComCliente = z.infer<typeof OportunidadeComClienteSchema>

export type OportunidadeInput = {
  cliente_id: string
  veiculo_interesse?: string | null
  tipo_veiculo?: CrmTipoVeiculo | null
  valor_negociado?: number
  etapa?: CrmEtapaFunil
  canal?: CrmCanal | null
  sinal?: number
  financiamento?: CrmFinanciamento
  carro_avaliado?: boolean
  motivo_perda?: string | null
  closed_at?: string | null
  created_at?: string | null
  placa_veiculo?: string | null
  data_entrega_prevista?: string | null
  data_competencia?: string | null
  origem_modulo?: string | null
  fechamento_id?: string | null
}

export type VendaDiretaInput = {
  nome: string
  telefone: string
  veiculo: string
  placa: string
  valor_venda: number
  data_competencia: string
  canal?: CrmCanal | null
  financiamento?: CrmFinanciamento
  carro_avaliado?: boolean
  data_entrega_prevista?: string | null
  observacao?: string | null
  observacao_entrega?: string | null
  fechamento_id?: string | null
}

type OportunidadePayload = {
  cliente_id: string
  loja_id: string
  seller_user_id: string
  veiculo_interesse: string | null
  tipo_veiculo: CrmTipoVeiculo | null
  valor_negociado: number
  etapa: CrmEtapaFunil
  canal: CrmCanal | null
  sinal: number
  financiamento: CrmFinanciamento
  carro_avaliado: boolean
  motivo_perda: string | null
  closed_at: string | null
  data_competencia: string | null
  origem_modulo: string
  fechamento_id: string | null
  placa_veiculo?: string | null
  data_entrega_prevista?: string | null
  created_at?: string
}

export function buildOportunidadePayload(
  input: OportunidadeInput,
  context: { loja_id: string; seller_user_id: string },
  nowIso = () => new Date().toISOString(),
): OportunidadePayload {
  const isTerminal = isEtapaTerminal(input.etapa)
  const payload: OportunidadePayload = {
    cliente_id: input.cliente_id,
    loja_id: context.loja_id,
    seller_user_id: context.seller_user_id,
    veiculo_interesse: input.veiculo_interesse?.trim() || null,
    tipo_veiculo: input.tipo_veiculo || null,
    valor_negociado: input.valor_negociado ?? 0,
    etapa: input.etapa || 'prospeccao',
    canal: input.canal || null,
    sinal: input.sinal ?? 0,
    financiamento: input.financiamento || 'nao_aplica',
    carro_avaliado: input.carro_avaliado ?? false,
    motivo_perda: input.etapa === 'perdido' ? (input.motivo_perda?.trim() || null) : null,
    closed_at: isTerminal ? (input.closed_at || nowIso()) : null,
    data_competencia: input.data_competencia || null,
    origem_modulo: input.origem_modulo || 'crm',
    fechamento_id: input.fechamento_id || null,
  }
  // P1-05/P0-05a (auditoria 2026-07-10): placa e previsão de entrega são
  // "esparsos" — só entram no payload quando o caller explicitamente os
  // informa. Em UPDATE, uma chave ausente preserva o valor já salvo
  // (Postgrest só sobrescreve colunas presentes no payload); antes, um
  // `|| null` incondicional aqui fazia qualquer edição que não tocasse
  // nesses dois campos (confirmar venda, confirmar perda, editar outro campo
  // no Fechamento) apagar a placa/previsão de entrega já cadastradas.
  if (input.placa_veiculo !== undefined) payload.placa_veiculo = input.placa_veiculo?.trim() || null
  if (input.data_entrega_prevista !== undefined) payload.data_entrega_prevista = input.data_entrega_prevista || null
  if (input.created_at) payload.created_at = input.created_at
  return payload
}

function parse(data: unknown): OportunidadeComCliente[] {
  if (!Array.isArray(data)) return []
  const out: OportunidadeComCliente[] = []
  for (const row of data) {
    const r = OportunidadeComClienteSchema.safeParse(row)
    if (r.success) out.push(r.data)
  }
  return out
}

/**
 * Chave de idempotência da venda direta: determinística por vendedor,
 * competência, telefone normalizado e placa — reenvio do mesmo formulário
 * (duplo clique, retry de rede) gera a MESMA chave e o RPC devolve a venda
 * existente com `duplicate: true`, sem criar segundo evento oficial.
 */
export function chaveIdempotenciaVendaDireta(
  userId: string,
  input: Pick<VendaDiretaInput, 'data_competencia' | 'telefone' | 'placa'>,
): string {
  return [userId, input.data_competencia, input.telefone.replace(/\D/g, ''), input.placa.replace(/[^A-Za-z0-9]/g, '').toUpperCase()].join(':')
}

export function useOportunidades() {
  const { supabaseUser, activeStoreId, storeId } = useAuth()
  const effectiveStoreId = activeStoreId || storeId || null
  const [oportunidades, setOportunidades] = useState<OportunidadeComCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOportunidades = useCallback(async () => {
    if (!supabaseUser) { setOportunidades([]); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from('oportunidades')
        .select('*, cliente:clientes(nome, telefone)')
        .eq('seller_user_id', supabaseUser.id)
        .order('updated_at', { ascending: false })
      if (fetchError) { setError(fetchError.message); setOportunidades([]) }
      else setOportunidades(parse(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar oportunidades')
      setOportunidades([])
    } finally {
      setLoading(false)
    }
  }, [supabaseUser])

  const createOportunidade = useCallback(async (input: OportunidadeInput): Promise<{ error: string | null; id?: string }> => {
    if (!supabaseUser) return { error: 'Sessão inválida.' }
    if (!effectiveStoreId) return { error: 'Loja não identificada para o vendedor.' }
    if (!input.cliente_id) return { error: 'Selecione o cliente da oportunidade.' }
    const payload = buildOportunidadePayload(input, { loja_id: effectiveStoreId, seller_user_id: supabaseUser.id })
    // Oportunidade e os eventos de funil no mesmo commit. Antes o INSERT ia
    // primeiro e o evento era best-effort: falhou o evento, sobrava
    // oportunidade sem fato comercial e o funil não fechava com a operação.
    const { data, error: rpcError } = await supabase.rpc('criar_oportunidade_crm', {
      p_payload: payload as unknown as Json,
    })
    if (rpcError) return { error: rpcError.message }
    const result = data as CrmRpcResult | null
    if (!result?.ok) return { error: result?.error || 'Não foi possível registrar a oportunidade.' }

    await fetchOportunidades()
    return { error: null, id: result.data?.id }
  }, [supabaseUser, effectiveStoreId, fetchOportunidades])

  const registrarVendaDireta = useCallback(async (input: VendaDiretaInput): Promise<{ error: string | null; id?: string }> => {
    if (!supabaseUser || !effectiveStoreId) return { error: 'Sessão ou loja inválida.' }
    const idempotencyKey = chaveIdempotenciaVendaDireta(supabaseUser.id, input)
    const { data, error: rpcError } = await supabase.rpc('registrar_venda_direta', {
      p_payload: { ...input, store_id: effectiveStoreId, idempotency_key: idempotencyKey, origem_modulo: 'terminal_mx' },
    })
    if (rpcError) return { error: rpcError.message }
    const result = data as { ok?: boolean; error?: string; data?: { oportunidade_id?: string } } | null
    if (!result?.ok) return { error: result?.error || 'Não foi possível registrar a venda.' }
    await fetchOportunidades()
    return { error: null, id: result.data?.oportunidade_id }
  }, [effectiveStoreId, fetchOportunidades, supabaseUser])

  const updateOportunidade = useCallback(async (id: string, input: OportunidadeInput): Promise<{ error: string | null }> => {
    if (!supabaseUser) return { error: 'Sessão inválida.' }
    if (!effectiveStoreId) return { error: 'Loja não identificada para o vendedor.' }
    const payload = buildOportunidadePayload(input, { loja_id: effectiveStoreId, seller_user_id: supabaseUser.id })
    const { error: updateError } = await supabase.from('oportunidades').update(payload).eq('id', id)
    if (updateError) return { error: updateError.message }
    await fetchOportunidades()
    return { error: null }
  }, [supabaseUser, effectiveStoreId, fetchOportunidades])

  const updateMotivoPerda = useCallback(async (id: string, motivoPerda: string | null): Promise<{ error: string | null }> => {
    if (!supabaseUser) return { error: 'Sessão inválida.' }
    const { error: updateError } = await supabase.from('oportunidades').update({ motivo_perda: motivoPerda?.trim() || null }).eq('id', id)
    if (updateError) return { error: updateError.message }
    await fetchOportunidades()
    return { error: null }
  }, [supabaseUser, fetchOportunidades])

  const updateEtapa = useCallback(async (id: string, etapa: CrmEtapaFunil, motivoPerda?: string): Promise<{ error: string | null }> => {
    if (!supabaseUser) return { error: 'Sessão inválida.' }
    // Mudança de etapa e o evento de venda no mesmo commit. A anotação de
    // "venda sem atendimento prévio" e a idempotência vivem no servidor: eram
    // duas consultas de leitura no cliente, sujeitas a corrida entre abas.
    const { data, error: rpcError } = await supabase.rpc('atualizar_etapa_oportunidade_crm', {
      p_oportunidade_id: id,
      p_payload: {
        etapa,
        motivo_perda: etapa === 'perdido' ? (motivoPerda?.trim() || null) : null,
      } as unknown as Json,
    })
    if (rpcError) return { error: rpcError.message }
    const result = data as CrmRpcResult | null
    if (!result?.ok) return { error: result?.error || 'Não foi possível atualizar a etapa.' }

    await fetchOportunidades()
    return { error: null }
  }, [supabaseUser, fetchOportunidades])

  const cancelarVenda = useCallback(async (id: string, motivo: string): Promise<{ error: string | null }> => {
    if (!supabaseUser) return { error: 'Sessão inválida.' }
    const { error: cancelError } = await cancelarVendaRpc(id, motivo)
    if (cancelError) return { error: cancelError }
    await fetchOportunidades()
    return { error: null }
  }, [supabaseUser, fetchOportunidades])

  const deleteOportunidade = useCallback(async (id: string): Promise<{ error: string | null }> => {
    if (!supabaseUser) return { error: 'Sessão inválida.' }
    const { error: delError } = await supabase.from('oportunidades').delete().eq('id', id)
    if (delError) return { error: delError.message }
    await fetchOportunidades()
    return { error: null }
  }, [supabaseUser, fetchOportunidades])

  useEffect(() => { fetchOportunidades() }, [fetchOportunidades])

  // Funil: contagem + valor por etapa, conversão entre etapas ativas, ticket médio
  const funil = useMemo(() => {
    const porEtapa = CRM_ETAPAS_FUNIL.map(etapa => {
      const itens = oportunidades.filter(o => o.etapa === etapa)
      const valor = itens.reduce((acc, o) => acc + (o.valor_negociado || 0), 0)
      return { etapa, quantidade: itens.length, valor }
    })

    const base = porEtapa.find(e => e.etapa === 'prospeccao')?.quantidade || 0
    const stagesAtivas = porEtapa.filter(e => CRM_ETAPAS_ATIVAS.includes(e.etapa))
    const stagesComConversao = stagesAtivas.map((e, idx) => {
      const ref = idx === 0 ? (base || e.quantidade) : stagesAtivas[0].quantidade
      const conversao = ref > 0 ? Math.round((e.quantidade / ref) * 1000) / 10 : 0
      return { ...e, conversao }
    })

    const ganhos = porEtapa.find(e => e.etapa === 'ganho')
    const perdidos = porEtapa.find(e => e.etapa === 'perdido')
    const totalOportunidades = oportunidades.length
    const taxaConversaoGeral = totalOportunidades > 0 && ganhos ? Math.round((ganhos.quantidade / totalOportunidades) * 1000) / 10 : 0
    const ticketMedio = ganhos && ganhos.quantidade > 0 ? ganhos.valor / ganhos.quantidade : 0
    const valorTotalFunil = stagesAtivas.reduce((acc, e) => acc + e.valor, 0)

    return {
      porEtapa, stagesComConversao,
      ganhos: ganhos || { etapa: 'ganho' as const, quantidade: 0, valor: 0 },
      perdidos: perdidos || { etapa: 'perdido' as const, quantidade: 0, valor: 0 },
      taxaConversaoGeral, ticketMedio, valorTotalFunil, totalOportunidades,
    }
  }, [oportunidades])

  return { oportunidades, funil, loading, error, refetch: fetchOportunidades, createOportunidade, registrarVendaDireta, updateOportunidade, updateMotivoPerda, updateEtapa, cancelarVenda, deleteOportunidade }
}
