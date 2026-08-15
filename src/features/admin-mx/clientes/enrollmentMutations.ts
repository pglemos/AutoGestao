import { supabase } from '@/lib/supabase'
import {
  buildEnrollmentUrl,
  generateEnrollmentToken,
  validateEnrollmentLinkDraft,
  type EnrollmentLinkDraft,
  type EnrollmentLinkStatus,
} from './enrollmentLink'

export type EnrollmentLinkRow = {
  id: string
  client_id: string
  token: string
  perfil_acesso: string
  nome_interno: string | null
  validade_dias: number
  limite_usos: number
  usos_consumidos: number
  status: string
  created_at: string
}

export async function createEnrollmentLink(
  clientId: string,
  clientSlug: string,
  origin: string,
  draft: EnrollmentLinkDraft,
  createdBy: string,
): Promise<{ url: string | null; error: string | null }> {
  const invalid = validateEnrollmentLinkDraft(draft)
  if (invalid) return { url: null, error: invalid }
  if (!clientSlug) return { url: null, error: 'Cliente sem slug não pode gerar link de autocadastro.' }

  const token = generateEnrollmentToken()
  const { data, error } = await supabase
    .from('links_autocadastro_cliente')
    .insert({
      client_id: clientId,
      token,
      perfil_acesso: draft.perfil_acesso,
      nome_interno: draft.nome_interno.trim() || null,
      validade_dias: draft.validade_dias,
      limite_usos: draft.limite_usos,
      usos_consumidos: 0,
      status: 'ativo',
      created_by: createdBy,
    })
    .select('id')
    .single()
  if (error) return { url: null, error: error.message }

  return { url: buildEnrollmentUrl(origin, clientSlug, token), error: null }
}

export async function listEnrollmentLinks(clientId: string): Promise<{ rows: EnrollmentLinkRow[]; error: string | null }> {
  const { data, error } = await supabase
    .from('links_autocadastro_cliente')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)
  return { rows: (data ?? []) as EnrollmentLinkRow[], error: error?.message ?? null }
}

export async function cancelEnrollmentLink(linkId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('links_autocadastro_cliente')
    .update({ status: 'cancelado' as EnrollmentLinkStatus, updated_at: new Date().toISOString() })
    .eq('id', linkId)
  return { error: error?.message ?? null }
}
