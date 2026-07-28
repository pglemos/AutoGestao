export type PeriodRange = {
  start: Date
  end: Date
}

export type FunnelChannel = 'Showroom' | 'Internet' | 'Carteira'
export type FunnelStepKey =
  | 'oportunidades'
  | 'qualificados'
  | 'agendamento'
  | 'atendimento_comercial'
  | 'venda'

export type FunnelRow = Record<string, unknown>

export type FunnelStep = {
  key: FunnelStepKey
  label: string
  value: number
  modalities?: Record<string, number>
}

export type ChannelFunnel = {
  channel: FunnelChannel
  steps: FunnelStep[]
  generalConversion: number | null
}

export type MonthlyEvolutionPoint = {
  label: string
  oportunidades: number
  atendimentos: number
  vendas: number
}

export type FunnelRecommendation = {
  id: string
  title: string
  text: string
  button: string
  channel: FunnelChannel
  from: string
  to: string
  loss: number
  conversion: number
  href: string
}

export type FunnelKpis = {
  meta: number | null
  realizado: number
  faltam: number | null
  diasUteisRestantes: number
  necessarioPorDia: number | null
  probabilidade: number | null
  metaBatida: boolean
}

export type FunnelDashboard = {
  kpis: FunnelKpis
  channels: ChannelFunnel[]
  evolution: MonthlyEvolutionPoint[]
  recommendations: FunnelRecommendation[]
  hasFunnelData: boolean
  hasCommercialEvents: boolean
}

type BuildDashboardInput = {
  events: FunnelRow[]
  customers: FunnelRow[]
  period: PeriodRange
  sellerIds: string[]
  storeId?: string | null
  meta: number | null
  referenceDate?: Date
  storeConfig?: FunnelRow | null
}

const SELLER_KEYS = ['vendedor_id', 'seller_user_id', 'seller_id', 'user_id', 'usuario_id']
const STORE_KEYS = ['store_id', 'loja_id']
const CHANNEL_KEYS = ['canal_mx', 'canal', 'channel']
const EVENT_TYPE_KEYS = ['tipo_evento', 'event_type', 'type']
const EVENT_DATE_KEYS = ['data_evento', 'event_date', 'created_at', 'data', 'date']
const SALE_DATE_KEYS = ['data_venda', 'sold_at', 'closed_at', 'updated_at', 'created_at']
const MODALITY_KEYS = ['modalidade', 'modalidade_atendimento', 'tipo_modalidade', 'tipo_atendimento', 'tipo']
const STATUS_KEYS = ['status_evento', 'status', 'compareceu']
const ENTITY_KEYS = ['cliente_id', 'cliente_oportunidade_id', 'oportunidade_id', 'customer_id']

const CHANNELS: FunnelChannel[] = ['Showroom', 'Internet', 'Carteira']
const MODALITY_LABELS = ['Visita na loja', 'Atendimento externo', 'Videochamada'] as const

function startOfDay(date: Date) {
  const out = new Date(date)
  out.setHours(0, 0, 0, 0)
  return out
}

function endOfDay(date: Date) {
  const out = new Date(date)
  out.setHours(23, 59, 59, 999)
  return out
}

function addDays(date: Date, days: number) {
  const out = new Date(date)
  out.setDate(out.getDate() + days)
  return out
}

function addMonths(date: Date, months: number) {
  const out = new Date(date)
  out.setMonth(out.getMonth() + months)
  return out
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date) {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

function normalize(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function firstString(row: FunnelRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') return String(value)
  }
  return null
}

function firstDate(row: FunnelRow, keys: string[]) {
  const raw = firstString(row, keys)
  if (!raw) return null
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function numberValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function isYes(value: unknown) {
  const text = normalize(value)
  return value === true || text === 'sim' || text === 's' || text === 'yes' || text === 'true' || text === '1'
}

function inPeriod(date: Date | null, period: PeriodRange) {
  if (!date) return false
  return date.getTime() >= period.start.getTime() && date.getTime() <= period.end.getTime()
}

function matchesAnyId(row: FunnelRow, keys: string[], ids: string[]) {
  if (ids.length === 0) return false
  return keys.some((key) => {
    const value = row[key]
    return typeof value === 'string' && ids.includes(value)
  })
}

function matchesSeller(row: FunnelRow, sellerIds: string[]) {
  return matchesAnyId(row, SELLER_KEYS, sellerIds)
}

function matchesStore(row: FunnelRow, storeId?: string | null) {
  if (!storeId) return true
  const hasStoreField = STORE_KEYS.some((key) => row[key] !== null && row[key] !== undefined)
  if (!hasStoreField) return true
  return matchesAnyId(row, STORE_KEYS, [storeId])
}

export function normalizeChannel(row: FunnelRow): FunnelChannel | null {
  const channel = normalize(firstString(row, CHANNEL_KEYS))
  if (channel === 'internet') return 'Internet'
  if (channel === 'carteira') return 'Carteira'
  if (channel === 'showroom' || channel === 'loja' || channel === 'presencial' || channel === 'porta') return 'Showroom'
  return null
}

function normalizeEventType(row: FunnelRow) {
  return normalize(firstString(row, EVENT_TYPE_KEYS))
}

function normalizeModality(row: FunnelRow) {
  const modality = normalize(firstString(row, MODALITY_KEYS))
  if (!modality) return null
  if (modality.includes('extern')) return 'Atendimento externo'
  if (modality.includes('video')) return 'Videochamada'
  if (modality.includes('loja') || modality.includes('visita')) return 'Visita na loja'
  return null
}

function entityKey(row: FunnelRow) {
  const entity = firstString(row, ENTITY_KEYS)
  return entity ? `entity:${entity}` : null
}

function rowKey(row: FunnelRow) {
  return entityKey(row) || (typeof row.id === 'string' ? `id:${row.id}` : JSON.stringify(row))
}

function isSoldCustomer(row: FunnelRow) {
  return isYes(row.vendido) || normalize(row.status_oportunidade) === 'vendido' || normalize(row.etapa) === 'ganho'
}

function isCompareceu(row: FunnelRow) {
  return STATUS_KEYS.some((key) => {
    const value = row[key]
    return normalize(value) === 'compareceu' || isYes(value)
  })
}

/**
 * Chave da venda para efeito de cancelamento. O cancelamento é sempre de uma
 * oportunidade específica — um cliente pode ter uma venda cancelada e outra
 * válida, e só a cancelada pode ser descontada.
 */
function saleKey(row: FunnelRow) {
  const opportunity = firstString(row, ['oportunidade_id', 'cliente_oportunidade_id'])
  return opportunity ? `opp:${opportunity}` : entityKey(row)
}

/**
 * O cancelamento preserva o evento `venda_realizada` original (histórico é
 * imutável) e acrescenta um `venda_cancelada`. Sem descontar o par, o funil, a
 * meta e o realizado seguiam contando a venda revertida.
 */
function dropCancelledSaleEvents(rows: FunnelRow[]) {
  const cancelled = new Set(
    rows
      .filter((row) => normalizeEventType(row) === 'venda_cancelada')
      .map(saleKey)
      .filter((key): key is string => Boolean(key)),
  )
  if (cancelled.size === 0) return rows
  return rows.filter((row) => {
    if (normalizeEventType(row) !== 'venda_realizada') return true
    const key = saleKey(row)
    return !key || !cancelled.has(key)
  })
}

function filterBaseRows(rows: FunnelRow[], period: PeriodRange, sellerIds: string[], storeId?: string | null) {
  // O desconto do cancelamento roda antes do recorte de período: a venda pode
  // ter sido feita em junho e cancelada em julho, e ainda assim não é uma
  // venda realizada.
  return dropCancelledSaleEvents(rows)
    .filter((row) => matchesSeller(row, sellerIds) && matchesStore(row, storeId) && inPeriod(firstDate(row, EVENT_DATE_KEYS), period))
}

function filterCustomers(rows: FunnelRow[], period: PeriodRange, sellerIds: string[], storeId?: string | null) {
  return rows.filter((row) => matchesSeller(row, sellerIds) && matchesStore(row, storeId) && isSoldCustomer(row) && inPeriod(firstDate(row, SALE_DATE_KEYS), period))
}

function eventCount(events: FunnelRow[], type: string, channel?: FunnelChannel) {
  return events.filter((row) => normalizeEventType(row) === type && (!channel || normalizeChannel(row) === channel)).length
}

function rowsForStage(events: FunnelRow[], type: string, channel: FunnelChannel) {
  return events.filter((row) => normalizeEventType(row) === type && normalizeChannel(row) === channel)
}

function modalityBreakdown(rows: FunnelRow[]) {
  const out: Record<string, number> = {}
  for (const row of rows) {
    const modality = normalizeModality(row)
    if (!modality) continue
    out[modality] = (out[modality] || 0) + 1
  }
  return MODALITY_LABELS.reduce<Record<string, number>>((acc, label) => {
    if (out[label]) acc[label] = out[label]
    return acc
  }, {})
}

function countSales(events: FunnelRow[], customers: FunnelRow[], channel?: FunnelChannel) {
  const saleEvents = events.filter((row) => normalizeEventType(row) === 'venda_realizada' && (!channel || normalizeChannel(row) === channel))
  const saleEventEntities = new Set(saleEvents.map(entityKey).filter(Boolean))
  const customerSales = customers.filter((row) => (!channel || normalizeChannel(row) === channel) && !saleEventEntities.has(entityKey(row)))
  return saleEvents.length + customerSales.length
}

function countAttendance(events: FunnelRow[], channel: FunnelChannel) {
  const attendanceRows = rowsForStage(events, 'atendimento_comercial_realizado', channel)
  const attendanceEntities = new Set(attendanceRows.map(entityKey).filter(Boolean))
  const compareceuRows = rowsForStage(events, 'agendamento_criado', channel).filter((row) => isCompareceu(row) && !attendanceEntities.has(entityKey(row)))
  return {
    count: attendanceRows.length + compareceuRows.length,
    rows: [...attendanceRows, ...compareceuRows],
  }
}

function conversion(from: number, to: number) {
  if (from <= 0) return null
  return Math.max(0, Math.min(100, (to / from) * 100))
}

function round2(value: number) {
  return Math.round(value * 100) / 100
}

function buildChannelFunnels(events: FunnelRow[], customers: FunnelRow[]): ChannelFunnel[] {
  return CHANNELS.map((channel) => {
    const attendance = countAttendance(events, channel)
    const agendamentoRows = rowsForStage(events, 'agendamento_criado', channel)
    const sales = countSales(events, customers, channel)
    const steps: FunnelStep[] =
      channel === 'Showroom'
        ? [
            { key: 'atendimento_comercial', label: 'Atendimento Comercial', value: attendance.count, modalities: modalityBreakdown(attendance.rows) },
            { key: 'venda', label: 'Venda', value: sales },
          ]
        : channel === 'Internet'
          ? [
              { key: 'oportunidades', label: 'Oportunidades', value: eventCount(events, 'oportunidade_registrada', channel) },
              { key: 'qualificados', label: 'Qualificados', value: eventCount(events, 'cliente_qualificado', channel) },
              { key: 'agendamento', label: 'Agendamento', value: agendamentoRows.length, modalities: modalityBreakdown(agendamentoRows) },
              { key: 'atendimento_comercial', label: 'Atendimento Comercial', value: attendance.count, modalities: modalityBreakdown(attendance.rows) },
              { key: 'venda', label: 'Venda', value: sales },
            ]
          : [
              { key: 'qualificados', label: 'Qualificados', value: eventCount(events, 'cliente_qualificado', channel) },
              { key: 'agendamento', label: 'Agendamento', value: agendamentoRows.length, modalities: modalityBreakdown(agendamentoRows) },
              { key: 'atendimento_comercial', label: 'Atendimento Comercial', value: attendance.count, modalities: modalityBreakdown(attendance.rows) },
              { key: 'venda', label: 'Venda', value: sales },
            ]

    return {
      channel,
      steps,
      generalConversion: conversion(steps[0]?.value || 0, steps[steps.length - 1]?.value || 0),
    }
  })
}

function isWorkingDay(date: Date, storeConfig?: FunnelRow | null) {
  const weekday = date.getDay()
  const rawDays = storeConfig?.dias_uteis ?? storeConfig?.business_days ?? storeConfig?.working_days
  if (Array.isArray(rawDays) && rawDays.length > 0) {
    const normalized = rawDays.map((day) => normalize(day))
    const names = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado']
    return normalized.includes(String(weekday)) || normalized.includes(names[weekday])
  }
  return weekday !== 0
}

export function countWorkingDays(start: Date, end: Date, storeConfig?: FunnelRow | null) {
  let count = 0
  for (let cursor = startOfDay(start); cursor.getTime() <= end.getTime(); cursor = addDays(cursor, 1)) {
    if (isWorkingDay(cursor, storeConfig)) count += 1
  }
  return count
}

function buildKpis(params: {
  meta: number | null
  realizado: number
  period: PeriodRange
  referenceDate: Date
  storeConfig?: FunnelRow | null
}): FunnelKpis {
  const { meta, realizado, period, referenceDate, storeConfig } = params
  const effectiveToday = startOfDay(referenceDate)
  const remainingStart = effectiveToday.getTime() > period.start.getTime() ? effectiveToday : period.start
  const diasUteisRestantes = referenceDate.getTime() > period.end.getTime() ? 0 : countWorkingDays(remainingStart, period.end, storeConfig)
  const passedEnd = referenceDate.getTime() < period.end.getTime() ? referenceDate : period.end
  const diasUteisPassados = countWorkingDays(period.start, passedEnd, storeConfig)
  const metaBatida = meta !== null && realizado >= meta
  const faltam = meta === null ? null : Math.max(meta - realizado, 0)
  const necessarioPorDia = faltam === null || metaBatida || diasUteisRestantes <= 0 ? null : round2(faltam / diasUteisRestantes)
  const mediaAtual = diasUteisPassados > 0 ? realizado / diasUteisPassados : 0
  const vendasProjetadas = realizado + mediaAtual * diasUteisRestantes
  const probabilidade = meta === null || meta <= 0 ? null : Math.max(0, Math.min(100, round2((vendasProjetadas / meta) * 100)))

  return {
    meta,
    realizado,
    faltam,
    diasUteisRestantes,
    necessarioPorDia,
    probabilidade,
    metaBatida,
  }
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

function buildEvolution(events: FunnelRow[], customers: FunnelRow[], periodEnd: Date) {
  const monthStart = startOfMonth(addMonths(periodEnd, -5))
  return Array.from({ length: 6 }, (_, index): MonthlyEvolutionPoint => {
    const month = addMonths(monthStart, index)
    const range = { start: startOfMonth(month), end: endOfMonth(month) }
    const monthEvents = events.filter((row) => inPeriod(firstDate(row, EVENT_DATE_KEYS), range))
    const monthCustomers = customers.filter((row) => inPeriod(firstDate(row, SALE_DATE_KEYS), range))
    const oportunidades =
      eventCount(monthEvents, 'oportunidade_registrada', 'Internet') +
      eventCount(monthEvents, 'cliente_qualificado', 'Carteira') +
      eventCount(monthEvents, 'atendimento_comercial_realizado', 'Showroom')

    return {
      label: monthLabel(month),
      oportunidades,
      atendimentos: eventCount(monthEvents, 'atendimento_comercial_realizado'),
      vendas: countSales(monthEvents, monthCustomers),
    }
  })
}

function stepHref(channel: FunnelChannel, stepKey: FunnelStepKey, period: PeriodRange) {
  const params = new URLSearchParams({
    canal_mx: channel,
    periodo_inicio: period.start.toISOString().slice(0, 10),
    periodo_fim: period.end.toISOString().slice(0, 10),
  })

  if (stepKey === 'oportunidades') {
    params.set('tipo_evento', 'oportunidade_registrada')
    return `/terminal-mx?${params.toString()}`
  }
  if (stepKey === 'agendamento') {
    params.set('tipo_evento', 'agendamento_criado')
    return `/carteira-clientes?${params.toString()}`
  }
  if (stepKey === 'atendimento_comercial') {
    params.set('tipo_evento', 'atendimento_comercial_realizado')
    return channel === 'Showroom' ? `/terminal-mx?${params.toString()}` : `/carteira-clientes?${params.toString()}`
  }
  if (stepKey === 'venda') {
    params.set('tipo_evento', 'venda_realizada')
    return `/terminal-mx?${params.toString()}`
  }

  return `/carteira-clientes?${params.toString()}`
}

function recommendationText(channel: FunnelChannel, fromKey: FunnelStepKey, toKey: FunnelStepKey) {
  if (channel === 'Showroom' && fromKey === 'atendimento_comercial' && toKey === 'venda') {
    return {
      title: 'Showroom precisa converter melhor',
      text: 'Os atendimentos comerciais do Showroom estão gerando poucas vendas.',
      button: 'Ver atendimentos',
      hrefStep: 'atendimento_comercial' as FunnelStepKey,
      target: 'terminal',
    }
  }

  if (fromKey === 'oportunidades' && toKey === 'qualificados') {
    return {
      title: 'Internet precisa de mais qualificação',
      text: 'Existem oportunidades que ainda não viraram clientes qualificados.',
      button: 'Abrir Fechamento Diário',
      hrefStep: 'oportunidades' as FunnelStepKey,
      target: 'terminal',
    }
  }

  if (fromKey === 'qualificados' && toKey === 'agendamento') {
    return {
      title: 'Falta gerar compromisso',
      text: 'Clientes qualificados não estão avançando para agendamento.',
      button: 'Abrir Carteira',
      hrefStep: 'qualificados' as FunnelStepKey,
      target: 'carteira',
    }
  }

  if (fromKey === 'agendamento' && toKey === 'atendimento_comercial') {
    return {
      title: 'Agendamentos não estão virando atendimento',
      text: 'Existem compromissos que não chegaram ao atendimento comercial.',
      button: 'Ver agendamentos',
      hrefStep: 'agendamento' as FunnelStepKey,
      target: 'central',
    }
  }

  return {
    title: 'Atendimentos sem fechamento',
    text: 'Atendimentos comerciais estão acontecendo, mas não estão virando venda.',
    button: 'Abrir Carteira',
    hrefStep: 'atendimento_comercial' as FunnelStepKey,
    target: 'carteira',
  }
}

function recommendationHref(channel: FunnelChannel, hrefStep: FunnelStepKey, target: string, period: PeriodRange) {
  const href = stepHref(channel, hrefStep, period)
  if (target === 'central') return href.replace('/carteira-clientes', '/central-de-execucao')
  if (target === 'carteira') return href.replace('/terminal-mx', '/carteira-clientes')
  return href
}

function buildRecommendations(channels: ChannelFunnel[], period: PeriodRange): FunnelRecommendation[] {
  const leaks = channels.flatMap((channel) => channel.steps.slice(0, -1).map((from, index) => {
    const to = channel.steps[index + 1]
    const loss = Math.max(from.value - to.value, 0)
    const leakConversion = conversion(from.value, to.value) ?? 0
    const copy = recommendationText(channel.channel, from.key, to.key)

    return {
      id: `${channel.channel}-${from.key}-${to.key}`,
      channel: channel.channel,
      from: from.label,
      to: to.label,
      loss,
      conversion: leakConversion,
      title: copy.title,
      text: copy.text,
      button: copy.button,
      href: recommendationHref(channel.channel, copy.hrefStep, copy.target, period),
    }
  }))

  return leaks
    .filter((leak) => leak.loss > 0)
    .sort((a, b) => b.loss - a.loss || a.conversion - b.conversion)
    .slice(0, 3)
}

export function buildFunnelDashboard(input: BuildDashboardInput): FunnelDashboard {
  const referenceDate = input.referenceDate ?? new Date()
  const events = filterBaseRows(input.events, { start: startOfMonth(addMonths(input.period.end, -5)), end: input.period.end }, input.sellerIds, input.storeId)
  const periodEvents = events.filter((row) => inPeriod(firstDate(row, EVENT_DATE_KEYS), input.period))
  const customers = filterCustomers(input.customers, { start: startOfMonth(addMonths(input.period.end, -5)), end: input.period.end }, input.sellerIds, input.storeId)
  const periodCustomers = customers.filter((row) => inPeriod(firstDate(row, SALE_DATE_KEYS), input.period))
  const channels = buildChannelFunnels(periodEvents, periodCustomers)
  const realizado = countSales(periodEvents, periodCustomers)

  return {
    kpis: buildKpis({
      meta: input.meta,
      realizado,
      period: input.period,
      referenceDate,
      storeConfig: input.storeConfig,
    }),
    channels,
    evolution: buildEvolution(events, customers, input.period.end),
    recommendations: buildRecommendations(channels, input.period),
    hasFunnelData: channels.some((channel) => channel.steps.some((step) => step.value > 0)),
    hasCommercialEvents: periodEvents.length > 0,
  }
}

export function resolveMetaTarget(rows: FunnelRow[], sellerIds: string[], storeId: string | null | undefined, referenceMonth: Date) {
  const month = referenceMonth.getMonth() + 1
  const year = referenceMonth.getFullYear()
  const candidates = rows.filter((row) => {
    const rowMonth = numberValue(row.month ?? row.mes)
    const rowYear = numberValue(row.year ?? row.ano)
    return rowMonth === month && rowYear === year && matchesSeller(row, sellerIds) && matchesStore(row, storeId)
  })

  const target = candidates
    .map((row) => numberValue(row.target ?? row.meta ?? row.monthly_goal))
    .find((value): value is number => value !== null && value > 0)

  return target ?? null
}

export function buildCurrentMonthRange(referenceDate = new Date()): PeriodRange {
  return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) }
}

export function buildLastMonthRange(referenceDate = new Date()): PeriodRange {
  const lastMonth = addMonths(referenceDate, -1)
  return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
}

export function buildLastThreeMonthsRange(referenceDate = new Date()): PeriodRange {
  return { start: startOfMonth(addMonths(referenceDate, -2)), end: endOfMonth(referenceDate) }
}

export function buildCustomRange(start: string, end: string, fallback = new Date()): PeriodRange {
  const fallbackRange = buildCurrentMonthRange(fallback)
  const startDate = start ? new Date(`${start}T00:00:00`) : fallbackRange.start
  const endDate = end ? new Date(`${end}T23:59:59`) : fallbackRange.end
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate.getTime() > endDate.getTime()) return fallbackRange
  return { start: startOfDay(startDate), end: endOfDay(endDate) }
}

export function formatPercent(value: number | null) {
  if (value === null) return 'Sem dados'
  return `${round2(value).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
}
