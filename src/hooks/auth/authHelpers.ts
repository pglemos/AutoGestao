import type { User as AppUser, UserRole, Store } from '@/types/database'
import { normalizeRole } from '@/lib/auth/roles'

export const DEV_BYPASS_STORAGE_KEY = 'mx_auth_profile'
export const ROLE_SIMULATION_STORAGE_KEY = 'mx_role_simulation'
export const SIMULATION_CONTEXT_STORAGE_KEY = 'mx_simulation_context'
export const DEV_BYPASS_ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])
export const AUTH_SIGNOUT_REASON_STORAGE_KEY = 'mx_auth_signout_reason'
const AUTH_SIGNOUT_REASON_MAX_AGE_MS = 60_000

export function writeSignoutReason(reason: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(AUTH_SIGNOUT_REASON_STORAGE_KEY, JSON.stringify({ reason, ts: Date.now() }))
}

export function readSignoutReason(): string | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(AUTH_SIGNOUT_REASON_STORAGE_KEY)
  if (!raw) return null
  window.sessionStorage.removeItem(AUTH_SIGNOUT_REASON_STORAGE_KEY)
  try {
    const parsed = JSON.parse(raw) as { reason?: string; ts?: number }
    if (!parsed.reason || typeof parsed.ts !== 'number') return null
    if (Date.now() - parsed.ts > AUTH_SIGNOUT_REASON_MAX_AGE_MS) return null
    return parsed.reason
  } catch {
    return null
  }
}

export const PROFILE_SELECT =
  'id, name, email, role, avatar_url, is_venda_loja, active, created_at, phone, must_change_password, notification_preferences'
export const MEMBERSHIP_SELECT =
  'id, user_id, store_id, role, created_at, is_active, ended_at, store:lojas(id, name, manager_email, legal_name, cnpj, address, administrative_phone, partners, active, source_mode, created_at, updated_at)'

export const AUTH_NETWORK_ERROR_MESSAGE =
  'Não foi possível conectar ao servidor de autenticação. Verifique sua conexão ou tente novamente em alguns minutos.'

export type SimulationRole = Extract<UserRole, 'dono' | 'gerente' | 'vendedor'>
export type SimulationContext = {
  role: SimulationRole
  sellerUserId: string
  storeId: string
  realRole?: string
  startedAt?: string
}

export function isTransientFetchError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('message' in error)) return false
  const message = String((error as { message?: unknown }).message || '').toLowerCase()
  return ['failed to fetch', 'networkerror', 'load failed', 'name_not_resolved', 'err_name_not_resolved']
    .some(fragment => message.includes(fragment))
}

export function isDevBypassAllowed(): boolean {
  if (!import.meta.env.DEV || typeof window === 'undefined') return false
  if (import.meta.env.VITE_ENABLE_DEV_AUTH_BYPASS !== 'true') return false
  return DEV_BYPASS_ALLOWED_HOSTS.has(window.location.hostname)
}

export function readDevBypassProfile(): AppUser | null {
  if (!isDevBypassAllowed()) {
    if (typeof window !== 'undefined') window.localStorage.removeItem(DEV_BYPASS_STORAGE_KEY)
    return null
  }
  try {
    const raw = window.localStorage.getItem(DEV_BYPASS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AppUser>
    if (!parsed.id || !parsed.email) return null
    const role = normalizeRole(parsed.role)
    if (!role) return null
    return {
      id: parsed.id,
      name: parsed.name || 'Admin MX',
      email: parsed.email,
      role,
      avatar_url: null,
      is_venda_loja: false,
      active: true,
      created_at: parsed.created_at || new Date().toISOString(),
      phone: parsed.phone,
      store_id: parsed.store_id,
    }
  } catch {
    window.localStorage.removeItem(DEV_BYPASS_STORAGE_KEY)
    return null
  }
}

export function readSimulationRole(): SimulationRole | null {
  if (typeof window === 'undefined') return null
  const stored = window.sessionStorage.getItem(ROLE_SIMULATION_STORAGE_KEY)
  return stored === 'dono' || stored === 'gerente' || stored === 'vendedor' ? stored : null
}

export function readSimulationContext(): SimulationContext | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(SIMULATION_CONTEXT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<SimulationContext>
    if ((parsed.role !== 'vendedor' && parsed.role !== 'gerente' && parsed.role !== 'dono') || !parsed.sellerUserId || !parsed.storeId) return null
    return {
      role: parsed.role,
      sellerUserId: parsed.sellerUserId,
      storeId: parsed.storeId,
      realRole: typeof parsed.realRole === 'string' ? parsed.realRole : undefined,
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : undefined,
    }
  } catch {
    window.sessionStorage.removeItem(SIMULATION_CONTEXT_STORAGE_KEY)
    return null
  }
}

export function writeSimulationContext(context: SimulationContext | null): void {
  if (typeof window === 'undefined') return
  if (!context) {
    window.sessionStorage.removeItem(SIMULATION_CONTEXT_STORAGE_KEY)
    return
  }
  window.sessionStorage.setItem(SIMULATION_CONTEXT_STORAGE_KEY, JSON.stringify(context))
}

export function clearSimulationStorage(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(ROLE_SIMULATION_STORAGE_KEY)
  window.sessionStorage.removeItem(SIMULATION_CONTEXT_STORAGE_KEY)
}

export function pickSimulationStore(stores: Store[], preferredStoreId?: string | null): Store | null {
  const activeStores = stores.filter(store => store.active)
  const sandboxStore = activeStores.find(store => store.name?.trim().toLowerCase() === 'mx consultoria')
  if (sandboxStore) return sandboxStore
  const preferredStore = preferredStoreId ? activeStores.find(store => store.id === preferredStoreId) : null
  return preferredStore || activeStores[0] || null
}
