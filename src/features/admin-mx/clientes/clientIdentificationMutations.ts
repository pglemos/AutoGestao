import { supabase } from '@/lib/supabase'
import { describeAdminRpcError } from '../equipe/adminRpcErrors'
import {
  identificationCnpjDigits,
  resolveClientShortName,
  validateClientIdentificationDraft,
  type ClientIdentificationDraft,
} from './clientIdentification'

function tableError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
): string | null {
  if (!error) return null
  return describeAdminRpcError(error, fallback)
}

export async function saveClientIdentification(input: {
  clientId: string
  unitId: string | null
  draft: ClientIdentificationDraft
  actorId: string
}): Promise<{ error: string | null }> {
  const errors = validateClientIdentificationDraft(input.draft, { requireAddress: false })
  if (errors.length) return { error: errors[0] }

  const name = resolveClientShortName(input.draft)
  const cnpj = identificationCnpjDigits(input.draft)
  const city = input.draft.city.trim()
  const state = input.draft.state.trim().toUpperCase()
  if ((city || state) && !input.unitId) return { error: 'Cadastre a loja principal antes de gravar cidade e UF.' }
  const before = await supabase
    .from('clientes_consultoria')
    .select('name, legal_name, cnpj, notes, structure_type, business_phase, contract_end_date')
    .eq('id', input.clientId)
    .maybeSingle()
  if (before.error) return { error: tableError(before.error, 'Não foi possível ler a identificação atual.') }

  const { error } = await supabase
    .from('clientes_consultoria')
    .update({
      name,
      legal_name: input.draft.legalName.trim(),
      cnpj,
      notes: input.draft.notes.trim() || null,
      structure_type: input.draft.structureType || 'LOJA_UNICA',
      business_phase: input.draft.businessPhase.trim() || null,
      contract_end_date: input.draft.contractEndDate.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.clientId)
  if (error) return { error: tableError(error, 'Não foi possível salvar a identificação do cliente.') }

  if (city && state && input.unitId) {
    const { error: unitError } = await supabase
      .from('unidades_cliente_consultoria')
      .update({
        city,
        state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.unitId)
      .eq('client_id', input.clientId)
    if (unitError) return { error: tableError(unitError, 'A identificação foi salva, mas a cidade/UF da unidade falhou.') }
  }


  await supabase.from('logs_auditoria').insert({
    action: 'editar_identificacao_cliente',
    entity: 'clientes_consultoria',
    entity_id: input.clientId,
    user_id: input.actorId,
    details_json: {
      antes: before.data,
      depois: {
        name,
        legal_name: input.draft.legalName.trim(),
        cnpj,
        city: input.draft.city.trim(),
        state: input.draft.state.trim().toUpperCase(),
        structure_type: input.draft.structureType || 'LOJA_UNICA',
        business_phase: input.draft.businessPhase.trim() || null,
        contract_end_date: input.draft.contractEndDate.trim() || null,
      },
    },
  })

  return { error: null }
}

export async function ensureOnboardingCompleteWhenActive(
  clientId: string,
): Promise<{ updated: boolean; error: string | null }> {
  const { data, error } = await supabase
    .from('clientes_consultoria')
    .select('status, onboarding_completed')
    .eq('id', clientId)
    .maybeSingle()
  if (error) return { updated: false, error: tableError(error, 'Não foi possível ler o onboarding.') }
  const ativo = ['ativo', 'ativa', 'active'].includes(String(data?.status ?? '').toLowerCase())
  if (!ativo || data?.onboarding_completed) return { updated: false, error: null }

  const { error: updateError } = await supabase
    .from('clientes_consultoria')
    .update({
      onboarding_completed: true,
      onboarding_step: 7,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clientId)
  return { updated: !updateError, error: tableError(updateError, 'Não foi possível encerrar o onboarding.') }
}
