// Coluna do kanban derivada do estado real da ação.
//
// O atraso no MX é gravado: um gatilho marca `status = 'atrasado'` quando a
// linha é inserida ou alterada com prazo vencido. Isso deixa de fora o caso mais
// comum — o prazo vence sozinho, sem ninguém tocar na ação, e o cartão continua
// em "Pendente" até que alguém o edite. Existe uma função de varredura
// (`mx_score_atualizar_atraso_plano`), mas nenhum cron a chama.
//
// Aqui a coluna é derivada na leitura, como no Base44: o cartão muda de coluna
// quando a data passa, independentemente do que está gravado.

export type ActionStatus =
  | 'pendente'
  | 'em_andamento'
  | 'atrasado'
  | 'concluido'
  | 'validando_eficacia'
  | 'pausada'
  | 'cancelada'

export type KanbanColumn =
  | 'PENDENTE'
  | 'EM_ANDAMENTO'
  | 'VALIDANDO_EFICACIA'
  | 'ATRASADA'
  | 'CONCLUIDA'

export const KANBAN_COLUMN_LABEL: Record<KanbanColumn, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  VALIDANDO_EFICACIA: 'Validando eficácia',
  ATRASADA: 'Atrasada',
  CONCLUIDA: 'Concluída',
}

export const KANBAN_COLUMN_ORDER: KanbanColumn[] = [
  'PENDENTE',
  'EM_ANDAMENTO',
  'VALIDANDO_EFICACIA',
  'ATRASADA',
  'CONCLUIDA',
]

/** Fim do dia do prazo: uma ação só atrasa depois de o dia inteiro passar. */
function isPastDue(dueDate: string, now: Date): boolean {
  const due = new Date(`${dueDate.slice(0, 10)}T23:59:59.999`)
  if (Number.isNaN(due.getTime())) return false
  return due.getTime() < now.getTime()
}

/**
 * Coluna em que a ação deve aparecer.
 *
 * `null` significa fora do kanban principal: ação pausada ou cancelada continua
 * existindo, mas não disputa espaço com o trabalho em curso.
 */
export function deriveActionKanbanColumn(
  status: string | null | undefined,
  dueDate: string | null | undefined,
  now: Date = new Date(),
): KanbanColumn | null {
  const normalized = String(status ?? '').trim().toLowerCase()

  if (normalized === 'concluido' || normalized === 'concluida') return 'CONCLUIDA'
  if (normalized === 'pausada' || normalized === 'cancelada') return null

  // Validando eficácia é trabalho já entregue à espera de comprovação; o prazo
  // de execução já não se aplica.
  if (normalized === 'validando_eficacia') return 'VALIDANDO_EFICACIA'

  if (dueDate && isPastDue(dueDate, now)) return 'ATRASADA'

  if (normalized === 'em_andamento') return 'EM_ANDAMENTO'
  if (normalized === 'atrasado') return 'ATRASADA'

  return 'PENDENTE'
}

/** Agrupa ações por coluna, descartando as que não pertencem ao kanban. */
export function groupActionsByKanbanColumn<T extends { status?: string | null; prazo?: string | null }>(
  actions: T[],
  now: Date = new Date(),
): Record<KanbanColumn, T[]> {
  const groups = {
    PENDENTE: [] as T[],
    EM_ANDAMENTO: [] as T[],
    VALIDANDO_EFICACIA: [] as T[],
    ATRASADA: [] as T[],
    CONCLUIDA: [] as T[],
  }

  for (const action of actions) {
    const column = deriveActionKanbanColumn(action.status, action.prazo, now)
    if (column) groups[column].push(action)
  }

  return groups
}
