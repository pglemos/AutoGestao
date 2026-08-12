import React, { useState, useEffect } from "react";
import { Store, Users, Globe, ShoppingCart, CheckCircle2, ChevronRight, Lock } from "lucide-react";
import moment from "moment";

// ── Stepper Input (same logic as MovimentoDia) ────────────────────────────────

function StepperInput({ value, onDecrement, onIncrement, onSet, disabled }) {
  const [inputVal, setInputVal] = useState(null);

  const handleFocus = (e) => {
    if (disabled) return;
    setInputVal(String(value));
    setTimeout(() => e.target.select(), 0);
  };

  const handleChange = (e) => {
    if (disabled) return;
    const raw = e.target.value.replace(/\D/g, "");
    setInputVal(raw);
  };

  const commit = () => {
    if (disabled) return;
    const num = inputVal === "" || inputVal === null ? 0 : parseInt(inputVal, 10);
    onSet(Math.min(999, Math.max(0, isNaN(num) ? 0 : num)));
    setInputVal(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "Tab") commit();
  };

  if (disabled) {
    return (
      <div className="flex items-center border border-slate-100 rounded-xl h-11 bg-slate-50 opacity-60 cursor-not-allowed">
        <div className="w-11 h-full flex items-center justify-center text-text-disabled border-r border-slate-100 text-[20px] font-light">−</div>
        <span className="flex-1 text-center font-bold text-[16px] text-muted-foreground tabular-nums">{value}</span>
        <div className="w-11 h-full flex items-center justify-center text-text-disabled border-l border-slate-100 text-[20px] font-light">+</div>
      </div>
    );
  }

  return (
    <div className="flex items-center border border-slate-200 rounded-xl shadow-sm h-11 focus-within:border-blue-400 focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.12)] transition-all bg-white">
      <button
        onClick={onDecrement}
        className="w-11 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 active:bg-slate-100 border-r border-slate-200 rounded-l-xl transition-colors text-[20px] font-light flex-shrink-0"
      >−</button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={inputVal !== null ? inputVal : String(value)}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onWheel={e => e.target.blur()}
        className="flex-1 min-w-0 text-center font-bold text-[16px] text-foreground bg-transparent border-none outline-none h-full tabular-nums"
        style={{ boxShadow: "none" }}
      />
      <button
        onClick={onIncrement}
        className="w-11 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 active:bg-slate-100 border-l border-slate-200 rounded-r-xl transition-colors text-[20px] font-light flex-shrink-0"
      >+</button>
    </div>
  );
}

function FieldRow({ label, value, onDecrement, onIncrement, onSet, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-body-sm font-semibold leading-tight flex-1 min-w-0 ${disabled ? "text-text-disabled" : "text-muted-foreground"}`}>{label}</span>
      <div className="w-[140px] flex-shrink-0">
        <StepperInput value={value} onDecrement={onDecrement} onIncrement={onIncrement} onSet={onSet} disabled={disabled} />
      </div>
    </div>
  );
}

// ── Step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { id: "showroom", label: "Showroom", pct: 20, icon: Store, color: "orange" },
  { id: "carteira", label: "Carteira", pct: 20, icon: Users, color: "green" },
  { id: "internet", label: "Internet", pct: 30, icon: Globe, color: "blue" },
  { id: "vendas", label: "Vendas", pct: 30, icon: ShoppingCart, color: "purple" },
];

const COLOR_MAP = {
  orange: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    iconBg: "bg-orange-500",
    iconShadow: "shadow-orange-200",
    title: "text-orange-700",
    sub: "text-orange-400",
    badge: "bg-orange-100 text-orange-700",
    btn: "bg-orange-500 hover:bg-orange-600",
    progress: "bg-orange-500",
    stepActive: "bg-orange-500 text-white",
    stepDone: "bg-orange-500 text-white",
    divider: "border-orange-100",
    note: "text-orange-400",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    iconBg: "bg-green-500",
    iconShadow: "shadow-green-200",
    title: "text-green-700",
    sub: "text-green-400",
    badge: "bg-green-100 text-green-700",
    btn: "bg-green-600 hover:bg-green-700",
    progress: "bg-green-500",
    stepActive: "bg-green-600 text-white",
    stepDone: "bg-green-600 text-white",
    divider: "border-green-100",
    note: "text-green-500",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    iconBg: "bg-blue-600",
    iconShadow: "shadow-blue-200",
    title: "text-blue-700",
    sub: "text-blue-400",
    badge: "bg-blue-100 text-blue-700",
    btn: "bg-blue-600 hover:bg-blue-700",
    progress: "bg-blue-600",
    stepActive: "bg-blue-600 text-white",
    stepDone: "bg-blue-600 text-white",
    divider: "border-blue-100",
    note: "text-blue-500",
  },
  purple: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    iconBg: "bg-purple-600",
    iconShadow: "shadow-purple-200",
    title: "text-purple-700",
    sub: "text-purple-400",
    badge: "bg-purple-100 text-purple-700",
    btn: "bg-purple-600 hover:bg-purple-700",
    progress: "bg-purple-600",
    stepActive: "bg-purple-600 text-white",
    stepDone: "bg-purple-600 text-white",
    divider: "border-purple-100",
    note: "text-purple-500",
  },
};

// ── Stepper Header (desktop) ──────────────────────────────────────────────────

function StepperHeader({ currentStep, completedSteps, onStepClick }) {
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((step, idx) => {
        const done = completedSteps.has(step.id);
        const active = currentStep === step.id;
        const c = COLOR_MAP[step.color];
        const Icon = step.icon;

        return (
          <React.Fragment key={step.id}>
            <button
              onClick={() => onStepClick(step.id)}
              className="flex flex-col items-center gap-1 flex-1 min-w-0 cursor-pointer transition-all"
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm
                ${done ? c.stepDone : active ? c.stepActive : "bg-slate-100 text-muted-foreground"}
              `}>
                {done ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-caption font-bold text-center leading-tight
                ${done ? c.title : active ? c.title : "text-muted-foreground"}
              `}>{step.label}</span>
              <span className={`text-caption font-semibold
                ${done || active ? c.note : "text-text-disabled"}
              `}>{step.pct}%</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 max-w-[24px] transition-all rounded-full
                ${completedSteps.has(step.id) ? COLOR_MAP[STEPS[idx + 1].color].progress : "bg-slate-100"}
              `} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Progress Bar (mobile slim) ────────────────────────────────────────────────

const SEGMENT_COLORS = {
  showroom: "#F97316",
  carteira: "#22C55E",
  internet: "#3B82F6",
  vendas:   "#9333EA",
};

function ProgressBar({ completedSteps }) {
  return (
    <div className="space-y-1.5">
      {/* Barra segmentada */}
      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 gap-px">
        {STEPS.map((step) => {
          const done = completedSteps.has(step.id);
          return (
            <div
              key={step.id}
              className="transition-all duration-500 rounded-full"
              style={{
                flex: step.pct,
                background: done ? SEGMENT_COLORS[step.id] : "transparent",
              }}
            />
          );
        })}
      </div>
      {/* Labels das etapas concluídas */}
      <div className="flex">
        {STEPS.map((step) => {
          const done = completedSteps.has(step.id);
          return (
            <div
              key={step.id}
              className="flex items-center gap-0.5 justify-center"
              style={{ flex: step.pct }}
            >
              {done && (
                <>
                  <CheckCircle2
                    className="w-2.5 h-2.5 flex-shrink-0"
                    style={{ color: SEGMENT_COLORS[step.id] }}
                  />
                  <span
                    className="text-caption font-bold truncate"
                    style={{ color: SEGMENT_COLORS[step.id] }}
                  >
                    {step.label}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Expanded Step Cards ───────────────────────────────────────────────────────

function BackButton({ onGoBack }) {
  if (!onGoBack) return null;
  return (
    <button
      onClick={onGoBack}
      className="sm:hidden flex items-center gap-1 text-[12px] font-semibold text-muted-foreground hover:text-foreground mb-1 -mt-1"
    >
      <ChevronRight className="w-3.5 h-3.5 rotate-180" />
      Voltar
    </button>
  );
}

function ShowroomStep({ dc, updateCounter, setCounter, bloqueado, onConfirm, onGoBack }) {
  const c = COLOR_MAP.orange;
  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 sm:p-5 space-y-4 sm:space-y-5`}>
      <BackButton onGoBack={onGoBack} />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${c.iconBg} shadow-md ${c.iconShadow} flex items-center justify-center flex-shrink-0`}>
          <Store className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className={`text-[14px] font-bold uppercase tracking-wider leading-none ${c.title}`}>1. Showroom</p>
          <p className={`text-caption mt-0.5 font-medium ${c.sub}`}>Atendimento presencial</p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground">Informe os atendimentos presenciais realizados no dia.</p>
      <div className={`border-t ${c.divider} pt-4 space-y-4`}>
        <FieldRow
          label="Atendimentos realizados"
          value={dc.atendimentos_showroom || 0}
          onDecrement={() => updateCounter("atendimentos_showroom", -1)}
          onIncrement={() => updateCounter("atendimentos_showroom", 1)}
          onSet={v => setCounter("atendimentos_showroom", v)}
          disabled={bloqueado}
        />
      </div>
      {!bloqueado && (
        <button onClick={onConfirm} className={`w-full py-3.5 rounded-xl text-white text-[14px] font-bold ${c.btn} transition-colors shadow-sm active:scale-95`}>
          Confirmar Showroom ✓
        </button>
      )}
      <p className={`text-caption ${c.note}`}>Vendas devem ser registradas em Cadastrar Venda/Agendamentos.</p>
    </div>
  );
}

function CarteiraStep({ dc, updateCounter, setCounter, clients, closingDate, bloqueado, d1Editavel, onConfirm, onGoBack }) {
  const c = COLOR_MAP.green;
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
  const showPostFinalizado = d1Editavel || bloqueado;
  const planejados = dc.agendamentos_carteira || 0;
  const ativos = clients.filter(cl =>
    cl.channel === "Carteira" && cl.sale_status === "Em Negociação" &&
    cl.appointment_datetime && moment(cl.appointment_datetime).format("YYYY-MM-DD") === d1Date && !cl.d1_excluido
  ).length;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 sm:p-5 space-y-4 sm:space-y-5`}>
      <BackButton onGoBack={onGoBack} />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${c.iconBg} shadow-md ${c.iconShadow} flex items-center justify-center flex-shrink-0`}>
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className={`text-[14px] font-bold uppercase tracking-wider leading-none ${c.title}`}>2. Carteira</p>
          <p className={`text-caption mt-0.5 font-medium ${c.sub}`}>Relacionamento e prospecção</p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground">Informe os contatos, atendimentos e agendamentos gerados pela sua carteira.</p>
      <div className={`border-t ${c.divider} pt-4 space-y-4`}>
        <FieldRow label="Leads recebidos" value={dc.leads_carteira || 0}
          onDecrement={() => updateCounter("leads_carteira", -1)} onIncrement={() => updateCounter("leads_carteira", 1)}
          onSet={v => setCounter("leads_carteira", v)} disabled={bloqueado || d1Editavel} />
        <FieldRow label="Atendimentos realizados" value={dc.atendimentos_carteira || 0}
          onDecrement={() => updateCounter("atendimentos_carteira", -1)} onIncrement={() => updateCounter("atendimentos_carteira", 1)}
          onSet={v => setCounter("atendimentos_carteira", v)} disabled={bloqueado || d1Editavel} />
        {!showPostFinalizado ? (
          <FieldRow label="Agendamentos D+1" value={planejados}
            onDecrement={() => updateCounter("agendamentos_carteira", -1)} onIncrement={() => updateCounter("agendamentos_carteira", 1)}
            onSet={v => setCounter("agendamentos_carteira", v)} disabled={false} />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm font-semibold text-muted-foreground flex-1">Agendamentos D+1 ativos</span>
            <span className={`text-h3 font-bold tabular-nums ${c.title}`}>{ativos}</span>
          </div>
        )}
        {showPostFinalizado && (
          <p className={`text-caption ${c.note}`}>Planejados: <strong>{planejados}</strong> · Detalhados: <strong>{ativos}</strong></p>
        )}
      </div>
      {!bloqueado && !d1Editavel && (
        <button onClick={onConfirm} className={`w-full py-3.5 rounded-xl text-white text-[14px] font-bold ${c.btn} transition-colors shadow-sm active:scale-95`}>
          Confirmar Carteira ✓
        </button>
      )}
    </div>
  );
}

function InternetStep({ dc, updateCounter, setCounter, clients, closingDate, bloqueado, d1Editavel, onConfirm, onGoBack }) {
  const c = COLOR_MAP.blue;
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
  const showPostFinalizado = d1Editavel || bloqueado;
  const planejados = dc.agendamentos_internet || 0;
  const ativos = clients.filter(cl =>
    cl.channel === "Internet" && cl.sale_status === "Em Negociação" &&
    cl.appointment_datetime && moment(cl.appointment_datetime).format("YYYY-MM-DD") === d1Date && !cl.d1_excluido
  ).length;

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 sm:p-5 space-y-4 sm:space-y-5`}>
      <BackButton onGoBack={onGoBack} />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${c.iconBg} shadow-md ${c.iconShadow} flex items-center justify-center flex-shrink-0`}>
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className={`text-[14px] font-bold uppercase tracking-wider leading-none ${c.title}`}>3. Internet</p>
          <p className={`text-caption mt-0.5 font-medium ${c.sub}`}>Leads digitais</p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground">Informe os leads digitais recebidos e o andamento dos atendimentos.</p>
      <div className={`border-t ${c.divider} pt-4 space-y-4`}>
        <FieldRow label="Leads recebidos" value={dc.leads_internet || 0}
          onDecrement={() => updateCounter("leads_internet", -1)} onIncrement={() => updateCounter("leads_internet", 1)}
          onSet={v => setCounter("leads_internet", v)} disabled={bloqueado || d1Editavel} />
        <FieldRow label="Atendimentos realizados" value={dc.atendimentos_internet || 0}
          onDecrement={() => updateCounter("atendimentos_internet", -1)} onIncrement={() => updateCounter("atendimentos_internet", 1)}
          onSet={v => setCounter("atendimentos_internet", v)} disabled={bloqueado || d1Editavel} />
        {!showPostFinalizado ? (
          <FieldRow label="Agendamentos D+1" value={planejados}
            onDecrement={() => updateCounter("agendamentos_internet", -1)} onIncrement={() => updateCounter("agendamentos_internet", 1)}
            onSet={v => setCounter("agendamentos_internet", v)} disabled={false} />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className="text-body-sm font-semibold text-muted-foreground flex-1">Agendamentos D+1 ativos</span>
            <span className={`text-h3 font-bold tabular-nums ${c.title}`}>{ativos}</span>
          </div>
        )}
        {showPostFinalizado && (
          <p className={`text-caption ${c.note}`}>Planejados: <strong>{planejados}</strong> · Detalhados: <strong>{ativos}</strong></p>
        )}
      </div>
      {!bloqueado && !d1Editavel && (
        <button onClick={onConfirm} className={`w-full py-3.5 rounded-xl text-white text-[14px] font-bold ${c.btn} transition-colors shadow-sm active:scale-95`}>
          Confirmar Internet ✓
        </button>
      )}
    </div>
  );
}

function VendasStep({ onGoBack, agendCarteira, agendInternet, children }) {
  const c = COLOR_MAP.purple;

  const totalAgend = agendCarteira + agendInternet;
  let msg = "Cadastre suas vendas e, quando todos os registros estiverem feitos, finalize o fechamento.";
  if (totalAgend > 0) {
    const partes = [];
    if (agendCarteira > 0) partes.push(`${agendCarteira} de carteira`);
    if (agendInternet > 0) partes.push(`${agendInternet} de internet`);
    msg = `Cadastre suas vendas e seus ${totalAgend} agendamento${totalAgend > 1 ? "s" : ""}, sendo ${partes.join(" e ")} para ganhar pontos. A seguir, finalize o fechamento.`;
  }

  return (
    <div className={`rounded-2xl border ${c.border} ${c.bg} p-4 sm:p-5 space-y-4`}>
      <BackButton onGoBack={onGoBack} />
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full ${c.iconBg} shadow-md ${c.iconShadow} flex items-center justify-center flex-shrink-0`}>
          <ShoppingCart className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className={`text-[14px] font-bold uppercase tracking-wider leading-none ${c.title}`}>4. Vendas e Agendamentos</p>
          <p className={`text-caption mt-0.5 font-medium ${c.sub}`}>Registros de vendas e agendamentos D+1</p>
        </div>
      </div>
      <p className="text-[12px] text-muted-foreground">{msg}</p>
      {children && <div className="space-y-3">{children}</div>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function FluxoFechamento({ dc, updateCounter, setCounter, clients = [], closingDate, bloqueado = false, d1Editavel = false, onAuditLog, onInternetConfirmado, vendasContent }) {
  const [currentStep, setCurrentStep] = useState("showroom");
  const [completedSteps, setCompletedSteps] = useState(new Set());

  // Auto-detect completed steps from saved data (initial load only)
  useEffect(() => {
    setCompletedSteps(prev => {
      const done = new Set(prev);
      if (dc.atendimentos_showroom > 0) done.add("showroom");
      if ((dc.leads_carteira || 0) + (dc.atendimentos_carteira || 0) + (dc.agendamentos_carteira || 0) > 0) done.add("carteira");
      if ((dc.leads_internet || 0) + (dc.atendimentos_internet || 0) + (dc.agendamentos_internet || 0) > 0) done.add("internet");
      return done;
    });
  }, [dc.atendimentos_showroom, dc.leads_carteira, dc.atendimentos_carteira, dc.agendamentos_carteira, dc.leads_internet, dc.atendimentos_internet, dc.agendamentos_internet]);

  // "Vendas" step: concluído quando existir pelo menos 1 registro ativo no fechamento
  useEffect(() => {
    setCompletedSteps(prev => {
      const done = new Set(prev);
      if (clients.length > 0) {
        done.add("vendas");
      } else {
        done.delete("vendas");
      }
      return done;
    });
  }, [clients.length]);

  const handleConfirm = (stepId) => {
    const nextMap = { showroom: "carteira", carteira: "internet", internet: "vendas", vendas: "vendas" };
    setCompletedSteps(prev => new Set([...prev, stepId]));
    setCurrentStep(nextMap[stepId] || stepId);
    if (stepId === "internet" && onInternetConfirmado) onInternetConfirmado();
  };

  const handleGoBack = (stepId) => {
    const prevMap = { carteira: "showroom", internet: "carteira", vendas: "internet" };
    if (prevMap[stepId]) setCurrentStep(prevMap[stepId]);
  };

  const handleStepClick = (stepId) => setCurrentStep(stepId);

  const totalPct = STEPS.reduce((acc, s) => completedSteps.has(s.id) ? acc + s.pct : acc, 0);
  const progressColor = totalPct === 100 ? "bg-green-500" :
    totalPct >= 70 ? "bg-blue-500" :
    totalPct >= 40 ? "bg-orange-400" : "bg-slate-300";

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Barra slim — apenas mobile */}
      <div className="sm:hidden">
        <ProgressBar completedSteps={completedSteps} />
      </div>

      {/* Card de progresso — apenas desktop */}
      <div className="hidden sm:block bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-body-sm sm:text-[14px] font-bold text-[#0F172A] uppercase tracking-wide">Progresso do Fechamento</h2>
            <p className="text-caption sm:text-caption text-muted-foreground mt-0.5 leading-tight">Acompanhe o preenchimento. Não é sua pontuação de disciplina.</p>
          </div>
          <span className={`text-h3 sm:text-h2 font-bold tabular-nums flex-shrink-0 ${totalPct === 100 ? "text-green-600" : "text-[#0F172A]"}`}>
            {totalPct}%
          </span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${totalPct}%` }}
          />
        </div>
        <div className="mt-4">
          <StepperHeader currentStep={currentStep} completedSteps={completedSteps} onStepClick={handleStepClick} />
        </div>
      </div>

      {/* Etapa expandida */}
      {currentStep === "showroom" && (
        <ShowroomStep dc={dc} updateCounter={updateCounter} setCounter={setCounter}
          bloqueado={bloqueado || d1Editavel} onConfirm={() => handleConfirm("showroom")} />
      )}
      {currentStep === "carteira" && (
        <CarteiraStep dc={dc} updateCounter={updateCounter} setCounter={setCounter}
          clients={clients} closingDate={closingDate} bloqueado={bloqueado} d1Editavel={d1Editavel}
          onConfirm={() => handleConfirm("carteira")} onGoBack={() => handleGoBack("carteira")} />
      )}
      {currentStep === "internet" && (
        <InternetStep dc={dc} updateCounter={updateCounter} setCounter={setCounter}
          clients={clients} closingDate={closingDate} bloqueado={bloqueado} d1Editavel={d1Editavel}
          onConfirm={() => handleConfirm("internet")} onGoBack={() => handleGoBack("internet")} />
      )}
      {currentStep === "vendas" && (
        <VendasStep
          onGoBack={() => handleGoBack("vendas")}
          agendCarteira={dc.agendamentos_carteira || 0}
          agendInternet={dc.agendamentos_internet || 0}
        >
          {vendasContent}
        </VendasStep>
      )}
    </div>
  );
}