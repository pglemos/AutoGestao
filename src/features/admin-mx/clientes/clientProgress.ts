export type ProgressKind = 'onboarding' | 'liberacao' | 'jornada'

export type ProgressBar = {
  kind: ProgressKind
  label: string
  done: number
  total: number
  percent: number
  detail: string
}

/**
 * Os três progressos que a especificação exige diferenciar. Uma barra só não
 * serve: um cliente pode ter onboarding completo, módulos liberados e jornada
 * ainda no primeiro encontro — misturar os três esconde exatamente onde ele
 * está parado.
 */
export function buildProgressBars(input: {
  onboardingStep: number | null
  onboardingTotal?: number
  onboardingCompleted: boolean | null
  modulesEnabled: number
  modulesTotal: number
  visitsDone: number
  visitsTotal: number
}): ProgressBar[] {
  const onboardingTotal = input.onboardingTotal ?? 7
  const onboardingDone = input.onboardingCompleted ? onboardingTotal : Math.min(input.onboardingStep ?? 0, onboardingTotal)
  const percent = (done: number, total: number) => (total > 0 ? Math.round((done / total) * 100) : 0)

  return [
    {
      kind: 'onboarding',
      label: 'Onboarding',
      done: onboardingDone,
      total: onboardingTotal,
      percent: percent(onboardingDone, onboardingTotal),
      detail: input.onboardingCompleted ? 'Cadastro concluído.' : `Etapa ${onboardingDone} de ${onboardingTotal}.`,
    },
    {
      kind: 'liberacao',
      label: 'Liberação de módulos',
      done: input.modulesEnabled,
      total: input.modulesTotal,
      percent: percent(input.modulesEnabled, input.modulesTotal),
      detail: input.modulesTotal
        ? `${input.modulesEnabled} de ${input.modulesTotal} módulo(s) liberado(s).`
        : 'Nenhum módulo configurado para o cliente.',
    },
    {
      kind: 'jornada',
      label: 'Jornada de encontros',
      done: input.visitsDone,
      total: input.visitsTotal,
      percent: percent(input.visitsDone, input.visitsTotal),
      detail: input.visitsTotal
        ? `${input.visitsDone} de ${input.visitsTotal} encontro(s) concluído(s).`
        : 'Jornada ainda não gerada.',
    },
  ]
}

export type DataSourceHealth = {
  key: string
  label: string
  rows: number
  lastAt: string | null
  status: 'ok' | 'vazio' | 'desatualizado'
  detail: string
}

/**
 * Classifica uma fonte de dados do cliente. "Desatualizado" usa a janela que a
 * operação enxerga como recente (45 dias): mais que isso, o dado existe mas não
 * sustenta decisão do mês.
 */
export function classifyDataSource(input: {
  key: string
  label: string
  rows: number
  lastAt: string | null
  today?: Date
  staleDays?: number
}): DataSourceHealth {
  const { key, label, rows, lastAt } = input
  const today = input.today ?? new Date()
  const staleDays = input.staleDays ?? 45

  if (!rows) {
    return { key, label, rows, lastAt, status: 'vazio', detail: 'Sem dados recebidos para este cliente.' }
  }
  if (!lastAt) {
    return { key, label, rows, lastAt, status: 'ok', detail: `${rows} registro(s).` }
  }
  const last = new Date(lastAt)
  if (Number.isNaN(last.getTime())) {
    return { key, label, rows, lastAt, status: 'ok', detail: `${rows} registro(s).` }
  }
  const days = Math.floor((today.getTime() - last.getTime()) / 86_400_000)
  if (days > staleDays) {
    return { key, label, rows, lastAt, status: 'desatualizado', detail: `Último registro há ${days} dias.` }
  }
  return { key, label, rows, lastAt, status: 'ok', detail: `${rows} registro(s) · último há ${days} dia(s).` }
}

export function dataIntegritySummary(sources: DataSourceHealth[]) {
  return {
    ok: sources.filter(source => source.status === 'ok').length,
    vazios: sources.filter(source => source.status === 'vazio').length,
    desatualizados: sources.filter(source => source.status === 'desatualizado').length,
    total: sources.length,
  }
}

export type TimelineEvent = {
  id: string
  at: string
  actor: string | null
  action: string
  entity: string
  detail: string | null
}

/** Junta eventos de fontes diferentes numa linha do tempo única, mais recente primeiro. */
export function mergeTimeline(groups: TimelineEvent[][], limit = 60): TimelineEvent[] {
  return groups
    .flat()
    .filter(event => event.at)
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, limit)
}
