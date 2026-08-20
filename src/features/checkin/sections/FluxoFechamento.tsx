import { Fragment, useMemo, useState } from 'react'
import { CheckCircle2, ChevronRight, Globe, ShoppingCart, Store, Users } from 'lucide-react'
import type { NumericCheckinField } from '../hooks/useCheckinPage'
import { chartTokens } from "@/lib/charts/tokens"

/**
 * Wizard de 4 etapas (Showroom → Carteira → Internet → Vendas + D+1) com barra de
 * progresso e confirmação por etapa. Porta do Base44 (components/fechamento/
 * FluxoFechamento.jsx) para o schema real: atendimentos_showroom→visitas_porta,
 * leads_carteira→leads_cart, atendimentos_carteira→visitas_cart,
 * agendamentos_carteira→agd_cart, leads_internet→leads_net,
 * atendimentos_internet→visitas_net, agendamentos_internet→agd_net.
 */

export type StepId = 'showroom' | 'carteira' | 'internet' | 'vendas'

const STEPS: Array<{ id: StepId; label: string; pct: number; icon: typeof Store; color: 'orange' | 'green' | 'blue' | 'purple' }> = [
  { id: 'showroom', label: 'Showroom', pct: 20, icon: Store, color: 'orange' },
  { id: 'carteira', label: 'Carteira', pct: 20, icon: Users, color: 'green' },
  { id: 'internet', label: 'Internet', pct: 30, icon: Globe, color: 'blue' },
  { id: 'vendas', label: 'Vendas + D+1', pct: 30, icon: ShoppingCart, color: 'purple' },
]

const COLOR_MAP = {
  orange: {
    bg: 'bg-status-warning-surface', border: 'border-status-warning/30', iconBg: 'bg-status-warning', iconShadow: 'shadow-orange-200',
    title: 'text-status-warning-text', sub: 'text-status-warning-text', btn: 'bg-status-warning hover:bg-status-warning', btnText: 'text-status-warning-foreground',
    stepActive: 'bg-status-warning text-status-warning-foreground', stepDone: 'bg-status-warning text-status-warning-foreground', divider: 'border-status-warning/20', note: 'text-status-warning-text', progress: 'bg-status-warning',
  },
  green: {
    bg: 'bg-brand-primary-subtle', border: 'border-brand-primary/30', iconBg: 'bg-brand-primary', iconShadow: 'shadow-green-200',
    title: 'text-brand-primary-hover', sub: 'text-brand-primary/60', btn: 'bg-brand-primary hover:bg-brand-primary-hover', btnText: 'text-white',
    stepActive: 'bg-brand-primary text-white', stepDone: 'bg-brand-primary text-white', divider: 'border-brand-primary/20', note: 'text-brand-primary', progress: 'bg-brand-primary',
  },
  blue: {
    bg: 'bg-status-info-surface', border: 'border-status-info/30', iconBg: 'bg-status-info', iconShadow: 'shadow-blue-200',
    title: 'text-status-info-text', sub: 'text-blue-400', btn: 'bg-status-info hover:bg-status-info', btnText: 'text-white',
    stepActive: 'bg-status-info text-white', stepDone: 'bg-status-info text-white', divider: 'border-status-info/20', note: 'text-status-info', progress: 'bg-status-info',
  },
  purple: {
    bg: 'bg-status-info-surface', border: 'border-status-info/30', iconBg: 'bg-status-info', iconShadow: 'shadow-[var(--mx-shadow-sm)]',
    title: 'text-status-info-text', sub: 'text-status-info-text', btn: 'bg-status-info hover:bg-status-info', btnText: 'text-white',
    stepActive: 'bg-status-info text-white', stepDone: 'bg-status-info text-white', divider: 'border-status-info/20', note: 'text-status-info-text', progress: 'bg-status-info',
  },
} as const

const SEGMENT_COLORS: Record<StepId, string> = {
  showroom: chartTokens.warning(), carteira: chartTokens.success(), internet: chartTokens.info(), vendas: chartTokens.series.s4(),
}

/**
 * Cores de TEXTO/ícone por segmento — tokens semânticos escurecidos (AA) do
 * primitives.css. A barra (SEGMENT_COLORS) mantém a semântica visual; só o
 * texto/ícone do label troca para o token apropriado. `vendas` (roxo) mapeia
 * para info-text, como o COLOR_MAP já faz.
 */
const SEGMENT_TEXT_COLORS: Record<StepId, string> = {
  showroom: 'hsl(var(--mx-status-warning-text))',
  carteira: 'hsl(var(--mx-status-success-text))',
  internet: 'hsl(var(--mx-status-info-text))',
  vendas: 'hsl(var(--mx-status-info-text))',
}

/** Mesmo clamp do setCounter original do Base44: Math.min(999, Math.max(0, newVal)). */
function clampCounter(value: number): number {
  return Math.min(999, Math.max(0, value))
}

function StepperInput({ label, value, onDecrement, onIncrement, onSet, disabled }: { label: string; value: number; onDecrement: () => void; onIncrement: () => void; onSet: (v: number) => void; disabled?: boolean }) {
  const [inputVal, setInputVal] = useState<string | null>(null)

  const commit = () => {
    if (disabled) return
    const num = inputVal === '' || inputVal === null ? 0 : parseInt(inputVal, 10)
    onSet(Math.min(999, Math.max(0, Number.isNaN(num) ? 0 : num)))
    setInputVal(null)
  }

  if (disabled) {
    return (
      <div className="flex h-11 cursor-not-allowed items-center rounded-xl border border-border-subtle bg-surface-alt opacity-60">
        <div className="flex h-full w-11 items-center justify-center border-r border-border-subtle text-[20px] font-light text-text-disabled">−</div>
        <span className="flex-1 text-center text-[16px] font-bold tabular-nums text-muted-foreground">{value}</span>
        <div className="flex h-full w-11 items-center justify-center border-l border-border-subtle text-[20px] font-light text-text-disabled">+</div>
      </div>
    )
  }

  return (
    <div className="flex h-11 items-center rounded-xl border border-border bg-white shadow-sm transition-all focus-within:border-status-info/50 focus-within:shadow-mx-focus-info">
      <button
        type="button"
        onClick={() => {
          setInputVal(null)
          onDecrement()
        }}
        className="flex h-full w-11 shrink-0 items-center justify-center rounded-l-xl border-r border-border text-[20px] font-light text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground active:bg-muted"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={inputVal !== null ? inputVal : String(value)}
        onFocus={event => { setInputVal(String(value)); setTimeout(() => event.target.select(), 0) }}
        onChange={event => {
          const digits = event.target.value.replace(/\D/g, '')
          setInputVal(digits)
          // Propaga já durante a digitação: o autosave só enxerga o que chega
          // ao formulário, e esperar o blur significava perder o número de
          // quem digita e fecha a aba. O campo vazio continua sendo estado
          // local até o blur, para não virar 0 a cada backspace.
          if (digits !== '' && !disabled) {
            const parsed = parseInt(digits, 10)
            if (!Number.isNaN(parsed)) onSet(Math.min(999, Math.max(0, parsed)))
          }
        }}
        onBlur={commit}
        onKeyDown={event => { if (event.key === 'Enter' || event.key === 'Tab') commit() }}
        // O rótulo existe visualmente no <span> do FieldRow, mas nada o
        // associava a este campo: um leitor de tela anunciava só "editar texto".
        aria-label={label}
        className="h-full min-w-0 flex-1 border-none bg-transparent text-center text-[16px] font-bold tabular-nums text-foreground outline-none"
      />
      <button
        type="button"
        onClick={() => {
          setInputVal(null)
          onIncrement()
        }}
        className="flex h-full w-11 shrink-0 items-center justify-center rounded-r-xl border-l border-border text-[20px] font-light text-muted-foreground transition-colors hover:bg-surface-alt hover:text-foreground active:bg-muted"
      >
        +
      </button>
    </div>
  )
}

function FieldRow({ label, value, onDecrement, onIncrement, onSet, disabled }: { label: string; value: number; onDecrement: () => void; onIncrement: () => void; onSet: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`min-w-0 flex-1 text-body-sm font-semibold leading-tight ${disabled ? 'text-text-disabled' : 'text-muted-foreground'}`}>{label}</span>
      <div className="w-[140px] shrink-0">
        <StepperInput label={label} value={value} onDecrement={onDecrement} onIncrement={onIncrement} onSet={onSet} disabled={disabled} />
      </div>
    </div>
  )
}

function BackButton({ onGoBack }: { onGoBack?: () => void }) {
  if (!onGoBack) return null
  return (
    <button type="button" onClick={onGoBack} className="-mt-1 mb-1 flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground sm:hidden">
      <ChevronRight className="h-3.5 w-3.5 rotate-180" />
      Voltar
    </button>
  )
}

function StepperHeader({ currentStep, completedSteps, onStepClick }: { currentStep: StepId; completedSteps: Set<StepId>; onStepClick: (id: StepId) => void }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const done = completedSteps.has(step.id)
        const active = currentStep === step.id
        const c = COLOR_MAP[step.color]
        const Icon = step.icon
        return (
          <Fragment key={step.id}>
            <button type="button" onClick={() => onStepClick(step.id)} className="flex min-w-0 flex-1 flex-col items-center gap-1 transition-all">
              <div className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all ${done ? c.stepDone : active ? c.stepActive : 'bg-muted text-muted-foreground'}`}>
                {done ? <CheckCircle2 className="h-4 w-4 text-white" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className={`text-center text-caption font-bold leading-tight ${done || active ? c.title : 'text-muted-foreground'}`}>{step.label}</span>
              {/* 10px e slate-500: em 8px com slate-300 o percentual ficava
                  abaixo do contraste AA e perto do limite legível (§12 pede
                  evitar texto excessivamente pequeno). */}
              <span className={`text-caption font-semibold ${done || active ? c.note : 'text-muted-foreground'}`}>{step.pct}%</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 max-w-[24px] flex-1 rounded-full transition-all ${completedSteps.has(step.id) ? COLOR_MAP[STEPS[idx + 1].color].progress : 'bg-muted'}`} />
            )}
          </Fragment>
        )
      })}
    </div>
  )
}

function ProgressBarMobile({ completedSteps }: { completedSteps: Set<StepId> }) {
  return (
    <div className="space-y-1.5">
      <div className="flex h-2.5 gap-px overflow-hidden rounded-full bg-muted">
        {STEPS.map(step => (
          <div key={step.id} className="rounded-full transition-all duration-500" style={{ flex: step.pct, background: completedSteps.has(step.id) ? SEGMENT_COLORS[step.id] : 'transparent' }} />
        ))}
      </div>
      <div className="flex">
        {STEPS.map(step => {
          const done = completedSteps.has(step.id)
          return (
            <div key={step.id} className="flex items-center justify-center gap-0.5" style={{ flex: step.pct }}>
              {done && (
                <>
                  <CheckCircle2 className="h-2.5 w-2.5 shrink-0" style={{ color: SEGMENT_TEXT_COLORS[step.id] }} />
                  <span className="truncate text-caption font-bold" style={{ color: SEGMENT_TEXT_COLORS[step.id] }}>{step.label}</span>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface FluxoFechamentoProps {
  readValue: (field: NumericCheckinField) => number
  updateField: (field: NumericCheckinField, value: number) => void
  disabled: boolean
  finalized?: boolean
  agdCartAtivos: number
  agdNetAtivos: number
  temClientesCadastrados: boolean
  /**
   * Confirmar uma etapa é o momento em que o vendedor considera aquele bloco
   * pronto. Antes, o clique só navegava; agora força a gravação do rascunho
   * para que o dado exista no servidor mesmo se a sessão morrer em seguida.
   */
  onStepConfirmed?: (step: StepId) => void
  /**
   * Etapa atual controlada pelo pai.
   *
   * Precisa viver fora deste componente porque a gravação do rascunho dispara
   * refetch, e o container troca o formulário por um skeleton enquanto carrega
   * — o que remonta este componente. Com a etapa em estado local, confirmar
   * Showroom salvava e voltava para Showroom: o vendedor clicava e a tela não
   * andava. Sem as props, o componente segue funcionando sozinho.
   */
  currentStep?: StepId
  onStepChange?: (step: StepId) => void
}

export function FluxoFechamento({ readValue, updateField, disabled, finalized = false, agdCartAtivos, agdNetAtivos, temClientesCadastrados, onStepConfirmed, currentStep: controlledStep, onStepChange }: FluxoFechamentoProps) {
  const [internalStep, setInternalStep] = useState<StepId>('showroom')
  const currentStep = controlledStep ?? internalStep
  const setCurrentStep = (step: StepId) => {
    setInternalStep(step)
    onStepChange?.(step)
  }

  const visitasPorta = readValue('visitas_porta')
  const leadsCart = readValue('leads_cart')
  const visitasCart = readValue('visitas_cart')
  const agdCart = readValue('agd_cart')
  const leadsNet = readValue('leads_net')
  const visitasNet = readValue('visitas_net')
  const agdNet = readValue('agd_net')

  const completedSteps = useMemo(() => {
    if (finalized) return new Set(STEPS.map(step => step.id))
    const done = new Set<StepId>()
    if (visitasPorta > 0) done.add('showroom')
    if (leadsCart + visitasCart + agdCart > 0) done.add('carteira')
    if (leadsNet + visitasNet + agdNet > 0) done.add('internet')
    if (temClientesCadastrados) done.add('vendas')
    return done
  }, [finalized, visitasPorta, leadsCart, visitasCart, agdCart, leadsNet, visitasNet, agdNet, temClientesCadastrados])

  const handleConfirm = (stepId: StepId) => {
    onStepConfirmed?.(stepId)
    const nextMap: Record<StepId, StepId> = { showroom: 'carteira', carteira: 'internet', internet: 'vendas', vendas: 'vendas' }
    setCurrentStep(nextMap[stepId])
  }

  const handleGoBack = (stepId: StepId) => {
    const prevMap: Partial<Record<StepId, StepId>> = { carteira: 'showroom', internet: 'carteira', vendas: 'internet' }
    const prev = prevMap[stepId]
    if (prev) setCurrentStep(prev)
  }

  const totalPct = STEPS.reduce((acc, s) => (completedSteps.has(s.id) ? acc + s.pct : acc), 0)
  const progressColor = totalPct === 100 ? 'bg-brand-primary' : totalPct >= 70 ? 'bg-status-info' : totalPct >= 40 ? 'bg-orange-400' : 'bg-muted'

  const co = COLOR_MAP.orange
  const cg = COLOR_MAP.green
  const cb = COLOR_MAP.blue
  const cp = COLOR_MAP.purple

  const totalAgend = agdCart + agdNet
  let vendasMsg = 'Cadastre suas vendas e, quando todos os registros estiverem feitos, finalize o fechamento.'
  if (totalAgend > 0) {
    const partes: string[] = []
    if (agdCart > 0) partes.push(`${agdCart} de carteira`)
    if (agdNet > 0) partes.push(`${agdNet} de internet`)
    vendasMsg = `Cadastre suas vendas e seus ${totalAgend} agendamento${totalAgend > 1 ? 's' : ''}, sendo ${partes.join(' e ')} para ganhar pontos. A seguir, finalize o fechamento.`
  }
  if (finalized) {
    vendasMsg = 'Fechamento concluído. Envio realizado com sucesso — as informações foram enviadas para sua liderança.'
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="sm:hidden">
        <ProgressBarMobile completedSteps={completedSteps} />
      </div>

      <div className="hidden rounded-2xl border border-border bg-white p-4 shadow-sm sm:block sm:p-5">
        <div className="mb-1 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-3">
            <h2 className="text-body-sm font-bold uppercase tracking-wide text-mx-navy sm:text-[14px]">Progresso do Fechamento</h2>
            <p className="mt-0.5 text-caption leading-tight text-muted-foreground sm:text-caption">Acompanhe o preenchimento. Não é sua pontuação de disciplina.</p>
          </div>
          <span className={`shrink-0 text-h3 font-bold tabular-nums sm:text-h2 ${totalPct === 100 ? 'text-status-success-text' : 'text-mx-navy'}`}>{totalPct}%</span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${totalPct}%` }} />
        </div>
        <div className="mt-4">
          <StepperHeader currentStep={currentStep} completedSteps={completedSteps} onStepClick={setCurrentStep} />
        </div>
      </div>

      {currentStep === 'showroom' && (
        <div className={`space-y-4 rounded-2xl border ${co.border} ${co.bg} p-4 sm:space-y-5 sm:p-5`}>
          <BackButton />
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${co.iconBg} shadow-md ${co.iconShadow}`}>
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-[14px] font-bold uppercase leading-none tracking-wider ${co.title}`}>1. Showroom</p>
              <p className={`mt-0.5 text-caption font-medium ${co.sub}`}>Atendimento presencial</p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">Informe os atendimentos presenciais realizados no dia.</p>
          <div className={`space-y-4 border-t ${co.divider} pt-4`}>
            <FieldRow
              label="Atendimentos realizados"
              value={visitasPorta}
              onDecrement={() => updateField('visitas_porta', clampCounter(visitasPorta - 1))}
              onIncrement={() => updateField('visitas_porta', clampCounter(visitasPorta + 1))}
              onSet={v => updateField('visitas_porta', clampCounter(v))}
              disabled={disabled}
            />
          </div>
          {!disabled && (
            <button type="button" onClick={() => handleConfirm('showroom')} className={`w-full rounded-xl py-3.5 text-[14px] font-bold shadow-sm transition-colors active:scale-95 ${co.btn} ${co.btnText}`}>
              Confirmar Showroom ✓
            </button>
          )}
          <p className={`text-caption ${co.note}`}>Vendas e Agendamentos D+1 devem ser registrados em Novo Registro.</p>
        </div>
      )}

      {currentStep === 'carteira' && (
        <div className={`space-y-4 rounded-2xl border ${cg.border} ${cg.bg} p-4 sm:space-y-5 sm:p-5`}>
          <BackButton onGoBack={() => handleGoBack('carteira')} />
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cg.iconBg} shadow-md ${cg.iconShadow}`}>
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-[14px] font-bold uppercase leading-none tracking-wider ${cg.title}`}>2. Carteira</p>
              <p className={`mt-0.5 text-caption font-medium ${cg.sub}`}>Relacionamento e prospecção</p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">Informe os contatos, atendimentos e agendamentos gerados pela sua carteira.</p>
          <div className={`space-y-4 border-t ${cg.divider} pt-4`}>
            <FieldRow label="Leads recebidos" value={leadsCart} onDecrement={() => updateField('leads_cart', clampCounter(leadsCart - 1))} onIncrement={() => updateField('leads_cart', clampCounter(leadsCart + 1))} onSet={v => updateField('leads_cart', clampCounter(v))} disabled={disabled} />
            <FieldRow label="Atendimentos realizados" value={visitasCart} onDecrement={() => updateField('visitas_cart', clampCounter(visitasCart - 1))} onIncrement={() => updateField('visitas_cart', clampCounter(visitasCart + 1))} onSet={v => updateField('visitas_cart', clampCounter(v))} disabled={disabled} />
            {!disabled ? (
              <FieldRow label="Agendamentos D+1" value={agdCart} onDecrement={() => updateField('agd_cart', clampCounter(agdCart - 1))} onIncrement={() => updateField('agd_cart', clampCounter(agdCart + 1))} onSet={v => updateField('agd_cart', clampCounter(v))} disabled={false} />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="flex-1 text-body-sm font-semibold text-muted-foreground">Agendamentos D+1 ativos</span>
                <span className={`text-h3 font-bold tabular-nums ${cg.title}`}>{agdCartAtivos}</span>
              </div>
            )}
            {disabled && (
              <p className={`text-caption ${cg.note}`}>Planejados: <strong>{agdCart}</strong> · Detalhados: <strong>{agdCartAtivos}</strong></p>
            )}
          </div>
          {!disabled && (
            <button type="button" onClick={() => handleConfirm('carteira')} className={`w-full rounded-xl py-3.5 text-[14px] font-bold shadow-sm transition-colors active:scale-95 ${cg.btn} ${cg.btnText}`}>
              Confirmar Carteira ✓
            </button>
          )}
        </div>
      )}

      {currentStep === 'internet' && (
        <div className={`space-y-4 rounded-2xl border ${cb.border} ${cb.bg} p-4 sm:space-y-5 sm:p-5`}>
          <BackButton onGoBack={() => handleGoBack('internet')} />
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cb.iconBg} shadow-md ${cb.iconShadow}`}>
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className={`text-[14px] font-bold uppercase leading-none tracking-wider ${cb.title}`}>3. Internet</p>
              <p className={`mt-0.5 text-caption font-medium ${cb.sub}`}>Leads digitais</p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">Informe os leads digitais recebidos e o andamento dos atendimentos.</p>
          <div className={`space-y-4 border-t ${cb.divider} pt-4`}>
            <FieldRow label="Leads recebidos" value={leadsNet} onDecrement={() => updateField('leads_net', clampCounter(leadsNet - 1))} onIncrement={() => updateField('leads_net', clampCounter(leadsNet + 1))} onSet={v => updateField('leads_net', clampCounter(v))} disabled={disabled} />
            <FieldRow label="Atendimentos realizados" value={visitasNet} onDecrement={() => updateField('visitas_net', clampCounter(visitasNet - 1))} onIncrement={() => updateField('visitas_net', clampCounter(visitasNet + 1))} onSet={v => updateField('visitas_net', clampCounter(v))} disabled={disabled} />
            {!disabled ? (
              <FieldRow label="Agendamentos D+1" value={agdNet} onDecrement={() => updateField('agd_net', clampCounter(agdNet - 1))} onIncrement={() => updateField('agd_net', clampCounter(agdNet + 1))} onSet={v => updateField('agd_net', clampCounter(v))} disabled={false} />
            ) : (
              <div className="flex items-center justify-between gap-3">
                <span className="flex-1 text-body-sm font-semibold text-muted-foreground">Agendamentos D+1 ativos</span>
                <span className={`text-h3 font-bold tabular-nums ${cb.title}`}>{agdNetAtivos}</span>
              </div>
            )}
            {disabled && (
              <p className={`text-caption ${cb.note}`}>Planejados: <strong>{agdNet}</strong> · Detalhados: <strong>{agdNetAtivos}</strong></p>
            )}
          </div>
          {!disabled && (
            <button type="button" onClick={() => handleConfirm('internet')} className={`w-full rounded-xl py-3.5 text-[14px] font-bold shadow-sm transition-colors active:scale-95 ${cb.btn} ${cb.btnText}`}>
              Confirmar Internet ✓
            </button>
          )}
        </div>
      )}

      {currentStep === 'vendas' && (
        <div className={`space-y-4 rounded-2xl border ${cp.border} ${cp.bg} p-4 sm:p-5`}>
          <BackButton onGoBack={() => handleGoBack('vendas')} />
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cp.iconBg} shadow-md ${cp.iconShadow}`}>
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <p className={`text-[14px] font-bold uppercase leading-none tracking-wider ${cp.title}`}>4. Vendas e Agendamentos</p>
              <p className={`mt-0.5 text-caption font-medium ${cp.sub}`}>Registros de vendas e agendamentos D+1</p>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground">{vendasMsg}</p>
        </div>
      )}
    </div>
  )
}

export default FluxoFechamento
