import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MODULES, buildDefaultCapabilities, RELEASE_STAGE_LABELS, VISIBILITY_LABELS, TECHNICAL_STATUS_LABELS, PREVIEW_PROFILES } from '@/lib/capabilityCatalog';
import { ChevronDown, ChevronUp, Lock, Check, RefreshCw, Eye, AlertCircle, CheckCircle, XCircle, MinusCircle } from 'lucide-react';

export default function ModulesMatrix({ clientId, productId, productName, onAudit }) {
  const [productRefs, setProductRefs] = useState([]);
  const [clientConfigs, setClientConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState({ DONO: true, GERENTE: true, VENDEDOR: true });
  const [showPreview, setShowPreview] = useState(false);
  const [previewProfile, setPreviewProfile] = useState('DONO');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId || !productId) { setLoading(false); return; }
    loadConfigs();
  }, [clientId, productId]);

  async function loadConfigs() {
    setLoading(true);
    // 1. Carregar refs do produto (ou gerar padrão)
    let refs = await base44.entities.ProductCapabilityReference.filter({ product_id: productId });
    if (refs.length === 0) {
      const defaults = buildDefaultCapabilities().map(d => ({ ...d, product_id: productId, product_name: productName, status: 'ATIVO' }));
      refs = await base44.entities.ProductCapabilityReference.bulkCreate(defaults);
    }
    setProductRefs(refs);

    // 2. Carregar configs do cliente (ou criar cópia do produto)
    let configs = await base44.entities.ClientCapabilityConfig.filter({ client_account_id: clientId });
    if (configs.length === 0) {
      const clientDefaults = refs.map(r => ({
        client_account_id: clientId,
        product_id: productId,
        module_code: r.module_code,
        module_label: r.module_label,
        menu_code: r.menu_code,
        menu_label: r.menu_label,
        included: r.default_included,
        is_mandatory: r.is_mandatory,
        release_stage: r.default_release_stage,
        visibility: r.default_visibility,
        technical_status: r.technical_status,
        is_customized: false,
        origin: 'PADRAO_PRODUTO',
        display_order: r.display_order,
      }));
      configs = await base44.entities.ClientCapabilityConfig.bulkCreate(clientDefaults);
    }
    setClientConfigs(configs);
    setLoading(false);
  }

  const getConfig = (modCode, menuCode) => clientConfigs.find(c => c.module_code === modCode && c.menu_code === menuCode);
  const getRef = (modCode, menuCode) => productRefs.find(r => r.module_code === modCode && r.menu_code === menuCode);

  async function toggleMenu(modCode, menuCode) {
    const cfg = getConfig(modCode, menuCode);
    if (!cfg || cfg.is_mandatory) return;
    const ref = getRef(modCode, menuCode);
    const newIncluded = !cfg.included;
    setSaving(true);
    const updated = await base44.entities.ClientCapabilityConfig.update(cfg.id, {
      included: newIncluded,
      is_customized: newIncluded !== ref.default_included,
      origin: newIncluded !== ref.default_included ? 'PERSONALIZADO_CLIENTE' : 'PADRAO_PRODUTO',
    });
    setClientConfigs(cs => cs.map(c => c.id === cfg.id ? updated : c));
    if (onAudit) onAudit({ action: 'MENU_TOGGLE', module: modCode, menu: menuCode, before: cfg.included ? 'liberado' : 'bloqueado', after: newIncluded ? 'liberado' : 'bloqueado' });
    setSaving(false);
  }

  async function toggleModule(modCode) {
    const moduleConfigs = clientConfigs.filter(c => c.module_code === modCode);
    const allIncluded = moduleConfigs.every(c => c.included);
    const target = !allIncluded;
    setSaving(true);
    const updates = moduleConfigs.filter(c => !c.is_mandatory).map(c => {
      const ref = getRef(modCode, c.menu_code);
      return { id: c.id, included: target, is_customized: target !== ref.default_included, origin: target !== ref.default_included ? 'PERSONALIZADO_CLIENTE' : 'PADRAO_PRODUTO' };
    });
    if (updates.length > 0) await base44.entities.ClientCapabilityConfig.bulkUpdate(updates);
    setClientConfigs(cs => cs.map(c => {
      if (c.module_code !== modCode || c.is_mandatory) return c;
      const ref = getRef(modCode, c.menu_code);
      return { ...c, included: target, is_customized: target !== ref.default_included, origin: target !== ref.default_included ? 'PERSONALIZADO_CLIENTE' : 'PADRAO_PRODUTO' };
    }));
    if (onAudit) onAudit({ action: 'MODULE_TOGGLE', module: modCode, before: allIncluded ? 'liberado' : 'parcial', after: target ? 'liberado' : 'bloqueado' });
    setSaving(false);
  }

  async function restoreProductDefault() {
    setSaving(true);
    const updates = clientConfigs.map(c => {
      const ref = getRef(c.module_code, c.menu_code);
      return { id: c.id, included: ref.default_included, release_stage: ref.default_release_stage, visibility: ref.default_visibility, is_customized: false, origin: 'PADRAO_PRODUTO' };
    });
    await base44.entities.ClientCapabilityConfig.bulkUpdate(updates);
    setClientConfigs(cs => cs.map(c => {
      const ref = getRef(c.module_code, c.menu_code);
      return { ...c, included: ref.default_included, release_stage: ref.default_release_stage, visibility: ref.default_visibility, is_customized: false, origin: 'PADRAO_PRODUTO' };
    }));
    if (onAudit) onAudit({ action: 'RESTORE_DEFAULT', before: 'personalizado', after: 'padrão do produto' });
    setSaving(false);
  }

  async function markAllNonMandatory() {
    setSaving(true);
    const updates = clientConfigs.filter(c => !c.is_mandatory).map(c => {
      const ref = getRef(c.module_code, c.menu_code);
      return { id: c.id, included: true, is_customized: ref.default_included !== true, origin: ref.default_included !== true ? 'PERSONALIZADO_CLIENTE' : 'PADRAO_PRODUTO' };
    });
    await base44.entities.ClientCapabilityConfig.bulkUpdate(updates);
    setClientConfigs(cs => cs.map(c => {
      if (c.is_mandatory) return c;
      const ref = getRef(c.module_code, c.menu_code);
      return { ...c, included: true, is_customized: ref.default_included !== true, origin: ref.default_included !== true ? 'PERSONALIZADO_CLIENTE' : 'PADRAO_PRODUTO' };
    }));
    if (onAudit) onAudit({ action: 'MARK_ALL', after: 'todos marcados' });
    setSaving(false);
  }

  const moduleState = (modCode) => {
    const cfgs = clientConfigs.filter(c => c.module_code === modCode);
    const included = cfgs.filter(c => c.included).length;
    if (included === cfgs.length) return 'full';
    if (included === 0) return 'none';
    return 'partial';
  };

  if (loading) return <div className="text-center py-8 text-sm text-gray-400">Carregando módulos...</div>;
  if (!productId) return <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">Selecione um produto na Etapa 3 para carregar os módulos.</div>;

  // Prévia por perfil
  const previewModules = PREVIEW_PROFILES.find(p => p.code === previewProfile)?.modules || [];
  const previewMenus = clientConfigs.filter(c => previewModules.includes(c.module_code) && c.included);

  return (
    <div className="space-y-4">
      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <button onClick={markAllNonMandatory} disabled={saving} className="flex items-center gap-1.5 text-xs bg-[#198653] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
          <Check size={12} /> Marcar todos
        </button>
        <button onClick={restoreProductDefault} disabled={saving} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          <RefreshCw size={12} /> Restaurar padrão do produto
        </button>
        <button onClick={() => setShowPreview(!showPreview)} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          <Eye size={12} /> Visualizar como perfil
        </button>
      </div>

      {/* Prévia */}
      {showPreview && (
        <div className="bg-[#102A3E] rounded-xl p-4 text-white">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="text-xs font-medium">Perfil:</span>
            {PREVIEW_PROFILES.map(p => (
              <button key={p.code} onClick={() => setPreviewProfile(p.code)} className={`text-xs px-2 py-1 rounded-full transition-colors ${previewProfile === p.code ? 'bg-[#198653] text-white' : 'bg-white/10 text-blue-200 hover:bg-white/20'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {previewMenus.map(m => (
              <div key={m.id} className="flex items-center gap-2 text-xs bg-white/10 rounded-lg px-2 py-1.5">
                <span className="text-blue-200">{m.module_label.replace('Módulo ', '')}</span>
                <span className="font-medium">{m.menu_label}</span>
                <span className="ml-auto text-[10px] bg-white/15 px-1.5 py-0.5 rounded">{VISIBILITY_LABELS[m.visibility]}</span>
              </div>
            ))}
            {previewMenus.length === 0 && <div className="text-xs text-blue-200">Nenhum menu liberado para este perfil.</div>}
          </div>
        </div>
      )}

      {/* Módulos hierárquicos */}
      <div className="space-y-3">
        {MODULES.map(mod => {
          const cfgs = clientConfigs.filter(c => c.module_code === mod.code);
          const includedCount = cfgs.filter(c => c.included).length;
          const state = moduleState(mod.code);
          const isExpanded = expandedModules[mod.code];
          const hasCustom = cfgs.some(c => c.is_customized);
          return (
            <div key={mod.code} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Header do módulo */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedModules(e => ({ ...e, [mod.code]: !e[mod.code] }))}>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleModule(mod.code); }}
                    disabled={saving}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                      state === 'full' ? 'bg-[#198653] border-[#198653]' :
                      state === 'partial' ? 'bg-[#198653] border-[#198653]' :
                      'bg-white border-gray-300'
                    }`}
                  >
                    {state === 'full' && <Check size={12} className="text-white" />}
                    {state === 'partial' && <MinusCircle size={12} className="text-white" />}
                  </button>
                  <div>
                    <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                      {mod.label}
                      {hasCustom && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">Personalizado</span>}
                    </div>
                    <div className="text-xs text-gray-500">{includedCount} de {cfgs.length} menus ativos</div>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>

              {/* Menus */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-50">
                  {mod.menus.map(menu => {
                    const cfg = getConfig(mod.code, menu.code);
                    if (!cfg) return null;
                    const ref = getRef(mod.code, menu.code);
                    const techUnavailable = cfg.technical_status === 'TEMPORARIAMENTE_INDISPONIVEL';
                    return (
                      <div key={menu.code} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50/50">
                        <button
                          onClick={() => toggleMenu(mod.code, menu.code)}
                          disabled={saving || cfg.is_mandatory || techUnavailable}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            cfg.included ? 'bg-[#198653] border-[#198653]' : 'bg-white border-gray-300'
                          } ${(cfg.is_mandatory || techUnavailable) ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {cfg.included && <Check size={10} className="text-white" />}
                          {cfg.is_mandatory && !cfg.included && <Lock size={9} className="text-gray-400" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-900 flex items-center gap-1.5">
                            {menu.label}
                            {cfg.is_mandatory && <Lock size={11} className="text-gray-400" />}
                            {cfg.is_customized && <span className="text-[10px] text-purple-600 font-medium">Personalizado</span>}
                            {!cfg.is_customized && <span className="text-[10px] text-gray-400">Padrão do produto</span>}
                          </div>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-[10px]">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{RELEASE_STAGE_LABELS[cfg.release_stage]}</span>
                          <span className={`px-1.5 py-0.5 rounded ${
                            cfg.visibility === 'ATIVO' ? 'bg-green-100 text-green-700' :
                            cfg.visibility === 'EM_BREVE' ? 'bg-yellow-100 text-yellow-700' :
                            cfg.visibility === 'VISIVEL_BLOQUEADO' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>{VISIBILITY_LABELS[cfg.visibility]}</span>
                          <span className={`px-1.5 py-0.5 rounded ${
                            cfg.technical_status === 'DISPONIVEL' ? 'bg-blue-50 text-blue-600' :
                            cfg.technical_status === 'EM_HOMOLOGACAO' ? 'bg-purple-50 text-purple-600' :
                            cfg.technical_status === 'EM_DESENVOLVIMENTO' ? 'bg-yellow-50 text-yellow-600' :
                            'bg-red-50 text-red-600'
                          }`}>{TECHNICAL_STATUS_LABELS[cfg.technical_status]}</span>
                        </div>
                        {techUnavailable && <span className="text-[10px] text-red-500 hidden md:inline">Indisponível</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Validação */}
      {clientConfigs.filter(c => c.included).length === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={14} /> Pelo menos um módulo deve ser liberado.
        </div>
      )}
    </div>
  );
}