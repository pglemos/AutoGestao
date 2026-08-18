import { useState, useRef, useEffect } from 'react';
import { Copy, Download, FileSpreadsheet, Upload, History, MoreVertical, Store } from 'lucide-react';

export default function StoreActionsMenu({ selectedStoreName, onCopy, onExport, onDownloadTemplate, onImport, onHistory, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = [
    { icon: Copy, label: 'Copiar Metas para Outra Loja', onClick: onCopy, primary: true },
    { icon: Download, label: 'Exportar Metas Preenchidas', onClick: onExport, primary: true },
    { divider: true },
    { icon: FileSpreadsheet, label: 'Baixar Modelo em Branco', onClick: onDownloadTemplate },
    { icon: Upload, label: 'Importar Tabela', onClick: onImport },
    { icon: History, label: 'Abrir Histórico', onClick: onHistory },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="flex items-center gap-1.5 text-xs border border-[#198653]/30 bg-[#198653]/5 text-[#198653] px-2.5 py-1 rounded-lg font-medium hover:bg-[#198653]/10 disabled:opacity-50"
      >
        <Store size={11} />
        <span>Ações da Loja:</span>
        <span className="font-bold max-w-24 truncate">{selectedStoreName}</span>
        <MoreVertical size={11} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-1">
          {items.map((item, i) => item.divider ? (
            <div key={i} className="border-t border-gray-100 my-1" />
          ) : (
            <button
              key={i}
              onClick={() => { item.onClick?.(); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 ${item.primary ? 'text-[#198653] font-medium' : 'text-gray-700'}`}
            >
              <item.icon size={13} />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}