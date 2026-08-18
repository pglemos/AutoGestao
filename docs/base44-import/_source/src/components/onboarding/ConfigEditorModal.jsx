import { useState } from 'react';
import { X, Lock, Save, Loader2, Info } from 'lucide-react';

export default function ConfigEditorModal({ open, onClose, title, fields, lockedFields = [], onSave, auditLabel }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const isSimulated = true;

  const handleSave = async () => {
    setSaving(true);
    await onSave?.(values);
    setSaving(false);
    onClose();
  };

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#198653]/30 focus:border-[#198653]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2 text-xs text-blue-700">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>Funcionalidade simulada no protótipo — os valores são demonstrativos e não persistem em produção.</span>
          </div>
          {fields?.map(f => {
            const isLocked = lockedFields.includes(f.key);
            return (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}{isLocked && <Lock size={10} className="inline ml-1 text-gray-400" />}</label>
                {f.type === 'time' ? (
                  <input type="time" disabled={isLocked} className={`${inputClass} ${isLocked ? 'bg-gray-50 text-gray-400' : ''}`} value={values[f.key] ?? f.default ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
                ) : f.type === 'select' ? (
                  <select disabled={isLocked} className={`${inputClass} ${isLocked ? 'bg-gray-50 text-gray-400' : ''}`} value={values[f.key] ?? f.default ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea disabled={isLocked} rows={3} className={`${inputClass} resize-none ${isLocked ? 'bg-gray-50 text-gray-400' : ''}`} value={values[f.key] ?? f.default ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
                ) : (
                  <input disabled={isLocked} className={`${inputClass} ${isLocked ? 'bg-gray-50 text-gray-400' : ''}`} value={values[f.key] ?? f.default ?? ''} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
                )}
                {f.help && <p className="text-xs text-gray-400 mt-1">{f.help}</p>}
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#198653] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : <><Save size={14} /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
}