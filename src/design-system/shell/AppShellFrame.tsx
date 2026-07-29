import * as React from 'react'
import { MX_DS_ROOT_CLASS } from '@/design-system/tokens'
import { resolveAppShellConfig } from './appShellConfig'
import { RouteAnnouncer } from './RouteAnnouncer'
import { SkipLink } from './SkipLink'

export interface AppShellFrameProps {
  /** Perfil autenticado. Decide densidade e alvo do skip-link. */
  role: string | null | undefined
  children: React.ReactNode
}

/**
 * Moldura comum a todo o produto.
 *
 * Concentra as responsabilidades do shell que hoje faltam em ambos os shells
 * existentes (§10, §14): escopo de tokens, densidade por perfil, skip-link e
 * foco ao trocar de rota.
 *
 * É deliberadamente uma casca em volta dos shells atuais em vez de uma
 * reescrita: o Dono entra na arquitetura unificada sem que sua aparência
 * aprovada mude, que é a condição da Fase 3. A convergência de sidebar e
 * topbar acontece por dentro, nas fases seguintes.
 */
export function AppShellFrame({ role, children }: AppShellFrameProps) {
  const config = resolveAppShellConfig(role)

  return (
    <div
      className={`${MX_DS_ROOT_CLASS} contents`}
      data-mx-density={config.density}
      data-mx-role={role ?? 'anonimo'}
    >
      <SkipLink targetId={config.mainContentId}>{config.skipLinkLabel}</SkipLink>
      <RouteAnnouncer mainContentId={config.mainContentId} />
      {children}
    </div>
  )
}
