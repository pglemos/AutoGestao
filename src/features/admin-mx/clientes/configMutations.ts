import { supabase } from '@/lib/supabase'
import { emptyClientConfigDraft, validateClientConfigDraft, type ClientConfigDraft } from './clientConfig'

export type ClientConfigRow = {
  client_id: string
  tolerancia_fechamento_min: number
  limite_vendedores: number
  retencao_snapshots_dias: number
  canal_critico: string
  canal_atencao: string
  janela_envio: string
  updated_at: string
}

export async function fetchClientConfig(clientId: string): Promise<{ draft: ClientConfigDraft; error: string | null }> {
  const { data, error } = await supabase
    .from('configuracoes_cliente_consultoria')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()
  if (error) return { draft: emptyClientConfigDraft(), error: error.message }
  if (!data) return { draft: emptyClientConfigDraft(), error: null }
  const row = data as ClientConfigRow
  return {
    draft: emptyClientConfigDraft({
      tolerancia_fechamento_min: row.tolerancia_fechamento_min,
      limite_vendedores: row.limite_vendedores,
      retencao_snapshots_dias: row.retencao_snapshots_dias,
      canal_critico: row.canal_critico as ClientConfigDraft['canal_critico'],
      canal_atencao: row.canal_atencao as ClientConfigDraft['canal_atencao'],
      janela_envio: row.janela_envio,
    }),
    error: null,
  }
}

export async function saveClientConfig(clientId: string, draft: ClientConfigDraft, updatedBy: string): Promise<{ error: string | null }> {
  const invalid = validateClientConfigDraft(draft)
  if (invalid) return { error: invalid }
  const { error } = await supabase
    .from('configuracoes_cliente_consultoria')
    .upsert({
      client_id: clientId,
      tolerancia_fechamento_min: draft.tolerancia_fechamento_min,
      limite_vendedores: draft.limite_vendedores,
      retencao_snapshots_dias: draft.retencao_snapshots_dias,
      canal_critico: draft.canal_critico,
      canal_atencao: draft.canal_atencao,
      janela_envio: draft.janela_envio.trim(),
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id' })
  return { error: error?.message ?? null }
}
