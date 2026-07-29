export const OWNER_BASE44_SECTION_VALUES = [
  'home',
  'rotina',
  'decisoes',
  'planejamento',
  'plano-acao',
  'consultoria',
  'departamentos',
  'mercado',
  'universidade',
  'consultor',
] as const

export const OWNER_LEGACY_SECTION_VALUES = [
  'resultados',
  'alertas',
  'benchmarking',
  'agenda',
  'visitas',
  'biblioteca',
] as const

export const OWNER_DEPARTMENT_CODES = [
  'visao-geral',
  'comercial',
  'marketing',
  'produto',
  'rh',
  'financeiro',
  'operacional',
] as const

export type OwnerBase44Section = (typeof OWNER_BASE44_SECTION_VALUES)[number]
export type OwnerLegacySection = (typeof OWNER_LEGACY_SECTION_VALUES)[number]
export type OwnerResolvedSection = OwnerBase44Section | OwnerLegacySection
export type OwnerDepartmentNavigationCode = (typeof OWNER_DEPARTMENT_CODES)[number]

export type OwnerBase44NavigationItem = {
  label: string
  section: OwnerBase44Section
  departmentCode?: OwnerDepartmentNavigationCode
  children?: OwnerBase44NavigationItem[]
  defaultExpanded?: boolean
  badge?: string
  badgeTone?: 'default' | 'warning'
}

export type OwnerBase44NavigationSection = {
  label: 'GESTÃO' | 'ESTRATÉGIA' | 'NEGÓCIO' | 'DESENVOLVIMENTO' | 'AÇÃO GLOBAL'
  items: OwnerBase44NavigationItem[]
}

export const OWNER_BASE44_NAVIGATION: OwnerBase44NavigationSection[] = [
  {
    label: 'GESTÃO',
    items: [
      { label: 'Início', section: 'home' },
      { label: 'Rotina do Dia', section: 'rotina' },
      { label: 'Central de Decisões', section: 'decisoes' },
    ],
  },
  {
    label: 'ESTRATÉGIA',
    items: [
      { label: 'Plano Estratégico', section: 'planejamento' },
      { label: 'Plano de Ação', section: 'plano-acao' },
      { label: 'Consultoria', section: 'consultoria' },
    ],
  },
  {
    label: 'NEGÓCIO',
    items: [
      {
        label: 'Departamentos',
        section: 'departamentos',
        defaultExpanded: true,
        children: [
          { label: 'Visão Geral', section: 'departamentos', departmentCode: 'visao-geral' },
          { label: 'Comercial', section: 'departamentos', departmentCode: 'comercial' },
          { label: 'Marketing', section: 'departamentos', departmentCode: 'marketing' },
          { label: 'Produto e Estoque', section: 'departamentos', departmentCode: 'produto' },
          { label: 'Pessoas — RH', section: 'departamentos', departmentCode: 'rh' },
          { label: 'Financeiro', section: 'departamentos', departmentCode: 'financeiro' },
          { label: 'Operações', section: 'departamentos', departmentCode: 'operacional' },
        ],
      },
      { label: 'Mercado', section: 'mercado' },
    ],
  },
  {
    label: 'DESENVOLVIMENTO',
    items: [{ label: 'Universidade MX', section: 'universidade' }],
  },
  {
    label: 'AÇÃO GLOBAL',
    items: [{ label: 'Falar com Consultor', section: 'consultor' }],
  },
]

const sectionSet = new Set<string>([
  ...OWNER_BASE44_SECTION_VALUES,
  ...OWNER_LEGACY_SECTION_VALUES,
])
const departmentCodeSet = new Set<string>(OWNER_DEPARTMENT_CODES)

export function resolveOwnerSection(search: string): OwnerResolvedSection {
  const raw = new URLSearchParams(search).get('ownerSection')
  if (raw?.startsWith('departamentos-')) {
    const code = raw.slice('departamentos-'.length)
    return departmentCodeSet.has(code) ? 'departamentos' : 'home'
  }
  return raw && sectionSet.has(raw) ? (raw as OwnerResolvedSection) : 'home'
}

const OWNER_PATH_SECTIONS: Array<[RegExp, OwnerResolvedSection]> = [
  [/^\/dono\/rotina\/?$/, 'rotina'],
  [/^\/dono\/decisoes\/?$/, 'decisoes'],
  [/^\/dono\/plano-estrategico\/?$/, 'planejamento'],
  [/^\/dono\/plano-acao\/?$/, 'plano-acao'],
  [/^\/dono\/consultoria\/?$/, 'consultoria'],
  [/^\/dono\/departamentos(?:\/.*)?$/, 'departamentos'],
  [/^\/dono\/mercado\/?$/, 'mercado'],
  [/^\/dono\/benchmarking\/?$/, 'benchmarking'],
  [/^\/dono\/alertas\/?$/, 'alertas'],
  [/^\/dono\/agenda\/?$/, 'agenda'],
  [/^\/dono\/resultados\/?$/, 'resultados'],
  [/^\/dono\/visitas\/?$/, 'visitas'],
  [/^\/dono\/universidade\/?$/, 'universidade'],
]

export function resolveOwnerLocation(pathname: string, search: string): OwnerResolvedSection {
  if (new URLSearchParams(search).has('ownerSection')) return resolveOwnerSection(search)
  return OWNER_PATH_SECTIONS.find(([pattern]) => pattern.test(pathname))?.[1] ?? 'home'
}

export function resolveOwnerDepartmentFromPath(pathname: string): OwnerDepartmentNavigationCode | null {
  const segment = pathname.match(/^\/dono\/departamentos\/([^/?#]+)/)?.[1]
  const aliases: Record<string, OwnerDepartmentNavigationCode> = {
    comercial: 'comercial',
    marketing: 'marketing',
    'produto-e-estoque': 'produto',
    'pessoas-rh': 'rh',
    financeiro: 'financeiro',
    operacoes: 'operacional',
  }
  return segment ? aliases[segment] ?? null : null
}

export function ownerNavigationSectionValue(item: OwnerBase44NavigationItem): string {
  return item.departmentCode ? `departamentos-${item.departmentCode}` : item.section
}

const OWNER_CANONICAL_PATHS: Record<OwnerBase44Section, string> = {
  home: '/dono',
  rotina: '/dono/rotina',
  decisoes: '/dono/decisoes',
  planejamento: '/dono/plano-estrategico',
  'plano-acao': '/dono/plano-acao',
  consultoria: '/dono/consultoria',
  departamentos: '/dono/departamentos',
  mercado: '/dono/mercado',
  universidade: '/dono/universidade',
  consultor: '/dono/consultoria?openConsultant=1',
}

const OWNER_DEPARTMENT_PATHS: Record<OwnerDepartmentNavigationCode, string> = {
  'visao-geral': '/dono/departamentos',
  comercial: '/dono/departamentos/comercial',
  marketing: '/dono/departamentos/marketing',
  produto: '/dono/departamentos/produto-e-estoque',
  rh: '/dono/departamentos/pessoas-rh',
  financeiro: '/dono/departamentos/financeiro',
  operacional: '/dono/departamentos/operacoes',
}

const OWNER_LEGACY_PATHS: Record<OwnerBase44Section, string> = {
  home: '/home',
  rotina: '/rotina',
  decisoes: '/decisoes',
  planejamento: '/plano-estrategico',
  'plano-acao': '/plano-acao',
  consultoria: '/consultoria',
  departamentos: '/departamentos',
  mercado: '/mercado',
  universidade: '/universidade-mx',
  consultor: '/consultoria?openConsultant=1',
}

const OWNER_LEGACY_DEPARTMENT_PATHS: Record<OwnerDepartmentNavigationCode, string> = {
  'visao-geral': '/departamentos',
  comercial: '/departamentos/comercial',
  marketing: '/departamentos/marketing',
  produto: '/departamentos/produto-e-estoque',
  rh: '/departamentos/pessoas-rh',
  financeiro: '/departamentos/financeiro',
  operacional: '/departamentos/operacoes',
}

export function ownerNavigationCanonicalPath(item: OwnerBase44NavigationItem): string {
  return item.departmentCode
    ? OWNER_DEPARTMENT_PATHS[item.departmentCode]
    : OWNER_CANONICAL_PATHS[item.section]
}

export function ownerNavigationActivePaths(item: OwnerBase44NavigationItem): string[] {
  const canonicalPath = ownerNavigationCanonicalPath(item)
  const legacyPath = item.departmentCode
    ? OWNER_LEGACY_DEPARTMENT_PATHS[item.departmentCode]
    : OWNER_LEGACY_PATHS[item.section]
  return canonicalPath === legacyPath ? [canonicalPath] : [canonicalPath, legacyPath]
}
