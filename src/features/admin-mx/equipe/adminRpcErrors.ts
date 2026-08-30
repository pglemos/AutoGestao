/** Traduz erros de RPC administrativa para mensagem honesta na UI. */
export function describeAdminRpcError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
): string {
  const message = error?.message?.trim() ?? ''
  const code = error?.code?.trim() ?? ''
  const blob = `${code} ${message}`

  if (/PGRST202|function .* does not exist|Could not find the function|schema cache/i.test(blob)) {
    return 'A função administrativa ainda não está publicada neste banco. Aplique a migration local de RPCs (usuários/lojas) antes de editar, desativar ou excluir.'
  }

  if (/42501|insufficient_privilege|permission denied|não tem permissão|sem permissão|aumentar.?privilég/i.test(blob)) {
    return message || 'Sem permissão para esta operação. Confirme o papel interno MX e se a RPC está publicada.'
  }

  return message || fallback
}
