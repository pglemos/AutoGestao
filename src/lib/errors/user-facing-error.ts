type ErrorWithCode = { code?: unknown }

export function getSafeUserFacingDataError(error: unknown, fallback: string): string {
  const code = error && typeof error === 'object' ? (error as ErrorWithCode).code : undefined
  const message = error instanceof Error
    ? error.message
    : error && typeof error === 'object' && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : typeof error === 'string'
    ? error
    : ''

  if (code === 'PGRST116') return 'Não foi possível localizar os dados solicitados.'
  if (code === '42501' || /42501|permission denied|insufficient privilege|não tem permissão|sem permissão/i.test(message)) {
    return 'Você não tem permissão para consultar estes dados. Confirme seu papel interno MX ou solicite acesso ao administrador.'
  }
  return fallback
}
