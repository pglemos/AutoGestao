// Adapter mínimo que substitui o SDK @base44/sdk nos componentes portados do export.
// Entidades com efeito real são mapeadas para o Supabase do MX; leituras de entidades
// legadas não mapeadas retornam listas vazias, mas escritas falham explicitamente para
// nunca confirmar ao usuário uma mutação que não foi persistida.
import { supabase } from '@/lib/supabase'
import { normalizeOwnerConsultantRequestPayload } from '@/features/owner/lib/consultantRequest'

const ConsultantRequest = {
  async create(payload) {
    const normalizedPayload = normalizeOwnerConsultantRequestPayload(payload)
    const { data: auth, error: authError } = await supabase.auth.getUser()
    const userId = auth?.user?.id
    if (authError || !userId) throw new Error('Usuário não identificado')

    const { data, error } = await supabase
      .from('solicitacoes_consultoria')
      .insert({
        store_id: normalizedPayload.storeId,
        created_by: userId,
        request_type: normalizedPayload.requestType,
        subject: payload.subject || '',
        message: payload.message || '',
        priority: normalizedPayload.priority,
        context_type: normalizedPayload.contextType,
        context_id: payload.context_id || null,
        context_snapshot: normalizedPayload.contextSnapshot,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },
  async filter() {
    return []
  },
}

const unsupportedMutation = (entityName, operation) => {
  throw new Error(`Entidade Base44 não mapeada: ${entityName}.${operation}`)
}

const noopEntity = {
  async filter() {
    return []
  },
  async list() {
    return []
  },
  async get() {
    return null
  },
  async create() {
    return unsupportedMutation('desconhecida', 'create')
  },
  async update() {
    return unsupportedMutation('desconhecida', 'update')
  },
  async delete() {
    return unsupportedMutation('desconhecida', 'delete')
  },
}

const entities = new Proxy(
  { ConsultantRequest },
  {
    get(target, prop) {
      if (target[prop]) return target[prop]
      const entityName = String(prop)
      return {
        ...noopEntity,
        create: async () => unsupportedMutation(entityName, 'create'),
        update: async () => unsupportedMutation(entityName, 'update'),
        delete: async () => unsupportedMutation(entityName, 'delete'),
      }
    },
  },
)

export const base44 = {
  entities,
  asServiceRole: { entities },
}
