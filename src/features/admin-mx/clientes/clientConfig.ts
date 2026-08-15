export const CLIENT_CONFIG_CANALS = ['whatsapp', 'email', 'ambos'] as const
export type ClientConfigCanal = (typeof CLIENT_CONFIG_CANALS)[number]

export type ClientConfigDraft = {
  tolerancia_fechamento_min: number
  limite_vendedores: number
  retencao_snapshots_dias: number
  canal_critico: ClientConfigCanal
  canal_atencao: ClientConfigCanal
  janela_envio: string
}

export const DEFAULT_CLIENT_CONFIG: ClientConfigDraft = {
  tolerancia_fechamento_min: 30,
  limite_vendedores: 10,
  retencao_snapshots_dias: 90,
  canal_critico: 'whatsapp',
  canal_atencao: 'email',
  janela_envio: '08h às 19h',
}

export function emptyClientConfigDraft(overrides: Partial<ClientConfigDraft> = {}): ClientConfigDraft {
  return { ...DEFAULT_CLIENT_CONFIG, ...overrides }
}

/** Erro bloqueante da configuração do cliente, ou null. */
export function validateClientConfigDraft(draft: ClientConfigDraft): string | null {
  if (!Number.isInteger(draft.tolerancia_fechamento_min) || draft.tolerancia_fechamento_min < 0 || draft.tolerancia_fechamento_min > 240) {
    return 'Tolerância de fechamento deve ficar entre 0 e 240 minutos.'
  }
  if (!Number.isInteger(draft.limite_vendedores) || draft.limite_vendedores < 1 || draft.limite_vendedores > 100) {
    return 'Limite de vendedores deve ficar entre 1 e 100.'
  }
  if (!Number.isInteger(draft.retencao_snapshots_dias) || draft.retencao_snapshots_dias < 1 || draft.retencao_snapshots_dias > 365) {
    return 'Retenção de snapshots deve ficar entre 1 e 365 dias.'
  }
  if (!CLIENT_CONFIG_CANALS.includes(draft.canal_critico)) return 'Selecione o canal para alertas críticos.'
  if (!CLIENT_CONFIG_CANALS.includes(draft.canal_atencao)) return 'Selecione o canal para alertas de atenção.'
  if (!draft.janela_envio.trim()) return 'Informe a janela de envio.'
  return null
}

/** Resumo legível para exibição. */
export function clientConfigSummary(draft: ClientConfigDraft): Array<[string, string]> {
  return [
    ['Tolerância de fechamento', `${draft.tolerancia_fechamento_min} min`],
    ['Limite de vendedores por loja', String(draft.limite_vendedores)],
    ['Retenção de snapshots', `${draft.retencao_snapshots_dias} dias`],
    ['Canal crítico', draft.canal_critico === 'ambos' ? 'WhatsApp e e-mail' : draft.canal_critico === 'whatsapp' ? 'WhatsApp' : 'E-mail'],
    ['Canal atenção', draft.canal_atencao === 'ambos' ? 'WhatsApp e e-mail' : draft.canal_atencao === 'whatsapp' ? 'WhatsApp' : 'E-mail'],
    ['Janela de envio', draft.janela_envio],
  ]
}
