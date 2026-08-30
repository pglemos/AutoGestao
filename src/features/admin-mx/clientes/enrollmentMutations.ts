import { supabase } from '@/lib/supabase'
import {
  buildEnrollmentUrl,
  generateEnrollmentToken,
  inviteProfileFromPersonRoles,
  resolveEnrollmentLinkStatus,
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

async function logPersonAccessAudit(input: {
  action: string
  entityId: string | null
  actorId: string | null
  details: Record<string, unknown>
}): Promise<void> {
  await supabase.from('logs_auditoria').insert({
    action: input.action,
    entity: 'acessos_cliente_consultoria',
    entity_id: input.entityId,
    user_id: input.actorId,
    details_json: input.details,
  })
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

/**
 * Reenvia o convite de uma identidade já cadastrada: reabre status inativo
 * para em_preparação, reusa um link ativo do mesmo perfil quando possível e
 * nunca insere outra linha em `acessos_cliente_consultoria`.
 */
export async function resendPersonInvite(input: {
  clientId: string
  clientSlug: string
  origin: string
  createdBy: string
  person: {
    id: string
    nome: string
    email: string
    papeis: string[]
    status: string
  }
}): Promise<{ url: string | null; error: string | null; reusedLink: boolean }> {
  if (!input.clientSlug) return { url: null, error: 'Cliente sem slug não pode gerar link de convite.', reusedLink: false }
  if (!input.person.email.trim()) return { url: null, error: 'Pessoa sem e-mail não recebe convite.', reusedLink: false }

  if (input.person.status === 'inativo') {
    const { error: reopenError } = await supabase
      .from('acessos_cliente_consultoria')
      .update({ status: 'em_preparacao', updated_at: new Date().toISOString() })
      .eq('id', input.person.id)
      .eq('client_id', input.clientId)
    if (reopenError) return { url: null, error: reopenError.message, reusedLink: false }
  }

  const perfil = inviteProfileFromPersonRoles(input.person.papeis)
  const listed = await listEnrollmentLinks(input.clientId)
  if (listed.error) return { url: null, error: listed.error, reusedLink: false }

  const reusable = listed.rows.find(link => {
    if (link.perfil_acesso !== perfil) return false
    return resolveEnrollmentLinkStatus({
      createdAt: link.created_at,
      validadeDias: link.validade_dias,
      limiteUsos: link.limite_usos,
      usosConsumidos: link.usos_consumidos,
      status: link.status as EnrollmentLinkStatus,
    }) === 'ativo'
  })

  let url: string | null = null
  let reusedLink = false
  if (reusable) {
    url = buildEnrollmentUrl(input.origin, input.clientSlug, reusable.token)
    reusedLink = true
  } else {
    const created = await createEnrollmentLink(
      input.clientId,
      input.clientSlug,
      input.origin,
      {
        perfil_acesso: perfil,
        nome_interno: `Convite ${input.person.nome.trim()}`.slice(0, 80),
        validade_dias: 7,
        limite_usos: 1,
      },
      input.createdBy,
    )
    if (created.error || !created.url) return { url: null, error: created.error ?? 'Não foi possível gerar o convite.', reusedLink: false }
    url = created.url
  }

  try {
    await logPersonAccessAudit({
      action: 'reenviar_convite_pessoa',
      entityId: input.person.id,
      actorId: input.createdBy,
      details: {
        client_id: input.clientId,
        email: input.person.email.trim().toLowerCase(),
        status_antes: input.person.status,
        reused_link: reusedLink,
      },
    })
  } catch {
    /* auditoria não bloqueia o convite */
  }

  return { url, error: null, reusedLink }
}
