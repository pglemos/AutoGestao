import { supabase } from '@/lib/supabase'
import { validatePersonAccessDraft, type PersonAccessDraft, type PersonStatus } from './personAccess'

export type PersonAccessRow = {
  id: string
  client_id: string
  nome: string
  email: string
  telefone: string | null
  funcao_declarada: string | null
  papeis: string[]
  lojas_autorizadas: string[]
  is_dono_master: boolean
  visao_padrao: string | null
  status: string
  created_at: string
}

export async function fetchClientPersons(clientId: string): Promise<{ rows: PersonAccessRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('acessos_cliente_consultoria')
    .select('*')
    .eq('client_id', clientId)
    .order('is_dono_master', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) return { rows: [], error: error.message }
  return {
    rows: (data ?? []).map(row => ({
      ...row,
      papeis: Array.isArray(row.papeis) ? row.papeis : [],
      lojas_autorizadas: Array.isArray(row.lojas_autorizadas) ? row.lojas_autorizadas : [],
    })) as PersonAccessRow[],
    error: null,
  }
}

export async function createClientPerson(
  clientId: string,
  draft: PersonAccessDraft,
  createdBy: string,
): Promise<{ error: string | null }> {
  const errors = validatePersonAccessDraft(draft)
  if (errors.length) return { error: errors[0] }

  // Um cliente só pode ter um Dono Master vigente (regra central do doc de
  // correção, item 10/17 de Pessoas e Acessos). Sem isso, marcar "Dono Master"
  // num segundo cadastro cria dois is_dono_master=true — mesma classe de bug
  // encontrada em unidades_cliente_consultoria (duas lojas "Principal").
  // Demover é a transferência implícita que o doc pede ao marcar outro usuário.
  if (draft.is_dono_master) {
    const { error: demoteError } = await supabase
      .from('acessos_cliente_consultoria')
      .update({ is_dono_master: false, updated_at: new Date().toISOString() })
      .eq('client_id', clientId)
      .eq('is_dono_master', true)
    if (demoteError) return { error: demoteError.message }
  }

  const { error } = await supabase.from('acessos_cliente_consultoria').insert({
    client_id: clientId,
    nome: draft.nome.trim(),
    email: draft.email.trim().toLowerCase(),
    telefone: draft.telefone.trim() || null,
    funcao_declarada: draft.funcao_declarada.trim() || null,
    papeis: draft.papeis,
    lojas_autorizadas: draft.lojas_autorizadas,
    is_dono_master: draft.is_dono_master,
    visao_padrao: draft.visao_padrao || null,
    status: 'em_preparacao' as PersonStatus,
    created_by: createdBy,
  })
  return { error: error?.message ?? null }
}

export async function updatePersonStatus(personId: string, status: PersonStatus): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('acessos_cliente_consultoria')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', personId)
  return { error: error?.message ?? null }
}
