type VisitDraftTask = {
  task: string
  completed: boolean
}

type FormatVisitDraftInput = {
  draft: string
  clientName?: string | null
  visitNumber: number
  objective?: string | null
  visitDate?: string | null
  consultantName?: string | null
  modality?: string | null
  completedTasks?: string[]
  pendingTasks?: string[]
  checklist?: VisitDraftTask[]
  feedbackClient?: string
  nextCycleGoal?: string
}

const MAX_ITEMS_PER_SECTION = 4

const cleanText = (value: string) =>
  value
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const cleanItem = (value: string) =>
  cleanText(value)
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/^[✅⚠️🎯📌📊]\s*/, '')
    .trim()

const splitDraftIntoItems = (draft: string) => {
  const normalized = cleanText(draft)
  if (!normalized) return []

  const isStructuralLine = (line: string) =>
    /^\*?(resumo da visita|visita \d+|data|o que foi alinhado|pontos de atencao|pontos de atenção|proximos passos|próximos passos|devolutiva ao cliente|foco do proximo ciclo|foco do próximo ciclo)\*?:?/i.test(line)

  const lineItems = normalized
    .split('\n')
    .map(cleanItem)
    .filter(item => !isStructuralLine(item))
    .filter(Boolean)

  if (lineItems.length > 1) return lineItems

  return normalized
    .split(/(?<=[.!?])\s+/)
    .map(cleanItem)
    .filter(Boolean)
}

const parseFormattedSections = (draft: string) => {
  const sections = {
    done: [] as string[],
    attention: [] as string[],
    actions: [] as string[],
  }

  let current: keyof typeof sections | null = null

  for (const rawLine of cleanText(draft).split('\n')) {
    const line = cleanText(rawLine).replace(/^\*|\*$/g, '')

    if (/^o que foi alinhado/i.test(line)) {
      current = 'done'
      continue
    }

    if (/^pontos de aten(c|ç)ao/i.test(line)) {
      current = 'attention'
      continue
    }

    if (/^pr(o|ó)ximos passos/i.test(line)) {
      current = 'actions'
      continue
    }

    if (/^(resumo da visita|visita \d+|data|devolutiva ao cliente|foco do pr(o|ó)ximo ciclo)/i.test(line)) {
      current = null
      continue
    }

    if (!current || !line) continue
    sections[current].push(cleanItem(line))
  }

  return sections
}

const uniqueLimited = (items: string[], limit = MAX_ITEMS_PER_SECTION) => {
  const seen = new Set<string>()
  const result: string[] = []

  for (const item of items) {
    const cleaned = cleanItem(item)
    const key = cleaned.toLocaleLowerCase('pt-BR')
    if (!cleaned || seen.has(key)) continue
    seen.add(key)
    result.push(cleaned)
    if (result.length >= limit) break
  }

  return result
}

const isActionItem = (item: string) =>
  /(\bacao\b|\bação\b|proximo|próximo|pendente|falta|precisa|implementar|acompanhar|corrigir|ajustar|enviar|validar|definir)/i.test(item)

const isAttentionItem = (item: string) =>
  /(atencao|atenção|risco|gargalo|problema|queda|baixo|baixa|dificuldade|alerta|ponto critico|ponto crítico)/i.test(item)

const isDoneItem = (item: string) =>
  /(feito|realizado|concluido|concluído|validado|alinhado|avaliado|implantado|definido|revisado|treinado)/i.test(item)

const formatDate = (date?: string | null) => {
  if (!date) return ''
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleDateString('pt-BR')
}

const taskFallback = (input: FormatVisitDraftInput) => {
  const completedTasks = input.completedTasks?.length
    ? input.completedTasks
    : input.checklist?.filter(task => task.completed).map(task => task.task) || []

  const pendingTasks = input.pendingTasks?.length
    ? input.pendingTasks
    : input.checklist?.filter(task => !task.completed).map(task => task.task) || []

  return {
    done: uniqueLimited(completedTasks),
    actions: uniqueLimited(pendingTasks),
  }
}

const appendMxSection = (lines: string[], title: string, body: string, items: string[] = []) => {
  lines.push('________________________________________')
  lines.push(title)
  if (body) lines.push(body)
  for (const item of items) lines.push(/^\d+\./.test(item) ? item : `• ${item}`)
  lines.push('')
}

export const formatVisitDraftForGroup = (input: FormatVisitDraftInput) => {
  const draftItems = splitDraftIntoItems(input.draft)
  const formattedSections = parseFormattedSections(input.draft)
  const hasFormattedSections = Object.values(formattedSections).some(section => section.length > 0)
  const fallback = taskFallback(input)

  const doneFromDraft = uniqueLimited(draftItems.filter(item => isDoneItem(item) && !isActionItem(item)))
  const attentionFromDraft = uniqueLimited(draftItems.filter(isAttentionItem))
  const actionFromDraft = uniqueLimited(draftItems.filter(item => isActionItem(item) && !isDoneItem(item)))

  const uncategorized = uniqueLimited(
    draftItems.filter(item =>
      !doneFromDraft.includes(item) &&
      !attentionFromDraft.includes(item) &&
      !actionFromDraft.includes(item)
    ),
    3
  )

  const done = hasFormattedSections
    ? uniqueLimited(formattedSections.done)
    : doneFromDraft.length ? doneFromDraft : uniqueLimited([...uncategorized, ...fallback.done])
  const attention = hasFormattedSections ? uniqueLimited(formattedSections.attention) : attentionFromDraft
  const actions = hasFormattedSections
    ? uniqueLimited(formattedSections.actions)
    : actionFromDraft.length ? actionFromDraft : fallback.actions
  const nextCycleGoal = cleanText(input.nextCycleGoal || '')
  const feedbackClient = cleanText(input.feedbackClient || '')
  const date = formatDate(input.visitDate)
  const modality = cleanText(input.modality || 'ONLINE ou PRESENCIAL').toUpperCase()
  const consultantName = cleanText(input.consultantName || 'Não informado')
  const companyName = cleanText(input.clientName || 'Cliente')

  const lines = [
    `RELATÓRIO DE VISITA TÉCNICA - MÉTODO MX (${modality})`,
    `Empresa: ${companyName}`,
    `Data da reunião: ${date || 'Não informado'}`,
    `Consultor: ${consultantName}`,
  ]

  appendMxSection(
    lines,
    '🎯 OBJETIVO DA REUNIÃO',
    cleanText(input.objective || '') || `Registrar os alinhamentos da visita ${input.visitNumber} e definir próximos passos operacionais.`
  )

  appendMxSection(
    lines,
    '💰 1. RAIO-X FINANCEIRO E DE ESTOQUE (ONDE ESTÁ O DINHEIRO)',
    done.length ? 'Pontos validados ou alinhados durante a reunião:' : 'Dados financeiros e de estoque ainda precisam ser preenchidos ou validados para um raio-x completo.',
    done
  )

  appendMxSection(
    lines,
    '⚠️ 2. DIAGNÓSTICO DO FUNIL (ONDE ESTÁ O VAZAMENTO)',
    attention.length ? 'Pontos de atenção identificados no fluxo operacional:' : 'Nenhum gargalo numérico foi informado no registro da visita. Validar leads, agendamentos, visitas e vendas antes do envio final.',
    attention
  )

  appendMxSection(
    lines,
    '👥 3. GESTÃO DE EQUIPE E COMPORTAMENTO',
    feedbackClient || 'Registrar percepções de gestão, foco da equipe, comportamento comercial e combinados com a liderança da loja.'
  )

  appendMxSection(
    lines,
    '🚀 4. PLANO DE AÇÃO URGENTE E INEGOCIÁVEL',
    actions.length ? 'Ações priorizadas para execução imediata:' : 'Nenhuma ação pendente foi informada. Definir responsáveis e prazos antes de compartilhar.',
    actions.map((item, index) => `${index + 1}. ${item}`)
  )

  lines.push('________________________________________')
  lines.push(`Consultor MX ${consultantName}`)
  lines.push('________________________________________')
  lines.push('📱 TEXTO PARA ENVIAR NO GRUPO DE WHATSAPP DA LOJA')
  lines.push(`Assunto: Relatório de reunião gerencial e plano de ação - ${companyName}${date ? ` (${date})` : ''}`)
  lines.push('')
  lines.push(`Fala, equipe! Finalizamos o acompanhamento da ${companyName} e o relatório oficial já está estruturado para revisão.`)

  if (attention.length) {
    lines.push(`O ponto critico identificado foi: ${attention[0]}.`)
  } else if (done.length) {
    lines.push(`O principal alinhamento da reunião foi: ${done[0]}.`)
  }

  if (actions.length) {
    lines.push(`Plano de ação imediato: ${actions.slice(0, 3).map((item, index) => `${index + 1}. ${item}`).join(' ')}`)
  }

  if (nextCycleGoal) lines.push(`Foco do próximo ciclo: ${nextCycleGoal}`)
  lines.push('Leiam o relatório com atenção, validem os pontos e vamos executar com disciplina.')

  const result = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

  if (result.split('\n').length > 10) return result

  return [
    ...lines,
    'Resumo ainda sem detalhes suficientes. Registre o que foi feito, pendências e próximos passos antes de enviar ao grupo.',
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim()
}
