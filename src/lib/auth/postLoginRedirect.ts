import type { UserRole } from '@/types/database'
import { canAccessPath } from './routeAccess'

type RedirectLocation = {
  pathname?: unknown
  search?: unknown
  hash?: unknown
}

function safeSearch(value: unknown) {
  return typeof value === 'string' && value.startsWith('?') ? value : ''
}

function safeHash(value: unknown) {
  return typeof value === 'string' && value.startsWith('#') ? value : ''
}

/**
 * Fallback default por papel, usado quando o redirect requisitado pelo state
 * nao eh acessivel para o role do usuario logado (evita loop 403).
 */
function defaultRedirectForRole(role: UserRole | null | undefined): string {
  if (role === 'vendedor') return '/home'
  if (role === 'gerente') return '/home'
  if (role === 'dono') return '/dono'
  // administrador_*, consultor_mx
  if (role) return '/painel'
  return '/'
}

export function resolvePostLoginRedirect(state: unknown, role?: UserRole | null) {
  const from = (state as { from?: RedirectLocation } | null)?.from
  const pathname = typeof from?.pathname === 'string' ? from.pathname : '/'

  if (!pathname.startsWith('/') || pathname === '/login') {
    return defaultRedirectForRole(role)
  }

  const fullPath = `${pathname}${safeSearch(from?.search)}${safeHash(from?.hash)}`

  // Valida acesso ao path pretendido — se o role nao tem acesso, redireciona
  // ao default do papel em vez de levar a uma 403. Sem role, mantem
  // comportamento antigo (sera tratado pela ProtectedRoute).
  if (role && !canAccessPath(pathname, role)) {
    return defaultRedirectForRole(role)
  }

  return fullPath
}
