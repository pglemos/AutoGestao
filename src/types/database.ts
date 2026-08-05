// ============================================
// MX PERFORMANCE — Canonical Database Types (EPIC-01)
// ============================================

/**
 * Tipos base vindos diretamente do schema do Postgres/Supabase.
 * Devem ser mantidos em sincronia com as migrações SQL.
 */

export type UserRole = 'administrador_geral' | 'administrador_mx' | 'consultor_mx' | 'dono' | 'gerente' | 'vendedor'
export type RoleCode =
    | 'master'
    | 'director'
    | 'sales_manager'
    | 'seller'
    | 'marketing'
    | 'product'
    | 'finance'
    | 'hr'
    | 'operations'
    | 'consultant'
export type MxMetaRoleCode = 'admin_mx'
export type MxRoleCode = RoleCode | MxMetaRoleCode
export type MembershipRole = 'dono' | 'gerente' | 'vendedor'
export type PDIStatus = 'aberto' | 'em_andamento' | 'concluido'
export type TrainingType = 'prospeccao' | 'agendamento' | 'atendimento' | 'apresentacao' | 'financiamento' | 'carro_de_troca' | 'fechamento' | 'funil' | 'rotina_diaria' | 'crm' | 'institucional' | 'gestao' | 'pre-vendas'
export type TargetAudience = 'vendedor' | 'gerente' | 'dono' | 'todos'
export type CheckinScope = 'daily' | 'adjustment' | 'historical'
// `draft` é aceito pelo banco desde a migration 20260708124500
// (daily_checkins_submission_status_check). O tipo omitia o valor e obrigava
// cast em toda comparação de rascunho.
export type CheckinSubmissionStatus = 'draft' | 'on_time' | 'late'
export type StoreSourceMode = 'legacy_forms' | 'native_app' | 'hybrid'
export type ProjectionMode = 'calendar' | 'business'
export type CorrectionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

/** Preferências granulares de notificação do usuário */
export interface NotificationPreferences {
    push: boolean
    email: boolean
    matinal: boolean
    weekly: boolean
    monthly: boolean
    gaps: boolean
    pdi: boolean
    rituals: boolean
    broadcasts: boolean
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
    push: true,
    email: true,
    matinal: true,
    weekly: true,
    monthly: false,
    gaps: true,
    pdi: true,
    rituals: true,
    broadcasts: true,
}

/** Interface de Usuário Canônica */
export interface User {
    id: string
    name: string
    email: string
    role: UserRole
    role_id?: string | null
    avatar_url: string | null
    is_venda_loja: boolean
    active: boolean
    created_at: string
    phone?: string
    store_id?: string
    must_change_password?: boolean
    notification_preferences?: NotificationPreferences | null
}

/** Interface de Unidade/Loja */
export interface Store {
    id: string
    name: string
    manager_email: string | null
    legal_name: string | null
    cnpj: string | null
    address: string | null
    administrative_phone: string | null
    partners: StorePartner[]
    /** Matriz desta unidade. `null` = a própria loja é matriz (hierarquia de um nível). */
    parent_loja_id: string | null
    active: boolean
    source_mode: StoreSourceMode
    created_at: string
    updated_at: string
}

export interface StorePartner {
    name: string
    document?: string | null
    phone?: string | null
    email?: string | null
}

export interface StorePreRegistration {
    id: string
    store_id: string
    store_name_snapshot: string
    auth_user_id: string | null
    full_name: string
    email: string
    phone: string
    role: MembershipRole
    segment: string
    store_tenure: string
    market_experience: string
    notes: string | null
    company_legal_name: string | null
    company_cnpj: string | null
    company_address: string | null
    company_administrative_phone: string | null
    avatar_url: string | null
    avatar_storage_path: string | null
    temporary_password: string | null
    status: 'pending' | 'reviewed' | 'synced' | 'rejected'
    submitted_at: string
    reviewed_by: string | null
    reviewed_at: string | null
    approved_by: string | null
    approved_at: string | null
    rejected_by: string | null
    rejected_at: string | null
    approval_note: string | null
}

/** Mapeamento Multi-tenant (Membership): Vincula usuários a múltiplas lojas */
export interface StoreSeller {
    id: string
    store_id: string
    seller_id: string
    is_active: boolean
    created_at?: string
    // Dados injetados em queries com JOIN
    store?: Store
    seller?: User
}

/** Regras de Meta da Unidade (Crucial para cálculos de performance) */
export interface StoreMetaRules {
    store_id: string
    monthly_goal: number
    individual_goal_mode: 'even' | 'custom' | 'proportional'
    include_venda_loja_in_store_total: boolean
    include_venda_loja_in_individual_goal: boolean
    bench_lead_agd: number
    bench_agd_visita: number
    bench_visita_vnd: number
    projection_mode: ProjectionMode
    /** Quando false, o vendedor vê o total de comissão mas o drawer de detalhamento fica oculto. Padrão true. */
    remuneracao_detalhes_visivel: boolean
    updated_by: string | null
    updated_at: string
}

/** Check-in Diário Operacional */
export interface DailyCheckin {
    id: string
    seller_user_id: string
    store_id: string
    reference_date: string // format: YYYY-MM-DD
    submitted_at: string   // ISO 8601
    metric_scope: CheckinScope
    submission_status: CheckinSubmissionStatus
    is_venda_loja: boolean
    
    // Métricas de Produção
    leads_prev_day: number
    leads_net_prev_day: number
    agd_cart_prev_day: number
    agd_net_prev_day: number
    agd_cart_today: number
    agd_net_today: number
    vnd_porta_prev_day: number
    vnd_cart_prev_day: number
    vnd_net_prev_day: number
    visit_prev_day: number
    // Distribuição de visitas por canal (P0-02, 2026-07-10). NULL em registros
    // anteriores a esta migração — significa "distribuição não rastreada",
    // nunca deve ser lido como zero.
    visitas_porta_prev_day: number | null
    visitas_cart_prev_day: number | null
    visitas_net_prev_day: number | null

    zero_reason: string | null
    note: string | null
    submitted_late?: boolean
    edit_locked_at?: string | null
    created_by?: string | null
    updated_at: string

    // Disciplina do Fechamento (EV-1.5) — persistida pelo servidor
    pontuacao_disciplina_base?: number | null
    pontuacao_disciplina_final?: number | null
    finalizado_apos_prazo?: boolean
    penalizacao_atraso_aplicada?: boolean
    percentual_penalizacao_atraso?: number
    fechamento_liberado?: boolean
    liberado_por_id?: string | null
    liberado_por_nome?: string | null
    data_hora_liberacao?: string | null

    // Controle otimista do rascunho (migration 20260805220000). Server-owned:
    // o cliente só informa a revisão que conhece, nunca a escolhe.
    draft_revision?: number | null
    last_draft_saved_at?: string | null
}

/** Feedback Estruturado Semanal */
export interface Feedback {
    id: string
    store_id: string
    manager_id: string | null
    seller_id: string
    week_reference: string
    leads_week: number
    agd_week: number
    visit_week: number
    vnd_week: number
    tx_lead_agd: number
    tx_agd_visita: number
    tx_visita_vnd: number
    meta_compromisso: number
    positives: string
    attention_points: string
    action: string
    caso_motivo?: string | null
    notes: string | null
    team_avg_json: Record<string, unknown>
    diagnostic_json: Record<string, unknown>
    commitment_suggested: number
    visible_to_seller?: boolean
    acknowledged: boolean
    acknowledged_at: string | null
    seller_comment?: string | null
    seller_comment_at?: string | null
    created_at: string
}

/** Plano de Desenvolvimento Individual (PDI) */
export interface PDI {
    id: string
    store_id: string
    manager_id: string
    seller_id: string
    comp_prospeccao: number
    comp_abordagem: number
    comp_demonstracao: number
    comp_fechamento: number
    comp_crm: number
    comp_digital: number
    comp_disciplina: number
    comp_organizacao: number
    comp_negociacao: number
    comp_produto: number
    meta_6m: string
    meta_12m: string
    meta_24m: string
    action_1: string
    action_2: string | null
    action_3: string | null
    action_4: string | null
    action_5: string | null
    due_date: string | null
    status: PDIStatus
    acknowledged: boolean
    created_at: string
    updated_at: string
}

/** Solicitação de Correção Retroativa (v1.1) */
export interface CheckinCorrectionRequest {
    id: string
    checkin_id: string
    seller_id: string
    store_id: string
    requested_values: CheckinFormData
    original_values?: Partial<CheckinFormData> | null
    delta?: Record<string, { original: unknown; solicitado: unknown }>
    reason: string
    status: CorrectionStatus
    auditor_id: string | null
    reviewed_at: string | null
    rejection_reason?: string | null
    cancelled_at?: string | null
    applied_at?: string | null
    created_at: string
}

/** Log de Auditoria Imutável (v1.1) */
export interface CheckinAuditLog {
    id: string
    checkin_id: string
    correction_request_id: string | null
    changed_by: string
    old_values: Partial<DailyCheckin>
    new_values: Partial<DailyCheckin>
    change_type: string
    created_at: string
}

// ============================================
// Derived & UI Types
// ============================================

/** Resultado Processado do Ranking */
export interface RankingEntry {
    user_id: string
    user_name: string
  avatar_url?: string | null
  store_name?: string
  remuneracao_plano_id?: string | null
  remuneracao_plano_cargo?: string | null
  is_venda_loja: boolean
    vnd_total: number
    vnd_yesterday?: number
    leads: number
    agd_total: number
    visitas: number
    meta: number
    atingimento: number
    projecao: number
    ritmo: number
    efficiency: number
    status: { label: string; color: string }
    gap: number
    position: number
    checked_in?: boolean
    routine_execution?: number | null
    discipline_score?: number | null
}

/** Dados do Funil de Vendas */
export interface FunnelData {
    leads: number
    agd_total: number
    visitas: number
    vnd_total: number
    tx_lead_agd: number
    tx_agd_visita: number
    tx_visita_vnd: number
}

/** Tipos de Formulários */
export interface CheckinFormData {
    leads?: number
    leads_prev_day?: number
    leads_cart?: number
    leads_net?: number
    leads_net_prev_day?: number
    agd_cart_prev?: number
    agd_cart_prev_day?: number
    agd_net_prev?: number
    agd_net_prev_day?: number
    agd_cart?: number
    agd_cart_today?: number
    agd_net?: number
    agd_net_today?: number
    vnd_porta?: number
    vnd_porta_prev_day?: number
    vnd_cart?: number
    vnd_cart_prev_day?: number
    vnd_net?: number
    vnd_net_prev_day?: number
    visitas?: number
    visit_prev_day?: number
    visitas_porta?: number
    visitas_cart?: number
    visitas_net?: number
    visitas_porta_prev_day?: number
    visitas_cart_prev_day?: number
    visitas_net_prev_day?: number
    note?: string
    zero_reason?: string
    reference_date?: string
    // Disciplina do Fechamento (EV-1.5) — calculada no client, validada/derivada no servidor
    pontuacao_disciplina_base?: number
    fechamento_liberado?: boolean
}

export interface Membership {
    id: string
    user_id: string
    store_id: string
    role: MembershipRole
    created_at?: string
    is_active?: boolean
    ended_at?: string | null
    store?: Store
}

export interface CheckinTotals {
    agd_total: number
    vnd_total: number
}

export type CheckinWithTotals = DailyCheckin & CheckinTotals

export interface Benchmark {
    lead_agd: number
    agd_visita: number
    visita_vnd: number
}

export interface FunnelDiagnostic {
    gargalo: string | null
    diagnostico: string
    sugestao: string
    mensagem?: string
}

export interface Training {
    id: string
    title: string
    description: string | null
    type: TrainingType
    video_url: string
    target_audience: TargetAudience
    active: boolean
    store_id?: string | null
    source_kind?: 'mx_interno' | 'especialista_convidado' | 'fornecedor' | 'loja_institucional'
    editorial_status?: 'draft' | 'active' | 'paused' | 'review' | 'retired'
    review_after?: string | null
    duration_minutes?: number
    xp_reward?: number
    curator_id?: string | null
    curation_notes?: string | null
    published_at?: string | null
    created_at: string
    updated_at?: string
}

export interface TrainingProgress {
    id?: string
    user_id: string
    training_id: string
    status?: 'locked' | 'available' | 'in_progress' | 'concluido' | 'completed'
    started_at?: string | null
    completed_at?: string | null
    progress_percent?: number
    source_context?: string | null
    created_at?: string
}

export interface FeedbackFormData {
    seller_id: string
    week_reference: string
    leads_week: number
    agd_week: number
    visit_week: number
    vnd_week: number
    tx_lead_agd: number
    tx_agd_visita: number
    tx_visita_vnd: number
    meta_compromisso: number
    positives: string
    attention_points: string
    action: string
    caso_motivo?: string
    notes?: string
    team_avg_json?: Record<string, unknown>
    diagnostic_json?: Record<string, unknown>
    commitment_suggested?: number
    visible_to_seller?: boolean
}

export interface WeeklyFeedbackReport {
    id: string
    store_id: string
    week_start: string
    week_end: string
    weekly_goal?: number
    team_avg_json?: Record<string, unknown> | null
    email_status?: string | null
    recipients?: string[] | null
    summary_json?: Record<string, unknown> | null
    created_at?: string
    updated_at?: string
}

export interface PDIReview {
    id: string
    pdi_id: string
    reviewer_id?: string | null
    notes?: string | null
    created_at?: string
    [key: string]: unknown
}

export interface PDIFormData {
    seller_id: string
    comp_prospeccao: number
    comp_abordagem: number
    comp_demonstracao: number
    comp_fechamento: number
    comp_crm: number
    comp_digital: number
    comp_disciplina: number
    comp_organizacao: number
    comp_negociacao: number
    comp_produto: number
    meta_6m: string
    meta_12m: string
    meta_24m: string
    action_1: string
    action_2?: string
    action_3?: string
    action_4?: string
    action_5?: string
    due_date?: string
}

export type NotificationPriority = 'low' | 'medium' | 'high'
export type NotificationType = 'system' | 'discipline' | 'performance' | 'alert'

export interface Notification {
    id: string
    title: string
    message: string
    type: NotificationType | string
    priority: NotificationPriority | string
    read: boolean
    recipient_id: string
    sender_id?: string | null
    store_id?: string | null
    target_role?: string | null
    link?: string | null
    broadcast_id?: string | null
    created_at: string
    updated_at?: string
}

export interface StoreBenchmark {
    store_id: string
    lead_to_agend: number
    agend_to_visit: number
    visit_to_sale: number
    updated_by?: string | null
    updated_at?: string
}

export interface StoreDeliveryRules {
    store_id: string
    matinal_recipients: string[]
    weekly_recipients: string[]
    monthly_recipients: string[]
    whatsapp_group_ref: string | null
    timezone: string
    active: boolean
    updated_by?: string | null
    updated_at?: string
}

export interface DigitalProduct {
    id: string
    name: string
    description: string
    link: string
    category?: string
    target_roles?: UserRole[]
    status?: 'ativo' | 'rascunho' | 'arquivado'
    sort_order?: number
    created_at?: string
    updated_at?: string
}

export interface ManagerRoutineLog {
    id: string
    store_id: string
    manager_id: string
    routine_date: string
    reference_date: string
    checkins_pending_count: number
    sem_registro_count: number
    agd_cart_today: number
    agd_net_today: number
    previous_day_leads: number
    previous_day_sales: number
    ranking_snapshot?: Array<Record<string, unknown>>
    notes?: string | null
    status?: string
    executed_at?: string
    updated_at?: string
    created_at?: string
}

// ============================================
// CRM de Consultoria (CONS-01 & CONS-02)
// ============================================

/** Status de Cliente da Consultoria */
export type ConsultingClientStatus = 'ativo' | 'inativo' | 'suspenso' | 'prospect'
/** Papeis na Consultoria */
export type AssignmentRole = 'responsavel' | 'auxiliar' | 'viewer'

/** Cliente da Consultoria (Empresa/Grupo) */
export interface ConsultingClient {
    id: string
    name: string
    legal_name: string | null
    cnpj: string | null
    product_name: string | null
    status: ConsultingClientStatus
    notes: string | null
    primary_store_id: string | null
    created_by: string | null
    created_at: string
    updated_at: string
}

/** Unidade/Loja do Cliente da Consultoria */
export interface ConsultingClientUnit {
    id: string
    client_id: string
    name: string
    city: string | null
    state: string | null
    is_primary: boolean
    created_at: string
    updated_at: string
}

/** Contato do Cliente da Consultoria */
export interface ConsultingClientContact {
    id: string
    client_id: string
    name: string
    email: string | null
    phone: string | null
    role: string | null
    is_primary: boolean
    created_at: string
    updated_at: string
}

/** Vínculo de Consultor a Cliente */
export interface ConsultingAssignment {
    id: string
    client_id: string
    user_id: string
    assignment_role: AssignmentRole
    active: boolean
    created_at: string
    updated_at: string
    // Dados injetados
    client?: ConsultingClient
    user?: User
}

/** Tokens OAuth2 para Integrações (Google, etc) */
export interface ConsultingOAuthToken {
    id: string
    user_id: string
    provider: 'google'
    access_token: string
    refresh_token: string | null
    expires_at: string | null
    scopes: string[]
    created_at: string
    updated_at: string
}

/** Configurações de Sincronização de Agenda */
export interface ConsultingCalendarSettings {
    id: string
    client_id: string
    user_id: string
    google_calendar_id: string
    sync_active: boolean
    last_sync_at: string | null
    created_at: string
    updated_at: string
}
