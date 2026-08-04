export type StoreManagementFormMode = 'owner_managed' | 'manager_pending'

export type StoreManagementFormInput = {
  mode: StoreManagementFormMode
  managerEmail?: string | null
}

export type StoreManagementFormResult =
  | { ok: true; managerEmail: string | null }
  | { ok: false; error: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeStoreManagementForm({
  mode,
  managerEmail,
}: StoreManagementFormInput): StoreManagementFormResult {
  if (mode === 'owner_managed') return { ok: true, managerEmail: null }

  const email = managerEmail?.trim().toLowerCase() || ''
  if (!email) {
    return { ok: false, error: 'Informe o e-mail do gerente que será cadastrado.' }
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: 'Informe um e-mail válido para o gerente.' }
  }

  return { ok: true, managerEmail: email }
}
