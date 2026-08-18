import { supabase } from '@/lib/supabase'

export type ProgramDraft = {
  product_name: string
  program_template_key: string
  modality: string
  contract_start_date: string
  contract_end_date: string
  implementation_owner_id: string
  responsible_consultant_id: string
  auxiliary_consultant_ids: string[]
}

export type SaveProgramResult = { error: string | null }

export function emptyProgramDraft(): ProgramDraft {
  return {
    product_name: '',
    program_template_key: '',
    modality: '',
    contract_start_date: '',
    contract_end_date: '',
    implementation_owner_id: '',
    responsible_consultant_id: '',
    auxiliary_consultant_ids: [],
  }
}

export function validateProgramDraft(draft: ProgramDraft): string[] {
  const errors: string[] = []
  if (!draft.product_name.trim() && !draft.program_template_key.trim()) {
    errors.push('Selecione o produto contratado.')
  }
  if (draft.contract_start_date && draft.contract_end_date && draft.contract_end_date < draft.contract_start_date) {
    errors.push('Data de fim do contrato anterior ao início.')
  }
  return errors
}

export async function saveClientProgram(
  clientId: string,
  draft: ProgramDraft,
): Promise<SaveProgramResult> {
  const errors = validateProgramDraft(draft)
  if (errors.length) return { error: errors[0] }

  const { error: clientError } = await supabase
    .from('clientes_consultoria')
    .update({
      product_name: draft.product_name.trim() || null,
      program_template_key: draft.program_template_key.trim() || null,
      modality: draft.modality.trim() || null,
      contract_start_date: draft.contract_start_date || null,
      contract_end_date: draft.contract_end_date || null,
      implementation_owner_id: draft.implementation_owner_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)

  if (clientError) return { error: clientError.message }

  const selectedUserIds = new Set<string>()
  if (draft.responsible_consultant_id) {
    selectedUserIds.add(draft.responsible_consultant_id)
  }
  for (const id of draft.auxiliary_consultant_ids) {
    if (id) selectedUserIds.add(id)
  }

  const { data: currentAssignments } = await supabase
    .from('atribuicoes_consultoria')
    .select('id, user_id, active')
    .eq('client_id', clientId)

  const currentList = currentAssignments ?? []
  for (const assignment of currentList) {
    if (!selectedUserIds.has(assignment.user_id) && assignment.active) {
      await supabase
        .from('atribuicoes_consultoria')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', assignment.id)
    }
  }

  if (draft.responsible_consultant_id) {
    const { error: respError } = await supabase
      .from('atribuicoes_consultoria')
      .upsert(
        {
          client_id: clientId,
          user_id: draft.responsible_consultant_id,
          assignment_role: 'responsavel',
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,user_id' },
      )
    if (respError) return { error: `Erro ao definir consultor responsável: ${respError.message}` }
  }

  for (const auxId of draft.auxiliary_consultant_ids) {
    if (!auxId || auxId === draft.responsible_consultant_id) continue
    const { error: auxError } = await supabase
      .from('atribuicoes_consultoria')
      .upsert(
        {
          client_id: clientId,
          user_id: auxId,
          assignment_role: 'auxiliar',
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id,user_id' },
      )
    if (auxError) return { error: `Erro ao vincular consultor auxiliar: ${auxError.message}` }
  }

  return { error: null }
}
