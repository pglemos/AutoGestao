/**
 * As telas do gerente passaram a viver na raiz (`/minha-equipe`, `/meta-loja`, ...).
 * O prefixo `/gerente/` saiu do produto, mas continua vivo em links antigos,
 * favoritos e navegações herdadas — sem este mapa eles caem no 404.
 */
const MANAGER_LEGACY_PATHS: Record<string, string> = {
  '': '/home',
  'minha-equipe': '/minha-equipe',
  'rotina-equipe': '/rotina-equipe',
  'meta-loja': '/meta-loja',
  'mentor': '/mentor',
  'feedbacks-pdis': '/feedbacks-pdis',
  'ranking': '/ranking',
  'universidade-mx': '/universidade-mx',
  'fechamento-diario': '/fechamento-diario',
}

export function resolveManagerLegacyPath(pathname: string): string {
  const rest = pathname.replace(/^\/gerente\/?/, '')
  return MANAGER_LEGACY_PATHS[rest] ?? '/home'
}
