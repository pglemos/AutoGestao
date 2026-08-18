import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Layout
import AppLayout from './components/layout/AppLayout';

// Pages
import Home from './pages/Home';
import ClientesMX from './pages/ClientesMX';
import NovoCliente from './pages/NovoCliente';
import ClienteDetalhe from './pages/ClienteDetalhe';
import Consultoria from './pages/Consultoria';
import EquipeMX from './pages/EquipeMX';
import Universidade from './pages/Universidade';
import ProdutosConsultoria from './pages/ProdutosConsultoria';
import ConsultoriaMX from './pages/ConsultoriaMX';
import Indicadores from './pages/Indicadores';
import PlanoEstrategicoGlobal from './pages/PlanoEstrategicoGlobal';
import PlanoEstrategicoEditor from './pages/PlanoEstrategicoEditor';
import PlanoEstrategicoPreview from './pages/PlanoEstrategicoPreview';
import VisualizacaoDono from './pages/VisualizacaoDono';
import ScoresAlertas from './pages/ScoresAlertas';
import PlanosAcaoGlobal from './pages/PlanosAcaoGlobal';
import Benchmark from './pages/Benchmark';
import DadosConciliacao from './pages/DadosConciliacao';
import Notificacoes from './pages/Notificacoes';
import Suporte from './pages/Suporte';
import SegurancaAuditoria from './pages/SegurancaAuditoria';
import Observabilidade from './pages/Observabilidade';
import Configuracoes from './pages/Configuracoes';
import MapaFuncional from './pages/MapaFuncional';
import RoteiroTestes from './pages/RoteiroTestes';
import PlanoEstrategico from './pages/PlanoEstrategico';
import PlanoAcao from './pages/PlanoAcao';
import ConsultoriaEntregas from './pages/ConsultoriaEntregas';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 bg-[#198653] rounded-xl flex items-center justify-center text-white font-bold text-sm">MX</div>
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#198653] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/clientes" element={<ClientesMX />} />
          <Route path="/clientes/novo" element={<NovoCliente />} />
          <Route path="/clientes/:id" element={<ClienteDetalhe />} />
          <Route path="/consultoria" element={<Consultoria />} />
          <Route path="/equipe" element={<EquipeMX />} />
          <Route path="/universidade" element={<Universidade />} />
          <Route path="/produtos" element={<ProdutosConsultoria />} />
          <Route path="/consultoria-mx" element={<ConsultoriaMX />} />
          <Route path="/indicadores" element={<PlanoEstrategicoGlobal />} />
          <Route path="/scores" element={<ScoresAlertas />} />
          <Route path="/planos-acao" element={<PlanosAcaoGlobal />} />
          <Route path="/benchmark" element={<Benchmark />} />
          <Route path="/dados" element={<DadosConciliacao />} />
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/suporte" element={<Suporte />} />
          <Route path="/seguranca" element={<SegurancaAuditoria />} />
          <Route path="/observabilidade" element={<Observabilidade />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="/mapa-funcional" element={<MapaFuncional />} />
          <Route path="/roteiro-testes" element={<RoteiroTestes />} />
          <Route path="/clientes/:clientId/plano-estrategico" element={<PlanoEstrategico />} />
          <Route path="/clientes/:clientId/plano-estrategico/:year" element={<PlanoEstrategicoEditor />} />
          <Route path="/clientes/:clientId/plano-estrategico/:year/preview" element={<PlanoEstrategicoPreview />} />
          <Route path="/clientes/:clientId/plano-estrategico/:year/visualizacao-dono" element={<VisualizacaoDono />} />
          <Route path="/clientes/:clientId/plano-acao" element={<PlanoAcao />} />
          <Route path="/clientes/:clientId/consultoria" element={<ConsultoriaEntregas />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;