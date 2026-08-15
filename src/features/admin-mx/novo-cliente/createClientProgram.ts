import { supabase } from '@/lib/supabase'
import { newClientSlug, onlyDigits, type NewClientDraft } from './newClientDraft'

export type CreateClientProgramResult = { clientId: string | null; slug: string | null; error: string | null }

/**
 * Grava o cliente e todas as suas coleções (lojas, contatos, módulos,
 * consultores). Se qualquer coleção falhar, o cliente recém-criado é arquivado
 * para não deixar cadastro pela metade na carteira.
 */
export async function createClientProgram(draft: NewClientDraft, createdBy: string): Promise<CreateClientProgramResult> {
  const slug = newClientSlug(draft.name)
  const { data: client, error: insertError } = await supabase
    .from('clientes_consultoria')
    .insert({
      name: draft.name.trim(),
      legal_name: draft.legal_name.trim() || null,
      cnpj: draft.cnpj.trim() ? onlyDigits(draft.cnpj) : null,
      notes: draft.notes.trim() || null,
      product_name: draft.product_name.trim() || null,
      program_template_key: draft.program_template_key.trim() || null,
      modality: draft.modality.trim() || null,
      structure_type: draft.structure_type,
      business_phase: draft.business_phase.trim() || null,
      implementation_owner_id: draft.implementation_owner_id || null,
      contract_start_date: draft.contract_start_date || null,
      contract_end_date: draft.contract_end_date || null,
      slug: slug || null,
      status: 'ativo',
      current_visit_step: 0,
      created_by: createdBy,
    })
    .select('id, slug')
    .single()

  if (insertError || !client) return { clientId: null, slug: null, error: insertError?.message ?? 'Falha ao criar o cliente.' }

  const rollback = async (message: string): Promise<CreateClientProgramResult> => {
    await supabase.from('clientes_consultoria').update({ status: 'arquivado' }).eq('id', client.id)
    return { clientId: null, slug: null, error: message }
  }

  const units = draft.units.filter(unit => unit.name.trim())
  if (units.length) {
    const { error } = await supabase.from('unidades_cliente_consultoria').insert(
      units.map(unit => ({
        client_id: client.id,
        name: unit.name.trim(),
        city: unit.city.trim() || null,
        state: unit.state.trim() || null,
        is_primary: unit.is_primary,
      })),
    )
    if (error) return rollback(`Cliente criado, mas as lojas falharam: ${error.message}`)
  }

  const contacts = draft.contacts.filter(contact => contact.name.trim())
  if (contacts.length) {
    const { error } = await supabase.from('contatos_cliente_consultoria').insert(
      contacts.map(contact => ({
        client_id: client.id,
        name: contact.name.trim(),
        role: contact.role.trim() || null,
        email: contact.email.trim() || null,
        phone: contact.phone.trim() || null,
        is_primary: contact.is_primary,
      })),
    )
    if (error) return rollback(`Cliente criado, mas os contatos falharam: ${error.message}`)
  }

  if (draft.enabled_modules.length) {
    const { error } = await supabase.from('modulos_cliente_consultoria').insert(
      draft.enabled_modules.map(moduleKey => ({
        client_id: client.id,
        module_key: moduleKey,
        label: moduleKey,
        enabled: true,
        configured_by: createdBy,
        configured_at: new Date().toISOString(),
      })),
    )
    if (error) return rollback(`Cliente criado, mas os módulos falharam: ${error.message}`)
  }

  if (draft.consultant_ids.length) {
    const { error } = await supabase.from('atribuicoes_consultoria').insert(
      draft.consultant_ids.map((userId, index) => ({
        client_id: client.id,
        user_id: userId,
        assignment_role: index === 0 ? 'responsavel' : 'apoio',
        active: true,
      })),
    )
    if (error) return rollback(`Cliente criado, mas os consultores falharam: ${error.message}`)
  }

  return { clientId: client.id, slug: client.slug ?? slug, error: null }
}
