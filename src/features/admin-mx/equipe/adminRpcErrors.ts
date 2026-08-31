/** Traduz erros de RPC administrativa para mensagem honesta na UI. */
export function describeAdminRpcError(
  error: { message?: string; code?: string } | null | undefined,
  fallback: string,
): string {
  const message = error?.message?.trim() ?? ''
  const code = error?.code?.trim() ?? ''
  const blob = `${code} ${message}`

  if (/Patch contém campo não permitido/i.test(message)) {
    const field = message.match(/campo não permitido[.:]?\s*([a-z_]+)/i)?.[1]
    return field
      ? `O campo "${field}" não pode ser gravado nesta operação. Atualize a migration de RPC do plano de ação.`
      : 'O patch do plano contém um campo não permitido pelo banco.'
  }

  if (/Campo obrigatório inválido:\s*([a-z_]+)/i.test(message)) {
    const field = message.match(/Campo obrigatório inválido:\s*([a-z_]+)/i)?.[1]
    return field ? `Preencha o campo obrigatório: ${field}.` : message
  }

  if (/Campo inválido:\s*([a-z_]+)/i.test(message)) {
    return message
  }

  if (/PGRST202|function .* does not exist|Could not find the function|schema cache/i.test(blob)) {
    return 'A função administrativa ainda não está publicada neste banco. Aplique a migration local de RPCs (usuários/lojas) antes de editar, desativar ou excluir.'
  }

  if (/42501|insufficient_privilege|permission denied|não tem permissão|sem permissão|aumentar.?privilég/i.test(blob)) {
    return message || 'Sem permissão para esta operação. Confirme o papel interno MX e se a RPC está publicada.'
  }

  return message || fallback
}
