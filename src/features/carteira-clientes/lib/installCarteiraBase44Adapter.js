import { supabase } from '@/lib/supabase'
import {
  canalToDb,
  financingToDb,
  mapMxClientToCarteiraVisual,
  situationToStage,
} from './carteira-mappers'
import { carteiraMutationCoordinator } from './carteira-mutation-coordinator'
import { readSimulationContext } from '@/hooks/auth/authHelpers'
import { cancelarVendaRpc } from '@/features/crm/lib/cancelarVenda'
import { parseCurrencyInput } from '@/lib/currency-mask'

const INSTALLED_KEY = '__mxCarteiraBase44AdapterInstalled'
const missionCache = new Map()

// Cacheado em vez de chamar supabase.auth.getUser() a cada operação: fazer
// isso logo após um supabase.rpc() (ex.: saveClient -> getVisualClient) faz o
// getUser() travar indefinidamente — a chamada RPC e o getUser() disputam o
// mesmo lock interno de sessão do supabase-js quando encadeados na mesma
// tick. useExecutionActions (Central de Execução) evita o problema lendo o
// id do usuário já resolvido via useAuth(); este módulo roda fora de
// componentes React (instalado uma vez no import), então cacheamos aqui.
let cachedUserIdPromise = null

export function resetCarteiraAuthCache() {
  cachedUserIdPromise = null
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
    resetCarteiraAuthCache()
  }
})

function getCurrentUserId() {
  if (!cachedUserIdPromise) {
    cachedUserIdPromise = supabase.auth.getUser().then(({ data }) => data.user?.id ?? null)
  }
  return cachedUserIdPromise
}

export async function resolveCarteiraExecutionContext() {
  const authenticatedUserId = await getCurrentUserId()
  if (!authenticatedUserId) {
    return {
      authenticatedUserId: null,
      sellerUserId: null,
      storeId: null,
      isSimulation: false,
    }
  }

  const simulation = readSimulationContext()
  if (simulation) {
    return {
      authenticatedUserId,
      sellerUserId: simulation.sellerUserId,
      storeId: simulation.storeId,
      isSimulation: true,
    }
  }

  return {
    authenticatedUserId,
    sellerUserId: authenticatedUserId,
    storeId: null,
    isSimulation: false,
  }
}

function yieldSupabaseClient() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

function matchesQuery(row, query) {
  if (!query) return true
  return Object.entries(query).every(([key, expected]) => {
    const actual = row[key]
    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$gte' in expected && !(actual >= expected.$gte)) return false
      if ('$lte' in expected && !(actual <= expected.$lte)) return false
      if ('$gt' in expected && !(actual > expected.$gt)) return false
      if ('$lt' in expected && !(actual < expected.$lt)) return false
      if ('$in' in expected && !expected.$in.includes(actual)) return false
      return true
    }
    return actual === expected
  })
}

function sortRows(rows, order) {
  if (!order) return rows
  const descending = order.startsWith('-')
  const key = descending ? order.slice(1) : order
  return [...rows].sort((left, right) => {
    const a = left[key]
    const b = right[key]
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    const result = typeof a === 'string' ? a.localeCompare(String(b)) : Number(a) - Number(b)
    return descending ? -result : result
  })
}

function mapClientStatus(data) {
  const situation = String(data.situacao_atual || data.momento || '')
  const status = String(data.status_comercial || '')
  if (status === 'Vendido' || situation === 'Venda realizada') return 'pos_venda'
  if (data.ativo === false || data.do_not_contact === true || status === 'Perdido' || situation === 'Cadência encerrada') return 'inativo'
  if (data.ativo === true || data.nome || data.telefone || data.whatsapp) return 'oportunidade'
  return undefined
}

function mapEventType(data, isCreate) {
  const situation = String(data.situacao_atual || data.momento || '')
  const status = String(data.status_comercial || '')
  if (status === 'Vendido' || situation === 'Venda realizada') return 'venda_realizada'
  if (situation.includes('Proposta')) return 'proposta_enviada'
  if (data.visita_agendada_em) return 'agendamento_criado'
  return isCreate ? 'oportunidade_registrada' : 'retorno_realizado'
}

function put(target, key, value) {
  if (value !== undefined) target[key] = value
}

function toDateOnly(value) {
  if (!value) return null
  const match = String(value).trim().match(/^\d{4}-\d{2}-\d{2}/)
  return match ? match[0] : null
}

// Competência é um fato comercial informado pelo usuário. Nunca derivar de
// created_at/updated_at/closed_at: esses campos representam o instante de
// persistência ou de transição, não o mês da venda.
export function resolveSaleCompetence(data) {
  return toDateOnly(data.data_competencia ?? data.sale_date ?? data.data_venda)
}

export function buildRpcPayload(data, clientId, executionContext) {
  const payload = {}
  const history = data.historico || null
  const nextAction = data.proximo_passo ?? data.proxima_acao
  const nextActionDate = data.proxima_acao_data ?? data.proxima_acao_em
  const channel = data.canal_comercial ?? data.canal_entrada ?? data.canal_origem
  const clientStatus = mapClientStatus(data)
  const terminal = data.ativo === false
    || data.status_comercial === 'Vendido'
    || data.status_comercial === 'Perdido'
    || data.status_comercial === 'Cancelada'

  put(payload, 'cliente_id', clientId ?? data.cliente_id)
  put(payload, 'oportunidade_id', data.oportunidade_id)
  put(payload, 'agendamento_id', data.agendamento_id)
  put(payload, 'nome', data.nome)
  put(payload, 'telefone', data.telefone ?? data.whatsapp)
  if (channel !== undefined) {
    payload.canal_origem = canalToDb(channel)
    payload.canal = canalToDb(channel)
  }
  put(payload, 'cliente_status', clientStatus)
  put(payload, 'proxima_acao', terminal ? null : nextAction)
  if (terminal) {
    payload.proxima_acao_em = null
  } else if (nextActionDate !== undefined && nextActionDate !== null && nextActionDate !== '') {
    payload.proxima_acao_em = String(nextActionDate).slice(0, 10)
  }
  const parsedValorVenda = data.valor_venda != null && data.valor_venda !== ''
    ? (typeof data.valor_venda === 'number' ? data.valor_venda : parseCurrencyInput(String(data.valor_venda)))
    : null
  const valorFinal = parsedValorVenda ?? data.valor_negociado ?? data.potencial_negocio

  put(payload, 'potencial_negocio', valorFinal)
  put(payload, 'observacoes', data.observacoes ?? data.origem_detalhada)
  put(payload, 'do_not_contact', data.do_not_contact)
  put(payload, 'do_not_contact_reason', data.do_not_contact_reason)
  put(payload, 'reactivation_at', data.reactivation_at)
  put(payload, 'nova_oportunidade', data.nova_oportunidade)

  put(payload, 'veiculo_interesse', data.veiculo_comprado || data.veiculo_interesse)
  // Sinais estruturados usados pelo match veículo × oportunidade. Eles são
  // opcionais para preservar o texto livre e permitem limpar um valor com
  // `null` durante a edição da ficha.
  put(payload, 'categoria_veiculo', data.categoria_veiculo)
  put(payload, 'catalog_model_id', data.catalog_model_id)
  put(payload, 'classification_source', data.classification_source)
  if (data.preco_interesse_min !== undefined) {
    payload.preco_interesse_min = data.preco_interesse_min === '' || data.preco_interesse_min === null
      ? null
      : Number(data.preco_interesse_min)
  }
  if (data.preco_interesse_max !== undefined) {
    payload.preco_interesse_max = data.preco_interesse_max === '' || data.preco_interesse_max === null
      ? null
      : Number(data.preco_interesse_max)
  }
  put(payload, 'valor_negociado', valorFinal)
  if (data.situacao_atual !== undefined || data.momento !== undefined || data.status_comercial !== undefined) {
    payload.etapa = situationToStage(data)
  }
  put(payload, 'sinal', data.sinal)
  if (data.financiamento !== undefined) payload.financiamento = financingToDb(data.financiamento)
  else if (data.interesse_financiamento !== undefined) payload.financiamento = data.interesse_financiamento ? 'pendente' : 'nao_aplica'
  if (data.carro_avaliado !== undefined || data.interesse_troca !== undefined) {
    payload.carro_avaliado = data.carro_avaliado === true || data.carro_avaliado === 'Sim' || data.interesse_troca === true
  }
  put(payload, 'veiculo_troca', data.veiculo_troca)
  put(payload, 'valor_troca', data.valor_troca)
  put(payload, 'motivo_perda', data.motivo_perda)
  put(payload, 'origem_detalhada', data.origem_detalhada)
  put(payload, 'placa_veiculo', data.placa_veiculo)
  put(payload, 'veiculo_comprado', data.veiculo_comprado || data.veiculo_interesse)
  put(payload, 'data_venda', data.data_venda)
  put(payload, 'valor_venda', parsedValorVenda ?? undefined)
  const saleCompetence = resolveSaleCompetence(data)
  if (saleCompetence) {
    payload.data_competencia = saleCompetence
    payload.sale_date = saleCompetence
  }
  put(payload, 'preferencia_modalidade', data.preferencia_modalidade ?? data.modalidade)
  put(payload, 'urgencia_compra', data.urgencia_compra ?? data.urgencia)

  if (data.proposta_enviada === true && !terminal) payload.etapa = 'apresentacao'

  const simulation = executionContext === undefined
    ? readSimulationContext()
    : executionContext?.isSimulation
      ? executionContext
      : null
  if (simulation) {
    payload.acting_seller_user_id = simulation.sellerUserId
    payload.acting_store_id = simulation.storeId
  }

  if (data.visita_agendada_em) {
    payload.agendamento_data_hora = data.visita_agendada_em
    payload.agendamento_tipo = 'visita'
    payload.agendamento_status = 'confirmado'
  }

  payload.registrar_interacao = Boolean(data.ultimo_contato || data.registrar_interacao || history)
  payload.tipo_evento = mapEventType(data, !clientId)
  payload.evento_observacao = history?.descricao || data.evento_observacao || (clientId ? 'Carteira atualizada.' : 'Cliente incluído na carteira.')
  payload.evento_metadata = {
    origem: 'base44_1to1_adapter',
    data_competencia: saleCompetence ?? null,
    situacao_atual: data.situacao_atual ?? data.momento ?? null,
    status_comercial: data.status_comercial ?? null,
    temperatura: data.temperatura ?? null,
    proximo_passo: nextAction ?? null,
    proposta_enviada: data.proposta_enviada ?? null,
    financiamento: data.financiamento ?? null,
    interesse_financiamento: data.interesse_financiamento ?? null,
    interesse_troca: data.interesse_troca ?? null,
    veiculo_troca: data.veiculo_troca ?? null,
    valor_troca: data.valor_troca ?? null,
    ...(history ? {
      tipo: history.tipo || null,
      descricao: history.descricao || null,
      resultado: history.resultado || null,
      momento_anterior: history.momento_anterior || null,
      momento_novo: history.momento_novo || null,
      missao_id: history.missao_id || null,
    } : {}),
  }

  return payload
}

async function listVisualClients(query, order, limit, executionContext) {
  try {
    const context = executionContext || await resolveCarteiraExecutionContext()
    const userId = context.sellerUserId
    if (!userId) return []

    const { data: userProfile } = await supabase
      .from('usuarios')
      .select('role')
      .eq('id', userId)
      .maybeSingle()

    const role = userProfile?.role || 'vendedor'

    let dbQuery = supabase
      .from('clientes')
      .select('*, oportunidades(*), agendamentos(*)')

    let scopedStoreId = context.isSimulation ? context.storeId : null

    if (role === 'vendedor') {
      dbQuery = dbQuery.eq('seller_user_id', userId)
    } else if (role === 'gerente' && !scopedStoreId) {
      const { data: storeLink } = await supabase
        .from('vinculos_loja')
        .select('store_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()
      scopedStoreId = storeLink?.store_id || null
    }

    if (scopedStoreId) {
      dbQuery = dbQuery.eq('loja_id', scopedStoreId)
    }

    const { data, error } = await dbQuery
    if (error) {
      console.error('[CarteiraAdapter] Error fetching clients:', error)
      return []
    }

    const mapped = (data || []).map(row => mapMxClientToCarteiraVisual(row))
    const filtered = mapped.filter(row => matchesQuery(row, query))
    const sorted = sortRows(filtered, order)
    return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
  } catch (err) {
    console.error('[CarteiraAdapter] Exception in listVisualClients:', err)
    return []
  }
}

async function getVisualClient(id, executionContext) {
  const list = await listVisualClients({ id }, '-updated_date', 1, executionContext)
  return list[0] ?? null
}

async function saveClient(data, clientId) {
  const context = await resolveCarteiraExecutionContext()
  if (!context.sellerUserId) throw new Error('Usuário não autenticado.')
  const scope = clientId ? `carteira:update:${clientId}` : 'carteira:create'
  const payload = buildRpcPayload(data, clientId, context)
  return carteiraMutationCoordinator.run(scope, payload, async key => {
    const { data: result, error } = await supabase.rpc('carteira_salvar_cliente_v2', {
      p_payload: payload,
      p_idempotency_key: key,
    })

    if (error) throw error
    if (!result?.ok) throw new Error(result?.error || 'Não foi possível salvar o cliente.')

    // Evita contenção do lock interno de sessão do supabase-js entre RPC e
    // a leitura de hidratação executada imediatamente depois.
    await yieldSupabaseClient()

    const hydrated = await getVisualClient(result.cliente_id, context)
    if (!hydrated) throw new Error('Cliente salvo, mas não foi possível recarregar a ficha.')
    return hydrated
  })
}

function historyTypeLabel(type) {
  const labels = {
    oportunidade_registrada: 'Oportunidade registrada',
    cliente_qualificado: 'Cliente qualificado',
    agendamento_criado: 'Agendamento criado',
    atendimento_comercial_realizado: 'Atendimento comercial',
    venda_realizada: 'Venda realizada',
    proposta_enviada: 'Proposta enviada',
    retorno_realizado: 'Resultado registrado',
    entrega_realizada: 'Entrega realizada',
    garantia_registrada: 'Garantia registrada',
    pos_venda_realizado: 'Pós-venda realizado',
  }
  return labels[type] || 'Evento comercial'
}

function mapHistory(row) {
  const metadata = row.metadata || {}
  return {
    id: row.id,
    cliente_id: row.cliente_id,
    vendedor_id: row.seller_user_id,
    tipo: metadata.tipo || historyTypeLabel(row.tipo_evento),
    descricao: row.observacao || metadata.descricao || '',
    resultado: metadata.resultado || null,
    momento_anterior: metadata.momento_anterior || metadata.situacao_anterior || null,
    momento_novo: metadata.momento_novo || metadata.situacao_nova || null,
    missao_id: metadata.missao_id || null,
    created_date: row.data_evento || row.created_at,
    updated_date: row.data_evento || row.created_at,
  }
}

async function createHistory(data) {
  // Compatibilidade para históricos independentes. Mutações de cliente que
  // também registram histórico usam `historico` no mesmo RPC transacional.
  const context = await resolveCarteiraExecutionContext()
  return carteiraMutationCoordinator.run(`carteira:history:${data.cliente_id}`, data, async key => {
    await yieldSupabaseClient()

    const metadata = {
      tipo: data.tipo || null,
      descricao: data.descricao || null,
      resultado: data.resultado || null,
      momento_anterior: data.momento_anterior || null,
      momento_novo: data.momento_novo || null,
      missao_id: data.missao_id || null,
    }

    const client = await getVisualClient(data.cliente_id, context)
    if (!client) throw new Error('Cliente não encontrado para registrar o histórico.')

    const eventPayload = {
      cliente_id: data.cliente_id,
      oportunidade_id: client.oportunidade_id || null,
      agendamento_id: client.agendamento_id || null,
      loja_id: client.loja_id,
      seller_user_id: client.vendedor_id,
      tipo_evento: 'retorno_realizado',
      data_evento: new Date().toISOString(),
      origem_modulo: 'carteira_base44',
      observacao: data.descricao || data.tipo || 'Evento comercial',
      metadata,
      created_by: client.vendedor_id,
      idempotency_key: key,
    }
    const { data: inserted, error } = await supabase
      .from('eventos_comerciais')
      .upsert(eventPayload, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      .select('*')
      .maybeSingle()

    if (error) throw error
    let created = inserted
    if (!created) {
      const { data: existing, error: existingError } = await supabase
        .from('eventos_comerciais')
        .select('*')
        .eq('idempotency_key', key)
        .single()
      if (existingError) throw existingError
      created = existing
    }
    return mapHistory(created)
  })
}

async function getSellerStoreContext() {
  const context = await resolveCarteiraExecutionContext()
  if (!context.sellerUserId) return null
  if (context.isSimulation) {
    return { userId: context.sellerUserId, storeId: context.storeId }
  }

  const { data, error } = await supabase
    .from('vinculos_loja')
    .select('store_id')
    .eq('user_id', context.sellerUserId)
    .eq('is_active', true)
    .in('role', ['vendedor', 'seller'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data?.store_id ? { userId: context.sellerUserId, storeId: data.store_id } : null
}

async function listArrivedVehicles(query, order, limit) {
  const context = await getSellerStoreContext()
  if (!context) return []

  const { data, error } = await supabase
    .from('veiculos_estoque')
    .select('*')
    .eq('loja_id', context.storeId)

  if (error) throw error
  const mapped = (data || []).map(row => ({
    ...row,
    vendedor_id: row.created_by,
    ativo: row.status !== 'vendido',
  }))
  const filtered = mapped.filter(row => matchesQuery(row, query))
  const sorted = sortRows(filtered, order)
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
}

async function createArrivedVehicle(data) {
  const context = await getSellerStoreContext()
  if (!context) throw new Error('Vendedor sem vínculo ativo com loja.')

  const payload = buildArrivedVehiclePayload(data, context)

  return carteiraMutationCoordinator.run('carteira:vehicle:create', payload, async key => {
    const { data: created, error } = await supabase
      .from('veiculos_estoque')
      .upsert({ ...payload, idempotency_key: key }, { onConflict: 'created_by,idempotency_key' })
      .select('*')
      .single()

    if (error) throw error
    return { ...created, vendedor_id: created.created_by, ativo: true }
  })
}

export function buildArrivedVehiclePayload(data, context, includeCreatedBy = true) {
  const price = data.preco === undefined || data.preco === null || data.preco === ''
    ? null
    : Number(data.preco)
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Preço do veículo inválido.')
  if (!String(data.marca || '').trim() || !String(data.modelo || '').trim()) {
    throw new Error('Informe marca e modelo do veículo.')
  }

  return {
    loja_id: context.storeId,
    ...(includeCreatedBy ? { created_by: context.userId } : {}),
    marca: String(data.marca).trim(),
    modelo: String(data.modelo).trim(),
    versao: String(data.versao || '').trim() || null,
    ano: String(data.ano || '').trim() || null,
    preco: price,
    data_entrada: data.data_entrada || new Date().toISOString().slice(0, 10),
    observacao: String(data.observacao || '').trim() || null,
    ...(includeCreatedBy ? { status: data.status || 'disponivel' } : {}),
    // PRODUCT DELTA 2026-08-07 §13 — classificação via catálogo mentor.
    categoria: data.categoria || null,
    catalog_model_id: data.catalog_model_id || null,
    classification_source: data.classification_source || null,
  }
}

async function updateArrivedVehicle(id, data) {
  const context = await getSellerStoreContext()
  if (!context) throw new Error('Vendedor sem vínculo ativo com loja.')
  if (!id) throw new Error('Veículo não identificado.')

  const payload = buildArrivedVehiclePayload(data, context, false)
  return carteiraMutationCoordinator.run(`carteira:vehicle:update:${id}`, payload, async () => {
    const { data: updated, error } = await supabase
      .from('veiculos_estoque')
      .update(payload)
      .eq('id', id)
      .eq('loja_id', context.storeId)
      .select('*')
      .single()

    if (error) throw error
    return { ...updated, vendedor_id: updated.created_by, ativo: updated.status !== 'vendido' }
  })
}

async function listCampaigns(executionContext) {
  const context = executionContext || await resolveCarteiraExecutionContext()
  const { data, error } = await supabase.rpc('carteira_listar_campanhas', {
    p_acting_seller_user_id: context.isSimulation ? context.sellerUserId : null,
    p_acting_store_id: context.isSimulation ? context.storeId : null,
  })
  if (error) throw error
  return data || []
}

async function createCampaign(data) {
  const context = await resolveCarteiraExecutionContext()
  return carteiraMutationCoordinator.run('carteira:campaign:create', data, async key => {
    const { data: result, error } = await supabase.rpc('carteira_salvar_campanha', {
      p_payload: data,
      p_idempotency_key: key,
      p_acting_seller_user_id: context.isSimulation ? context.sellerUserId : null,
      p_acting_store_id: context.isSimulation ? context.storeId : null,
    })
    if (error) throw error
    if (!result?.ok) throw new Error(result?.error || 'Não foi possível salvar a campanha.')
    const campaigns = await listCampaigns(context)
    return campaigns.find(campaign => campaign.id === result.campanha_id) || result
  })
}

async function listVehicleCatalog() {
  // Catálogo mentor (PRODUCT DELTA 2026-08-07 §9): global, leitura via RLS
  // para autenticados vinculados a loja. Não é dado por loja — sem filtro.
  const { data, error } = await supabase
    .from('vehicle_model_catalog')
    .select('*')
    .order('normalized_brand', { ascending: true })
    .order('normalized_model', { ascending: true })
  if (error) throw error
  return data || []
}

async function cancelarVenda(oportunidadeId, motivo) {
  await yieldSupabaseClient()
  const { error } = await cancelarVendaRpc(oportunidadeId, motivo)
  if (error) throw new Error(error)
  const clientId = await (async () => {
    const { data } = await supabase.from('oportunidades').select('cliente_id').eq('id', oportunidadeId).maybeSingle()
    return data?.cliente_id || null
  })()
  return clientId ? getVisualClient(clientId) : null
}

async function loadMission(id) {
  await yieldSupabaseClient()
  const { data: mission, error } = await supabase
    .from('carteira_missoes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  missionCache.set(mission.id, mission)
  return mission
}

export function installCarteiraBase44Adapter(base44) {
  if (base44[INSTALLED_KEY]) return

  base44.entities.CarteiraCliente = {
    filter: listVisualClients,
    list: (order, limit) => listVisualClients(null, order, limit),
    get: getVisualClient,
    create: data => saveClient(data),
    update: (id, data) => saveClient(data, id),
    cancelarVenda,
  }

  base44.entities.Client = base44.entities.CarteiraCliente

  base44.entities.CarteiraHistorico = {
    filter: async (query, order, limit) => {
      const context = await resolveCarteiraExecutionContext()
      const userId = context.sellerUserId
      if (!userId) return []

      let request = supabase
        .from('eventos_comerciais')
        .select('*')
        .eq('seller_user_id', userId)

      if (query?.cliente_id) request = request.eq('cliente_id', query.cliente_id)
      if (context.storeId) request = request.eq('loja_id', context.storeId)
      const { data, error } = await request.order('data_evento', { ascending: false }).limit(limit || 100)
      if (error) throw error
      return sortRows((data || []).map(mapHistory).filter(row => matchesQuery(row, query)), order)
    },
    create: createHistory,
  }

  base44.entities.CarteiraMissao = {
    filter: async (query, order, limit) => {
      const context = await resolveCarteiraExecutionContext()
      const userId = context.sellerUserId
      if (!userId) return []
      let request = supabase
        .from('carteira_missoes')
        .select('*')
        .eq('seller_user_id', userId)
      if (context.storeId) request = request.eq('loja_id', context.storeId)
      const { data, error } = await request.order('iniciada_em', { ascending: false })
      if (error) throw error
      for (const mission of data || []) missionCache.set(mission.id, mission)
      const filtered = (data || []).filter(row => matchesQuery(row, query))
      const sorted = sortRows(filtered, order)
      return typeof limit === 'number' ? sorted.slice(0, limit) : sorted
    },
    list: (order, limit) => base44.entities.CarteiraMissao.filter(null, order, limit),
    create: async data => {
      return carteiraMutationCoordinator.run('carteira:mission:start', data, async key => {
        const { data: result, error } = await supabase.rpc('carteira_iniciar_missao_v2', {
          p_payload: data,
          p_idempotency_key: key,
        })
        if (error) throw error
        return loadMission(result.missao_id)
      })
    },
    update: async (id, data) => {
      const cached = missionCache.get(id) || await loadMission(id)
      const payload = {
        ...data,
        expected_revision: data.expected_revision ?? cached.revision,
      }
      return carteiraMutationCoordinator.run(`carteira:mission:update:${id}`, payload, async key => {
        const { error } = await supabase.rpc('carteira_atualizar_missao_v2', {
          p_missao_id: id,
          p_payload: payload,
          p_idempotency_key: key,
        })
        if (error) throw error
        return loadMission(id)
      })
    },
  }

  base44.entities.VeiculoChegado = {
    filter: listArrivedVehicles,
    list: (order, limit) => listArrivedVehicles(null, order, limit),
    create: createArrivedVehicle,
    update: updateArrivedVehicle,
  }

  base44.entities.CarteiraCampanha = {
    filter: listCampaigns,
    list: listCampaigns,
    create: createCampaign,
  }

  base44.entities.CatalogoModelos = {
    list: listVehicleCatalog,
  }

  base44[INSTALLED_KEY] = true
}
