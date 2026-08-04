import React, { Suspense, lazy, Component, useEffect, type ReactNode, type ErrorInfo } from 'react'
import { setOperationScope } from '@/lib/observability'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider, isPerfilInternoMx, useAuth } from '@/hooks/useAuth'
import { Toaster } from 'sonner'
import { MotionConfig } from 'motion/react'
import { ErrorState } from '@/components/molecules/ErrorState'
import { slugify } from '@/lib/utils'
import { canAccessPath } from '@/lib/auth/routeAccess'

// Pages — Lazy loaded
const OAuthHome = lazy(() => import('@/pages/OAuthHome'))
const MXPerformanceLanding = lazy(() => import('@/pages/MXPerformanceLanding'))
const Login = lazy(() => import('@/pages/Login'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const StorePreRegistration = lazy(() => import('@/pages/StorePreRegistration'))

// Vendedor — Real MX implementations (Supabase-powered, not Base44 reference)
const Checkin = lazy(() => import('@/features/checkin/Checkin.container'))
const LiberacaoFechamento = lazy(() => import('@/pages/LiberacaoFechamento'))
const Ranking = lazy(() => import('@/pages/Ranking'))
const VendedorDesenvolvimento = lazy(() => import('@/pages/VendedorDesenvolvimento'))
const VendedorTreinamentos = lazy(() => import('@/pages/VendedorTreinamentos'))
const VendedorAjuda = lazy(() => import('@/pages/VendedorAjuda'))
const VendedorConfiguracoes = lazy(() => import('@/pages/VendedorConfiguracoes'))
const MinhaRemuneracao = lazy(() => import('@/pages/MinhaRemuneracao'))
const VendedorHome = lazy(() => import('@/pages/VendedorHome'))
const CarteiraClientes = lazy(() => import('@/pages/CarteiraClientes'))
const FunilVendedor = lazy(() => import('@/pages/FunilVendedor'))
const CentralExecucao = lazy(() => import('@/pages/CentralExecucao'))
const MeuPerfilVendedor = lazy(() => import('@/pages/MeuPerfilVendedor'))
const RelatoriosVendedor = lazy(() => import('@/pages/RelatoriosVendedor'))
const FunilVendasGerente = lazy(() => import('@/features/gerente/FunilVendasGerente'))
const MetasGerente = lazy(() => import('@/features/gerente/MetasGerente'))
const FalarConsultorDono = lazy(() => import('@/features/dono/FalarConsultorDono'))
const Organograma = lazy(() => import('@/features/organograma/OrganogramaPage'))
const Comportamental = lazy(() => import('@/features/comportamental/ComportamentalPage'))
const Notificacoes = lazy(() => import('@/pages/Notificacoes'))
const Perfil = lazy(() => import('@/pages/Perfil'))

// Gerente e Dono
const DashboardLoja = lazy(() => import('@/pages/DashboardLoja'))
const ScopedActionPlanPage = lazy(() => import('@/features/action-plan/ScopedActionPlanPage'))
const InternalActionPlanPage = lazy(() => import('@/features/internal-mx-planning/InternalActionPlanPage'))
const InternalStrategicPlanPage = lazy(() => import('@/features/internal-mx-planning/InternalStrategicPlanPage'))
const InternalConsultingPage = lazy(() => import('@/features/internal-mx-planning/InternalConsultingPage'))
const AppShell = lazy(() => import('@/components/AppShell'))
const OwnerPlanoEstrategico = lazy(() => import('@/pages/owner/PlanoEstrategico'))
const OwnerPlanoDeAcao = lazy(() => import('@/pages/owner/PlanoDeAcao'))
const OwnerConsultoria = lazy(() => import('@/pages/owner/Consultoria'))
const OwnerCentralDeDecisoes = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.CentralDeDecisoes })))
const OwnerDepartamentos = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.DepartamentosVisaoGeral })))
const OwnerDeptComercial = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.DepartamentoComercial })))
const OwnerDeptMarketing = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.DepartamentoMarketing })))
const OwnerDeptProduto = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.DepartamentoProdutoEstoque })))
const OwnerDeptPessoas = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.DepartamentoPessoasRH })))
const OwnerDeptFinanceiro = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.DepartamentoFinanceiro })))
const OwnerDeptOperacoes = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.DepartamentoOperacoes })))
const OwnerMercado = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.Mercado })))
const OwnerUniversidade = lazy(() => import('@/pages/owner/Placeholders').then(m => ({ default: m.UniversidadeMX })))
const StoreConsultorIa = lazy(() => import('@/pages/StoreConsultorIa'))
const GerenteFeedback = lazy(() => import('@/pages/GerenteFeedback'))
const GerentePDI = lazy(() => import('@/pages/GerentePDI'))
const PDIPrint = lazy(() => import('@/pages/PDIPrint'))
const GerenteTreinamentos = lazy(() => import('@/pages/GerenteTreinamentos'))
const RotinaGerente = lazy(() => import('@/pages/RotinaGerente'))
const OwnerRoutineRoute = lazy(() => import('@/features/owner/OwnerRoutineRoute'))
const ManagerDevelopment = lazy(() => import('@/pages/ManagerDevelopment'))
const ManagerMentor = lazy(() => import('@/pages/ManagerMentor'))
const ManagerDailyClosing = lazy(() => import('@/features/manager/daily-closing/ManagerDailyClosing.container'))
const ManagerTeamRoutine = lazy(() => import('@/features/manager/team-routine/ManagerTeamRoutine.container'))

// Admin
const PainelConsultor = lazy(() => import('@/pages/PainelConsultor'))
const Lojas = lazy(() => import('@/pages/Lojas'))
const ConsultorTreinamentos = lazy(() => import('@/pages/ConsultorTreinamentos'))
const ProdutosDigitais = lazy(() => import('@/pages/ProdutosDigitais'))
const ConsultorNotificacoes = lazy(() => import('@/pages/ConsultorNotificacoes'))
const Configuracoes = lazy(() => import('@/pages/Configuracoes'))
const OperationalSettings = lazy(() => import('@/pages/OperationalSettings'))
const ConsultoriaParametros = lazy(() => import('@/pages/ConsultoriaParametros'))
const Reprocessamento = lazy(() => import('@/pages/Reprocessamento'))
const AiDiagnostics = lazy(() => import('@/pages/AiDiagnostics'))
const MorningReport = lazy(() => import('@/pages/MorningReport'))
const SalesPerformance = lazy(() => import('@/pages/SalesPerformance'))
const SellerPerformance = lazy(() => import('@/pages/SellerPerformance'))
const Consultoria = lazy(() => import('@/pages/Consultoria'))
const ConsultoriaClientes = lazy(() => import('@/pages/ConsultoriaClientes'))
const ConsultoriaClienteDetalhe = lazy(() => import('@/pages/ConsultoriaClienteDetalhe'))
const ConsultoriaVisitaExecucao = lazy(() => import('@/pages/ConsultoriaVisitaExecucao'))
const AgendaAdmin = lazy(() => import('@/pages/AgendaAdmin'))
const Simulacao = lazy(() => import('@/pages/Simulacao'))

const Spinner = () => (
  <div className="flex flex-col items-center gap-mx-md">
    <div className="relative w-mx-2xl h-mx-2xl">
      <div className="absolute inset-0 border-4 border-brand-primary/10 rounded-mx-full"></div>
      <div className="absolute inset-0 border-4 border-t-brand-primary rounded-mx-full animate-spin"></div>
    </div>
    <p className="text-mx-tiny font-bold text-gray-500 uppercase tracking-mx-widest animate-pulse">MX PERFORMANCE</p>
  </div>
)

function RedirectWithSearch({ to }: { to: string }) {
  const location = useLocation()
  const [targetPathWithSearch, targetHash] = to.split('#')
  const [targetPath, targetSearch] = targetPathWithSearch.split('?')
  const params = new URLSearchParams(targetSearch)
  new URLSearchParams(location.search).forEach((value, key) => {
    if (!params.has(key)) params.append(key, value)
  })
  const search = params.toString()
  const hash = targetHash ? `#${targetHash}` : location.hash

  return <Navigate to={`${targetPath}${search ? `?${search}` : ''}${hash}`} replace />
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('[ErrorBoundary]', error, info)

    if (/dynamically imported module|Importing a module script failed/i.test(error.message)) {
      const key = 'mx-chunk-reload-at'
      const last = Number(sessionStorage.getItem(key) || 0)
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(key, String(Date.now()))
        window.location.reload()
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center gap-mx-lg p-mx-xl">
        <div className="w-mx-2xl h-mx-2xl rounded-2xl bg-emerald-600/10 flex items-center justify-center">
          <span className="text-emerald-600 font-bold text-4xl">MX</span>
        </div>
        <h1 className="text-white text-xl font-bold uppercase tracking-wider">Algo deu errado</h1>
        <p className="text-white/50 text-sm text-center max-w-md">
          A aplicação encontrou um erro inesperado. Tente recarregar a página.
        </p>
        {import.meta.env.DEV && this.state.error && (
          <pre className="text-status-error text-xs bg-white/5 p-mx-md rounded-xl max-w-lg overflow-auto text-left">{this.state.error.message}</pre>
        )}
        <button
          onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
          className="mt-mx-md px-8 py-3 bg-emerald-600 text-white rounded-mx-full font-bold uppercase tracking-widest hover:bg-brand-primary-hover transition-colors"
        >
          Recarregar
        </button>
      </div>
    )
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading, initialized, role, baseRole } = useAuth()
  const location = useLocation()
  const isSimulationRoute = location.pathname === '/simulacao' || location.pathname.startsWith('/simulacao/')
  const routeAccessRole = isSimulationRoute ? baseRole || role : role

  if (loading || !initialized) return <div className="h-screen flex items-center justify-center bg-gray-900"><Spinner /></div>
  if (!profile) {
    if (import.meta.env.DEV) console.warn('Audit Warn [ProtectedRoute]: No profile found, redirecting to login.')
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (!role) {
    if (import.meta.env.DEV) console.warn('Audit Warn [ProtectedRoute]: Invalid role, redirecting to login.')
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (!canAccessPath(location.pathname, routeAccessRole)) {
    return <ForbiddenRoute />
  }
  return <>{children}</>
}

function ForbiddenRoute() {
  const { role } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Usa o estado de erro do Design System em vez de um layout próprio (§9.5).
  // Em um 403 repetir não resolve, então a saída oferecida é voltar.
  return (
      <main className="flex min-h-screen items-center justify-center bg-[hsl(var(--mx-color-surface-muted))] p-[var(--mx-space-6)]">
        <section className="w-full max-w-lg rounded-[var(--mx-card-radius)] border border-[hsl(var(--mx-color-border))] bg-[hsl(var(--mx-color-surface))] shadow-[var(--mx-shadow-lg)]">
          <ErrorState
            kind="permission"
            description={`O perfil ${role || 'indefinido'} não tem permissão para acessar ${location.pathname}. Se esse acesso faz parte da sua rotina, solicite liberação ao Admin MX ou ao gestor responsável pela unidade.`}
            action={(
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="inline-flex h-[var(--mx-button-height-md)] items-center rounded-[var(--mx-button-radius)] bg-[hsl(var(--mx-color-primary))] px-[var(--mx-button-padding-inline-md)] text-[length:var(--mx-font-size-base)] font-semibold text-[hsl(var(--mx-color-primary-foreground))] transition-colors hover:bg-[hsl(var(--mx-color-primary-hover))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--mx-color-focus-ring))] focus-visible:ring-offset-2"
              >
                Voltar para minha área
              </button>
            )}
          />
        </section>
      </main>
  )
}

function RoleRedirect() {
  const { role, membership } = useAuth()
  if (isPerfilInternoMx(role)) return <Navigate to="/painel" replace />
  if (role === 'dono') return <Navigate to="/home" replace />
  if (role === 'gerente') {
    const storeDashboardPath = membership?.store?.name ? `/lojas/${slugify(membership.store.name)}` : '/classificacao'
    return <Navigate to={storeDashboardPath} replace />
  }
  if (role === 'vendedor') return <Navigate to="/home" replace />
  return <Navigate to="/login" replace />
}

const OWNER_LEGACY_PATHS: Record<string, string> = {
  '': '/home',
  'rotina': '/rotina',
  'decisoes': '/decisoes',
  'plano-estrategico': '/plano-estrategico',
  'plano-acao': '/plano-acao',
  'consultoria': '/consultoria',
  'departamentos': '/departamentos',
  'mercado': '/mercado',
  'universidade': '/universidade-mx',
}

/** As telas do Dono passaram a viver na raiz; mantém links antigos vivos. */
function OwnerLegacyPathRedirect() {
  const location = useLocation()
  const rest = location.pathname.replace(/^\/dono\/?/, '')
  const target = OWNER_LEGACY_PATHS[rest]
    ?? (rest.startsWith('departamentos/') ? `/${rest}` : '/home')
  return <Navigate to={`${target}${location.search}`} replace />
}


function TeamAliasRedirect() {
  const { role, membership } = useAuth()
  if (isPerfilInternoMx(role)) return <Navigate to="/lojas" replace />
  if (role === 'dono') return <Navigate to="/home" replace />
  if (role === 'gerente' && membership?.store?.name) {
    return <RedirectWithSearch to="/gerente/minha-equipe" />
  }
  return <ForbiddenRoute />
}

function ConsultorIaAliasRedirect() {
  const { role, membership } = useAuth()
  if (role === 'vendedor' && membership?.store?.name) {
    return <Navigate to={`/lojas/${slugify(membership.store.name)}/consultor-ia`} replace />
  }
  return <ForbiddenRoute />
}

function PublicHome() {
  const { profile, loading, initialized } = useAuth()

  if (loading || !initialized) {
    return <div className="h-screen flex items-center justify-center bg-white"><Spinner /></div>
  }

  if (profile) return <RoleRedirect />

  return (
    <Suspense fallback={<Spinner />}>
      <MXPerformanceLanding />
    </Suspense>
  )
}

/**
 * Marca a rota corrente no contexto de observabilidade.
 *
 * O path é normalizado (UUIDs e números viram :id) para que a tag `mx.route`
 * agrupe por rota em vez de explodir em cardinalidade — uma tag por registro
 * visitado tornaria os dashboards inúteis.
 */
function ObservabilityRouteScope() {
  const location = useLocation()

  useEffect(() => {
    const route = location.pathname
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id')
    setOperationScope({ route, module: route.split('/')[1] || 'root' })
  }, [location.pathname])

  return null
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <MotionConfig reducedMotion="user">
          <Router>
            <ObservabilityRouteScope />
            <Routes>
              <Route path="/" element={<PublicHome />} />
              <Route path="/login" element={<Suspense fallback={<Spinner />}><Login /></Suspense>} />
              <Route path="/forgot-password" element={<Suspense fallback={<Spinner />}><Login /></Suspense>} />
              <Route path="/reset-password" element={<Suspense fallback={<Spinner />}><Login /></Suspense>} />
              <Route path="/pre-cadastro/:storeSlug" element={<Suspense fallback={<Spinner />}><StorePreRegistration /></Suspense>} />
              <Route path="/privacy" element={<Suspense fallback={<Spinner />}><Privacy /></Suspense>} />
              <Route path="/terms" element={<Suspense fallback={<Spinner />}><Terms /></Suspense>} />
              <Route path="/dono/*" element={<OwnerLegacyPathRedirect />} />
              <Route path="/" element={<ProtectedRoute><Suspense fallback={<Spinner />}><AppShell /></Suspense></ProtectedRoute>}>
                <Route path="settings" element={<Navigate to="/configuracoes" replace />} />
                <Route path="plano-estrategico" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerPlanoEstrategico />} admin={<InternalStrategicPlanPage />} /></Suspense>} />
                <Route path="plano-acao" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ScopedActionPlanPage />} dono={<OwnerPlanoDeAcao />} admin={<InternalActionPlanPage />} /></Suspense>} />
                <Route path="decisoes" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerCentralDeDecisoes />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="departamentos" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerDepartamentos />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="departamentos/comercial" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerDeptComercial />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="departamentos/marketing" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerDeptMarketing />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="departamentos/produto-e-estoque" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerDeptProduto />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="departamentos/pessoas-rh" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerDeptPessoas />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="departamentos/financeiro" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerDeptFinanceiro />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="departamentos/operacoes" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerDeptOperacoes />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="mercado" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerMercado />} admin={<ForbiddenRoute />} /></Suspense>} />
                <Route path="team" element={<TeamAliasRedirect />} />
                <Route path="equipe" element={<TeamAliasRedirect />} />

                <Route path="meu-dia" element={<RedirectWithSearch to="/home" />} />
                <Route path="home" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<VendedorHome />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<RoleRedirect />} />
                </Suspense>} />
                <Route path="minha-remuneracao" element={<RedirectWithSearch to="/home" />} />
                <Route path="lancamento-diario" element={<RedirectWithSearch to="/terminal-mx" />} />
                <Route path="fechamento-diario" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<Checkin />} gerente={<ManagerDailyClosing />} dono={<ManagerDailyClosing />} admin={<ManagerDailyClosing />} />
                </Suspense>} />
                <Route path="vendedor/terminal-mx" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<Checkin />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="terminal-mx" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<Checkin />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="liberacao-fechamento" element={<Suspense fallback={<Spinner />}><LiberacaoFechamento /></Suspense>} />
                <Route path="carteira-clientes" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<CarteiraClientes />} gerente={<CarteiraClientes />} dono={<CarteiraClientes />} admin={<CarteiraClientes />} />
                </Suspense>} />
                <Route path="carteira" element={<RedirectWithSearch to="/carteira-clientes" />} />
                <Route path="vendedor/carteira" element={<RedirectWithSearch to="/carteira-clientes" />} />
                <Route path="mentor-comercial" element={<RedirectWithSearch to="/carteira-clientes" />} />
                <Route path="vendedor/mentor-comercial" element={<RedirectWithSearch to="/carteira-clientes" />} />
                <Route path="funil" element={<RedirectWithSearch to="/meu-funil" />} />
                <Route path="minha-meta" element={<RedirectWithSearch to="/meu-funil" />} />
                <Route path="vendedor/minha-meta" element={<RedirectWithSearch to="/meu-funil" />} />
                <Route path="meu-funil" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<FunilVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="funil-comercial" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<FunilVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="central-execucao" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<CentralExecucao />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="rotina-do-dia" element={<RedirectWithSearch to="/central-execucao" />} />
                <Route path="vendedor/rotina-do-dia" element={<RedirectWithSearch to="/central-execucao" />} />
                <Route path="central-de-execucao" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<CentralExecucao />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="relatorios-vendedor" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<RelatoriosVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="relatorios" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<RelatoriosVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="feedback" element={<RedirectWithSearch to="/devolutivas" />} />
                <Route path="feedbacks" element={<RedirectWithSearch to="/desenvolvimento?tab=feedback" />} />
                <Route path="vendedor/funil" element={<RedirectWithSearch to="/meu-funil" />} />
                <Route path="vendedor/meu-funil" element={<RedirectWithSearch to="/meu-funil" />} />
                <Route path="vendedor/feedback" element={<RedirectWithSearch to="/desenvolvimento?tab=feedback" />} />
                <Route path="vendedor/devolutivas" element={<RedirectWithSearch to="/desenvolvimento?tab=feedback" />} />
                <Route path="vendedor/desenvolvimento" element={<RedirectWithSearch to="/desenvolvimento" />} />
                <Route path="vendedor/treinamentos" element={<RedirectWithSearch to="/universidade-mx" />} />
                <Route path="vendedor/universidade-mx" element={<RedirectWithSearch to="/universidade-mx" />} />
                <Route path="vendedor/configuracoes" element={<RedirectWithSearch to="/configuracoes" />} />
                <Route path="funil-vendas" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<FunilVendasGerente />} dono={<FunilVendasGerente />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="metas" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<MetasGerente />} dono={<MetasGerente />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="falar-consultor" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<FalarConsultorDono />} dono={<FalarConsultorDono />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="organograma" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<Organograma />} admin={<Organograma />} />
                </Suspense>} />
                <Route path="banco-talentos" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<Comportamental />} admin={<Comportamental />} />
                </Suspense>} />
                <Route path="ajuda" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<VendedorAjuda />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="ranking" element={<Suspense fallback={<Spinner />}><Ranking /></Suspense>} />
                <Route path="classificacao" element={<Suspense fallback={<Spinner />}><Ranking /></Suspense>} />
                <Route path="universidade-mx" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<VendedorTreinamentos />} gerente={<RedirectWithSearch to="/treinamentos" />} dono={<OwnerUniversidade />} admin={<RedirectWithSearch to="/treinamentos" />} />
                </Suspense>} />
                <Route path="treinamentos" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<RedirectWithSearch to="/universidade-mx" />} gerente={<GerenteTreinamentos />} dono={<GerenteTreinamentos />} admin={<ConsultorTreinamentos />} />
                </Suspense>} />
                <Route path="desenvolvimento" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<VendedorDesenvolvimento />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} />
                </Suspense>} />
                <Route path="devolutivas" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<VendedorDesenvolvimento />} gerente={<GerenteFeedback />} dono={<GerenteFeedback />} admin={<GerenteFeedback />} />
                </Suspense>} />
                <Route path="notificacoes" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<Notificacoes />} gerente={<Notificacoes />} dono={<Notificacoes />} admin={<Notificacoes />} />
                </Suspense>} />
                <Route path="perfil" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<MeuPerfilVendedor />} gerente={<Perfil />} dono={<Perfil />} admin={<Perfil />} />
                </Suspense>} />
                <Route path="meu-perfil" element={<RedirectWithSearch to="/perfil" />} />
                <Route path="meu-perfil-vendedor" element={<RedirectWithSearch to="/perfil" />} />
                <Route path="vendedor/perfil" element={<RedirectWithSearch to="/perfil" />} />

                <Route path="gerente/fechamento-diario" element={<RedirectWithSearch to="/fechamento-diario" />} />
                <Route path="gerente/rotina-equipe" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerTeamRoutine />} dono={<ManagerTeamRoutine />} admin={<ManagerTeamRoutine />} /></Suspense>} />
                <Route path="gerente/minha-equipe" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /></Suspense>} />
                <Route path="gerente/meta-loja" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /></Suspense>} />
                <Route path="gerente/vendas" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /></Suspense>} />
                <Route path="gerente/mentor" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerMentor />} dono={<ManagerMentor />} admin={<ManagerMentor />} /></Suspense>} />
                <Route path="gerente/feedbacks-pdis" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerDevelopment />} dono={<ManagerDevelopment />} admin={<ManagerDevelopment />} /></Suspense>} />
                <Route path="gerente/ranking" element={<Suspense fallback={<Spinner />}><Ranking /></Suspense>} />
                <Route path="gerente/universidade-mx" element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<GerenteTreinamentos />} dono={<GerenteTreinamentos />} admin={<ConsultorTreinamentos />} /></Suspense>} />
                <Route path="lojas/:storeSlug/consultor-ia" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<StoreConsultorIa />} gerente={<StoreConsultorIa />} dono={<StoreConsultorIa />} admin={<StoreConsultorIa />} />
                </Suspense>} />
                <Route path="lojas/:storeSlug" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} />
                </Suspense>} />
                <Route path="lojas/:storeSlug/equipe" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} />
                </Suspense>} />
                <Route path="consultor-ia" element={<ConsultorIaAliasRedirect />} />
                <Route path="pdi" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<Navigate to="/desenvolvimento?tab=pdi" replace />} gerente={<GerentePDI />} dono={<GerentePDI />} admin={<GerentePDI />} />
                </Suspense>} />
                <Route path="pdi/:id/print" element={<Suspense fallback={<Spinner />}><PDIPrint /></Suspense>} />
                <Route path="rotina" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<RotinaGerente />} dono={<OwnerRoutineRoute />} admin={<RotinaGerente />} />
                </Suspense>} />

                <Route path="painel" element={<Suspense fallback={<Spinner />}><PainelConsultor /></Suspense>} />
                <Route path="lojas" element={<Suspense fallback={<Spinner />}><Lojas /></Suspense>} />
                <Route path="simulacao" element={<Suspense fallback={<Spinner />}><Simulacao /></Suspense>} />
                <Route path="simulacao/:simulationRole" element={<Suspense fallback={<Spinner />}><Simulacao /></Suspense>} />
                <Route path="agenda" element={<Suspense fallback={<Spinner />}><AgendaAdmin /></Suspense>} />
                <Route path="consultoria">
                  <Route index element={<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerConsultoria />} admin={<InternalConsultingPage />} /></Suspense>} />
                  <Route path="clientes" element={<Suspense fallback={<Spinner />}><ConsultoriaClientes /></Suspense>} />
                  <Route path="clientes/:clientSlug" element={<Suspense fallback={<Spinner />}><ConsultoriaClienteDetalhe /></Suspense>} />
                  <Route path="clientes/:clientSlug/visitas/:visitNumber" element={<Suspense fallback={<Spinner />}><ConsultoriaVisitaExecucao /></Suspense>} />
                </Route>
                <Route path="produtos" element={<Suspense fallback={<Spinner />}><ProdutosDigitais /></Suspense>} />
                <Route path="configuracoes" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<VendedorConfiguracoes />} gerente={<Configuracoes />} dono={<Configuracoes />} admin={<Configuracoes />} />
                </Suspense>} />
                <Route path="configuracoes/remuneracao" element={<Suspense fallback={<Spinner />}><Configuracoes initialTab="remuneracao" /></Suspense>} />
                <Route path="configuracoes/operacional" element={<Suspense fallback={<Spinner />}><OperationalSettings /></Suspense>} />
                <Route path="configuracoes/consultoria-pmr" element={<Suspense fallback={<Spinner />}><ConsultoriaParametros /></Suspense>} />
                <Route path="configuracoes/reprocessamento" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<Reprocessamento />} />
                </Suspense>} />
                <Route path="relatorio-matinal" element={<Suspense fallback={<Spinner />}><MorningReport /></Suspense>} />
                <Route path="relatorios/performance-vendas" element={<Suspense fallback={<Spinner />}><SalesPerformance /></Suspense>} />
                <Route path="relatorios/performance-vendedor" element={<Suspense fallback={<Spinner />}><SellerPerformance /></Suspense>} />
                <Route path="auditoria" element={<Suspense fallback={<Spinner />}>
                  <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<AiDiagnostics />} dono={<ForbiddenRoute />} admin={<AiDiagnostics />} />
                </Suspense>} />
                <Route path="*" element={<Suspense fallback={<Spinner />}><NotFound /></Suspense>} />
              </Route>
            </Routes>
          </Router>
          <Toaster richColors closeButton expand visibleToasts={5} position="top-right" toastOptions={{ duration: 4000 }} />
        </MotionConfig>
      </ErrorBoundary>
    </AuthProvider>
  )
}

function RoleSwitch({
  vendedor,
  gerente,
  dono,
  admin,
}: {
  vendedor: React.ReactNode
  gerente: React.ReactNode
  dono: React.ReactNode
  admin?: React.ReactNode
}) {
  const { role } = useAuth()
  if (isPerfilInternoMx(role)) return <>{admin ?? <RoleRedirect />}</>
  if (role === 'dono') return <>{dono}</>
  if (role === 'gerente') return <>{gerente}</>
  if (role === 'vendedor') return <>{vendedor}</>
  return <RoleRedirect />
}
