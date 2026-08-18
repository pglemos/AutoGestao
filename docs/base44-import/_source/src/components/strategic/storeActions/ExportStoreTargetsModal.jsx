import { useState } from 'react';
import { X, Download, Loader2, Store } from 'lucide-react';
import { exportStoreTargets } from '@/lib/storeTargetCopyOps';
import { downloadExcelBuffer } from '@/lib/excelTargetTemplateGenerator';
import { useToast } from '@/components/ui/use-toast';

export default function ExportStoreTargetsModal({ client, cycle, indicators, targets, monthlyValues, params, overrides, referenceYear, sourceStoreId, sourceStoreName, onClose }) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const manualCount = targets.filter(t => {
    const ind = indicators.find(i => i.id === t.indicator_definition_id);
    return ind && (ind.input_mode === 'MANUAL' || ind.target_calculation_mode === 'MANUAL');
  }).length;

  async function handleExport() {
    setGenerating(true);
    try {
      const { buffer, fileName } = await exportStoreTargets({
        client, cycle, indicators, targets, monthlyValues, params, overrides,
        referenceYear, sourceStoreId, sourceStoreName,
      });
      downloadExcelBuffer(buffer, fileName);
      toast({ title: 'Metas exportadas', description: fileName });
      onClose();
    } catch (e) {
      toast({ title: 'Erro ao exportar', description: String(e?.message || e), variant: 'destructive' });
    }
    setGenerating(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Exportar Metas da Loja</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100"><X size={18} className="text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-[#198653]/5 rounded-lg p-3 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 text-[#198653] font-medium mb-1"><Store size={12} /> Loja de Origem</div>
            <div className="flex justify-between"><span className="text-gray-500">Loja:</span><span className="font-medium text-gray-900">{sourceStoreName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cliente:</span><span className="font-medium text-gray-900">{client?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ano:</span><span className="font-medium text-gray-900">{referenceYear}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Versão:</span><span className="font-medium text-gray-900">v{cycle?.version_number || '1'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Indicadores digitáveis:</span><span className="font-medium text-gray-900">{manualCount}</span></div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
            O arquivo conterá as metas preenchidas desta Loja de janeiro a dezembro. Indicadores calculáveis aparecem protegidos (fundo cinza) para conferência.
          </div>
          <div className="text-[10px] text-gray-400">
            Nome do arquivo: METAS_{String(client?.name || '').replace(/\s/g, '_').toUpperCase()}_{String(sourceStoreName || '').replace(/\s/g, '_').toUpperCase()}_{referenceYear}.xlsx
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          <button onClick={handleExport} disabled={generating} className="flex items-center gap-1.5 bg-[#198653] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Exportar Metas
          </button>
        </div>
      </div>
    </div>
  );
}