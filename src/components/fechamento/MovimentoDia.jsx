import React, { useState } from "react";
import { Store, Users, Globe, Info, Lock } from "lucide-react";
import moment from "moment";
import { isClienteD1 } from "@/components/fechamento/ClientCard";

// ── Stepper Input ─────────────────────────────────────────────────────────────

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
      <div className="flex items-center border border-border-subtle rounded-xl h-9 bg-surface-alt opacity-60 cursor-not-allowed">
        <div className="w-9 h-full flex items-center justify-center text-text-disabled border-r border-border-subtle text-[18px] font-light">−</div>
        <span className="flex-1 text-center font-bold text-body text-muted-foreground tabular-nums">{value}</span>
        <div className="w-9 h-full flex items-center justify-center text-text-disabled border-l border-border-subtle text-[18px] font-light">+</div>
      </div>
    );
  }

  return (
    <div className="flex items-center border border-border rounded-xl shadow-sm h-9 focus-within:border-status-info/50 focus-within:shadow-mx-focus-info transition-all bg-white">
      <button
        onClick={onDecrement}
        className="w-9 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-alt active:bg-muted border-r border-border rounded-l-xl transition-colors text-[18px] font-light flex-shrink-0"
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
        className="flex-1 min-w-0 text-center font-bold text-body text-foreground bg-transparent border-none outline-none h-full tabular-nums"
        style={{ boxShadow: "none" }}
      />
      <button
        onClick={onIncrement}
        className="w-9 h-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-alt active:bg-muted border-l border-border rounded-r-xl transition-colors text-[18px] font-light flex-shrink-0"
      >+</button>
    </div>
  );
}

// ── Field Row ─────────────────────────────────────────────────────────────────

function FieldRow({ label, value, onDecrement, onIncrement, onSet, disabled }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={`text-[12px] font-semibold leading-tight flex-1 min-w-0 ${disabled ? "text-text-disabled" : "text-muted-foreground"}`}>{label}</span>
      <div className="w-[120px] flex-shrink-0">
        <StepperInput value={value} onDecrement={onDecrement} onIncrement={onIncrement} onSet={onSet} disabled={disabled} />
      </div>
    </div>
  );
}

// ── Canal Cards ───────────────────────────────────────────────────────────────

function ShowroomCard({ dc, updateCounter, setCounter, bloqueado }) {
  return (
    <div className={`flex-1 rounded-2xl p-5 flex flex-col gap-4 min-w-0 border ${bloqueado ? "bg-surface-alt border-border-subtle opacity-70" : "bg-status-warning-surface/60 border-status-warning/20"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${bloqueado ? "bg-muted shadow-slate-100" : "bg-status-warning shadow-orange-200"}`}>
          {bloqueado ? <Lock className="w-5 h-5 text-white" /> : <Store className="w-5 h-5 text-white" />}
        </div>
        <div>
          <p className={`text-body-sm font-bold uppercase tracking-wider leading-none ${bloqueado ? "text-muted-foreground" : "text-status-warning-text"}`}>Showroom</p>
          <p className={`text-caption mt-0.5 font-medium ${bloqueado ? "text-text-disabled" : "text-orange-400"}`}>Atendimento presencial</p>
        </div>
      </div>
      <div className="space-y-3">
        <FieldRow
          label="Atendimentos realizados"
          value={dc.atendimentos_showroom || 0}
          onDecrement={() => updateCounter("atendimentos_showroom", -1)}
          onIncrement={() => updateCounter("atendimentos_showroom", 1)}
          onSet={v => setCounter("atendimentos_showroom", v)}
          disabled={bloqueado}
        />
      </div>
      <p className={`text-caption leading-relaxed mt-auto pt-1 border-t ${bloqueado ? "text-text-disabled border-border-subtle" : "text-orange-400 border-status-warning/20"}`}>
        Vendas devem ser registradas em Cadastrar Venda/Agendamentos.
      </p>
    </div>
  );
}

// Card Carteira — exibe quantidade ativa calculada pelos registros quando finalizado
function CarteiraCard({ dc, updateCounter, setCounter, clients, closingDate, bloqueado, d1Editavel, onAuditLog }) {
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");

  // Planejados (fotografia original do fechamento)
  const planejados = dc.agendamentos_carteira || 0;

  // Ativos: calculados dinamicamente pelos registros válidos (após finalização)
  const ativos = clients.filter(c =>
    c.channel === "Carteira" &&
    c.sale_status === "Em Negociação" &&
    c.appointment_datetime &&
    moment(c.appointment_datetime).format("YYYY-MM-DD") === d1Date &&
    !c.d1_excluido
  ).length;

  // Antes da finalização: mostra o stepper editável com planejados
  // Após finalização: mostra ativos como número principal + planejados discreto
  const showPostFinalizado = d1Editavel || bloqueado;

  return (
    <div className={`flex-1 rounded-2xl p-5 flex flex-col gap-4 min-w-0 border ${bloqueado ? "bg-surface-alt border-border-subtle opacity-70" : "bg-brand-primary-subtle/60 border-brand-primary/20"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${bloqueado ? "bg-muted shadow-slate-100" : "bg-brand-primary shadow-green-200"}`}>
          {bloqueado ? <Lock className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-white" />}
        </div>
        <div>
          <p className={`text-body-sm font-bold uppercase tracking-wider leading-none ${bloqueado ? "text-muted-foreground" : "text-brand-primary-hover"}`}>Carteira</p>
          <p className={`text-caption mt-0.5 font-medium ${bloqueado ? "text-text-disabled" : "text-brand-primary/60"}`}>Relacionamento e prospecção</p>
        </div>
      </div>
      <div className="space-y-3">
        <FieldRow
          label="Leads recebidos"
          value={dc.leads_carteira || 0}
          onDecrement={() => updateCounter("leads_carteira", -1)}
          onIncrement={() => updateCounter("leads_carteira", 1)}
          onSet={v => setCounter("leads_carteira", v)}
          disabled={bloqueado || d1Editavel}
        />
        <FieldRow
          label="Atendimentos realizados"
          value={dc.atendimentos_carteira || 0}
          onDecrement={() => updateCounter("atendimentos_carteira", -1)}
          onIncrement={() => updateCounter("atendimentos_carteira", 1)}
          onSet={v => setCounter("atendimentos_carteira", v)}
          disabled={bloqueado || d1Editavel}
        />
        {/* Agendamentos D+1: stepper livre antes; display calculado depois */}
        {!showPostFinalizado ? (
          <FieldRow
            label="Agendamentos D+1"
            value={planejados}
            onDecrement={() => updateCounter("agendamentos_carteira", -1)}
            onIncrement={() => updateCounter("agendamentos_carteira", 1)}
            onSet={v => setCounter("agendamentos_carteira", v)}
            disabled={false}
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[12px] font-semibold leading-tight flex-1 min-w-0 ${bloqueado ? "text-text-disabled" : "text-muted-foreground"}`}>
              Agendamentos D+1 ativos
            </span>
            <div className="w-[120px] flex-shrink-0 flex items-center justify-center">
              <span className={`text-h3 font-bold tabular-nums ${bloqueado ? "text-muted-foreground" : "text-brand-primary-hover"}`}>{ativos}</span>
            </div>
          </div>
        )}
      </div>
      {/* Planejados originais (sempre discreto após finalização) */}
      {showPostFinalizado && (
        <div className={`mt-auto pt-3 border-t space-y-1 ${bloqueado ? "border-border-subtle" : "border-brand-primary/20"}`}>
          <p className={`text-caption font-medium ${bloqueado ? "text-text-disabled" : "text-status-success-text"}`}>
            Planejados no fechamento: <strong className={bloqueado ? "text-muted-foreground" : "text-brand-primary-hover"}>{planejados}</strong>
          </p>
          {!bloqueado && (
            <p className="text-caption font-semibold text-status-success-text">
              Detalhados: <strong className="text-brand-primary-hover">{ativos}</strong> de <strong className="text-brand-primary-hover">{planejados}</strong>
            </p>
          )}
        </div>
      )}
      {/* Antes da finalização: detalhados vs planejados */}
      {!showPostFinalizado && planejados > 0 && (
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-brand-primary/20">
          <span className="text-caption font-semibold text-status-success-text">
            Detalhados: <strong className="text-brand-primary-hover">{ativos}</strong> de <strong className="text-brand-primary-hover">{planejados}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

// Card Internet — mesma lógica do Carteira
function InternetCard({ dc, updateCounter, setCounter, clients, closingDate, bloqueado, d1Editavel, onAuditLog }) {
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");

  const planejados = dc.agendamentos_internet || 0;

  const ativos = clients.filter(c =>
    c.channel === "Internet" &&
    c.sale_status === "Em Negociação" &&
    c.appointment_datetime &&
    moment(c.appointment_datetime).format("YYYY-MM-DD") === d1Date &&
    !c.d1_excluido
  ).length;

  const showPostFinalizado = d1Editavel || bloqueado;

  return (
    <div className={`flex-1 rounded-2xl p-5 flex flex-col gap-4 min-w-0 border ${bloqueado ? "bg-surface-alt border-border-subtle opacity-70" : "bg-status-info-surface/60 border-status-info/20"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${bloqueado ? "bg-muted shadow-slate-100" : "bg-status-info shadow-blue-200"}`}>
          {bloqueado ? <Lock className="w-5 h-5 text-white" /> : <Globe className="w-5 h-5 text-white" />}
        </div>
        <div>
          <p className={`text-body-sm font-bold uppercase tracking-wider leading-none ${bloqueado ? "text-muted-foreground" : "text-status-info-text"}`}>Internet</p>
          <p className={`text-caption mt-0.5 font-medium ${bloqueado ? "text-text-disabled" : "text-blue-400"}`}>Leads digitais</p>
        </div>
      </div>
      <div className="space-y-3">
        <FieldRow
          label="Leads recebidos"
          value={dc.leads_internet || 0}
          onDecrement={() => updateCounter("leads_internet", -1)}
          onIncrement={() => updateCounter("leads_internet", 1)}
          onSet={v => setCounter("leads_internet", v)}
          disabled={bloqueado || d1Editavel}
        />
        <FieldRow
          label="Atendimentos realizados"
          value={dc.atendimentos_internet || 0}
          onDecrement={() => updateCounter("atendimentos_internet", -1)}
          onIncrement={() => updateCounter("atendimentos_internet", 1)}
          onSet={v => setCounter("atendimentos_internet", v)}
          disabled={bloqueado || d1Editavel}
        />
        {!showPostFinalizado ? (
          <FieldRow
            label="Agendamentos D+1"
            value={planejados}
            onDecrement={() => updateCounter("agendamentos_internet", -1)}
            onIncrement={() => updateCounter("agendamentos_internet", 1)}
            onSet={v => setCounter("agendamentos_internet", v)}
            disabled={false}
          />
        ) : (
          <div className="flex items-center justify-between gap-3">
            <span className={`text-[12px] font-semibold leading-tight flex-1 min-w-0 ${bloqueado ? "text-text-disabled" : "text-muted-foreground"}`}>
              Agendamentos D+1 ativos
            </span>
            <div className="w-[120px] flex-shrink-0 flex items-center justify-center">
              <span className={`text-h3 font-bold tabular-nums ${bloqueado ? "text-muted-foreground" : "text-status-info-text"}`}>{ativos}</span>
            </div>
          </div>
        )}
      </div>
      {showPostFinalizado && (
        <div className={`mt-auto pt-3 border-t space-y-1 ${bloqueado ? "border-border-subtle" : "border-status-info/20"}`}>
          <p className={`text-caption font-medium ${bloqueado ? "text-text-disabled" : "text-status-info-text"}`}>
            Planejados no fechamento: <strong className={bloqueado ? "text-muted-foreground" : "text-status-info-text"}>{planejados}</strong>
          </p>
          {!bloqueado && (
            <p className="text-caption font-semibold text-status-info-text">
              Detalhados: <strong className="text-status-info-text">{ativos}</strong> de <strong className="text-status-info-text">{planejados}</strong>
            </p>
          )}
        </div>
      )}
      {!showPostFinalizado && planejados > 0 && (
        <div className="flex items-center gap-1.5 mt-auto pt-3 border-t border-status-info/20">
          <span className="text-caption font-semibold text-status-info-text">
            Detalhados: <strong className="text-status-info-text">{ativos}</strong> de <strong className="text-status-info-text">{planejados}</strong>
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function MovimentoDia({ dc, updateCounter, setCounter, clients = [], closingDate, bloqueado = false, d1Editavel = false, onAuditLog }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-border-subtle flex items-center gap-3">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <span className="w-6 h-6 rounded-full bg-status-info text-white text-caption font-bold flex items-center justify-center flex-shrink-0">1</span>
          <div>
            <h2 className="text-[14px] font-bold text-mx-navy uppercase tracking-wide leading-none">Movimento do Dia</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">Informe rapidamente o que aconteceu hoje em cada canal.</p>
          </div>
        </div>
        <div className="relative group flex-shrink-0">
          <Info className="w-4 h-4 text-text-disabled hover:text-muted-foreground cursor-pointer transition-colors" />
          <div className="absolute right-0 top-6 w-72 bg-slate-800 text-white text-caption rounded-xl p-3 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 leading-relaxed">
            Preencha os dados de cada canal. Os totais são somados automaticamente no Resumo do Dia. Após a finalização, os Agendamentos D+1 ativos são calculados automaticamente pelos registros cadastrados.
          </div>
        </div>
      </div>

      <div className="p-5 flex gap-4">
        <ShowroomCard
          dc={dc}
          updateCounter={updateCounter}
          setCounter={setCounter}
          bloqueado={bloqueado || d1Editavel}
        />
        <CarteiraCard
          dc={dc}
          updateCounter={updateCounter}
          setCounter={setCounter}
          clients={clients}
          closingDate={closingDate}
          bloqueado={bloqueado}
          d1Editavel={d1Editavel}
          onAuditLog={onAuditLog}
        />
        <InternetCard
          dc={dc}
          updateCounter={updateCounter}
          setCounter={setCounter}
          clients={clients}
          closingDate={closingDate}
          bloqueado={bloqueado}
          d1Editavel={d1Editavel}
          onAuditLog={onAuditLog}
        />
      </div>
    </div>
  );
}