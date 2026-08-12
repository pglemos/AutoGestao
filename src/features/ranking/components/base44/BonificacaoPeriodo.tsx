import { Gift } from 'lucide-react'

/**
 * MX ainda não tem cadastro de bonificação por período (tabela BonificacaoRanking
 * do Base44 não existe no schema hoje). Reproduz fielmente o estado vazio do
 * protótipo em vez de inventar dados — ver docs/auditorias/auditoria-comparativa-base44-vs-mx-2026-07-03.md.
 */
export function BonificacaoPeriodo() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 w-full sm:w-[260px]">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-green-600" />
        <h2 className="text-body font-bold text-foreground">Bonificação do Período</h2>
      </div>
      <p className="text-body-sm text-muted-foreground text-center py-6">Nenhuma bonificação cadastrada para este período.</p>
    </div>
  )
}

export default BonificacaoPeriodo
