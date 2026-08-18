import { Menu, Bell, Search, ChevronDown } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const routeLabels = {
  '/': 'Início',
  '/clientes': 'Clientes MX',
  '/consultoria': 'Consultoria',
  '/equipe': 'Equipe MX',
  '/universidade': 'Universidade MX',
  '/produtos': 'Produtos de Consultoria',
  '/indicadores': 'Indicadores e Parâmetros',
  '/scores': 'Scores e Alertas',
  '/planos-acao': 'Planos de Ação e Playbooks',
  '/benchmark': 'Benchmark e Mercado',
  '/dados': 'Dados e Conciliação',
  '/notificacoes': 'Notificações, Agenda e Integrações',
  '/suporte': 'Suporte e Incidentes',
  '/seguranca': 'Segurança e Auditoria',
  '/observabilidade': 'Observabilidade',
  '/configuracoes': 'Configurações da Plataforma',
};

export default function TopBar({ onMenuClick }) {
  const location = useLocation();
  const pathRoot = '/' + location.pathname.split('/')[1];
  const pageLabel = routeLabels[pathRoot] || routeLabels[location.pathname] || 'Módulo Administrador';

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
        >
          <Menu size={18} />
        </button>
        <h1 className="text-base font-semibold text-gray-900 hidden sm:block">{pageLabel}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 text-sm text-gray-500 border border-gray-200 w-48">
          <Search size={14} />
          <span>Buscar...</span>
        </div>

        <button className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="w-7 h-7 bg-[#102A3E] rounded-full flex items-center justify-center text-white text-xs font-bold">
            AD
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-medium text-gray-900">Administrador</div>
            <div className="text-[10px] text-gray-500">Principal MX</div>
          </div>
          <ChevronDown size={12} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}