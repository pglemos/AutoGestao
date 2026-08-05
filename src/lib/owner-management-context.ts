export type OwnerManagementStatus = 'active_manager' | 'manager_pending' | 'owner_managed'
export type OwnerManagementAccessMode = 'full_management' | 'oversight'

export type OwnerManagementContext = {
  status: OwnerManagementStatus
  hasActiveManager: boolean
  activeManagerCount: number
  ownerAssumesManagement: boolean
  managerRegistrationPending: boolean
  declaredManagerEmail: string | null
  accessMode: OwnerManagementAccessMode
  queryFailed: boolean
}

export type ResolveOwnerManagementContextInput = {
  activeManagerCount: number | null | undefined
  declaredManagerEmail?: string | null
  queryFailed?: boolean
}

function normalizeManagerEmail(value?: string | null) {
  const email = value?.trim().toLowerCase() || ''
  return email || null
}

export function resolveOwnerManagementContext({
  activeManagerCount,
  declaredManagerEmail,
  queryFailed = false,
}: ResolveOwnerManagementContextInput): OwnerManagementContext {
  const email = normalizeManagerEmail(declaredManagerEmail)

  if (queryFailed) {
    return {
      status: 'active_manager',
      hasActiveManager: true,
      activeManagerCount: Math.max(0, activeManagerCount || 0),
      ownerAssumesManagement: false,
      managerRegistrationPending: false,
      declaredManagerEmail: email,
      accessMode: 'oversight',
      queryFailed: true,
    }
  }

  const count = Math.max(0, activeManagerCount || 0)
  if (count > 0) {
    return {
      status: 'active_manager',
      hasActiveManager: true,
      activeManagerCount: count,
      ownerAssumesManagement: false,
      managerRegistrationPending: false,
      declaredManagerEmail: email,
      accessMode: 'oversight',
      queryFailed: false,
    }
  }

  if (email) {
    return {
      status: 'manager_pending',
      hasActiveManager: false,
      activeManagerCount: 0,
      ownerAssumesManagement: true,
      managerRegistrationPending: true,
      declaredManagerEmail: email,
      accessMode: 'full_management',
      queryFailed: false,
    }
  }

  return {
    status: 'owner_managed',
    hasActiveManager: false,
    activeManagerCount: 0,
    ownerAssumesManagement: true,
    managerRegistrationPending: false,
    declaredManagerEmail: null,
    accessMode: 'full_management',
    queryFailed: false,
  }
}
