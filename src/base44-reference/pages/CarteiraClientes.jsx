import React, { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import CarteiraAtivaTab from "@/components/carteira/CarteiraAtivaTab.jsx";
import PlanoAtaqueTab from "@/components/carteira/PlanoAtaqueTab";
import ExecucaoMissao from "@/components/carteira/ExecucaoMissao";
import NovoClienteModal from "@/components/carteira/NovoClienteModal";
import WhatsAppRoteiro, { WA_KEY } from "@/components/carteira/WhatsAppRoteiro";
import FichaClienteSheet from "@/components/carteira/FichaClienteSheet";
import ProximaOportunidadeModal, { MODO_ATAQUE_ACEITO_KEY } from "@/components/carteira/ProximaOportunidadeModal";
import RetornoWhatsAppModal from "@/components/carteira/RetornoWhatsAppModal";
import ModoAtaque from "@/components/carteira/ModoAtaque";
import { calcularPrioridade, resultadoParaSituacao } from "@/components/carteira/carteiraUtils";

// Retorna a próxima oportunidade da fila excluindo o cliente atual
function proximaOportunidadeDaFila(clientes, clienteAtualId) {
  const PRIORIDADE_ORDER = { Máxima: 0, Alta: 1, Média: 2, Baixa: 3 };
  return clientes
    .filter(c => c.id !== clienteAtualId && c.ativo !== false)
    .map(c => ({ ...c, _prio: PRIORIDADE_ORDER[calcularPrioridade(c)] ?? 4 }))
    .sort((a, b) => a._prio - b._prio)[0] || null;
}

export default function CarteiraClientes() {
  const [aba, setAba] = useState("carteira");
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [perfil, setPerfil] = useState(null);

  // Modais
  const [novoClienteOpen, setNovoClienteOpen] = useState(false);
  const [whatsAppCliente, setWhatsAppCliente] = useState(null);
  const [whatsAppMissaoId, setWhatsAppMissaoId] = useState(null);
  const [fichaClienteId, setFichaClienteId] = useState(null);

  // Fluxo contínuo
  const [proximaModalOpen, setProximaModalOpen] = useState(false);
  const [proximaOportunidade, setProximaOportunidade] = useState(null);
  const [ultimoClienteAtendido, setUltimoClienteAtendido] = useState(null);

  // Modo Ataque
  const [modoAtaqueAtivo, setModoAtaqueAtivo] = useState(false);
  // callback de resultado do modo ataque (para WhatsApp aberto a partir do modo ataque)
  const modoAtaqueCallbackRef = useRef(null);

  // Retorno automático do WhatsApp
  const [retornoWaOpen, setRetornoWaOpen] = useState(false);
  const [retornoWaCliente, setRetornoWaCliente] = useState(null);
  const [retornoWaResultado, setRetornoWaResultado] = useState("");
  const visibilityTimerRef = useRef(null);

  // Controle de auto-expansão do WhatsAppRoteiro após retorno do WhatsApp via Script IA
  const [whatsAppAutoExpandir, setWhatsAppAutoExpandir] = useState(false);

  // Execução de missão
  const [execucaoMissao, setExecucaoMissao] = useState(null);
  const [execucaoClientes, setExecucaoClientes] = useState([]);

  useEffect(() => {
    async function init() {
      const u = await base44.auth.me().catch(() => null);
      setUser(u);
      const [cs, ps] = await Promise.all([
        base44.entities.CarteiraCliente.filter({ ativo: true }, "-updated_date", 200).catch(() => []),
        u ? base44.entities.UserProfile.filter({ created_by_id: u.id }, "-created_date", 1).catch(() => []) : Promise.resolve([]),
      ]);
      setClientes(cs);
      setPerfil(ps[0] || null);

      const params = new URLSearchParams(window.location.search);
      const cid = params.get("clienteId");
      if (cid) setFichaClienteId(cid);

      setLoading(false);
    }
    init();
  }, []);

  // ── IMPLEMENTAÇÃO 1: Detecção de retorno do WhatsApp (Carteira normal) ───
  useEffect(() => {
    if (modoAtaqueAtivo) return; // Modo Ataque tem seu próprio listener
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        const raw = sessionStorage.getItem(WA_KEY);
        if (!raw) return;
        const dados = JSON.parse(raw);
        const elapsed = Date.now() - dados.ts;
        // Janela: até 2 minutos (120 000 ms)
        if (elapsed <= 120000) {
          const cliente = clientes.find(c => c.id === dados.clienteId);
          if (!cliente) return;

          if (dados.origem === "script_ia_whatsapp") {
            // Retorno via Script IA — reabrir o WhatsAppRoteiro direto nos cards de resultado
            sessionStorage.removeItem(WA_KEY);
            setWhatsAppAutoExpandir(true);
            setWhatsAppCliente(cliente);
            setWhatsAppMissaoId(null);
          } else {
            // Retorno via botão WhatsApp simples — modal de retorno rápido
            setRetornoWaCliente(cliente);
            setRetornoWaResultado("");
            setRetornoWaOpen(true);
          }
        } else {
          // Passou do prazo — limpa silenciosamente
          sessionStorage.removeItem(WA_KEY);
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clientes, modoAtaqueAtivo]);

  // Registrar resultado a partir do modal de retorno WhatsApp
  async function handleRetornoWaConfirmar(resultadoLabel) {
    setRetornoWaResultado(resultadoLabel);
    if (!retornoWaCliente) return;
    sessionStorage.removeItem(WA_KEY);

    const RESULTADO_MAP = {
      "Executado": "Atendeu", "Não atendeu": "Não atendeu", "Não respondeu": "Não respondeu",
      "Visita agendada": "Agendou visita", "Proposta enviada": "Proposta enviada",
      "Remarcar": "Reagendou visita", "Perdeu interesse": "Sem interesse",
      "Venda realizada": "Comprou",
    };
    const resultadoMapeado = RESULTADO_MAP[resultadoLabel] || resultadoLabel;
    const { situacao: novaSituacao, temperatura, objetivo, proximoPasso, statusComercial } = resultadoParaSituacao(resultadoMapeado);
    const update = {
      ultimo_contato: new Date().toISOString(),
      canal_comercial: retornoWaCliente.canal_comercial || "Internet",
    };
    if (novaSituacao) update.situacao_atual = novaSituacao;
    if (temperatura) update.temperatura = temperatura;
    if (objetivo) update.objetivo_atual = objetivo;
    if (proximoPasso) update.proximo_passo = proximoPasso;
    if (statusComercial) update.status_comercial = statusComercial;

    if (novaSituacao === "Venda realizada" || novaSituacao === "Venda perdida" || novaSituacao === "Cadência encerrada") {
      update.ativo = false;
      update.proximo_passo = null;
      update.proxima_acao = null;
      update.proxima_acao_data = null;
    }
    update.historico = {
      tipo: "Resultado registrado",
      descricao: `Resultado via retorno WhatsApp: ${resultadoLabel}.`,
      resultado: resultadoLabel,
      momento_anterior: retornoWaCliente.situacao_atual,
      momento_novo: novaSituacao || retornoWaCliente.situacao_atual,
    };

    let persistido;
    try {
      persistido = await base44.entities.CarteiraCliente.update(retornoWaCliente.id, update);
    } catch {
      setRetornoWaOpen(false);
      setRetornoWaCliente(null);
      return;
    }

    const atualizado = persistido || { ...retornoWaCliente, ...update };
    const novosClientes = clientes.map(c => c.id === atualizado.id ? atualizado : c);
    setClientes(novosClientes);
    setRetornoWaOpen(false);
    setRetornoWaCliente(null);

    // Abre o fluxo de próxima oportunidade
    abrirProximaOportunidade(atualizado, novosClientes);
  }

  // ── IMPLEMENTAÇÃO 2/3: Fluxo contínuo após registrar resultado ────────────
  function abrirProximaOportunidade(clienteAtendido, listaAtualizada) {
    const lista = listaAtualizada || clientes;
    const proxima = proximaOportunidadeDaFila(lista, clienteAtendido.id);
    setUltimoClienteAtendido(clienteAtendido);
    setProximaOportunidade(proxima);
    setProximaModalOpen(true);
  }

  const handleClienteCriado = useCallback((c) => {
    setClientes(prev => [c, ...prev]);
  }, []);

  const handleResultadoAtualizado = useCallback((atualizado) => {
    setClientes(prev => {
      const nova = prev.map(c => c.id === atualizado.id ? atualizado : c);
      // Se há callback do modo ataque, delega para ele; senão abre modal normal
      if (modoAtaqueCallbackRef.current) {
        modoAtaqueCallbackRef.current(atualizado);
        modoAtaqueCallbackRef.current = null;
      } else {
        abrirProximaOportunidade(atualizado, nova);
      }
      return nova;
    });
  }, [clientes]);

  const handleIniciarMissao = useCallback((missao, clientesMissao) => {
    setExecucaoMissao(missao);
    setExecucaoClientes(clientesMissao);
    setAba("execucao");
  }, []);

  const handleVoltarMissao = useCallback(() => {
    setExecucaoMissao(null);
    setExecucaoClientes([]);
    setAba("plano");
  }, []);

  function abrirWhatsApp(c, mid, callbackOverride) {
    modoAtaqueCallbackRef.current = callbackOverride || null;
    setWhatsAppCliente(c);
    setWhatsAppMissaoId(mid || null);
  }

  function handleExecutarProxima(cliente) {
    setProximaModalOpen(false);
    setProximaOportunidade(null);
    abrirWhatsApp(cliente, null);
  }

  function handleVoltarCarteira() {
    setProximaModalOpen(false);
    setProximaOportunidade(null);
  }

  function handleEntrarModoAtaque() {
    setProximaModalOpen(false);
    setProximaOportunidade(null);
    setModoAtaqueAtivo(true);
  }

  function handleSairModoAtaque() {
    setModoAtaqueAtivo(false);
  }

  // ── Detecção de retorno do WhatsApp no Modo Ataque ───────────────────────
  useEffect(() => {
    if (!modoAtaqueAtivo) return;
    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      const raw = sessionStorage.getItem(WA_KEY);
      if (!raw) return;
      const dados = JSON.parse(raw);
      const elapsed = Date.now() - dados.ts;
      if (elapsed <= 120000 && dados.origem === "script_ia_whatsapp") {
        const cliente = clientes.find(c => c.id === dados.clienteId);
        if (cliente) {
          sessionStorage.removeItem(WA_KEY);
          setWhatsAppAutoExpandir(true);
          setWhatsAppCliente(cliente);
          setWhatsAppMissaoId(null);
        }
      } else if (elapsed > 120000) {
        sessionStorage.removeItem(WA_KEY);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [modoAtaqueAtivo, clientes]);

  // Modo Ataque — renderiza a tela completa sobrepondo o resto
  if (modoAtaqueAtivo) {
    return (
      <>
        <ModoAtaque
          clientes={clientes}
          onSair={handleSairModoAtaque}
          onWhatsApp={abrirWhatsApp}
          onFicha={(id) => setFichaClienteId(id)}
          onPlanoAtaque={() => { handleSairModoAtaque(); setAba("plano"); }}
          onResultadoRegistrado={handleResultadoAtualizado}
        />
        {/* WhatsApp e Ficha ainda disponíveis em modo ataque */}
        <WhatsAppRoteiro
          open={!!whatsAppCliente}
          onClose={() => { setWhatsAppCliente(null); setWhatsAppMissaoId(null); setWhatsAppAutoExpandir(false); modoAtaqueCallbackRef.current = null; }}
          cliente={whatsAppCliente}
          missaoId={whatsAppMissaoId}
          onResultadoRegistrado={handleResultadoAtualizado}
          autoExpandirRegistro={whatsAppAutoExpandir}
        />
        <FichaClienteSheet
          open={!!fichaClienteId}
          clienteId={fichaClienteId}
          onClose={() => setFichaClienteId(null)}
          onAtualizado={handleResultadoAtualizado}
          onExecutar={(c) => { setFichaClienteId(null); abrirWhatsApp(c, null); }}
        />
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#005BFF] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6 bg-surface-alt">

        {aba !== "execucao" && (
          <div className="flex gap-1 bg-white border border-slate-100 rounded-2xl p-1 w-fit shadow-sm">
            {[
              { id: "carteira", label: "Carteira Ativa" },
              { id: "plano", label: "Plano de Ataque" },
            ].map(t => (
              <button key={t.id} onClick={() => setAba(t.id)}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${aba === t.id ? "bg-[#005BFF] text-white shadow-sm" : "text-slate-500 hover:text-[#031B3D]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        )}

        {aba === "carteira" && (
          <CarteiraAtivaTab
            clientes={clientes}
            onNovoCliente={() => setNovoClienteOpen(true)}
            onWhatsApp={abrirWhatsApp}
            onFicha={(id) => setFichaClienteId(id)}
            onResultadoAtualizado={handleResultadoAtualizado}
          />
        )}

        {aba === "plano" && (
          <PlanoAtaqueTab
            clientes={clientes}
            perfil={perfil || user}
            onIniciarMissao={handleIniciarMissao}
            missaoAtiva={execucaoMissao}
            onWhatsApp={abrirWhatsApp}
            onFicha={(id) => setFichaClienteId(id)}
          />
        )}

        {aba === "execucao" && execucaoMissao && (
          <ExecucaoMissao
            missao={execucaoMissao}
            clientes={execucaoClientes}
            onVoltar={handleVoltarMissao}
            onConcluida={handleVoltarMissao}
          />
        )}

        {/* Modais globais */}
        <NovoClienteModal
          open={novoClienteOpen}
          onClose={() => setNovoClienteOpen(false)}
          onCriado={handleClienteCriado}
          vendedorId={user?.id}
        />

        <WhatsAppRoteiro
          open={!!whatsAppCliente}
          onClose={() => { setWhatsAppCliente(null); setWhatsAppMissaoId(null); setWhatsAppAutoExpandir(false); }}
          cliente={whatsAppCliente}
          missaoId={whatsAppMissaoId}
          onResultadoRegistrado={handleResultadoAtualizado}
          autoExpandirRegistro={whatsAppAutoExpandir}
        />

        <FichaClienteSheet
          open={!!fichaClienteId}
          clienteId={fichaClienteId}
          onClose={() => setFichaClienteId(null)}
          onAtualizado={handleResultadoAtualizado}
          onExecutar={(c) => { setFichaClienteId(null); abrirWhatsApp(c, null); }}
        />

        {/* Retorno automático do WhatsApp */}
        <RetornoWhatsAppModal
          open={retornoWaOpen}
          cliente={retornoWaCliente}
          resultado={retornoWaResultado}
          onResultado={handleRetornoWaConfirmar}
          onIgnorar={() => { setRetornoWaOpen(false); sessionStorage.removeItem(WA_KEY); }}
        />

        {/* Próxima oportunidade (fluxo contínuo) */}
        <ProximaOportunidadeModal
          open={proximaModalOpen}
          proximaOportunidade={proximaOportunidade}
          onExecutar={handleExecutarProxima}
          onVoltarCarteira={handleVoltarCarteira}
          onClose={handleVoltarCarteira}
          onEntrarModoAtaque={handleEntrarModoAtaque}
        />
    </div>
  );
}
