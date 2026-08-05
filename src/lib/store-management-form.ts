export type StoreManagementFormMode = 'owner_managed' | 'manager_pending'

export type StoreManagementFormInput = {
  mode: StoreManagementFormMode
  managerEmail?: string | null
}

export type StoreManagementFormResult =
  | { ok: true; managerEmail: string | null }
  | { ok: false; error: string }

export type StoreManagementEditInput = StoreManagementFormInput & {
  contextConfirmed: boolean
  hasActiveManager: boolean
  currentManagerEmail?: string | null
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeOptionalEmail(value?: string | null) {
  const email = value?.trim().toLowerCase() || ''
  return email || null
}

export function normalizeStoreManagementForm({
  mode,
  managerEmail,
}: StoreManagementFormInput): StoreManagementFormResult {
  if (mode === 'owner_managed') return { ok: true, managerEmail: null }

  const email = normalizeOptionalEmail(managerEmail)
  if (!email) {
    return { ok: false, error: 'Informe o e-mail do gerente que será cadastrado.' }
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Informe um e-mail válido para o gerente.' }
  }

  return { ok: true, managerEmail: email }
}

export function resolveStoreManagementEdit({
  contextConfirmed,
  hasActiveManager,
  currentManagerEmail,
  mode,
  managerEmail,
}: StoreManagementEditInput): StoreManagementFormResult {
  if (!contextConfirmed || hasActiveManager) {
    return { ok: true, managerEmail: normalizeOptionalEmail(currentManagerEmail) }
  }

  return normalizeStoreManagementForm({ mode, managerEmail })
}
