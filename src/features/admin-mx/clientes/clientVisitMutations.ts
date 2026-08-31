import { supabase } from '@/lib/supabase'
import { describeAdminRpcError } from '../equipe/adminRpcErrors'

export async function completeOverdueConsultingVisits(visitIds: string[]): Promise<{ error: string | null; updated: number }> {
  const ids = [...new Set(visitIds.filter(Boolean))]
  if (!ids.length) return { error: null, updated: 0 }

  const { data, error } = await supabase
    .from('visitas_consultoria')
    .update({ status: 'concluida', updated_at: new Date().toISOString() })
    .in('id', ids)
    .in('status', ['agendada', 'em_andamento'])
    .select('id')

  if (error) return { error: describeAdminRpcError(error, 'Não foi possível concluir as visitas atrasadas.'), updated: 0 }
  return { error: null, updated: data?.length ?? 0 }
}
