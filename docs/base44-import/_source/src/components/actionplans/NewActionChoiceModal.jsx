import { X, FileCheck, Plus } from 'lucide-react';

export default function NewActionChoiceModal({ open, onClose, onUseTemplate, onCreateCustom }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Nova Ação</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <button onClick={onUseTemplate} className="w-full text-left border-2 border-[#198653] bg-green-50 rounded-lg p-4 hover:bg-green-100 transition-colors">
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-[#198653]" />
              <span className="font-medium text-gray-900">Usar Plano Padrão</span>
              <span className="text-[10px] bg-[#198653] text-white px-1.5 py-0.5 rounded-full ml-auto">Recomendado</span>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">Selecione uma orientação da metodologia MX e adapte responsáveis, prazos e metas para este cliente.</p>
          </button>
          <button onClick={onCreateCustom} className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-2">
              <Plus size={18} className="text-gray-600" />
              <span className="font-medium text-gray-900">Criar Plano Personalizado</span>
            </div>
            <p className="text-xs text-gray-600 mt-1.5">Crie um Plano específico para uma necessidade deste cliente.</p>
          </button>
        </div>
      </div>
    </div>
  );
}