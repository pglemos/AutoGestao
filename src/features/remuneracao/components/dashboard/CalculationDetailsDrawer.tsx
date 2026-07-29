import { X } from 'lucide-react'
import type { RemuneracaoEstimadaResultado } from '../../lib/comparativo'

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type Props = {
  open: boolean
  onClose: () => void
  calculo: RemuneracaoEstimadaResultado | null
}

export function CalculationDetailsDrawer({ open, onClose, calculo }: Props) {
  if (!open || !calculo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <button
        type="button"
        aria-label="Fechar detalhamento do cálculo"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-mx-navy">Detalhamento do Cálculo</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <Section title="Regra de comissão aplicada">
            {calculo.regraComissaoAplicada ? calculo.regraComissaoAplicada.tipo : 'Nenhuma regra encontrada'}
          </Section>

          <Section title="Veículos considerados">{calculo.vendasConsideradas}</Section>
          <Section title="Faturamento considerado">{formatCurrency(calculo.faturamentoConsiderado)}</Section>
          <Section title="Meta">{calculo.meta > 0 ? `${calculo.meta} vendas (${calculo.atingimentoPercentual}%)` : 'Pendente'}</Section>

          <Section title="Composição">
            {calculo.formulaItens.map(item => (
              <div key={item.chave} className="flex justify-between text-sm mt-1">
                <span className="text-slate-600">{item.label}</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(item.valor)}</span>
              </div>
            ))}
          </Section>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-mx-navy">Total previsto</span>
              <span className="text-2xl font-bold text-emerald-600">{formatCurrency(calculo.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <div className="text-sm text-slate-700 font-medium">{children}</div>
    </div>
  )
}

export default CalculationDetailsDrawer
