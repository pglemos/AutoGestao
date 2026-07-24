export type StoreClosingStatus =
  | 'not_started'
  | 'draft'
  | 'submitted_late'
  | 'submitted_on_time'

export interface StoreLiveOverviewRow {
  seller_user_id: string
  seller_name: string
  reference_date: string
  closing_status: StoreClosingStatus
  submission_status: string | null
  submitted_at: string | null
  submitted_late: boolean
  discipline_score: number | null
  live_leads: number
  live_appointments: number
  live_attendances: number
  live_sales: number
  declared_leads: number
  declared_appointments: number
  declared_attendances: number
  declared_sales: number
  has_divergence: boolean
  last_activity_at: string | null
}

export type AdminLiveOverviewRpcResult = {
  data: unknown
  error: { message: string; code?: string } | null
}

export type AdminLiveOverviewRpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<AdminLiveOverviewRpcResult>
}

export function loadAdminStoreLiveOverview(
  client: AdminLiveOverviewRpcClient,
  storeId: string,
  referenceDate: string,
) {
  // Keep rpc as an object method. Detaching SupabaseClient.rpc loses its internal
  // `this` context and fails before the browser sends a network request.
  return client.rpc('admin_store_live_overview', {
    p_store_id: storeId,
    p_reference_date: referenceDate,
  })
}

export function isClosingCompleted(status: StoreClosingStatus) {
  return status === 'submitted_on_time' || status === 'submitted_late'
}

export function getClosingPresentation(status: StoreClosingStatus) {
  if (status === 'submitted_on_time') {
    return { label: 'Fechado no prazo', variant: 'success' as const }
  }
  if (status === 'submitted_late') {
    return { label: 'Fechado com atraso', variant: 'warning' as const }
  }
  if (status === 'draft') {
    return { label: 'Rascunho aberto', variant: 'warning' as const }
  }
  return { label: 'Não iniciado', variant: 'danger' as const }
}

export function summarizeLiveOverview(rows: readonly StoreLiveOverviewRow[]) {
  return rows.reduce(
    (summary, row) => {
      if (isClosingCompleted(row.closing_status)) summary.completed += 1
      else summary.pending += 1
      if (row.closing_status === 'draft') summary.drafts += 1
      if (row.closing_status === 'not_started') summary.notStarted += 1
      if (row.has_divergence) summary.divergences += 1
      summary.leads += row.live_leads
      summary.appointments += row.live_appointments
      summary.attendances += row.live_attendances
      summary.sales += row.live_sales
      return summary
    },
    {
      completed: 0,
      pending: 0,
      drafts: 0,
      notStarted: 0,
      divergences: 0,
      leads: 0,
      appointments: 0,
      attendances: 0,
      sales: 0,
    },
  )
}
