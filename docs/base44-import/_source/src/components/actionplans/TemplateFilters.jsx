import { Search, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { TEMPLATE_STATUS, PRIORITIES, RESPONSIBLE_ROLES } from '@/lib/actionPlanConstants';

export default function TemplateFilters({ indicators, filters, onFilterChange, onClear }) {
  const [indicatorSearch, setIndicatorSearch] = useState('');
  const [showIndicatorDropdown, setShowIndicatorDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowIndicatorDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const deptIndicators = filters.department_id
    ? indicators.filter(i => i.department === filters.department_id && i.is_active && i.status === 'PUBLICADO')
    : [];

  const filteredIndicators = deptIndicators.filter(i =>
    !indicatorSearch || i.name?.toLowerCase().includes(indicatorSearch.toLowerCase())
  );

  const selectedIndicator = indicators.find(i => i.id === filters.indicator_id);

  const inputClass = "bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#198653]/30 focus:border-[#198653]";

  const hasFilters = filters.search || filters.department_id || filters.indicator_id || filters.status || filters.suggestion_enabled || filters.priority || filters.responsible_role;

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-3">
      <div className="flex flex-wrap gap-2">
        {/* Busca */}
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filters.search || ''}
            onChange={e => onFilterChange('search', e.target.value)}
            className="text-sm outline-none flex-1 bg-transparent"
          />
        </div>

        {/* Departamento */}
        <select
          value={filters.department_id || ''}
          onChange={e => {
            onFilterChange('department_id', e.target.value);
            onFilterChange('indicator_id', '');
          }}
          className={inputClass}
        >
          <option value="">Todos os departamentos</option>
          <option value="COMERCIAL">Comercial</option>
          <option value="MARKETING">Marketing</option>
          <option value="PRODUTO_ESTOQUE">Produto e Estoque</option>
          <option value="PESSOAS_RH">Pessoas - RH</option>
          <option value="FINANCEIRO">Financeiro</option>
          <option value="OPERACOES">Operações</option>
        </select>

        {/* Indicador (dependente de departamento) */}
        <div className="relative" ref={dropdownRef} style={{ minWidth: 200 }}>
          <button
            disabled={!filters.department_id}
            onClick={() => filters.department_id && setShowIndicatorDropdown(!showIndicatorDropdown)}
            className={`w-full text-left ${inputClass} ${!filters.department_id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {selectedIndicator ? selectedIndicator.name : 'Selecione primeiro um departamento'}
          </button>
          {showIndicatorDropdown && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Buscar indicador..."
                  value={indicatorSearch}
                  onChange={e => setIndicatorSearch(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none"
                  autoFocus
                />
              </div>
              <button
                onClick={() => { onFilterChange('indicator_id', ''); setShowIndicatorDropdown(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                Todos os indicadores
              </button>
              {filteredIndicators.map(i => (
                <button
                  key={i.id}
                  onClick={() => { onFilterChange('indicator_id', i.id); setShowIndicatorDropdown(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-t border-gray-50"
                >
                  <div className="font-medium text-gray-800">{i.name}</div>
                  <div className="text-xs text-gray-400">{i.unit} · {i.default_direction}</div>
                </button>
              ))}
              {filteredIndicators.length === 0 && (
                <div className="px-3 py-3 text-sm text-gray-400">Nenhum indicador encontrado</div>
              )}
            </div>
          )}
        </div>

        {/* Status */}
        <select value={filters.status || ''} onChange={e => onFilterChange('status', e.target.value)} className={inputClass}>
          <option value="">Todos os status</option>
          {Object.entries(TEMPLATE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Sugestão ao Dono */}
        <select value={filters.suggestion_enabled ?? ''} onChange={e => onFilterChange('suggestion_enabled', e.target.value === '' ? '' : e.target.value === 'true')} className={inputClass}>
          <option value="">Disponibilidade</option>
          <option value="true">Disponível para sugestão</option>
          <option value="false">Não disponível</option>
        </select>

        {/* Prioridade */}
        <select value={filters.priority || ''} onChange={e => onFilterChange('priority', e.target.value)} className={inputClass}>
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {/* Responsável */}
        <select value={filters.responsible_role || ''} onChange={e => onFilterChange('responsible_role', e.target.value)} className={inputClass}>
          <option value="">Todos os responsáveis</option>
          {RESPONSIBLE_ROLES.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
        </select>

        {/* Limpar */}
        {hasFilters && (
          <button onClick={onClear} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 px-3 py-2 border border-gray-200 rounded-lg">
            <X size={12} /> Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}