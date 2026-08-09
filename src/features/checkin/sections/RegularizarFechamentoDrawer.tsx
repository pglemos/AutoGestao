import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, CalendarDays, Globe, Send, Store, Users, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useOportunidades } from '@/features/crm/hooks/useOportunidades'
import { useAgendamentos } from '@/features/crm/hooks/useAgendamentos'
import { deriveClientesListFromCrm, deriveRegularizacaoCrmMetrics, type RegularizacaoCrmMetrics } from '../lib/clientes-list-from-crm'
import { calcularDisciplina } from '../lib/disciplina'
import { CheckinCrmSection } from './CheckinCrmSection'

const BRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

export interface RegularizarFormValues {
  leads_cart: number
  leads_net: number
  visitas_porta: number
  visitas_cart: number
  visitas_net: number
  agd_cart: number
  agd_net: number
  vnd_porta: number
  vnd_cart: number
  vnd_net: number
}

export interface RegularizarCrmValues {
  agd_cart: number
  agd_net: number
  vnd_porta: number
  vnd_cart: number
  vnd_net: number
}

interface RegularizarFechamentoDrawerProps {
  date: string
  finalized: boolean
  formValues: RegularizarFormValues
  onFieldChange: (field: keyof Omit<RegularizarFormValues, 'vnd_porta' | 'vnd_cart' | 'vnd_net'>, value: number) => void
  saving: boolean
  onVoltar: () => void
  onClose: () => void
  onSubmit: (crmValues: RegularizarCrmValues) => void
}

/** Stepper numérico — mesmo padrão visual do StepperInput em FluxoFechamento.tsx. */
function NumStepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [inputVal, setInputVal] = useState<string | null>(null)

  const commit = () => {
    if (disabled) return
    const num = inputVal === '' || inputVal === null ? 0 : parseInt(inputVal, 10)
    onChange(Math.min(999, Math.max(0, Number.isNaN(num) ? 0 : num)))
    setInputVal(null)
  }

  return (
    <div className={`flex h-10 items-center rounded-xl border bg-white shadow-sm transition-all ${disabled ? 'border-slate-100 opacity-60' : 'border-slate-200 focus-within:border-blue-400'}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-full w-9 shrink-0 items-center justify-center rounded-l-xl border-r border-slate-200 text-[18px] font-light text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={inputVal !== null ? inputVal : String(value)}
        onFocus={(e) => { setInputVal(String(value)); setTimeout(() => e.target.select(), 0) }}
        onChange={(e) => setInputVal(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Tab') commit() }}
        className="h-full min-w-0 flex-1 border-none bg-transparent text-center text-[14px] font-bold tabular-nums text-slate-700 outline-none disabled:text-slate-600"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(Math.min(999, value + 1))}
        className="flex h-full w-9 shrink-0 items-center justify-center rounded-r-xl border-l border-slate-200 text-[18px] font-light text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  )
}

function FieldRow({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={`min-w-0 flex-1 text-[12px] font-semibold leading-tight ${disabled ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
      <div className="w-[108px] shrink-0">
        <NumStepper value={value} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  )
}

export function RegularizarFechamentoDrawer({
  date,
  finalized,
  formValues,
  onFieldChange,
  saving,
  onVoltar,
  onClose,
  onSubmit,
}: RegularizarFechamentoDrawerProps) {
  const { supabaseUser } = useAuth()
  const { oportunidades, refetch: refetchOportunidades } = useOportunidades()
  const { agendamentos, refetch: refetchAgendamentos } = useAgendamentos()

  const clientesList = useMemo(
    () => deriveClientesListFromCrm(oportunidades, agendamentos, date, { fechamentoPendente: !finalized }),
    [oportunidades, agendamentos, date, finalized],
  )
  const refetchClientesList = async () => { await Promise.all([refetchOportunidades(), refetchAgendamentos()]) }

  const totalLeads = formValues.leads_cart + formValues.leads_net
  const totalAtendimentos = formValues.visitas_porta + formValues.visitas_cart + formValues.visitas_net
  const crmMetrics: RegularizacaoCrmMetrics = useMemo(
    () => deriveRegularizacaoCrmMetrics(oportunidades, agendamentos, date, { fechamentoPendente: !finalized }),
    [oportunidades, agendamentos, date, finalized],
  )
  const effectiveAgendamentosD1 = {
    carteira: Math.max(formValues.agd_cart, crmMetrics.agendamentosD1.carteira),
    internet: Math.max(formValues.agd_net, crmMetrics.agendamentosD1.internet),
  }
  const effectiveSales = {
    porta: Math.max(formValues.vnd_porta, crmMetrics.vendas.porta),
    carteira: Math.max(formValues.vnd_cart, crmMetrics.vendas.carteira),
    internet: Math.max(formValues.vnd_net, crmMetrics.vendas.internet),
  }
  const totalAgendamentosD1 = effectiveAgendamentosD1.carteira + effectiveAgendamentosD1.internet
  const totalVendas = effectiveSales.porta + effectiveSales.carteira + effectiveSales.internet
  const totalFaturamento = clientesList
    .filter((c) => c.vendaRealizada === 'Sim')
    .reduce((acc, c) => acc + (c.valorNegociado || 0), 0)

  const creditosValidos = Math.min(crmMetrics.creditosValidos, totalAgendamentosD1)
  const disciplina = calcularDisciplina({ totalAgendamentosD1, creditosValidos, finalizadoAposPrazo: true })

  const dataObj = new Date(`${date}T12:00:00`)
  const dataFormatada = dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const weekday = dataObj.toLocaleDateString('pt-BR', { weekday: 'long' })

  const ringColor = disciplina.pontuacaoDisciplinaFinal >= 80 ? '#22C55E' : disciplina.pontuacaoDisciplinaFinal >= 50 ? '#F59E0B' : '#EF4444'
  const ringColorClass = disciplina.pontuacaoDisciplinaFinal >= 80 ? 'text-[#22C55E]' : disciplina.pontuacaoDisciplinaFinal >= 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'

  const crmCtx = {
    clientesList,
    refetchClientesList,
    selectedDate: date,
    supabaseUser,
    finalizadoAposPrazo: false,
    effectiveForm: {
      leads: totalLeads,
      leads_cart: formValues.leads_cart,
      leads_net: formValues.leads_net,
      agd_cart_prev: 0,
      agd_net_prev: 0,
      agd_cart: effectiveAgendamentosD1.carteira,
      agd_net: effectiveAgendamentosD1.internet,
      vnd_porta: effectiveSales.porta,
      vnd_cart: effectiveSales.carteira,
      vnd_net: effectiveSales.internet,
      visitas: totalAtendimentos,
      visitas_porta: formValues.visitas_porta,
      visitas_cart: formValues.visitas_cart,
      visitas_net: formValues.visitas_net,
      note: '',
      zero_reason: '',
    },
  }

  return (
    <div className="fixed inset-0 z-[140] grid place-items-center p-4">
      <button
        type="button"
        aria-label="Fechar regularização"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative z-10 flex w-full max-w-4xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-[#F8FAFC] shadow-2xl">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-5 py-4">
            <CalendarDays className="h-5 w-5 shrink-0 text-[#005BFF]" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-bold text-[#0F172A]">Regularizar Fechamento</h2>
                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-caption font-bold text-red-600">Fechamento atrasado</span>
              </div>
              <p className="mt-0.5 text-body-sm text-slate-500">
                {dataFormatada} — <span className="capitalize">{weekday}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-600 transition-colors hover:bg-slate-100" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
 <div className="min-w-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
            {!finalized && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-body-sm font-bold text-amber-800">
                  Preencha os dados e solicite a aprovação do gerente. Nenhum lançamento será aplicado antes da aprovação.
                </p>
              </div>
            )}

            {/* Movimento do Dia */}
 <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[14px] font-bold uppercase tracking-wide text-[#0F172A]">Movimento do Dia</h3>
                <p className="mt-0.5 text-[12px] text-slate-600">Informe os atendimentos realizados neste dia</p>
              </div>
              <div className="space-y-4 p-5">
                <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500"><Store className="h-4 w-4 text-white" /></div>
                    <span className="text-body-sm font-bold uppercase tracking-wide text-orange-700">Showroom</span>
                  </div>
                  <FieldRow label="Atendimentos" value={formValues.visitas_porta} onChange={(v) => onFieldChange('visitas_porta', v)} disabled={false} />
                </div>

                <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500"><Users className="h-4 w-4 text-white" /></div>
                    <span className="text-body-sm font-bold uppercase tracking-wide text-green-700">Carteira</span>
                  </div>
                  <FieldRow label="Leads recebidos" value={formValues.leads_cart} onChange={(v) => onFieldChange('leads_cart', v)} disabled={false} />
                  <FieldRow label="Atendimentos" value={formValues.visitas_cart} onChange={(v) => onFieldChange('visitas_cart', v)} disabled={false} />
                  <FieldRow label="Agendamentos D+1" value={formValues.agd_cart} onChange={(v) => onFieldChange('agd_cart', v)} disabled={false} />
                </div>

                <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600"><Globe className="h-4 w-4 text-white" /></div>
                    <span className="text-body-sm font-bold uppercase tracking-wide text-blue-700">Internet</span>
                  </div>
                  <FieldRow label="Leads recebidos" value={formValues.leads_net} onChange={(v) => onFieldChange('leads_net', v)} disabled={false} />
                  <FieldRow label="Atendimentos" value={formValues.visitas_net} onChange={(v) => onFieldChange('visitas_net', v)} disabled={false} />
                  <FieldRow label="Agendamentos D+1" value={formValues.agd_net} onChange={(v) => onFieldChange('agd_net', v)} disabled={false} />
                </div>

              </div>
            </div>

            {/* Cadastrar Venda/Agendamentos — reaproveita o mesmo CRUD real da tela principal,
                apontando para a data que está sendo regularizada. */}
            <CheckinCrmSection ctx={crmCtx} />

            {/* Resumo do Dia */}
 <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[14px] font-bold uppercase tracking-wide text-[#0F172A]">Resumo do Dia</h3>
              </div>
              <div className="grid grid-cols-2 divide-y divide-slate-100 sm:grid-cols-5 sm:divide-x sm:divide-y-0">
                {[
                  { label: 'Leads', value: totalLeads, color: 'text-blue-600' },
                  { label: 'Atendimentos', value: totalAtendimentos, color: 'text-purple-600' },
                  { label: 'Agendamentos D+1', value: totalAgendamentosD1, color: 'text-amber-600' },
                  { label: 'Vendas', value: totalVendas, color: 'text-green-600' },
                  { label: 'Faturamento', value: totalFaturamento > 0 ? BRL(totalFaturamento) : '—', color: 'text-green-700' },
                ].map((s) => (
                  <div key={s.label} className="p-4 text-center">
                    <p className={`text-[20px] font-bold tabular-nums ${s.color}`}>{s.value}</p>
                    <p className="mt-0.5 text-caption font-medium text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disciplina */}
 <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-[14px] font-bold uppercase tracking-wide text-[#0F172A]">Disciplina — Fechamento Diário</h3>
                <p className="mt-0.5 text-[12px] text-slate-600">Estimativa com penalização de -10% por atraso</p>
              </div>
              <div className="flex items-center gap-6 p-5">
                <div className="relative h-20 w-20 shrink-0">
                  <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#E5E7EB" strokeWidth="8" />
                    <circle
                      cx="40" cy="40" r="32" fill="none" stroke={ringColor} strokeWidth="8"
                      strokeDasharray={`${(Math.PI * 64 * disciplina.pontuacaoDisciplinaFinal) / 100} ${Math.PI * 64}`}
                      strokeLinecap="round" className="transition-all duration-700"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-[18px] font-bold tabular-nums ${ringColorClass}`}>
                    {disciplina.pontuacaoDisciplinaFinal}%
                  </span>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-body-sm">
                    <span className="text-slate-500">Pontuação base</span>
                    <span className="font-bold text-[#0F172A]">{disciplina.pontuacaoDisciplinaBase}%</span>
                  </div>
                  <div className="flex justify-between text-body-sm">
                    <span className="font-medium text-red-500">Penalização por atraso</span>
                    <span className="font-bold text-red-500">-10%</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-100 pt-2 text-body-sm">
                    <span className="font-bold text-[#0F172A]">Estimativa após aprovação</span>
                    <span className={`text-body font-bold ${ringColorClass}`}>{disciplina.pontuacaoDisciplinaFinal}%</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-600">Agendamentos D+1</span>
                    <span className="font-semibold text-slate-600">{creditosValidos} de {totalAgendamentosD1} detalhados</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">
            <button type="button" onClick={onVoltar} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-body-sm font-bold text-slate-600 transition-colors hover:bg-slate-50">
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => onSubmit({
                agd_cart: effectiveAgendamentosD1.carteira,
                agd_net: effectiveAgendamentosD1.internet,
                vnd_porta: effectiveSales.porta,
                vnd_cart: effectiveSales.carteira,
                vnd_net: effectiveSales.internet,
              })}
 className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#005BFF] px-5 py-2.5 text-center text-body-sm font-bold leading-snug text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
            >
              <Send className="h-4 w-4" /> {saving ? 'Enviando...' : 'Solicitar aprovação do gerente'}
            </button>
          </div>
      </div>
    </div>
  )
}

export default RegularizarFechamentoDrawer
