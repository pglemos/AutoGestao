import { useEffect, useRef, useState } from 'react'
import { Calendar, X } from 'lucide-react'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import type { ManagerFeedbackDraft } from './manager-feedback-draft'

type Seller = { id: string; name: string }

type Props = {
  open: boolean
  saving: boolean
  sellers: Seller[]
  initialDate: string
  preselectedSeller?: string
  onClose: () => void
  onSubmit: (draft: ManagerFeedbackDraft) => void
}

const COMPETENCIES = [
  'Planejamento', 'Atendimento ao Cliente', 'Agendamento de Visitas', 'Fechamento de Venda',
  'Carteira de Clientes', 'Mídias Sociais', 'Prospecção', 'Avaliação de Carro', 'Financiamentos',
  'Processos', 'Pontualidade', 'Senso de Urgência', 'Iniciativa', 'Organização', 'Liderança',
  'Relacionamento Interpessoal', 'Persistência', 'Resiliência',
]
const ORIGINS = ['Observação do gerente', 'Minha Equipe', 'Rotina da Equipe', 'Fechamento Diário', 'Meta da Loja', 'Universidade MX']
const IMPACTS = ['Redução de oportunidades', 'Clientes sem acompanhamento', 'Agenda abaixo do necessário', 'Maior organização do atendimento', 'Melhoria no resultado', 'Redução de erros', 'Melhoria no ambiente da equipe', 'Outro']
const fieldClass = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

function emptyDraft(initialDate: string, sellerId = ''): ManagerFeedbackDraft {
  return { sellerId, date: initialDate, type: '', competency: '', origin: ORIGINS[0], situation: '', impact: '', orientation: '', commitment: '', deadline: '', nextConversation: '', useAsPdiEvidence: false, sendToSeller: true }
}

export function ManagerFeedbackModal({ open, saving, sellers, initialDate, preselectedSeller = '', onClose, onSubmit }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState(() => emptyDraft(initialDate, preselectedSeller))
  const [impactCustom, setImpactCustom] = useState('')
  const [validation, setValidation] = useState('')
  useFocusTrap(dialogRef, open)

  useEffect(() => {
    if (!open) return
    setDraft(emptyDraft(initialDate, preselectedSeller))
    setImpactCustom('')
    setValidation('')
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [initialDate, onClose, open, preselectedSeller])

  if (!open) return null
  const set = <K extends keyof ManagerFeedbackDraft>(key: K, value: ManagerFeedbackDraft[K]) => setDraft(current => ({ ...current, [key]: value }))
  const submit = () => {
    if (!draft.sellerId || !draft.type) {
      setValidation('Selecione o vendedor e o tipo do feedback para salvar.')
      return
    }
    onSubmit({ ...draft, impact: draft.impact === 'Outro' ? impactCustom.trim() : draft.impact })
  }

  return <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/30 p-0 backdrop-blur-[1px] sm:items-center sm:p-6" role="presentation">
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="manager-feedback-title" className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
        <h2 id="manager-feedback-title" className="text-lg font-semibold text-gray-800">Novo Feedback</h2>
        <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-lg p-1 text-gray-400 hover:bg-gray-50 hover:text-gray-700"><X size={18} /></button>
      </header>
      <div className="overflow-y-auto px-6 py-5">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Identificação</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-xs font-medium text-gray-600">Vendedor *<select aria-label="Vendedor" value={draft.sellerId} onChange={event => set('sellerId', event.target.value)} className={`mt-1 ${fieldClass}`}><option value="">Selecione...</option>{sellers.map(seller => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></label>
            <label className="text-xs font-medium text-gray-600">Data<div className="relative mt-1"><Calendar size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input aria-label="Data" type="date" value={draft.date} onChange={event => set('date', event.target.value)} className={`pl-9 ${fieldClass}`} /></div></label>
            <label className="text-xs font-medium text-gray-600">Tipo *<select aria-label="Tipo" value={draft.type} onChange={event => set('type', event.target.value as ManagerFeedbackDraft['type'])} className={`mt-1 ${fieldClass} ${!draft.type ? 'border-amber-300' : ''}`}><option value="">Selecione...</option><option value="positive">Positivo</option><option value="development">Desenvolvimento</option></select>{!draft.type ? <span className="mt-1 block text-caption text-amber-600">Escolha um tipo para salvar.</span> : null}</label>
            <label className="text-xs font-medium text-gray-600">Competência relacionada<select aria-label="Competência relacionada" value={draft.competency} onChange={event => set('competency', event.target.value)} className={`mt-1 ${fieldClass}`}><option value="">Selecione...</option>{COMPETENCIES.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="text-xs font-medium text-gray-600 md:col-span-2">Origem do feedback<select aria-label="Origem do feedback" value={draft.origin} onChange={event => set('origin', event.target.value)} className={`mt-1 ${fieldClass}`}>{ORIGINS.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
        </section>
        <section className="mt-6 space-y-2"><h3 className="text-sm font-semibold text-gray-700">Situação observada</h3><p className="text-xs text-gray-500">O que foi observado?</p><textarea aria-label="Situação observada" value={draft.situation} onChange={event => set('situation', event.target.value)} placeholder="Descreva a situação observada..." rows={2} className={fieldClass} /></section>
        <section className="mt-6 space-y-3"><h3 className="text-sm font-semibold text-gray-700">Impacto e orientação</h3><div><p className="mb-1.5 text-xs text-gray-500">Qual foi o impacto?</p><div className="flex flex-wrap gap-1.5">{IMPACTS.map(item => <button key={item} type="button" onClick={() => set('impact', item)} className={`rounded-lg border px-3 py-1.5 text-xs ${draft.impact === item ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{item}</button>)}</div>{draft.impact === 'Outro' ? <input aria-label="Outro impacto" value={impactCustom} onChange={event => setImpactCustom(event.target.value)} placeholder="Descreva o impacto..." className={`mt-2 ${fieldClass}`} /> : null}</div><label className="text-xs text-gray-500">Qual orientação foi dada?<textarea aria-label="Orientação" value={draft.orientation} onChange={event => set('orientation', event.target.value)} placeholder="Descreva a orientação..." rows={2} className={`mt-1 ${fieldClass}`} /></label></section>
        <section className="mt-6 space-y-3"><h3 className="text-sm font-semibold text-gray-700">Compromisso do vendedor</h3><p className="text-xs text-gray-500">O que o vendedor se comprometeu a fazer?</p><input aria-label="Compromisso" value={draft.commitment} onChange={event => set('commitment', event.target.value)} placeholder="Descreva o compromisso (opcional para reconhecimento)..." className={fieldClass} /><div className="grid grid-cols-1 gap-3 md:grid-cols-2"><label className="text-xs font-medium text-gray-600">Prazo<input aria-label="Prazo" type="date" value={draft.deadline} onChange={event => set('deadline', event.target.value)} className={`mt-1 ${fieldClass}`} /></label><label className="text-xs font-medium text-gray-600">Próxima conversa<input aria-label="Próxima conversa" type="date" value={draft.nextConversation} onChange={event => set('nextConversation', event.target.value)} className={`mt-1 ${fieldClass}`} /></label></div><label className="flex items-center gap-2 text-xs text-gray-600"><input aria-label="Usar este feedback como evidência no próximo PDI" type="checkbox" checked={draft.useAsPdiEvidence} onChange={event => set('useAsPdiEvidence', event.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />Usar este feedback como evidência no próximo PDI</label><label className="flex items-start gap-2 text-xs text-gray-600"><input aria-label="Enviar este feedback ao vendedor" type="checkbox" checked={draft.sendToSeller} onChange={event => set('sendToSeller', event.target.checked)} className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" /><span><span className="font-medium text-gray-700">Enviar este feedback ao vendedor</span><span className="block text-caption text-gray-500">Desmarque para manter esta observação somente na visão da liderança.</span></span></label></section>
        {validation ? <p role="alert" className="mt-4 text-xs text-amber-700">{validation}</p> : null}
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-2 border-t border-gray-100 bg-white px-6 py-4"><button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700">Cancelar</button><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60">{saving ? 'Salvando...' : 'Enviar Feedback'}</button></footer>
    </div>
  </div>
}
