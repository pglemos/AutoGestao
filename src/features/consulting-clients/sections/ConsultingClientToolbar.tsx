import { Search } from 'lucide-react'
import { Input } from '@/components/atoms/Input'
import { MxField, MxToolbar } from '@/components/module/MxModuleVisualPrimitives'

export function ConsultingClientToolbar({ search, onSearch }: { search: string; onSearch: (value: string) => void }) {
  return <MxToolbar><MxField label="Buscar cliente" className="min-w-[240px] flex-1"><div className="relative"><Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input value={search} onChange={event => onSearch(event.target.value)} className="pl-9" placeholder="Nome, produto ou CNPJ" /></div></MxField></MxToolbar>
}
