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

  // #region agent log
  fetch('http://127.0.0.1:7506/ingest/ceac55d9-e57e-4aa7-abcd-40a91956c86a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'285f20'},body:JSON.stringify({sessionId:'285f20',runId:'post-fix',hypothesisId:'AH',location:'clientVisitMutations.ts:completeOverdueConsultingVisits',message:'complete overdue visits',data:{requested:ids.length,updated:data?.length??0,error:error?.message??null},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  if (error) return { error: describeAdminRpcError(error, 'Não foi possível concluir as visitas atrasadas.'), updated: 0 }
  return { error: null, updated: data?.length ?? 0 }
}
