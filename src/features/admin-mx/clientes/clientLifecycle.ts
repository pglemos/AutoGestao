export type ClientLifecycleRow = {
  status: string | null
  onboarding_completed: boolean | null
  onboarding_step: number | null
  suspended_at: string | null
  activated_at: string | null
  scheduled_activation_at: string | null
}

/**
 * Lifecycle derivado do cliente — o banco mantém `status` (ativo/inativo/
 * arquivado) e as colunas de paridade; aqui se resolve o estado exibível e as
 * ações permitidas no menu (Base44 ClientesMX.jsx §9 ClientLifecycleStatus).
 */
export type ClientLifecycle = 'rascunho' | 'em_configuracao' | 'pronto_para_ativar' | 'ativacao_programada' | 'ativo' | 'suspenso' | 'arquivado'

export function resolveClientLifecycle(client: ClientLifecycleRow): ClientLifecycle {
  if (String(client.status ?? '').toLowerCase() === 'arquivado') return 'arquivado'
  if (client.suspended_at) return 'suspenso'
  if (String(client.status ?? '').toLowerCase() === 'ativo') return 'ativo'
  if (client.scheduled_activation_at) return 'ativacao_programada'
  if (client.onboarding_completed) return 'pronto_para_ativar'
  return 'em_configuracao'
}

export const CLIENT_LIFECYCLE_LABELS: Record<ClientLifecycle, string> = {
  rascunho: 'Rascunho',
  em_configuracao: 'Em configuração',
  pronto_para_ativar: 'Pronto para ativar',
  ativacao_programada: 'Ativação programada',
  ativo: 'Ativo',
  suspenso: 'Suspenso',
  arquivado: 'Arquivado',
}

export type ClientAction =
  | 'abrir_visao360'
  | 'acessar_workspace'
  | 'gerenciar_equipe'
  | 'editar_loja'
  | 'copiar_link_cadastro'
  | 'continuar_onboarding'
  | 'gerar_link_autocadastro'
  | 'adicionar_pessoa'
  | 'abrir_jornada'
  | 'validar_cadastros'
  | 'programar_ativacao'
  | 'suspender'
  | 'abrir_auditoria'
  | 'arquivar_loja'

/**
 * Ações do menu da lista conforme o lifecycle (Base44 ClientesMX.jsx 160-195):
 * - "Continuar onboarding" só quando o onboarding não terminou;
 * - "Programar ativação" só para pronto_para_ativar (inativo com onboarding ok);
 * - "Suspender" só para ativo/em_implantação;
 * - demais ações sempre disponíveis (o fluxo valida no destino).
 */
export function clientActionsFor(client: ClientLifecycleRow): ClientAction[] {
  const lifecycle = resolveClientLifecycle(client)
  const actions: ClientAction[] = [
    'abrir_visao360',
    'acessar_workspace',
    'gerenciar_equipe',
    'editar_loja',
    'copiar_link_cadastro',
  ]
  if (!client.onboarding_completed) actions.push('continuar_onboarding')
  actions.push('gerar_link_autocadastro', 'adicionar_pessoa', 'abrir_jornada')
  if (lifecycle === 'pronto_para_ativar' || lifecycle === 'em_configuracao') actions.push('programar_ativacao')
  if (lifecycle === 'ativo' || lifecycle === 'ativacao_programada') actions.push('suspender')
  actions.push('abrir_auditoria', 'arquivar_loja')
  return actions
}