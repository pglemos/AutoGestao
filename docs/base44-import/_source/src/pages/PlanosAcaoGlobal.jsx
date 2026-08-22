import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Zap, Send, Eye, History, Loader2, AlertCircle } from 'lucide-react';
import DepartmentCards from '@/components/actionplans/DepartmentCards';
import TemplateFilters from '@/components/actionplans/TemplateFilters';
import TemplateTable from '@/components/actionplans/TemplateTable';
import TemplateWizard from '@/components/actionplans/TemplateWizard';
import ApplyTemplateModal from '@/components/actionplans/ApplyTemplateModal';
import SuggestToClientModal from '@/components/actionplans/SuggestToClientModal';
import TemplateDetailDrawer from '@/components/actionplans/TemplateDetailDrawer';
import SuggestionsTab from '@/components/actionplans/SuggestionsTab';
import ApplicationsTab from '@/components/actionplans/ApplicationsTab';
import HistoryTab from '@/components/actionplans/HistoryTab';
import { seedDemoTemplates, migrateDepartments } from '@/lib/actionPlanOps';

const TABS = [
  { id: 'planos', label: 'Planos Padrão', icon: Zap },
  { id: 'sugestoes', label: 'Sugestões ao Dono', icon: Send },
  { id: 'aplicacoes', label: 'Aplicações nos Clientes', icon: Eye },
  { id: 'historico', label: 'Histórico', icon: History },
];

export default function PlanosAcaoGlobal() {
  const [activeTab, setActiveTab] = useState('planos');
  const [templates, setTemplates] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [filters, setFilters] = useState({ search: '', department_id: '', indicator_id: '', status: '', suggestion_enabled: '', priority: '', responsible_role: '' });
  const [wizardOpen, setWizardOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [applyPreselected, setApplyPreselected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [tpls, inds] = await Promise.all([
      base44.entities.ActionPlanTemplate.list('-created_date', 200),
      base44.entities.IndicatorDefinition.filter({ is_active: true }),
    ]);
    setTemplates(tpls);
    setIndicators(inds);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Migrar departamentos e seed na primeira carga
    (async () => {
      try {
        await migrateDepartments();
      } catch (e) { /* não bloqueia */ }
      await load();
    })();
  }, [load]);

  const filtered = templates.filter(t => {
    const matchSearch = !filters.search || t.title?.toLowerCase().includes(filters.search.toLowerCase()) || t.code?.toLowerCase().includes(filters.search.toLowerCase());
    const matchDept = !filters.department_id || t.department_id === filters.department_id;
    const matchIndicator = !filters.indicator_id || t.primary_indicator_id === filters.indicator_id;
    const matchStatus = !filters.status || t.status === filters.status;
    const matchSuggestion = filters.suggestion_enabled === '' || t.suggestion_enabled === filters.suggestion_enabled;
    const matchPriority = !filters.priority || t.default_priority === filters.priority;
    const matchResponsible = !filters.responsible_role || t.default_responsible_role === filters.responsible_role;
    return matchSearch && matchDept && matchIndicator && matchStatus && matchSuggestion && matchPriority && matchResponsible;
  });

  const handleFilterChange = (field, value) => setFilters(f => ({ ...f, [field]: value }));
  const clearFilters = () => setFilters({ search: '', department_id: '', indicator_id: '', status: '', suggestion_enabled: '', priority: '', responsible_role: '' });

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMsg('');
    try {
      const result = await seedDemoTemplates();
      setSeedMsg(`${result.created} Planos Padrão criados. Total: ${result.total}.`);
      await load();
    } catch (e) {
      setSeedMsg('Erro ao criar dados demonstrativos: ' + e.message);
    }
    setSeeding(false);
  };

  const handleAction = async (templateId, action) => {
    const template = templates.find(t => t.id === templateId);
    if (!template && action !== 'refresh') return;

    switch (action) {
      case 'open':
        setSelectedTemplate(template);
        setDrawerOpen(true);
        break;
      case 'edit':
        setSelectedTemplate(template);
        setDrawerOpen(false);
        setWizardOpen(true);
        break;
      case 'apply':
        setApplyPreselected(template?.id || null);
        setApplyOpen(true);
        break;
      case 'suggest':
        setSelectedTemplate(template);
        setSuggestOpen(true);
        break;
      case 'history':
        setActiveTab('historico');
        break;
      case 'refresh':
        await load();
        break;
      default:
        break;
    }
  };

  const drawerAction = async (action) => {
    if (action === 'apply') { setApplyPreselected(selectedTemplate?.id || null); setApplyOpen(true); }
    if (action === 'suggest') { setSuggestOpen(true); }
    if (action === 'edit') { setWizardOpen(true); }
    if (action === 'refresh') { await load(); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Planos de Ação</h2>
          <p className="text-sm text-gray-500">Crie modelos de ação da metodologia MX para aplicação nos clientes e sugestão aos Donos.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {templates.length === 0 && !seeding && (
            <button onClick={handleSeed} className="flex items-center gap-1.5 text-xs bg-blue-50 text-[#2563EB] px-3 py-2 rounded-lg font-medium hover:bg-blue-100 border border-blue-200">
              <Zap size={14} /> Criar dados demonstrativos
            </button>
          )}
          {seeding && <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 size={14} className="animate-spin" /> Criando dados...</div>}
          <button onClick={() => setApplyOpen(true)} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-lg font-medium hover:bg-gray-50">
            <Eye size={14} /> Aplicar a Cliente
          </button>
          <button onClick={() => setActiveTab('historico')} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-lg font-medium hover:bg-gray-50">
            <History size={14} /> Abrir Histórico
          </button>
          <button onClick={() => { setSelectedTemplate(null); setWizardOpen(true); }} className="flex items-center gap-1.5 text-xs bg-[#198653] text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700">
            <Plus size={14} /> Criar Plano Padrão
          </button>
        </div>
      </div>

      {seedMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <AlertCircle size={14} /> {seedMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-[#198653] text-[#198653]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'planos' && (
        <div className="space-y-4">
          <DepartmentCards
            templates={templates}
            indicators={indicators}
            selectedDept={filters.department_id}
            onSelect={(dept) => { handleFilterChange('department_id', dept); handleFilterChange('indicator_id', ''); }}
          />
          <TemplateFilters
            indicators={indicators}
            filters={filters}
            onFilterChange={handleFilterChange}
            onClear={clearFilters}
          />
          <TemplateTable
            templates={filtered}
            indicators={indicators}
            loading={loading}
            onAction={handleAction}
          />
        </div>
      )}

      {activeTab === 'sugestoes' && <SuggestionsTab />}
      {activeTab === 'aplicacoes' && <ApplicationsTab />}
      {activeTab === 'historico' && <HistoryTab />}

      {/* Modals */}
      <TemplateWizard open={wizardOpen} onClose={() => setWizardOpen(false)} onSaved={load} editTemplate={selectedTemplate} />
      <ApplyTemplateModal open={applyOpen} onClose={() => setApplyOpen(false)} preselectedTemplateId={applyPreselected} onApplied={load} />
      <SuggestToClientModal open={suggestOpen} onClose={() => setSuggestOpen(false)} template={selectedTemplate} onSuggested={load} />
      <TemplateDetailDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} template={selectedTemplate} onAction={drawerAction} />
    </div>
  );
}
