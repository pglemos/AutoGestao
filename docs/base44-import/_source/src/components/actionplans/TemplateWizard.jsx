import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ChevronLeft, ChevronRight, Save, AlertCircle, Plus, Trash2, Copy, ArrowUp, ArrowDown, Eye, FileCheck, Upload, GraduationCap, Check, Loader2 } from 'lucide-react';
import { ACTION_PLAN_DEPARTMENTS, DIRECTION_OPTIONS, DIRECTION_LABELS, PRIORITIES, WIZARD_STEPS, SUPPORT_MATERIAL_TYPES } from '@/lib/actionPlanConstants';
import { createTemplate, publishTemplate, suggestTitle, calculateWeights } from '@/lib/actionPlanOps';

export default function TemplateWizard({ open, onClose, onSaved, editTemplate }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [indicators, setIndicators] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [titleIsCustomized, setTitleIsCustomized] = useState(false);
  const [templateId, setTemplateId] = useState(null);
  const [form, setForm] = useState({
    department_id: '',
    primary_indicator_id: '',
    primary_indicator_code: '',
    primary_indicator_name: '',
    title: '',
    improvement_direction: 'AUMENTAR',
    actions: [{ title: '', execution_instructions: '', support_material_type: 'NONE', file_asset_id: '', file_asset_name: '', learning_content_id: '', learning_content_name: '' }],
    recommended_deadline_days: 30,
    default_priority: 'ATENCAO',
    effectiveness_indicator_id: '',
    effectiveness_indicator_name: '',
    manual_application_enabled: true,
    owner_suggestion_enabled: false,
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      setErrors({});
      setTitleIsCustomized(false);
      setLastSaved(null);
      setTemplateId(editTemplate?.id || null);
      base44.entities.IndicatorDefinition.filter({ is_active: true, status: 'PUBLICADO' }).then(setIndicators);
      base44.entities.LearningContent.filter({ status: 'PUBLICADO' }).then(setLessons);
    }
  }, [open, editTemplate]);

  if (!open) return null;

  const deptIndicators = form.department_id ? indicators.filter(i => i.department === form.department_id) : [];
  const update = (field, value) => { setForm(f => ({ ...f, [field]: value })); setErrors(e => { const n = { ...e }; delete n[field]; return n; }); };

  // Auto-sugerir título quando indicador ou direção mudam (se não personalizado)
  const onIndicatorChange = (indicatorId) => {
    const ind = indicators.find(i => i.id === indicatorId);
    setForm(f => {
      const newDirection = ind?.default_direction || f.improvement_direction;
      const newTitle = titleIsCustomized ? f.title : suggestTitle(newDirection, ind?.name || '');
      return {
        ...f,
        primary_indicator_id: indicatorId,
        primary_indicator_code: ind?.code || '',
        primary_indicator_name: ind?.name || '',
        improvement_direction: newDirection,
        effectiveness_indicator_id: indicatorId,
        effectiveness_indicator_name: ind?.name || '',
        title: newTitle,
      };
    });
  };

  const onDirectionChange = (direction) => {
    setForm(f => {
      const newTitle = titleIsCustomized ? f.title : suggestTitle(direction, f.primary_indicator_name || '');
      return { ...f, improvement_direction: direction, title: newTitle };
    });
  };

  const onTitleChange = (value) => {
    setTitleIsCustomized(true);
    update('title', value);
  };

  const useSuggestedTitle = () => {
    setTitleIsCustomized(false);
    const suggested = suggestTitle(form.improvement_direction, form.primary_indicator_name);
    update('title', suggested);
  };

  // Actions management
  const addAction = () => {
    setForm(f => ({ ...f, actions: [...f.actions, { title: '', execution_instructions: '', support_material_type: 'NONE', file_asset_id: '', file_asset_name: '', learning_content_id: '', learning_content_name: '' }] }));
  };
  const updateAction = (i, field, value) => {
    setForm(f => { const n = [...f.actions]; n[i] = { ...n[i], [field]: value }; return { ...f, actions: n }; });
  };
  const duplicateAction = (i) => {
    setForm(f => { const n = [...f.actions]; n.splice(i + 1, 0, { ...n[i] }); return { ...f, actions: n }; });
  };
  const removeAction = (i) => {
    setForm(f => ({ ...f, actions: f.actions.filter((_, j) => j !== i) }));
  };
  const moveAction = (i, dir) => {
    setForm(f => {
      const n = [...f.actions];
      const target = i + dir;
      if (target < 0 || target >= n.length) return f;
      [n[i], n[target]] = [n[target], n[i]];
      return { ...f, actions: n };
    });
  };

  const weights = calculateWeights(form.actions.length);

  // File upload
  const handleFileUpload = async (i, file) => {
    if (!file) return;
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const fa = await base44.entities.FileAsset.create({
        client_account_id: '',
        file_name: file.name,
        original_file_name: file.name,
        storage_url: file_url,
        mime_type: file.type,
        file_size: file.size,
        category: 'MATERIAL_APOIO',
        status: 'PUBLICADO',
        uploaded_by: 'Administrador MX',
        uploaded_at: new Date().toISOString(),
      });
      updateAction(i, 'file_asset_id', fa.id);
      updateAction(i, 'file_asset_name', file.name);
    } catch (e) { console.error('Upload error:', e); }
  };

  const validate = () => {
    const errs = {};
    if (step === 1) {
      if (!form.department_id) errs.department_id = 'Selecione um departamento.';
      if (!form.primary_indicator_id) errs.primary_indicator_id = 'Selecione um indicador principal.';
      else {
        const ind = indicators.find(i => i.id === form.primary_indicator_id);
        if (ind && ind.department !== form.department_id) errs.primary_indicator_id = 'O indicador selecionado não pertence a este departamento.';
      }
      if (!form.title.trim()) errs.title = 'Informe o título do Plano de Ação.';
      if (!form.improvement_direction) errs.improvement_direction = 'Selecione a direção de melhoria.';
    }
    if (step === 2) {
      if (form.actions.length === 0) errs.actions = 'Adicione pelo menos uma ação.';
      else if (form.actions.some(a => !a.title.trim())) errs.actions = 'Informe o nome de todas as ações.';
    }
    if (step === 3) {
      if (!form.recommended_deadline_days || form.recommended_deadline_days <= 0) errs.recommended_deadline_days = 'Informe o prazo recomendado.';
      if (!form.default_priority) errs.default_priority = 'Selecione a prioridade padrão.';
      if (!form.effectiveness_indicator_id) errs.effectiveness_indicator_id = 'Selecione o indicador de eficácia.';
      else {
        const ind = indicators.find(i => i.id === form.effectiveness_indicator_id);
        if (ind && ind.department !== form.department_id) errs.effectiveness_indicator_id = 'O indicador de eficácia deve pertencer ao mesmo departamento.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = async () => {
    if (!validate()) return;
    await saveDraft();
    setStep(s => Math.min(4, s + 1));
  };
  const prev = () => setStep(s => Math.max(1, s - 1));

  const saveDraft = async () => {
    setSaving(true);
    try {
      const tpl = await createTemplate(form, templateId);
      if (!templateId) setTemplateId(tpl.id);
      setLastSaved(new Date());
    } catch (e) { setErrors({ submit: 'Erro ao salvar: ' + e.message }); }
    setSaving(false);
  };

  const publish = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const tpl = await createTemplate(form, templateId);
      await publishTemplate(tpl.id);
      onSaved?.();
      onClose();
    } catch (e) { setErrors({ submit: 'Erro ao publicar: ' + e.message }); }
    setSaving(false);
  };

  const inputClass = (field) => `w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#198653]/30 focus:border-[#198653] ${errors[field] ? 'border-red-400' : 'border-gray-200'}`;
  const FieldErr = ({ field }) => errors[field] ? <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle size={11} />{errors[field]}</p> : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Criar Plano Padrão</h3>
            {lastSaved && <p className="text-xs text-gray-400 mt-0.5">Última gravação: {lastSaved.toLocaleTimeString('pt-BR')}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
        </div>

        {/* Stepper */}
        <div className="px-5 py-3 border-b border-gray-100">
          <div className="flex items-center">
            {WIZARD_STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${step === s.id ? 'bg-[#198653] border-[#198653] text-white' : step > s.id ? 'bg-green-100 border-[#198653] text-[#198653]' : 'bg-white border-gray-200 text-gray-400'}`}>
                    {step > s.id ? <Check size={12} /> : s.id}
                  </div>
                  <span className={`text-[10px] mt-1 whitespace-nowrap ${step === s.id ? 'text-[#198653] font-medium' : 'text-gray-400'}`}>{s.label}</span>
                </div>
                {i < WIZARD_STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${step > s.id ? 'bg-[#198653]' : 'bg-gray-200'}`} />}
              </div>
            ))}
          </div>
          <div className="md:hidden text-xs text-gray-500 mt-1">Passo {step} de 4</div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* STEP 1 — INDICADOR */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-800">Indicador</h4>
                <p className="text-xs text-gray-500 mt-0.5">Selecione o departamento e o indicador que este Plano de Ação pretende melhorar.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Departamento *</label>
                  <select className={inputClass('department_id')} value={form.department_id} onChange={e => { update('department_id', e.target.value); update('primary_indicator_id', ''); update('effectiveness_indicator_id', ''); }}>
                    <option value="">Selecionar...</option>
                    {Object.entries(ACTION_PLAN_DEPARTMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <FieldErr field="department_id" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Indicador Principal *</label>
                  <select className={inputClass('primary_indicator_id')} value={form.primary_indicator_id} onChange={e => onIndicatorChange(e.target.value)} disabled={!form.department_id}>
                    <option value="">{form.department_id ? 'Selecione um indicador' : 'Selecione primeiro um departamento'}</option>
                    {deptIndicators.map(i => <option key={i.id} value={i.id}>{i.name} — {i.unit || ''} ({DIRECTION_LABELS[i.default_direction] || i.default_direction})</option>)}
                  </select>
                  <FieldErr field="primary_indicator_id" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Título do Plano *</label>
                  <input className={inputClass('title')} value={form.title} onChange={e => onTitleChange(e.target.value)} placeholder="Título do Plano de Ação" />
                  {titleIsCustomized && form.primary_indicator_name && (
                    <button onClick={useSuggestedTitle} className="text-xs text-[#2563EB] mt-1 hover:underline">Usar título sugerido</button>
                  )}
                  <FieldErr field="title" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Direção de Melhoria *</label>
                  <select className={inputClass('improvement_direction')} value={form.improvement_direction} onChange={e => onDirectionChange(e.target.value)}>
                    {DIRECTION_OPTIONS.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
                  </select>
                  <FieldErr field="improvement_direction" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 — AÇÕES */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-800">Ações</h4>
                <p className="text-xs text-gray-500 mt-0.5">Crie as ações que deverão ser executadas quando este Plano for aplicado a um cliente.</p>
              </div>
              {FieldErr({ field: 'actions' })}
              <div className="space-y-2">
                {form.actions.map((a, i) => (
                  <ActionCard
                    key={i}
                    action={a}
                    index={i}
                    total={form.actions.length}
                    weight={weights[i]}
                    lessons={lessons}
                    onChange={(field, val) => updateAction(i, field, val)}
                    onDuplicate={() => duplicateAction(i)}
                    onRemove={() => removeAction(i)}
                    onMoveUp={() => moveAction(i, -1)}
                    onMoveDown={() => moveAction(i, 1)}
                    onFileUpload={(file) => handleFileUpload(i, file)}
                  />
                ))}
              </div>
              <button onClick={addAction} className="flex items-center gap-1 text-xs bg-[#198653] text-white px-3 py-2 rounded-lg font-medium hover:bg-green-700">
                <Plus size={14} /> Adicionar Ação
              </button>
            </div>
          )}

          {/* STEP 3 — PRAZO E META */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-800">Prazo e Meta</h4>
                <p className="text-xs text-gray-500 mt-0.5">Defina o prazo recomendado, a prioridade e o indicador que medirá a eficácia deste Plano.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prazo Recomendado em Dias *</label>
                  <input type="number" min="1" className={inputClass('recommended_deadline_days')} value={form.recommended_deadline_days} onChange={e => update('recommended_deadline_days', parseInt(e.target.value))} />
                  <FieldErr field="recommended_deadline_days" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Prioridade Padrão *</label>
                  <select className={inputClass('default_priority')} value={form.default_priority} onChange={e => update('default_priority', e.target.value)}>
                    {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <FieldErr field="default_priority" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Indicador de Eficácia *</label>
                  <select className={inputClass('effectiveness_indicator_id')} value={form.effectiveness_indicator_id} onChange={e => { const ind = indicators.find(i => i.id === e.target.value); update('effectiveness_indicator_id', e.target.value); update('effectiveness_indicator_name', ind?.name || ''); }}>
                    <option value="">Selecionar...</option>
                    {deptIndicators.map(i => <option key={i.id} value={i.id}>{i.name} — {i.unit || ''}</option>)}
                  </select>
                  <FieldErr field="effectiveness_indicator_id" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — REVISÃO E PUBLICAÇÃO */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-800">Revisão e Publicação</h4>
                <p className="text-xs text-gray-500 mt-0.5">Revise o Plano Padrão antes de disponibilizá-lo para aplicação nos clientes.</p>
              </div>

              {/* Card Identificação */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Identificação</h5>
                <div className="flex justify-between"><span className="text-gray-500">Departamento:</span><span className="font-medium">{ACTION_PLAN_DEPARTMENTS[form.department_id]?.label || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Indicador Principal:</span><span className="font-medium text-right">{form.primary_indicator_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Título:</span><span className="font-medium text-right">{form.title || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Direção:</span><span className="font-medium">{DIRECTION_LABELS[form.improvement_direction] || '—'}</span></div>
              </div>

              {/* Card Ações */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Ações ({form.actions.length})</h5>
                {form.actions.map((a, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="font-medium text-gray-700">{i + 1}. {a.title || '—'}</span>
                    <span className="text-gray-500">{weights[i]?.weight_percentage_display || '—'}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-gray-500 font-medium">Peso total:</span>
                  <span className="font-bold text-[#198653]">100.00%</span>
                </div>
              </div>

              {/* Card Prazo e Meta */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-1.5 text-sm">
                <h5 className="text-xs font-semibold text-gray-500 uppercase mb-2">Prazo e Meta</h5>
                <div className="flex justify-between"><span className="text-gray-500">Prazo recomendado:</span><span className="font-medium">{form.recommended_deadline_days} dias</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Prioridade:</span><span className="font-medium">{PRIORITIES[form.default_priority]?.label || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Indicador de Eficácia:</span><span className="font-medium text-right">{form.effectiveness_indicator_name || '—'}</span></div>
              </div>

              {/* Disponibilidade */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.manual_application_enabled} onChange={e => update('manual_application_enabled', e.target.checked)} /> Disponível para aplicação nos clientes</label>
                <p className="text-xs text-gray-400 ml-6">Permite que a equipe MX utilize este modelo na área dos clientes.</p>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.owner_suggestion_enabled} onChange={e => update('owner_suggestion_enabled', e.target.checked)} /> Disponível para sugestão ao Dono</label>
                <p className="text-xs text-gray-400 ml-6">Permite que o Plano seja apresentado como recomendação no Módulo Dono.</p>
              </div>

              {errors.submit && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{errors.submit}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {step > 1 && <button onClick={prev} className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"><ChevronLeft size={14} /> Voltar</button>}
            <button onClick={saveDraft} disabled={saving} className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:bg-gray-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar rascunho
            </button>
          </div>
          <div className="flex items-center gap-2">
            {step === 4 && <button onClick={() => setShowPreview(true)} className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"><Eye size={14} /> Visualizar como Dono</button>}
            {step < 4 && <button onClick={next} disabled={saving} className="flex items-center gap-1 bg-[#198653] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">Continuar <ChevronRight size={14} /></button>}
            {step === 4 && <button onClick={publish} disabled={saving} className="flex items-center gap-1 bg-[#198653] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"><FileCheck size={14} /> {saving ? 'Publicando...' : 'Publicar Plano Padrão'}</button>}
          </div>
        </div>
      </div>

      {showPreview && <PreviewAsDono form={form} weights={weights} indicators={indicators} onClose={() => setShowPreview(false)} />}
    </div>
  );
}

// Componente: Card de Ação
function ActionCard({ action, index, total, weight, lessons, onChange, onDuplicate, onRemove, onMoveUp, onMoveDown, onFileUpload }) {
  const [expanded, setExpanded] = useState(false);
  const [showLessonSearch, setShowLessonSearch] = useState(false);
  const [lessonSearch, setLessonSearch] = useState('');

  const filteredLessons = lessons.filter(l => !lessonSearch || l.title?.toLowerCase().includes(lessonSearch.toLowerCase()));

  return (
    <div className="border border-gray-200 rounded-lg p-3">
      <div className="flex items-start gap-2">
        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 mt-1">{index + 1}</div>
        <div className="flex-1 space-y-2">
          <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#198653]/30" value={action.title} onChange={e => onChange('title', e.target.value)} placeholder="Nome da Ação *" />
          {expanded && (
            <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#198653]/30 resize-none" rows={2} value={action.execution_instructions} onChange={e => onChange('execution_instructions', e.target.value)} placeholder="Descreva de forma objetiva como esta ação deve ser realizada." />
          )}
          {/* Material de apoio */}
          <div className="flex items-center gap-2 flex-wrap">
            <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none" value={action.support_material_type} onChange={e => { onChange('support_material_type', e.target.value); if (e.target.value !== 'FILE') { onChange('file_asset_id', ''); onChange('file_asset_name', ''); } if (e.target.value !== 'UNIVERSITY_LESSON') { onChange('learning_content_id', ''); onChange('learning_content_name', ''); } }}>
              {SUPPORT_MATERIAL_TYPES.map(t => <option key={t.code} value={t.code}>{t.label}</option>)}
            </select>
            {action.support_material_type === 'FILE' && (
              <div className="flex items-center gap-2">
                {action.file_asset_name ? (
                  <span className="text-xs text-gray-600 flex items-center gap-1"><Check size={12} className="text-[#198653]" /> {action.file_asset_name}</span>
                ) : (
                  <label className="flex items-center gap-1 text-xs text-[#2563EB] cursor-pointer hover:underline"><Upload size={12} /> Enviar arquivo<input type="file" className="hidden" onChange={e => onFileUpload(e.target.files[0])} /></label>
                )}
              </div>
            )}
            {action.support_material_type === 'UNIVERSITY_LESSON' && (
              <div className="flex items-center gap-2">
                {action.learning_content_name ? (
                  <span className="text-xs text-gray-600 flex items-center gap-1"><GraduationCap size={12} className="text-[#198653]" /> {action.learning_content_name}</span>
                ) : (
                  <button onClick={() => setShowLessonSearch(!showLessonSearch)} className="flex items-center gap-1 text-xs text-[#2563EB] hover:underline"><GraduationCap size={12} /> Vincular aula</button>
                )}
              </div>
            )}
          </div>
          {showLessonSearch && action.support_material_type === 'UNIVERSITY_LESSON' && (
            <div className="border border-gray-200 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto">
              <input className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none" placeholder="Buscar aula..." value={lessonSearch} onChange={e => setLessonSearch(e.target.value)} autoFocus />
              {filteredLessons.map(l => (
                <button key={l.id} onClick={() => { onChange('learning_content_id', l.id); onChange('learning_content_name', l.title); setShowLessonSearch(false); }} className="w-full text-left text-xs px-2 py-1.5 hover:bg-gray-50 rounded">
                  <div className="font-medium text-gray-700">{l.title}</div>
                  <div className="text-gray-400">{l.trail_level} · {l.duration_minutes || 0} min · {l.target_profile || ''}</div>
                </button>
              ))}
              {filteredLessons.length === 0 && <div className="text-xs text-gray-400 p-2">Nenhuma aula encontrada</div>}
            </div>
          )}
          {/* Peso */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">Peso:</span>
            <span className="font-medium text-gray-600">{weight?.weight_percentage_display || '—'}</span>
          </div>
        </div>
        {/* Actions */}
        <div className="flex flex-col gap-1">
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-gray-100 text-gray-400" title="Expandir"><ChevronRight size={14} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} /></button>
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30" title="Mover para cima"><ArrowUp size={14} /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30" title="Mover para baixo"><ArrowDown size={14} /></button>
          <button onClick={onDuplicate} className="p-1 rounded hover:bg-gray-100 text-gray-400" title="Duplicar"><Copy size={14} /></button>
          <button onClick={onRemove} disabled={total <= 1} className="p-1 rounded hover:bg-red-50 text-red-400 disabled:opacity-30" title="Excluir"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// Componente: Prévia como Dono
function PreviewAsDono({ form, weights, indicators, onClose }) {
  const dept = ACTION_PLAN_DEPARTMENTS[form.department_id];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#102A3E] text-white px-5 py-3 rounded-t-xl flex items-center justify-between">
          <h3 className="font-semibold text-sm">Prévia do Plano Padrão — Ainda não publicado</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-white/10"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <h4 className="text-lg font-bold text-gray-900">{form.title}</h4>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dept?.color || ''}`}>{dept?.label}</span>
              <span className="text-xs text-gray-500">{form.primary_indicator_name}</span>
              <span className="text-xs text-gray-500">· {DIRECTION_LABELS[form.improvement_direction]}</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Prazo</div><div className="font-bold text-sm">{form.recommended_deadline_days} dias</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Prioridade</div><div className="font-bold text-sm">{PRIORITIES[form.default_priority]?.label}</div></div>
            <div className="bg-gray-50 rounded-lg p-2"><div className="text-xs text-gray-500">Eficácia</div><div className="font-bold text-sm truncate">{form.effectiveness_indicator_name || '—'}</div></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-semibold text-gray-700">Checklist ({form.actions.length})</h5>
              <span className="text-xs text-gray-500">Progresso: 0%</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full mb-3"><div className="h-full bg-[#198653] rounded-full" style={{ width: '0%' }} /></div>
            <div className="space-y-2">
              {form.actions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <div className="w-4 h-4 rounded border-2 border-gray-300 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-700">{a.title}</span>
                    {a.execution_instructions && <p className="text-xs text-gray-500 mt-0.5">{a.execution_instructions}</p>}
                    {a.support_material_type === 'FILE' && a.file_asset_name && <p className="text-xs text-[#2563EB] mt-0.5">📎 {a.file_asset_name}</p>}
                    {a.support_material_type === 'UNIVERSITY_LESSON' && a.learning_content_name && <p className="text-xs text-[#198653] mt-0.5">🎓 {a.learning_content_name}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{weights[i]?.weight_percentage_display}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}