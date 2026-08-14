import type { PageBottomClearance, PageDensity, PageWidth } from './PageCanvas'

/**
 * Decisão de layout de uma rota — §8.6.
 *
 * Fica fora do componente de página de propósito: assim a decisão é auditável
 * em bloco ("todos os formulários usam a mesma largura?") sem abrir 54
 * arquivos, e um teste consegue afirmar que nenhuma rota ficou sem decisão.
 */
export interface RouteLayoutMetadata {
  width: PageWidth
  density?: PageDensity
  bottomClearance?: PageBottomClearance
  /**
   * A rota já teve o padding e a largura próprios removidos, e por isso o
   * `PageCanvas` pode envolvê-la no shell.
   *
   * Existe porque a migração não pode ser atômica: aplicar o canvas a uma
   * página que ainda tem `px-6` na raiz **soma** os dois paddings, e o
   * resultado é pior que o ponto de partida. O flag deixa o shell aplicar o
   * canvas rota por rota, mantendo cada passo verificável, em vez de trocar
   * 100 rotas num commit que ninguém consegue revisar.
   *
   * Some quando a migração terminar: o default passa a ser adotado.
   */
  adopted?: true
}

/**
 * Larguras agrupadas pela natureza do conteúdo.
 *
 * A ordem de resolução é: correspondência exata → prefixo mais longo →
 * default. Prefixo mais longo, não o primeiro que casa, para que
 * `configuracoes/operacional` possa divergir de `configuracoes` sem depender
 * da ordem de declaração neste objeto.
 */
const ROUTE_LAYOUTS: Record<string, RouteLayoutMetadata> = {
  // ------------------------------------------------------ públicas e de conta
  '/login': { width: 'form' },
  '/forgot-password': { width: 'form' },
  '/reset-password': { width: 'form' },
  '/pre-cadastro/:storeSlug': { width: 'form' },
  '/terms': { width: 'reading' },
  '/privacy': { width: 'reading' },

  // ------------------------------------------------------------- dashboards
  // Visões de indicadores: aproveitam a largura, limitadas a 1400px para que
  // os cards não virem faixas em telas ultrawide (§14.4).
  home: { width: 'dashboard' },
  painel: { width: 'dashboard' },
  'meu-dia': { width: 'dashboard', bottomClearance: 'navigation' },
  'central-de-execucao': { width: 'dashboard' },
  'central-execucao': { width: 'dashboard' },
  // Checkin para vendedor; os outros perfis caem em ForbiddenRoute.
  'terminal-mx': { width: 'dashboard', bottomClearance: 'navigation', adopted: true },
  'vendedor/terminal-mx': { width: 'dashboard', bottomClearance: 'navigation', adopted: true },
  'relatorio-matinal': { width: 'dashboard' },
  'minha-equipe': { width: 'dashboard' },
  ranking: { width: 'dashboard' },
  classificacao: { width: 'dashboard' },
  mercado: { width: 'dashboard' },
  'plano-estrategico': { width: 'dashboard' },
  // Estas duas tinham conteúdo encostado na sidebar antes do canvas: o header
  // começava exatamente em 256px, sem margem alguma. Ver commit desta onda.
  organograma: { width: 'dashboard', adopted: true },
  'banco-talentos': { width: 'dashboard', adopted: true },
  auditoria: { width: 'dashboard' },
  decisoes: { width: 'dashboard' },

  // ------------------------------------------------------- tabelas e listagens
  // `wide` e não `dashboard`: tabelas densas ficam mais legíveis um pouco mais
  // estreitas, porque a linha de leitura horizontal encurta.
  lojas: { width: 'wide', bottomClearance: 'navigation', adopted: true },
  'lojas/:storeSlug': { width: 'wide' },
  'lojas/:storeSlug/equipe': { width: 'wide' },
  'lojas/:storeSlug/consultor-ia': { width: 'focused' },
  'lojas/:storeSlug/filiais': { width: 'wide', bottomClearance: 'navigation', adopted: true },
  clientes: { width: 'wide' },
  carteira: { width: 'wide' },
  'carteira-clientes': { width: 'wide', bottomClearance: 'navigation', adopted: true },
  'vendedor/carteira': { width: 'wide', bottomClearance: 'navigation' },
  equipe: { width: 'wide' },
  team: { width: 'wide' },
  produtos: { width: 'wide', bottomClearance: 'navigation', adopted: true },
  notificacoes: { width: 'wide', bottomClearance: 'navigation', adopted: true },
  relatorios: { width: 'wide', bottomClearance: 'navigation', adopted: true },
  'relatorios-vendedor': { width: 'wide', bottomClearance: 'navigation', adopted: true },
  'relatorios/performance-vendas': { width: 'wide' },
  'relatorios/performance-vendedor': { width: 'wide', bottomClearance: 'navigation', adopted: true },
  agenda: { width: 'wide', adopted: true },
  'liberacao-fechamento': { width: 'wide' },
  departamentos: { width: 'wide' },
  consultoria: { width: 'wide' },
  clientes_visita: { width: 'wide' },

  // ------------------------------------------------------------------- funis
  // Colunas de funil precisam de largura; a rolagem horizontal é do board,
  // não da página (§14.5).
  funil: { width: 'dashboard', bottomClearance: 'navigation' },
  // FunilVendedor. As outras variantes de perfil são ForbiddenRoute, que não
  // tem layout próprio, então a rota pode ser adotada.
  'meu-funil': { width: 'dashboard', bottomClearance: 'navigation', adopted: true },
  'vendedor/funil': { width: 'dashboard', bottomClearance: 'navigation' },
  'vendedor/meu-funil': { width: 'dashboard', bottomClearance: 'navigation' },
  'funil-comercial': { width: 'dashboard', bottomClearance: 'navigation', adopted: true },
  'funil-vendas': { width: 'dashboard', bottomClearance: 'navigation', adopted: true },

  // --------------------------------------------------- fluxos e formulários
  // Barra de ações fixa: a reserva impede que o botão salvar cubra o último
  // campo (§15).
  'fechamento-diario': { width: 'dashboard', bottomClearance: 'actions' },
  'lancamento-diario': { width: 'focused', bottomClearance: 'actions' },
  rotina: { width: 'focused', bottomClearance: 'actions' },
  'rotina-do-dia': { width: 'focused', bottomClearance: 'actions' },
  'vendedor/rotina-do-dia': { width: 'focused', bottomClearance: 'actions' },
  'rotina-equipe': { width: 'focused', bottomClearance: 'actions' },
  'plano-acao': { width: 'focused', bottomClearance: 'actions' },
  simulacao: { width: 'focused' },
  'simulacao/:simulationRole': { width: 'focused' },
  reprocessamento: { width: 'form' },

  // -------------------------------------------------- configurações e perfil
  // Dividida por RoleSwitch: vendedor renderiza VendedorConfiguracoes (já
  // migrada, painel de 1500px), gerente e dono renderizam Configuracoes (não
  // migrada). Não marcada como adotada justamente por isso — ver a nota sobre
  // rotas divididas no fim deste arquivo.
  configuracoes: { width: 'dashboard' },
  'configuracoes/operacional': { width: 'focused' },
  'configuracoes/remuneracao': { width: 'focused' },
  'configuracoes/consultoria-pmr': { width: 'focused' },
  'configuracoes/reprocessamento': { width: 'form' },
  settings: { width: 'form' },
  // Alias que redireciona para `configuracoes`; mantido no registro para que a
  // decisão continue resolvível se o redirect for removido.
  'vendedor/configuracoes': { width: 'dashboard', bottomClearance: 'navigation' },
  // Redirects legados continuam classificados para não depender do default
  // enquanto preservam a URL histórica para integrações externas.
  metas: { width: 'dashboard' },
  'minhas-lojas': { width: 'wide' },
  perfil: { width: 'form' },
  'meu-perfil': { width: 'form' },
  'meu-perfil-vendedor': { width: 'form' },
  'vendedor/perfil': { width: 'form' },
  'minha-remuneracao': { width: 'focused' },
  'minha-meta': { width: 'focused' },
  'vendedor/minha-meta': { width: 'focused' },
  'meta-loja': { width: 'focused' },

  // ------------------------------------------- desenvolvimento e conversação
  // `focused` e `reading`: conteúdo textual longo, onde largura excessiva
  // prejudica a leitura em vez de ajudar (§12).
  desenvolvimento: { width: 'focused' },
  'vendedor/desenvolvimento': { width: 'focused' },
  // GerenteTreinamentos (migrada) para gerente e dono, ConsultorTreinamentos
  // (não migrada) para admin — por isso não adotada ainda.
  treinamentos: { width: 'dashboard' },
  'vendedor/treinamentos': { width: 'focused' },
  // Rota única para todos os perfis desde que o gerente perdeu o prefixo
  // `/gerente/`: largura de dashboard atende gerente, dono e admin, e o
  // vendedor tem a própria entrada em `vendedor/universidade-mx`.
  'universidade-mx': { width: 'dashboard' },
  'vendedor/universidade-mx': { width: 'focused' },
  feedback: { width: 'focused' },
  feedbacks: { width: 'focused' },
  devolutivas: { width: 'focused' },
  'vendedor/devolutivas': { width: 'focused' },
  'vendedor/feedback': { width: 'focused' },
  'feedbacks-pdis': { width: 'focused' },
  // GerentePDI para gerente, dono e admin; vendedor é redirect. `dashboard` e
  // não `focused`: grid de até três colunas de cards.
  pdi: { width: 'dashboard', adopted: true },
  'pdi/:id/print': { width: 'reading', bottomClearance: 'none' },
  // `dashboard`, não `reading`: a tela tem grid de três colunas e vivia em
  // max-w-[1500px]. A largura de leitura estreita quebraria o layout aprovado.
  ajuda: { width: 'dashboard', bottomClearance: 'navigation', adopted: true },

  // Conversação com IA: coluna estreita, porque diálogo é leitura sequencial
  // e não se beneficia de largura (§12).
  'consultor-ia': { width: 'reading', bottomClearance: 'actions' },
  'mentor-comercial': { width: 'reading', bottomClearance: 'actions' },
  'vendedor/mentor-comercial': { width: 'reading', bottomClearance: 'actions' },
  'mentor': { width: 'reading', bottomClearance: 'actions' },
  // Não é conversa em coluna estreita como o consultor IA: é um painel de
  // solicitações com cards e histórico. Medido em /falar-consultor.
  'falar-consultor': { width: 'dashboard', bottomClearance: 'navigation', adopted: true },
}

/** Default consciente, não acidental: a maioria das telas é dashboard. */
export const DEFAULT_ROUTE_LAYOUT: RouteLayoutMetadata = { width: 'dashboard' }

/**
 * Resolve a decisão de layout de uma rota.
 *
 * Nunca lança e nunca devolve `undefined`: uma rota nova renderiza com o
 * default em vez de quebrar. O custo dessa tolerância é uma rota podendo
 * passar despercebida, e é por isso que existe o teste de cobertura que
 * confronta este mapa com os `path=` reais de `App.tsx`.
 */
export function resolveRouteLayout(path: string): RouteLayoutMetadata {
  const normalized = path.replace(/^\/+|\/+$/g, '')

  const exact = ROUTE_LAYOUTS[path] ?? ROUTE_LAYOUTS[normalized]
  if (exact) return exact

  // Prefixo mais longo primeiro, para que a rota mais específica ganhe.
  const prefixes = Object.keys(ROUTE_LAYOUTS)
    .filter((key) => normalized.startsWith(`${key.replace(/^\/+/, '')}/`))
    .sort((a, b) => b.length - a.length)

  return prefixes.length > 0 ? ROUTE_LAYOUTS[prefixes[0]] : DEFAULT_ROUTE_LAYOUT
}

/**
 * A rota já foi migrada e pode receber o `PageCanvas` no shell.
 *
 * Rota não adotada renderiza exatamente como antes — nenhuma tela muda de
 * aparência até que seu padding próprio tenha sido removido.
 */
export function isRouteAdopted(path: string): boolean {
  return resolveRouteLayout(path).adopted === true
}

/**
 * LIMITE CONHECIDO — rotas divididas por perfil.
 *
 * `App.tsx` usa `RoleSwitch` para fazer um mesmo path renderizar componentes
 * diferentes por perfil (`configuracoes`, `funil`, `ranking`, entre outros).
 * Este registro é indexado por path, então nesses casos ele descreve a decisão
 * de layout comum, não a de cada variante.
 *
 * Consequência prática: `adopted` só pode ser marcado quando **todas** as
 * variantes daquele path já estiverem migradas. Marcar antes faria o registro
 * afirmar algo falso sobre as telas que ainda não foram tocadas.
 *
 * Enquanto o `PageCanvas` é aplicado dentro de cada página, esse limite é
 * apenas de documentação. Ele passa a importar se o canvas migrar para o shell,
 * e nesse momento o registro precisará de uma dimensão por perfil.
 */

/** Exposto para o teste de cobertura. Não use para navegação. */
export const REGISTERED_ROUTE_PATHS = Object.keys(ROUTE_LAYOUTS)
