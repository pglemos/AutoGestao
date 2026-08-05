import { describe, expect, test } from 'bun:test'

describe('manager day routine Base44 parity', () => {
  test('classifica o prazo em vencida, crítica, atenção, normal e futura pelo relógio de São Paulo', async () => {
    const module = await import('./manager-day-routine').catch(() => ({})) as Record<string, unknown>
    const classifyManagerRoutineUrgency = module.classifyManagerRoutineUrgency

    expect(typeof classifyManagerRoutineUrgency).toBe('function')
    if (typeof classifyManagerRoutineUrgency !== 'function') return

    const now = new Date('2026-07-13T12:00:00.000Z') // 09:00 em São Paulo
    expect(classifyManagerRoutineUrgency('2026-07-12', '18:00', now)).toBe('vencida')
    expect(classifyManagerRoutineUrgency('2026-07-13', '08:59', now)).toBe('critica')
    expect(classifyManagerRoutineUrgency('2026-07-13', '09:30', now)).toBe('atencao')
    expect(classifyManagerRoutineUrgency('2026-07-13', '10:00', now)).toBe('normal')
    expect(classifyManagerRoutineUrgency('2026-07-14', '08:00', now)).toBe('futura')
  })

  test('calcula dias de atraso sem depender da hora operacional', async () => {
    const module = await import('./manager-day-routine').catch(() => ({})) as Record<string, unknown>
    const calculateManagerRoutineDaysLate = module.calculateManagerRoutineDaysLate

    expect(typeof calculateManagerRoutineDaysLate).toBe('function')
    if (typeof calculateManagerRoutineDaysLate !== 'function') return

    const now = new Date('2026-07-13T12:00:00.000Z')
    expect(calculateManagerRoutineDaysLate('2026-07-10', now)).toBe(3)
    expect(calculateManagerRoutineDaysLate('2026-07-13', now)).toBe(0)
    expect(calculateManagerRoutineDaysLate('2026-07-14', now)).toBe(0)
  })

  test('gera todas as onze famílias Base44 quando as fontes reais exigem atuação', async () => {
    const module = await import('./manager-day-routine') as Record<string, unknown>
    const buildManagerRoutineTasks = module.buildManagerRoutineTasks

    expect(typeof buildManagerRoutineTasks).toBe('function')
    if (typeof buildManagerRoutineTasks !== 'function') return

    const tasks = buildManagerRoutineTasks(fullRoutineInput()) as Array<{
      id: string
      title: string
      dueTime: string
      category: string
      priority: string
    }>

    expect(tasks.map(task => task.id)).toEqual([
      'reg_fech_2026-07-13',
      'conf_agend_2026-07-13',
      'conf_plano_2026-07-13',
      'conf_prosp_2026-07-13',
      'conf_atu_2026-07-13',
      'meta_hoje_2026-07-13',
      'fb_pendente_2026-07-13',
      'pdi_prazo_2026-07-13',
      'pdi_reuniao_meeting-1',
      'agenda_event-1',
      'manual-1',
    ])
    expect(tasks.find(task => task.id.startsWith('conf_agend'))).toMatchObject({
      title: 'Confirmar agendamentos do dia',
      dueTime: '10:30',
      category: 'resultado',
      priority: 'normal',
    })
    expect(tasks.find(task => task.id.startsWith('meta_hoje'))?.title).toBe('Acompanhar oportunidades da meta de hoje')
  })

  test('suprime uma tarefa automática já encerrada sem remover a atividade manual', async () => {
    const module = await import('./manager-day-routine') as Record<string, unknown>
    const buildManagerRoutineTasks = module.buildManagerRoutineTasks

    expect(typeof buildManagerRoutineTasks).toBe('function')
    if (typeof buildManagerRoutineTasks !== 'function') return

    const input = fullRoutineInput()
    input.resolvedAutomaticTaskIds = ['conf_agend_2026-07-13', 'meta_hoje_2026-07-13']
    const ids = (buildManagerRoutineTasks(input) as Array<{ id: string }>).map(task => task.id)

    expect(ids).not.toContain('conf_agend_2026-07-13')
    expect(ids).not.toContain('meta_hoje_2026-07-13')
    expect(ids).toContain('manual-1')
  })

  test('filtra vencidas e categorias, conta apenas pendentes de hoje e ordena sem mutar', async () => {
    const module = await import('./manager-day-routine') as Record<string, unknown>
    const filterManagerRoutineTasks = module.filterManagerRoutineTasks
    const sortManagerRoutineTasks = module.sortManagerRoutineTasks
    const countManagerRoutinePendingToday = module.countManagerRoutinePendingToday

    expect(typeof filterManagerRoutineTasks).toBe('function')
    expect(typeof sortManagerRoutineTasks).toBe('function')
    expect(typeof countManagerRoutinePendingToday).toBe('function')
    if (
      typeof filterManagerRoutineTasks !== 'function'
      || typeof sortManagerRoutineTasks !== 'function'
      || typeof countManagerRoutinePendingToday !== 'function'
    ) return

    const tasks = [
      routineTask('late', 'vencida', 'operacao', '12:00', 'manual'),
      routineTask('critical', 'critica', 'resultado', '11:00', 'meta_loja'),
      routineTask('attention', 'atencao', 'equipe', '10:00', 'rotina_equipe'),
      routineTask('normal', 'normal', 'resultado', '09:00', 'carteira_clientes'),
      routineTask('future', 'futura', 'operacao', '08:00', 'fechamento_diario'),
    ]

    expect(filterManagerRoutineTasks(tasks, 'todas', true).map((task: { id: string }) => task.id)).toEqual(['late'])
    expect(filterManagerRoutineTasks(tasks, 'resultado', false).map((task: { id: string }) => task.id)).toEqual(['critical', 'normal'])
    expect(countManagerRoutinePendingToday(tasks)).toBe(3)
    expect(sortManagerRoutineTasks(tasks, 'prioridade').map((task: { id: string }) => task.id)).toEqual([
      'late', 'critical', 'attention', 'normal', 'future',
    ])
    expect(sortManagerRoutineTasks(tasks, 'horario').map((task: { id: string }) => task.id)).toEqual([
      'future', 'normal', 'attention', 'critical', 'late',
    ])
    expect(tasks.map(task => task.id)).toEqual(['late', 'critical', 'attention', 'normal', 'future'])
  })

  test('serializa os quatro resultados Base44 no constraint existente e os recupera da metadata', async () => {
    const module = await import('./manager-day-routine') as Record<string, unknown>
    const managerRoutineDbStatusForResult = module.managerRoutineDbStatusForResult
    const resolveManagerRoutineResult = module.resolveManagerRoutineResult

    expect(typeof managerRoutineDbStatusForResult).toBe('function')
    expect(typeof resolveManagerRoutineResult).toBe('function')
    if (typeof managerRoutineDbStatusForResult !== 'function' || typeof resolveManagerRoutineResult !== 'function') return

    expect(managerRoutineDbStatusForResult('concluida')).toBe('concluida')
    expect(managerRoutineDbStatusForResult('concluida_parcial')).toBe('justificada')
    expect(managerRoutineDbStatusForResult('reagendada')).toBe('em_andamento')
    expect(managerRoutineDbStatusForResult('nao_realizada')).toBe('cancelada')
    expect(resolveManagerRoutineResult('justificada', { manager_result: 'concluida_parcial' })).toBe('concluida_parcial')
    expect(resolveManagerRoutineResult('cancelada', {})).toBe('nao_realizada')
    expect(resolveManagerRoutineResult('pendente', {})).toBe('pendente')
  })

  test('agrupa Minha Rotina por data decrescente preservando status, contagens e observação', async () => {
    const module = await import('./manager-day-routine') as Record<string, unknown>
    const groupManagerRoutineHistory = module.groupManagerRoutineHistory

    expect(typeof groupManagerRoutineHistory).toBe('function')
    if (typeof groupManagerRoutineHistory !== 'function') return

    const groups = groupManagerRoutineHistory([
      { ...routineTask('today-done', 'normal'), dueDate: '2026-07-13', status: 'concluida', observation: 'Tudo certo' },
      { ...routineTask('today-partial', 'normal'), dueDate: '2026-07-13', status: 'concluida_parcial' },
      { ...routineTask('old-pending', 'vencida'), dueDate: '2026-07-12', status: 'pendente' },
      { ...routineTask('older-rescheduled', 'vencida'), dueDate: '2026-07-11', status: 'reagendada' },
    ], '2026-07-13') as Array<{
      date: string
      isToday: boolean
      completedCount: number
      overdueCount: number
      items: Array<{ id: string; observation?: string }>
    }>

    expect(groups.map(group => group.date)).toEqual(['2026-07-13', '2026-07-12', '2026-07-11'])
    expect(groups[0]).toMatchObject({ isToday: true, completedCount: 2, overdueCount: 0 })
    expect(groups[0].items[0].observation).toBe('Tudo certo')
    expect(groups[1]).toMatchObject({ isToday: false, completedCount: 0, overdueCount: 1 })
  })

  test('monta a rota de ação com os parâmetros observados no Chrome', async () => {
    const module = await import('./manager-day-routine') as Record<string, unknown>
    const buildManagerRoutineNavigationPath = module.buildManagerRoutineNavigationPath

    expect(typeof buildManagerRoutineNavigationPath).toBe('function')
    if (typeof buildManagerRoutineNavigationPath !== 'function') return

    expect(buildManagerRoutineNavigationPath({
      label: 'Acompanhar',
      path: '/meta-loja',
      params: { acao: 'acompanhar' },
      kind: 'acao',
    })).toBe('/meta-loja?acao=acompanhar')
    expect(buildManagerRoutineNavigationPath({
      label: 'Ver rotina',
      path: '/rotina-equipe',
      params: { data: '2026-07-13', filtro: 'plano_ataque' },
      kind: 'consulta',
    })).toBe('/rotina-equipe?data=2026-07-13&filtro=plano_ataque')
  })
})

function fullRoutineInput() {
  return {
    now: new Date('2026-07-13T09:02:00.000Z'),
    referenceDate: '2026-07-13',
    store: { monthlyGoal: 44, businessDays: 22 },
    sellers: [
      { id: 'seller-1', name: 'Ana' },
      { id: 'seller-2', name: 'Bruno' },
    ],
    todayClosings: [
      { sellerId: 'seller-1', date: '2026-07-13', status: 'aguardando_aprovacao', sales: 0 },
    ],
    yesterdayClosings: [
      { sellerId: 'seller-2', date: '2026-07-12', status: 'pendente', sales: 0 },
    ],
    todayAppointments: [
      { id: 'appointment-1', status: 'aguardando' },
    ],
    todayRoutines: [
      {
        sellerId: 'seller-1',
        eligible: true,
        planStatus: 'CALCULAVEL',
        firstAccess: false,
        firstAccessAt: null,
        planPlanned: 2,
        planExecuted: 0,
        planPoints: 20,
        prospectingStatus: 'SEM_PLANEJAMENTO',
        prospectingPlanned: 3,
        qualifiedGenerated: 1,
        updateStatus: 'CALCULAVEL',
        updatesRequired: 2,
        updatesDone: 1,
      },
    ],
    feedbacks: [
      { id: 'feedback-1', status: 'pendente', dueDate: '2026-07-13' },
    ],
    pdiActions: [
      { id: 'pdi-action-1', status: 'aberto', dueDate: '2026-07-13' },
    ],
    pdiMeetings: [
      { id: 'meeting-1', status: 'agendada', date: '2026-07-13', time: '15:00', summary: 'Carreira' },
    ],
    agendaItems: [
      {
        id: 'event-1',
        status: 'agendado',
        type: 'reuniao',
        date: '2026-07-13',
        time: '14:00',
        description: 'Reunião de resultado',
      },
    ],
    manualTasks: [
      {
        id: 'manual-1',
        title: 'Ligar para fornecedor',
        description: 'Confirmar disponibilidade',
        category: 'operacao',
        origin: 'manual',
        dueDate: '2026-07-13',
        dueTime: '12:00',
        automatic: false,
        status: 'pendente',
      },
    ],
    resolvedAutomaticTaskIds: [] as string[],
    salesToday: 0,
  }
}

function routineTask(
  id: string,
  priority: string,
  category = 'operacao',
  dueTime = '12:00',
  origin = 'manual',
) {
  return {
    id,
    title: id,
    description: '',
    category,
    block: 'pessoas_processos',
    origin,
    dueDate: '2026-07-13',
    dueTime,
    automatic: origin !== 'manual',
    icon: 'Plus',
    actions: [],
    priority,
    daysLate: priority === 'vencida' ? 1 : 0,
    status: 'pendente',
    countsForScore: origin !== 'manual',
  }
}
