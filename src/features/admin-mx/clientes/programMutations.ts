import { supabase } from '@/lib/supabase'
import { createStrategicPlanFromProduct } from '@/features/strategic-plan/productPackageOps'

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

const PROGRAM_MODALITY_LABEL: Record<string, string> = {
  presencial: 'Presencial',
  online: 'Online',
  hibrido: 'Híbrido',
}

export function normalizeProgramModality(value: string | null | undefined): string {
  const key = String(value ?? '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (key === 'presencial') return 'presencial'
  if (key === 'online') return 'online'
  if (key === 'hibrido') return 'hibrido'
  return ''
}

export function programModalityLabel(value: string | null | undefined): string {
  const normalized = normalizeProgramModality(value)
  return normalized ? PROGRAM_MODALITY_LABEL[normalized] : (String(value ?? '').trim() || '—')
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
      modality: normalizeProgramModality(draft.modality) || draft.modality.trim() || null,
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

  if (draft.program_template_key) {
    const strategicPlan = await createStrategicPlanFromProduct({
      clientId,
      referenceYear: new Date().getFullYear(),
    })
    if (strategicPlan.resolution.ok && strategicPlan.error) {
      return { error: `Programa salvo, mas o Plano Estratégico não foi sincronizado: ${strategicPlan.error}` }
    }
    if (!strategicPlan.resolution.ok && !['CLIENTE_SEM_PRODUTO', 'PRODUTO_NAO_USA_PLANO'].includes(strategicPlan.resolution.reason)) {
      return { error: `Programa salvo, mas o pacote de indicadores não pôde ser vinculado: ${strategicPlan.resolution.message}` }
    }
  }

  return { error: null }
}

/**
 * Fichas legadas têm carteira de consultores mas `implementation_owner_id`
 * vazio. O mais antigo responsável assume a implantação — o mesmo critério
 * de `planResponsibleRepair`.
 */
export async function ensureImplementationOwnerFromAssignments(
  clientId: string,
): Promise<{ updated: boolean; ownerId: string | null; error: string | null }> {
  const { data: client, error: clientError } = await supabase
    .from('clientes_consultoria')
    .select('implementation_owner_id')
    .eq('id', clientId)
    .maybeSingle()
  if (clientError) return { updated: false, ownerId: null, error: clientError.message }
  if (client?.implementation_owner_id) {
    return { updated: false, ownerId: client.implementation_owner_id, error: null }
  }

  const { data: assignments, error: assignmentError } = await supabase
    .from('atribuicoes_consultoria')
    .select('user_id, assignment_role, active, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })
  if (assignmentError) return { updated: false, ownerId: null, error: assignmentError.message }

  const owner = (assignments ?? []).find(row => row.active !== false && row.assignment_role === 'responsavel')
  if (!owner?.user_id) return { updated: false, ownerId: null, error: null }

  const { error } = await supabase
    .from('clientes_consultoria')
    .update({ implementation_owner_id: owner.user_id, updated_at: new Date().toISOString() })
    .eq('id', clientId)
  return { updated: !error, ownerId: owner.user_id, error: error?.message ?? null }
}

/**
 * Ficha já operando sem `contract_start_date`. Usa a data de criação da
 * conta — não inventa vigência, só materializa o que o cadastro já tem.
 */
export async function ensureContractStartFromCreatedAt(
  clientId: string,
): Promise<{ updated: boolean; start: string | null; error: string | null }> {
  const { data: client, error: readError } = await supabase
    .from('clientes_consultoria')
    .select('contract_start_date, created_at')
    .eq('id', clientId)
    .maybeSingle()
  if (readError) return { updated: false, start: null, error: readError.message }
  if (client?.contract_start_date) {
    return { updated: false, start: client.contract_start_date, error: null }
  }
  const start = typeof client?.created_at === 'string' ? client.created_at.slice(0, 10) : null
  if (!start) return { updated: false, start: null, error: null }

  const { error } = await supabase
    .from('clientes_consultoria')
    .update({ contract_start_date: start, updated_at: new Date().toISOString() })
    .eq('id', clientId)
  return { updated: !error, start, error: error?.message ?? null }
}
