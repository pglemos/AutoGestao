import type { MxDensity } from '@/design-system/tokens'
import type { UserRole } from '@/types/database'

/**
 * Configuração do App Shell por perfil.
 *
 * É por aqui que o perfil varia — não por tema visual próprio (§10.1). Cada
 * perfil escolhe densidade, rótulos e alvo do skip-link; identidade, cores,
 * família de componentes e linguagem de interação são as mesmas para todos.
 */
export interface AppShellProfileConfig {
  /** Densidade de layout. Nunca altera identidade (§10.2). */
  density: MxDensity
  /** `id` do landmark principal do shell que atende este perfil. */
  mainContentId: string
  /** Rótulo do landmark, anunciado por leitores de tela. */
  mainContentLabel: string
  /** Texto do skip-link. */
  skipLinkLabel: string
}

/** Perfil do Dono: mais respiro, telas executivas de leitura. */
const OWNER_CONFIG: AppShellProfileConfig = {
  density: 'comfortable',
  mainContentId: 'main-content',
  mainContentLabel: 'Conteúdo principal',
  skipLinkLabel: 'Pular para o conteúdo',
}

/** Demais perfis: shell universal, densidade padrão. */
const UNIVERSAL_CONFIG: AppShellProfileConfig = {
  density: 'standard',
  mainContentId: 'main-content',
  mainContentLabel: 'Conteúdo principal',
  skipLinkLabel: 'Pular para o conteúdo',
}

/** Perfis internos MX operam sobre tabelas extensas — densidade compacta. */
const INTERNAL_CONFIG: AppShellProfileConfig = {
  ...UNIVERSAL_CONFIG,
  density: 'compact',
}

const BY_ROLE: Record<UserRole, AppShellProfileConfig> = {
  dono: OWNER_CONFIG,
  gerente: UNIVERSAL_CONFIG,
  vendedor: UNIVERSAL_CONFIG,
  administrador_geral: INTERNAL_CONFIG,
  administrador_mx: INTERNAL_CONFIG,
  consultor_mx: INTERNAL_CONFIG,
}

/** Resolve a configuração do shell. Perfil desconhecido cai no universal. */
export function resolveAppShellConfig(role: string | null | undefined): AppShellProfileConfig {
  if (!role) return UNIVERSAL_CONFIG
  return BY_ROLE[role as UserRole] ?? UNIVERSAL_CONFIG
}

export { OWNER_CONFIG, UNIVERSAL_CONFIG, INTERNAL_CONFIG }
