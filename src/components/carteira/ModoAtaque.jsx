import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Zap, Pause, Phone, MessageCircle, FileText, Trophy, Target, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { calcularObjetivoEProximoPasso, calcularPrioridade, explicacaoCliente } from "./carteiraUtils";

// ─── BARRA SUPERIOR ───────────────────────────────────────────────────────────
function BarraModoAtaque({ total, concluidos, tempoInicio, onPausar }) {
  const [tempoStr, setTempoStr] = useState("00:00");

  useEffect(() => {
    const tick = () => {
      const diff = Math.floor((Date.now() - tempoInicio) / 1000);
      const m = String(Math.floor(diff / 60)).padStart(2, "0");
      const s = String(diff % 60).padStart(2, "0");
      setTempoStr(`${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tempoInicio]);

  const progresso = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#031B3D] text-white shadow-lg">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-[#005BFF] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black tracking-wide">MODO ATAQUE</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-caption text-text-disabled">
              {concluidos} de {total} oportunidades concluídas
            </span>
            <span className="text-caption text-muted-foreground font-mono">{tempoStr}</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#005BFF] rounded-full transition-all duration-500"
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        <Button
          onClick={onPausar}
          size="sm"
          variant="ghost"
          className="text-white hover:bg-white/10 shrink-0 gap-1.5 text-xs rounded-lg"
        >
          <Pause className="w-3.5 h-3.5" /> Pausar
        </Button>
      </div>
    </div>
  );
}

// ─── CARD DA OPORTUNIDADE ─────────────────────────────────────────────────────
function OportunidadeCard({ cliente, onWhatsApp, onLigar, onFicha, onExecutar }) {
  const { objetivo, proximoPasso } = calcularObjetivoEProximoPasso(cliente);
  const explicacao = explicacaoCliente(cliente);
  const canal = cliente.canal_comercial || cliente.canal_origem || "—";
  const iniciais = (cliente.nome || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
  const tel = (cliente.whatsapp || cliente.telefone || "").replace(/\D/g, "");

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-border-subtle overflow-hidden">
      {/* Header do cliente */}
      <div className="bg-gradient-to-br from-[#005BFF] to-status-info p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-xl font-black">
            {iniciais}
          </div>
          <div>
            <p className="text-xl font-black">{cliente.nome}</p>
            <p className="text-sm text-blue-200 mt-0.5">{canal} · {cliente.veiculo_interesse || "Veículo não informado"}</p>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-6 space-y-5">
        {/* Objetivo + Próximo passo */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-alt rounded-2xl p-4">
            <p className="text-caption text-muted-foreground font-bold uppercase tracking-wide mb-1">Objetivo</p>
            <p className="text-sm font-bold text-foreground">{objetivo}</p>
          </div>
          <div className="bg-status-info-surface rounded-2xl p-4">
            <p className="text-caption text-status-info-text font-bold uppercase tracking-wide mb-1">Próximo passo</p>
            <p className="text-sm font-bold text-[#031B3D]">{proximoPasso}</p>
          </div>
        </div>

        {/* Motivo da recomendação */}
        <div className="flex items-start gap-2 bg-status-warning-surface rounded-2xl px-4 py-3">
          <Target className="w-4 h-4 text-status-warning-text shrink-0 mt-0.5" />
          <p className="text-xs text-status-warning-text leading-snug">{explicacao}</p>
        </div>

        {/* Ações secundárias */}
        <div className="grid grid-cols-3 gap-2">
          {tel && (
            <a href={`tel:+55${tel}`} className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-border bg-white hover:bg-surface-alt transition-colors">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-caption font-semibold text-muted-foreground">Ligar</span>
            </a>
          )}
          {tel && (
            <button
              onClick={() => onWhatsApp(cliente)}
              className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-brand-primary/30 bg-brand-primary-subtle hover:bg-brand-primary-subtle transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-status-success-text" />
              <span className="text-caption font-semibold text-brand-primary-hover">WhatsApp</span>
            </button>
          )}
          <button
            onClick={() => onFicha(cliente.id)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl border border-border bg-white hover:bg-surface-alt transition-colors"
          >
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-caption font-semibold text-muted-foreground">Ficha</span>
          </button>
        </div>

        {/* Executar */}
        <Button
          onClick={() => onExecutar(cliente)}
          className="w-full h-14 rounded-2xl bg-[#005BFF] hover:bg-status-info text-white text-base font-black gap-2 shadow-lg shadow-blue-200"
        >
          <Zap className="w-5 h-5" /> Executar próximo passo
        </Button>
      </div>
    </div>
  );
}

// ─── TELA DE CONCLUSÃO ────────────────────────────────────────────────────────
function TelaConclusao({ stats, onPlanoAtaque, onCarteira, onEncerrar }) {
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 text-center">
      <div className="w-20 h-20 rounded-full bg-brand-primary-subtle flex items-center justify-center">
        <Trophy className="w-10 h-10 text-status-success-text" />
      </div>
      <div>
        <p className="text-3xl font-black text-[#031B3D]">🎉 Excelente!</p>
        <p className="text-muted-foreground mt-2 text-sm">Você concluiu todas as oportunidades prioritárias de hoje.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-lg">
        {[
          { label: "Executadas", value: stats.executadas, color: "text-status-info-text bg-status-info-surface" },
          { label: "Visitas geradas", value: stats.visitas, color: "text-status-success-text bg-brand-primary-subtle" },
          { label: "Propostas enviadas", value: stats.propostas, color: "text-status-warning-text bg-status-warning-surface" },
          { label: "Recuperações", value: stats.recuperacoes, color: "text-status-info-text bg-status-info-surface" },
        ].map(s => (
          <div key={s.label} className={`rounded-2xl p-4 ${s.color}`}>
            <p className="text-2xl font-black">{s.value}</p>
            <p className="text-caption font-semibold mt-1 leading-snug">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 w-full max-w-sm">
        <Button onClick={onPlanoAtaque} variant="outline" className="w-full rounded-xl">Ir para Plano de Ataque</Button>
        <Button onClick={onCarteira} className="w-full rounded-xl bg-[#005BFF] hover:bg-status-info text-white">Voltar para Carteira</Button>
        <button onClick={onEncerrar} className="text-xs text-muted-foreground hover:underline mt-1">Encerrar sessão</button>
      </div>
    </div>
  );
}

// ─── MODAL PAUSAR ─────────────────────────────────────────────────────────────
function ModalPausar({ open, onContinuar, onEncerrar }) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm rounded-2xl text-center" hideCloseButton>
        <div className="flex flex-col items-center gap-4 py-2">
          <div className="w-12 h-12 rounded-full bg-status-warning-surface flex items-center justify-center">
            <Pause className="w-6 h-6 text-status-warning-text" />
          </div>
          <div>
            <p className="text-base font-black text-[#031B3D]">Pausar o Modo Ataque?</p>
            <p className="text-sm text-muted-foreground mt-1">Sua posição na fila será salva. Você continua de onde parou.</p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Button onClick={onContinuar} className="w-full rounded-xl bg-[#005BFF] hover:bg-status-info text-white">Continuar depois</Button>
            <Button onClick={onEncerrar} variant="outline" className="w-full rounded-xl text-status-error-text border-status-error/30 hover:bg-status-error-surface">Encerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
const STORAGE_KEY = "mx_modo_ataque";

export default function ModoAtaque({ clientes, onSair, onWhatsApp, onFicha, onPlanoAtaque, onResultadoRegistrado }) {
  const PRIORIDADE_ORDER = { Máxima: 0, Alta: 1, Média: 2, Baixa: 3 };

  const fila = [...clientes]
    .filter(c => c.ativo !== false)
    .map(c => ({ ...c, _prio: PRIORIDADE_ORDER[calcularPrioridade(c)] ?? 4 }))
    .sort((a, b) => a._prio - b._prio);

  const [indice, setIndice] = useState(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { indice: i } = JSON.parse(saved);
      return typeof i === "number" ? Math.min(i, fila.length - 1) : 0;
    }
    return 0;
  });

  const [concluidos, setConcluidos] = useState(0);
  const [concluido, setConcluido] = useState(false);
  const [pausarOpen, setPausarOpen] = useState(false);
  const tempoInicio = useRef(Date.now());

  const [stats, setStats] = useState({ executadas: 0, visitas: 0, propostas: 0, recuperacoes: 0 });

  const clienteAtual = fila[indice] || null;

  // Salva posição ao pausar/mudar
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ indice }));
  }, [indice]);

  function avancar(resultado) {
    // Contabilizar stats
    const r = resultado || "";
    setStats(prev => ({
      executadas: prev.executadas + 1,
      visitas: prev.visitas + (r.includes("Visita") || r.includes("Agendou") ? 1 : 0),
      propostas: prev.propostas + (r.includes("Proposta") ? 1 : 0),
      recuperacoes: prev.recuperacoes + (r.includes("Recuper") || r.includes("reagendou") || r.includes("Remarcar") ? 1 : 0),
    }));

    const proximo = indice + 1;
    if (proximo >= fila.length) {
      setConcluido(true);
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      setIndice(proximo);
      setConcluidos(c => c + 1);
    }
  }

  function handleResultadoRegistrado(clienteAtualizado) {
    onResultadoRegistrado(clienteAtualizado);
    avancar("");
  }

  function handleWhatsApp(cliente) {
    onWhatsApp(cliente, null, handleResultadoRegistrado);
  }

  function handleExecutar(cliente) {
    onWhatsApp(cliente, null, handleResultadoRegistrado);
  }

  function handlePausarContinuar() {
    setPausarOpen(false);
    onSair();
  }

  function handleEncerrar() {
    sessionStorage.removeItem(STORAGE_KEY);
    setPausarOpen(false);
    onSair();
  }

  if (concluido) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] pt-20">
        <TelaConclusao
          stats={stats}
          onPlanoAtaque={() => { sessionStorage.removeItem(STORAGE_KEY); onPlanoAtaque(); }}
          onCarteira={() => { sessionStorage.removeItem(STORAGE_KEY); onSair(); }}
          onEncerrar={() => { sessionStorage.removeItem(STORAGE_KEY); onSair(); }}
        />
      </div>
    );
  }

  return (
    <>
      <BarraModoAtaque
        total={fila.length}
        concluidos={concluidos}
        tempoInicio={tempoInicio.current}
        onPausar={() => setPausarOpen(true)}
      />

      <div className="min-h-screen bg-[#F0F4FF] pt-20 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          {clienteAtual ? (
            <OportunidadeCard
              cliente={clienteAtual}
              onWhatsApp={handleWhatsApp}
              onLigar={() => {}}
              onFicha={onFicha}
              onExecutar={handleExecutar}
            />
          ) : (
            <div className="text-center py-20 text-muted-foreground">Sem oportunidades na fila.</div>
          )}
        </div>
      </div>

      <ModalPausar
        open={pausarOpen}
        onContinuar={handlePausarContinuar}
        onEncerrar={handleEncerrar}
      />
    </>
  );
}

export { STORAGE_KEY as MODO_ATAQUE_KEY };