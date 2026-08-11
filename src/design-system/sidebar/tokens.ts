/**
 * Design tokens da sidebar canônica do MX.
 *
 * Fonte da verdade: docs/design-system/sidebar-dono.md (sidebar do módulo do
 * Dono em produção). Todo módulo — vendedor, gerente, dono, consultoria e
 * Admin MX — consome estas constantes; nenhuma tela deve escrever as classes
 * da sidebar à mão.
 *
 * As cores usam os tokens `mxsb-*` declarados em src/index.css, que replicam
 * os valores do escopo `.owner-b44` fora dele.
 */

/** Medidas em pixels, para testes e cálculos de layout. */
export const SIDEBAR_METRICS = {
  /** Largura expandida (w-64). */
  width: 256,
  /** Largura recolhida (w-16). */
  widthCollapsed: 64,
  /** Altura do cabeçalho de marca. 52px (múltiplo de 4 no grid T4.5); a doc
   *  previa 54px medidos no runtime antigo — o T4.8 normalizou sem atualizar
   *  o contrato, corrigido aqui. */
  headerHeight: 52,
  /** Altura de um item de navegação. */
  itemHeight: 36,
  /** Altura de um subitem. */
  nestedItemHeight: 28,
  /** Ícone do item de navegação. */
  iconSize: 16,
  /** Ícone do botão de recolher. */
  toggleIconSize: 18,
  /** Breakpoint em que a sidebar fixa aparece (xl). */
  desktopBreakpoint: 1280,
  /** Duração da transição de largura. */
  widthTransitionMs: 300,
} as const

/** Marca usada no cabeçalho (mesmo arquivo em todos os módulos). */
export const SIDEBAR_LOGO = '/landing/logo-mx.png'

export const SIDEBAR = {
  /** Coluna fixa no desktop. */
  aside: 'hidden shrink-0 border-r border-mxsb-line font-sans text-[14px] leading-normal text-mxsb-base antialiased transition-[width] duration-300 xl:block',
  asideWidth: 'w-64',
  asideWidthCollapsed: 'w-16',
  /**
   * Variante fixa, usada pelo shell universal (o do Dono é uma coluna no
   * fluxo). Só acrescenta posicionamento — a superfície continua vindo de
   * `aside`, para que os dois shells não divirjam quando ela mudar.
   */
  asideFixed: 'fixed left-0 top-0 h-screen z-[80]',

  /** Container interno (superfície + cor de texto base). */
  root: 'flex h-full flex-col bg-mxsb-surface font-sans text-sm antialiased text-mxsb-ink',

  /** Cabeçalho de marca. */
  header: 'flex h-[52px] shrink-0 items-center gap-2 border-b border-mxsb-line',
  headerExpanded: 'justify-between px-4',
  headerCollapsed: 'justify-center px-2',
  brandLogo: 'h-7 w-7 shrink-0 object-contain',
  brandTitle: 'truncate text-body-sm font-black tracking-tight text-slate-900',
  brandModule: 'mt-0.5 truncate text-caption font-bold uppercase tracking-[0.14em] text-emerald-700',
  toggle:
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border border-mxsb-line bg-white text-slate-500 outline-none transition-colors hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500/30',

  /** Área de navegação. */
  nav: 'flex-1 min-h-0 overflow-y-auto py-4',
  navExpanded: 'px-3',
  navCollapsed: 'px-2',
  section: 'mb-5',
  sectionLabel:
    'truncate px-3 pb-1.5 text-caption font-semibold uppercase tracking-wider text-mxsb-muted/70',
  sectionItems: 'space-y-0.5',

  /** Item de navegação. */
  item: 'group relative flex w-full items-center gap-2.5 rounded-[8px] py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30',
  itemExpanded: 'px-3',
  itemCollapsed: 'justify-center px-0',
  itemActive: 'bg-mxsb-active-surface font-semibold text-mxsb-active',
  itemIdle: 'text-mxsb-ink hover:bg-mxsb-hover hover:text-mxsb-ink-strong',
  itemIcon: 'h-4 w-4 shrink-0 text-mxsb-muted/80',
  itemLabel: 'min-w-0 flex-1 truncate',

  /** Grupo expansível. */
  groupTrigger:
    'flex w-full items-center gap-2.5 rounded-[8px] py-2 text-sm font-medium text-mxsb-muted outline-none transition-colors hover:bg-mxsb-hover hover:text-mxsb-ink-strong focus-visible:ring-2 focus-visible:ring-emerald-500/30',
  groupChevron: 'h-3.5 w-3.5 shrink-0',
  subnav: 'ml-3 mt-0.5 space-y-0.5 border-l border-mxsb-line pl-3',
  nestedItem:
    'flex w-full items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-body-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500/30',
  nestedItemActive: 'bg-mxsb-active-surface font-medium text-mxsb-active',
  nestedItemIdle: 'text-mxsb-muted hover:bg-mxsb-hover hover:text-mxsb-ink-strong',

  /** Badges. */
  badge: 'shrink-0 rounded-full px-1.5 py-0.5 text-caption font-medium',
  badgeWarning: 'bg-amber-50 text-amber-700',
  badgeDefault: 'bg-emerald-50 text-emerald-700',

  /** Rodapés (CTA e cartão de perfil). */
  footer: 'border-t border-mxsb-line py-3',
  footerExpanded: 'px-3',
  footerCollapsed: 'px-2',
  ctaSlot: 'border-t border-mxsb-line p-3',
  ctaButton:
    'flex h-9 w-full items-center gap-2.5 rounded-[6px] bg-mxsb-active px-4 text-sm font-medium text-white shadow outline-none transition-colors hover:bg-mxsb-active/90 focus-visible:ring-2 focus-visible:ring-emerald-500/30',
  ctaButtonExpanded: 'justify-start',
  ctaButtonCollapsed: 'justify-center px-0',

  /** Drawer mobile/tablet. */
  drawerOverlay: 'fixed inset-0 z-40 xl:hidden',
  drawerScrim: 'absolute inset-0 bg-black/40',
  drawerPanel:
    'relative flex h-full w-72 max-w-[85vw] flex-col overflow-hidden bg-mxsb-surface shadow-xl sm:w-80 sm:max-w-sm',
  drawerClose:
    'absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-[8px] text-mxsb-ink outline-none transition-colors hover:bg-mxsb-hover focus-visible:ring-2 focus-visible:ring-emerald-500/30',
} as const

export type SidebarTokens = typeof SIDEBAR
