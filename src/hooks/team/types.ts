import type { User, UserRole } from '@/types/database'

export type TeamMemberUpdateFields = Partial<Pick<User, 'name' | 'email' | 'phone' | 'active'>> & {
  role?: UserRole
  store_id?: string | null
  previous_store_id?: string | null
  started_at?: string | null
  ended_at?: string | null
  is_active?: boolean
  closing_month_grace?: boolean
  is_venda_loja?: boolean
}

export type TeamMember = User & {
  checkin_today: boolean
  started_at?: string
  ended_at?: string
  is_active?: boolean
  closing_month_grace?: boolean
  store_name?: string
}

export type TeamMembershipRow = {
  id?: string
  user_id: string
  store_id: string
  role: UserRole
  is_active?: boolean | null
  ended_at?: string | null
  users: User | null
  store?: { name?: string | null } | null
}

export type SellerTenureRow = {
  seller_user_id: string
  store_id: string
  started_at?: string | null
  ended_at?: string | null
  is_active?: boolean | null
  closing_month_grace?: boolean | null
}

export type SellerTenureWithUserRow = SellerTenureRow & {
  users: User | null
  store?: { name?: string | null } | null
}

export type SellerTenureUpdateFields = Partial<
  Pick<SellerTenureRow, 'started_at' | 'ended_at' | 'is_active' | 'closing_month_grace'>
>

export interface RegisterUserInput {
  email: string
  password?: string
  name: string
  role: UserRole
  store_id?: string
  phone?: string
  started_at?: string
  ended_at?: string | null
  is_active?: boolean
  closing_month_grace?: boolean
  is_venda_loja?: boolean
  confirm_transfer?: boolean
  /** Confirma que o homônimo já ativo na loja é outra pessoa. */
  confirm_duplicate_name?: boolean
}

export const TEAM_USER_SELECT =
  'id, name, email, role, avatar_url, is_venda_loja, active, created_at, phone, must_change_password, notification_preferences'
export const TEAM_MEMBERSHIP_SELECT = `id, user_id, store_id, role, is_active, ended_at, users:usuarios(${TEAM_USER_SELECT}), store:lojas(name)`
export const TEAM_SELLER_TENURE_SELECT = `seller_user_id, store_id, started_at, ended_at, is_active, closing_month_grace, users:usuarios(${TEAM_USER_SELECT}), store:lojas(name)`

export const isInternalRole = (role?: string | null) =>
  role === 'administrador_geral' || role === 'administrador_mx' || role === 'consultor_mx'

export const isStoreTeamRole = (role?: string | null) =>
  role === 'dono' || role === 'gerente' || role === 'vendedor'

export const todayISO = () => new Date().toISOString().slice(0, 10)

export function hasStoreTeamUser(
  row: TeamMembershipRow,
): row is TeamMembershipRow & { users: User } {
  return Boolean(row.users && row.users.active !== false && isStoreTeamRole(row.role || row.users.role))
}
