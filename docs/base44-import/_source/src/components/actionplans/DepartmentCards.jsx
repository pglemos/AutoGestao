import { TrendingUp, Megaphone, Package, Users, DollarSign, Settings, LayoutGrid } from 'lucide-react';
import { ACTION_PLAN_DEPARTMENTS } from '@/lib/actionPlanConstants';

const ICONS = { TrendingUp, Megaphone, Package, Users, DollarSign, Settings, LayoutGrid };

export default function DepartmentCards({ templates, indicators, selectedDept, onSelect }) {
  const cards = [
    { code: '', label: 'Todos', icon: 'LayoutGrid' },
    ...Object.entries(ACTION_PLAN_DEPARTMENTS).map(([code, info]) => ({ code, ...info })),
  ];

  const getCounts = (dept) => {
    const published = templates.filter(t => (dept ? t.department_id === dept : true) && t.status === 'PUBLICADO').length;
    const drafts = templates.filter(t => (dept ? t.department_id === dept : true) && (t.status === 'RASCUNHO' || t.status === 'EM_REVISAO')).length;
    const activeIndicators = indicators.filter(i => (dept ? i.department === dept : true) && i.is_active && i.status === 'PUBLICADO').length;
    return { published, drafts, activeIndicators };
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      {cards.map(card => {
        const Icon = ICONS[card.icon] || LayoutGrid;
        const counts = getCounts(card.code);
        const isSelected = selectedDept === card.code;
        return (
          <button
            key={card.code || 'todos'}
            onClick={() => onSelect(card.code)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${
              isSelected
                ? 'border-[#198653] bg-[#198653]/5 shadow-sm'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.color || 'bg-gray-100 text-gray-600'}`}>
                <Icon size={14} />
              </div>
              <span className="text-xs font-semibold text-gray-800 truncate">{card.label}</span>
            </div>
            <div className="text-lg font-bold text-gray-900">{counts.published}</div>
            <div className="text-[10px] text-gray-500">Planos Padrão</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{counts.activeIndicators} indicadores ativos</div>
            {counts.drafts > 0 && (
              <div className="text-[10px] text-yellow-600 mt-0.5">{counts.drafts} em rascunho</div>
            )}
          </button>
        );
      })}
    </div>
  );
}