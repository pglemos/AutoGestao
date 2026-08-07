/**
 * Integração do Fechamento Diário com o Mentor Comercial (TASK 30 / TAREFA A09).
 *
 * Conecta o cadastro de Venda e Agendamento (Fechamento Diário) ao motor
 * determinístico do Mentor Comercial sem criar base paralela.
 *
 * Regras principais:
 * 1. Deduplicação estrita de cliente (Telefone → WhatsApp → Email → Nome + Telefone parcial).
 * 2. Reagendamento reusa a MESMA oportunidade e MESMO cliente (sem duplicação).
 * 3. Venda Sim → status VEN-04.
 * 4. Venda Não → status PER-01 (motivo de perda OBRIGATÓRIO).
 * 5. Negociação com agendamento → status de visita por data (INT-V05, INT-V03, INT-V02).
 * 6. Negociação sem agendamento → status qualificado (INT-Q04).
 * 7. Exclusão / ajuste preserva cliente e histórico.
 */

import {
  applyMentorEvent,
  type ApplyMentorEventResult,
  type MentorRepository,
  type OpportunityRef,
} from './mentorApplicationService'

export type ClosingSaleStatus = 'sim' | 'nao' | 'negociacao'

export type ClosingClientInput = {
  id?: string
  name: string
  phone: string
  whatsapp?: string | null
  email?: string | null
}

export type CustomerEntity = {
  id: string
  storeId: string
  name: string
  phone: string
  whatsapp: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
}

export type OpportunityEntity = {
  id: string
  clientId: string
  storeId: string
  sellerId: string
  currentStatusCode: string
  previousStatusCode: string | null
  appointmentAt: Date | null
  saleDate: Date | null
  lossReason: string | null
  saleValue: number | null
  updatedAt: Date
}

export type ClosingEntryInput = {
  idempotencyKey: string
  storeId: string
  sellerId: string
  client: ClosingClientInput
  opportunityId?: string
  saleStatus: ClosingSaleStatus
  appointmentAt?: Date | null
  lossReason?: string | null
  saleValue?: number | null
  notes?: string | null
  now: Date
  ruleVersion?: string
}

export interface ClosingRepository extends MentorRepository {
  findCustomerById(id: string): Promise<CustomerEntity | null>
  findCustomersByStore(storeId: string): Promise<CustomerEntity[]>
  saveCustomer(customer: CustomerEntity): Promise<void>

  findOpportunityById(id: string): Promise<OpportunityEntity | null>
  findOpportunityByClientAndStore(clientId: string, storeId: string): Promise<OpportunityEntity | null>
  saveOpportunityRecord(opp: OpportunityEntity): Promise<void>
}

/** Normaliza número de telefone mantendo apenas os dígitos numéricos. */
export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/** Normaliza e-mail removendo espaços e convertendo para minúsculas. */
export function normalizeEmail(email: string | null | undefined): string {
  if (!email) return ''
  return email.trim().toLowerCase()
}

/** Normaliza nome removendo acentos, espaços extras e convertendo para minúsculas. */
export function normalizeName(name: string | null | undefined): string {
  if (!name) return ''
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Deduplica cliente conforme ordem estrita de prioridade (§ TAREFA A09):
 * 1. Telefone normalizado
 * 2. WhatsApp normalizado
 * 3. Email normalizado
 * 4. Nome + Telefone parcial (últimos 8 dígitos) apenas como confirmação
 * PROIBIDO merge fuzzy destrutivo.
 */
export function findMatchingCustomer(
  input: ClosingClientInput,
  existingCustomers: CustomerEntity[],
): CustomerEntity | null {
  const inputPhone = normalizePhone(input.phone)
  const inputWhatsapp = normalizePhone(input.whatsapp)
  const inputEmail = normalizeEmail(input.email)
  const inputName = normalizeName(input.name)

  // 1. Telefone normalizado
  if (inputPhone) {
    const match = existingCustomers.find((c) => {
      const p = normalizePhone(c.phone)
      const w = normalizePhone(c.whatsapp)
      return (p && p === inputPhone) || (w && w === inputPhone)
    })
    if (match) return match
  }

  // 2. WhatsApp normalizado
  if (inputWhatsapp) {
    const match = existingCustomers.find((c) => {
      const p = normalizePhone(c.phone)
      const w = normalizePhone(c.whatsapp)
      return (p && p === inputWhatsapp) || (w && w === inputWhatsapp)
    })
    if (match) return match
  }

  // 3. Email normalizado
  if (inputEmail) {
    const match = existingCustomers.find((c) => {
      const e = normalizeEmail(c.email)
      return Boolean(e && e === inputEmail)
    })
    if (match) return match
  }

  // 4. Nome + telefone parcial (últimos 8 dígitos) apenas como confirmação
  if (inputName && inputPhone.length >= 8) {
    const inputSuffix = inputPhone.slice(-8)
    const match = existingCustomers.find((c) => {
      const cName = normalizeName(c.name)
      if (cName !== inputName) return false
      const cPhone = normalizePhone(c.phone)
      const cWhatsapp = normalizePhone(c.whatsapp)
      return (
        (cPhone.length >= 8 && cPhone.slice(-8) === inputSuffix) ||
        (cWhatsapp.length >= 8 && cWhatsapp.slice(-8) === inputSuffix)
      )
    })
    if (match) return match
  }

  return null
}

/**
 * Resolve o código de status oficial de visita baseado na data do agendamento relacional a `now`.
 * - Hoje ou passado: INT-V05 (Visita hoje)
 * - D-1 ou D-2 (1 ou 2 dias no futuro): INT-V03 (Visita a confirmar)
 * - D+3 ou mais no futuro: INT-V02 (Visita agendada)
 */
export function resolveVisitStatusByDate(appointmentAt: Date, now: Date): string {
  const apptDay = Date.UTC(
    appointmentAt.getUTCFullYear(),
    appointmentAt.getUTCMonth(),
    appointmentAt.getUTCDate(),
  )
  const nowDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  )
  const diffDays = Math.round((apptDay - nowDay) / 86_400_000)

  if (diffDays <= 0) {
    return 'INT-V05'
  } else if (diffDays <= 2) {
    return 'INT-V03'
  } else {
    return 'INT-V02'
  }
}

/**
 * Resolve o status do Fechamento Diário segundo os requisitos:
 * - Venda Sim → VEN-04
 * - Venda Não → PER-01 (motivo de perda OBRIGATÓRIO)
 * - Negociação com agendamento → status de visita por data (INT-V05, INT-V03, INT-V02)
 * - Negociação sem agendamento → estado de qualificado correspondente (INT-Q04)
 */
export function resolveClosingStatusCode(input: {
  saleStatus: ClosingSaleStatus
  appointmentAt?: Date | null
  lossReason?: string | null
  now: Date
}): string {
  if (input.saleStatus === 'sim') {
    return 'VEN-04'
  }

  if (input.saleStatus === 'nao') {
    if (!input.lossReason || input.lossReason.trim() === '') {
      throw new Error('Motivo de perda é obrigatório para Venda Não.')
    }
    return 'PER-01'
  }

  if (input.appointmentAt) {
    return resolveVisitStatusByDate(input.appointmentAt, input.now)
  }

  return 'INT-Q04'
}

export type ClosingIntegrationResult = {
  customer: CustomerEntity
  opportunity: OpportunityEntity
  mentorResult: ApplyMentorEventResult
  isNewCustomer: boolean
  isNewOpportunity: boolean
}

/**
 * Processa um lançamento do Fechamento Diário (Cadastrar Venda / Agendamento)
 * e o integra com o motor determinístico do Mentor Comercial.
 *
 * Invariante: Reagendar duas vezes mantém 1 cliente e 1 oportunidade.
 */
export async function processClosingEntry(
  repository: ClosingRepository,
  input: ClosingEntryInput,
): Promise<ClosingIntegrationResult> {
  const { storeId, sellerId, now } = input

  // 1. Resolve o status do lançamento e valida pré-condições
  const targetStatusCode = resolveClosingStatusCode({
    saleStatus: input.saleStatus,
    appointmentAt: input.appointmentAt,
    lossReason: input.lossReason,
    now,
  })

  // 2. Deduplicação do cliente
  let customer: CustomerEntity | null = null
  let isNewCustomer = false

  if (input.client.id) {
    customer = await repository.findCustomerById(input.client.id)
  }

  if (!customer) {
    const storeCustomers = await repository.findCustomersByStore(storeId)
    customer = findMatchingCustomer(input.client, storeCustomers)
  }

  if (!customer) {
    isNewCustomer = true
    customer = {
      id: input.client.id ?? `cli-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      storeId,
      name: input.client.name,
      phone: input.client.phone,
      whatsapp: input.client.whatsapp ?? null,
      email: input.client.email ?? null,
      createdAt: now,
      updatedAt: now,
    }
  } else {
    // Atualiza cliente preservando a identidade (ID)
    customer = {
      ...customer,
      name: input.client.name || customer.name,
      phone: input.client.phone || customer.phone,
      whatsapp: input.client.whatsapp ?? customer.whatsapp,
      email: input.client.email ?? customer.email,
      updatedAt: now,
    }
  }

  // 3. Resolução da oportunidade (Reagendamento mantém MESMA oportunidade)
  let opportunity: OpportunityEntity | null = null
  let isNewOpportunity = false

  if (input.opportunityId) {
    opportunity = await repository.findOpportunityById(input.opportunityId)
  }

  if (!opportunity) {
    opportunity = await repository.findOpportunityByClientAndStore(customer.id, storeId)
  }

  if (!opportunity) {
    isNewOpportunity = true
    opportunity = {
      id: input.opportunityId ?? `opp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      clientId: customer.id,
      storeId,
      sellerId,
      currentStatusCode: targetStatusCode,
      previousStatusCode: null,
      appointmentAt: input.appointmentAt ?? null,
      saleDate: input.saleStatus === 'sim' ? now : null,
      lossReason: input.saleStatus === 'nao' ? (input.lossReason ?? null) : null,
      saleValue: input.saleValue ?? null,
      updatedAt: now,
    }
  }

  // 4. Atualiza oportunidade com os novos dados do Fechamento Diário
  const updatedOpp: OpportunityEntity = {
    ...opportunity,
    clientId: customer.id,
    sellerId,
    previousStatusCode:
      opportunity.currentStatusCode === targetStatusCode
        ? opportunity.previousStatusCode
        : opportunity.currentStatusCode,
    currentStatusCode: targetStatusCode,
    appointmentAt: input.appointmentAt ?? opportunity.appointmentAt,
    saleDate: input.saleStatus === 'sim' ? now : opportunity.saleDate,
    lossReason: input.saleStatus === 'nao' ? (input.lossReason ?? null) : opportunity.lossReason,
    saleValue: input.saleValue ?? opportunity.saleValue,
    updatedAt: now,
  }

  // 5. Persiste cliente e oportunidade
  await repository.saveCustomer(customer)
  await repository.saveOpportunityRecord(updatedOpp)

  // 6. Integração com a aplicação do Mentor Comercial
  const ref: OpportunityRef = {
    opportunityId: updatedOpp.id,
    clientId: customer.id,
    storeId,
    sellerId,
  }

  const mentorResult = await applyMentorEvent(repository, {
    ref,
    now,
    ruleVersion: input.ruleVersion ?? 'v1',
    idempotencyKey: input.idempotencyKey,
  })

  return {
    customer,
    opportunity: updatedOpp,
    mentorResult,
    isNewCustomer,
    isNewOpportunity,
  }
}

/**
 * Registra ajuste ou exclusão de lançamento no Fechamento Diário.
 * Regra: Preserva o cliente e todo o histórico.
 */
export async function adjustOrDeleteClosingEntry(
  repository: ClosingRepository,
  input: {
    opportunityId: string
    clientId: string
    storeId: string
    sellerId: string
    reason: string
    now: Date
    idempotencyKey: string
  },
): Promise<void> {
  await repository.appendHistory({
    opportunityId: input.opportunityId,
    clientId: input.clientId,
    storeId: input.storeId,
    sellerId: input.sellerId,
    eventType: 'closing_adjustment',
    previousStatusCode: null,
    statusCode: 'INT-C01',
    result: input.reason,
    idempotencyKey: `${input.idempotencyKey}:adjust`,
    occurredAt: input.now,
  })
}
