import type { PersonProfile } from './personAccess'
import type { PersonAccessRow } from './personMutations'

/** Vínculo operacional de uma pessoa com uma loja (`vinculos_loja`). */
export type VinculoLojaRow = {
  id?: string
  user_id: string
  store_id: string
  role: string | null
  is_active?: boolean | null
  ended_at?: string | null
}

/** Usuário operacional (`usuarios`). */
export type UsuarioRow = {
  id: string
  name?: string | null
  email?: string | null
  active?: boolean | null
  phone?: string | null
  declared_function?: string | null
  default_view?: string | null
}

/** Prefixo dos ids sintéticos: a pessoa existe na operação, não em acessos. */
export const VINCULO_PERSON_ID_PREFIX = 'vinculo:'

export function isVinculoPersonId(id: string): boolean {
  return id.startsWith(VINCULO_PERSON_ID_PREFIX)
}

export function vinculoPersonUserId(id: string): string | null {
  return isVinculoPersonId(id) ? id.slice(VINCULO_PERSON_ID_PREFIX.length) : null
}

const ROLE_TO_PROFILE: Record<string, PersonProfile> = {
  dono: 'DONO',
  gerente: 'GERENTE_COMERCIAL',
  vendedor: 'VENDEDOR',
}

/**
 * Traduz o papel operacional de `vinculos_loja` para o perfil de acesso da
 * consultoria. Papel desconhecido volta `null` em vez de virar um perfil
 * qualquer — inventar perfil aqui daria acesso que ninguém concedeu.
 */
export function mapVinculoRoleToProfile(role: string | null | undefined): PersonProfile | null {
  const key = String(role ?? '').trim().toLowerCase()
  return ROLE_TO_PROFILE[key] ?? null
}

export function isVinculoActive(vinculo: Pick<VinculoLojaRow, 'is_active' | 'ended_at'>): boolean {
  return vinculo.is_active !== false && !vinculo.ended_at
}

function normalizeEmail(email: string | null | undefined): string {
  return String(email ?? '').trim().toLowerCase()
}

/**
 * Lojas que respondem por um cliente da consultoria.
 *
 * São três origens complementares: a loja principal do cliente, as lojas
 * apontadas pelas unidades cadastradas e as filiais penduradas em qualquer uma
 * delas via `parent_loja_id`. Unidade sem `store_id` (cadastro incompleto ou
 * lixo de teste) fica de fora — não existe loja para consultar.
 */
export function collectClientStoreIds(input: {
  primaryStoreId?: string | null
  unidades?: ReadonlyArray<{ store_id?: string | null }>
  lojas?: ReadonlyArray<{ id: string; parent_loja_id?: string | null }>
}): string[] {
  const ids = new Set<string>()
  if (input.primaryStoreId) ids.add(input.primaryStoreId)
  for (const unidade of input.unidades ?? []) {
    if (unidade.store_id) ids.add(unidade.store_id)
  }
  if (!ids.size) return []
  for (const loja of input.lojas ?? []) {
    if (loja.parent_loja_id && ids.has(loja.parent_loja_id)) ids.add(loja.id)
  }
  return [...ids]
}

type Accumulator = {
  row: PersonAccessRow
  papeis: Set<string>
  lojas: Set<string>
  fromAcesso: boolean
  fromVinculo: boolean
  vinculoAtivo: boolean
  usuarioAtivo: boolean
}

function accumulatorKey(email: string, userId: string | null): string {
  return email || (userId ? `user:${userId}` : '')
}

/**
 * Junta a tabela de acessos da consultoria com os vínculos operacionais das
 * lojas do cliente.
 *
 * Sem esse merge, um cliente cuja equipe só existe em `vinculos_loja` aparece
 * com zero pessoas na tela do Admin, que foi o caso da AG Automóveis: 23
 * vínculos ativos na matriz e nas duas filiais e nenhuma linha em
 * `acessos_cliente_consultoria`.
 *
 * `is_dono_master` continua vindo só de acessos: `role = 'dono'` no vínculo
 * diz que a pessoa é dona da loja, não que alguém a designou Dono Master da
 * conta. Promover é um ato explícito e fica com o fluxo da tela.
 */
export function mergeAccessAndVinculos(input: {
  clientId: string
  acessos?: ReadonlyArray<PersonAccessRow>
  vinculos?: ReadonlyArray<VinculoLojaRow>
  usuarios?: ReadonlyArray<UsuarioRow>
}): PersonAccessRow[] {
  const usuarios = new Map((input.usuarios ?? []).map(usuario => [usuario.id, usuario]))
  const byKey = new Map<string, Accumulator>()
  const order: string[] = []

  const ensure = (key: string, factory: () => Accumulator): Accumulator => {
    const current = byKey.get(key)
    if (current) return current
    const created = factory()
    byKey.set(key, created)
    order.push(key)
    return created
  }

  for (const acesso of input.acessos ?? []) {
    const key = accumulatorKey(normalizeEmail(acesso.email), acesso.id)
    if (!key) continue
    const entry = ensure(key, () => ({
      row: { ...acesso, papeis: [], lojas_autorizadas: [], source: 'acesso' as const },
      papeis: new Set<string>(),
      lojas: new Set<string>(),
      fromAcesso: true,
      fromVinculo: false,
      vinculoAtivo: false,
      usuarioAtivo: true,
    }))
    entry.fromAcesso = true
    for (const papel of acesso.papeis ?? []) entry.papeis.add(papel)
    for (const loja of acesso.lojas_autorizadas ?? []) entry.lojas.add(loja)
  }

  for (const vinculo of input.vinculos ?? []) {
    if (!isVinculoActive(vinculo)) continue
    const usuario = usuarios.get(vinculo.user_id)
    const email = normalizeEmail(usuario?.email)
    const key = accumulatorKey(email, vinculo.user_id)
    if (!key) continue
    const entry = ensure(key, () => ({
      row: {
        id: `${VINCULO_PERSON_ID_PREFIX}${vinculo.user_id}`,
        client_id: input.clientId,
        nome: usuario?.name?.trim() || email || 'Sem nome',
        email,
        telefone: usuario?.phone ?? null,
        funcao_declarada: usuario?.declared_function ?? null,
        papeis: [],
        lojas_autorizadas: [],
        is_dono_master: false,
        visao_padrao: usuario?.default_view ?? null,
        status: 'ativo',
        created_at: '',
        source: 'vinculo' as const,
      },
      papeis: new Set<string>(),
      lojas: new Set<string>(),
      fromAcesso: false,
      fromVinculo: false,
      vinculoAtivo: false,
      usuarioAtivo: usuario?.active !== false,
    }))
    entry.fromVinculo = true
    entry.vinculoAtivo = true
    entry.usuarioAtivo = entry.usuarioAtivo && usuario?.active !== false
    entry.lojas.add(vinculo.store_id)
    const profile = mapVinculoRoleToProfile(vinculo.role)
    if (profile) entry.papeis.add(profile)
    // A pessoa já cadastrada em acessos mantém o cadastro da consultoria como
    // fonte de nome/telefone; o vínculo só preenche o que estiver vazio.
    if (!entry.row.nome && usuario?.name) entry.row.nome = usuario.name
    if (!entry.row.telefone && usuario?.phone) entry.row.telefone = usuario.phone
    if (!entry.row.funcao_declarada && usuario?.declared_function) {
      entry.row.funcao_declarada = usuario.declared_function
    }
  }

  const rows = order.map(key => {
    const entry = byKey.get(key) as Accumulator
    const source: PersonAccessRow['source'] = entry.fromAcesso && entry.fromVinculo
      ? 'ambos'
      : entry.fromAcesso ? 'acesso' : 'vinculo'
    const status = entry.fromAcesso
      ? entry.row.status
      : entry.vinculoAtivo && entry.usuarioAtivo ? 'ativo' : 'inativo'
    return {
      ...entry.row,
      papeis: [...entry.papeis],
      lojas_autorizadas: [...entry.lojas],
      status,
      source,
    }
  })

  return rows.sort((a, b) => {
    if (a.is_dono_master !== b.is_dono_master) return a.is_dono_master ? -1 : 1
    const byName = a.nome.localeCompare(b.nome, 'pt-BR')
    return byName !== 0 ? byName : a.email.localeCompare(b.email, 'pt-BR')
  })
}

/**
 * Chave de identidade de pessoa para contagem distinta na carteira: e-mail
 * normalizado quando existe, senão o id do usuário. Sem isso, quem tem vínculo
 * na matriz e na filial seria contado duas vezes no card "Pessoas".
 */
export function personIdentityKey(person: { email?: string | null; user_id?: string | null }): string {
  return normalizeEmail(person.email) || (person.user_id ? `user:${person.user_id}` : '')
}

export type OperationalLoja = {
  id: string
  name?: string | null
  parent_loja_id?: string | null
  city?: string | null
  state?: string | null
  cnpj?: string | null
  active?: boolean | null
}

export type DisplayClientUnit = {
  id: string
  client_id: string
  store_id: string | null
  name: string
  city: string | null
  state: string | null
  is_primary: boolean
  store_type: string | null
  cnpj: string | null
  status: string | null
  synthetic: boolean
}

/**
 * Unidades que a tela deve mostrar: as lojas operacionais da matriz e das
 * filiais. Cadastro sem `store_id` (lixo de QA, unidade órfã) não conta como
 * loja. Loja operacional sem linha em `unidades_cliente_consultoria` entra
 * mesmo assim — é o caso da AG, em que 3 Piso e Tito existem em `lojas` e
 * não na tabela de unidades.
 */
export function mergeOperationalUnits(input: {
  clientId: string
  primaryStoreId?: string | null
  units?: ReadonlyArray<{
    id: string
    store_id?: string | null
    name?: string | null
    city?: string | null
    state?: string | null
    is_primary?: boolean | null
    store_type?: string | null
    cnpj?: string | null
    status?: string | null
  }>
  lojas?: ReadonlyArray<OperationalLoja>
}): DisplayClientUnit[] {
  const lojas = input.lojas ?? []
  const storeIds = collectClientStoreIds({
    primaryStoreId: input.primaryStoreId,
    unidades: input.units ?? [],
    lojas,
  })
  if (!storeIds.length) return []

  const lojaById = new Map(lojas.map(loja => [loja.id, loja]))
  const unitByStore = new Map<string, NonNullable<typeof input.units>[number]>()
  for (const unit of input.units ?? []) {
    if (unit.store_id) unitByStore.set(unit.store_id, unit)
  }

  return storeIds.map(storeId => {
    const loja = lojaById.get(storeId)
    const unit = unitByStore.get(storeId)
    const isPrimary = storeId === input.primaryStoreId || unit?.is_primary === true
    const isFilial = Boolean(loja?.parent_loja_id) && !isPrimary
    return {
      id: unit?.id ?? `loja:${storeId}`,
      client_id: input.clientId,
      store_id: storeId,
      name: unit?.name?.trim() || loja?.name?.trim() || 'Loja',
      city: unit?.city ?? loja?.city ?? null,
      state: unit?.state ?? loja?.state ?? null,
      is_primary: isPrimary,
      store_type: isPrimary ? 'matriz' : isFilial ? 'filial' : unit?.store_type ?? null,
      cnpj: unit?.cnpj ?? loja?.cnpj ?? null,
      status: unit?.status ?? (loja?.active === false ? 'inativa' : 'ativa'),
      synthetic: !unit,
    }
  })
}

export type StorePeopleGroup = {
  storeId: string
  storeName: string
  kind: 'matriz' | 'filial' | 'sem_loja'
  gerenteNome: string | null
  people: PersonAccessRow[]
}

/**
 * Agrupa a equipe por loja. Matriz e cada filial têm gerente e vendedores
 * próprios; quem tem vínculo em mais de uma (o dono da rede) aparece em cada
 * loja em que opera.
 */
export function groupPeopleByStore(
  persons: ReadonlyArray<PersonAccessRow>,
  stores: ReadonlyArray<{ id: string; name: string; parent_loja_id?: string | null }>,
  primaryStoreId?: string | null,
): StorePeopleGroup[] {
  const orderedStores = [...stores].sort((a, b) => {
    const aMatriz = a.id === primaryStoreId || !a.parent_loja_id ? 0 : 1
    const bMatriz = b.id === primaryStoreId || !b.parent_loja_id ? 0 : 1
    if (aMatriz !== bMatriz) return aMatriz - bMatriz
    return a.name.localeCompare(b.name, 'pt-BR')
  })

  const groups: StorePeopleGroup[] = orderedStores.map(store => {
    const people = persons.filter(person => person.lojas_autorizadas.includes(store.id))
    const gerente = people.find(person => person.papeis.includes('GERENTE_COMERCIAL'))
    const kind: StorePeopleGroup['kind'] =
      store.id === primaryStoreId || !store.parent_loja_id ? 'matriz' : 'filial'
    return {
      storeId: store.id,
      storeName: store.name,
      kind,
      gerenteNome: gerente?.nome ?? null,
      people,
    }
  })

  const known = new Set(stores.map(store => store.id))
  const semLoja = persons.filter(person => !person.lojas_autorizadas.some(id => known.has(id)))
  if (semLoja.length) {
    groups.push({
      storeId: 'sem-loja',
      storeName: 'Sem loja vinculada',
      kind: 'sem_loja',
      gerenteNome: null,
      people: semLoja,
    })
  }
  return groups.filter(group => group.people.length > 0)
}

/**
 * Unidade de teste esquecida no cadastro: nome de QA e sem loja operacional.
 * A AG tinha "TESTE QA REMOVER" sem `store_id` — não é filial de verdade.
 */
/** Unidades sintéticas: loja operacional que ainda não tem linha no cadastro. */
export function unitsMissingFromCadastro<T extends { store_id: string | null; synthetic?: boolean }>(
  operational: ReadonlyArray<T>,
): T[] {
  return operational.filter(unit => Boolean(unit.store_id) && unit.synthetic === true)
}

export function isOrphanTestUnit(unit: { name?: string | null; store_id?: string | null }): boolean {
  if (unit.store_id) return false
  const name = String(unit.name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  return /teste\s*qa/.test(name)
}
