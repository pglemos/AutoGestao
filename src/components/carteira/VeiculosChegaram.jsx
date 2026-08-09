import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Users, X, ArrowLeft, Car } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { calcularPrioridade } from "./carteiraUtils";

// ─── COMPATIBILIDADE ──────────────────────────────────────────────────────────
function normalizar(str) {
  return (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").trim();
}

function clientesCompativeis(clientes, veiculo) {
  const termos = [veiculo.marca, veiculo.modelo, veiculo.versao, veiculo.ano]
    .filter(Boolean)
    .map(normalizar);

  return clientes.filter(c => {
    const interesse = normalizar(c.veiculo_interesse || "");
    if (!interesse) return false;
    return termos.some(t => t && interesse.includes(t));
  }).sort((a, b) => {
    const ordP = { Máxima: 0, Alta: 1, Média: 2, Baixa: 3 };
    return (ordP[calcularPrioridade(a)] ?? 3) - (ordP[calcularPrioridade(b)] ?? 3);
  });
}

// ─── MODAL REGISTRAR VEÍCULO ─────────────────────────────────────────────────
function ModalRegistrarVeiculo({ onClose, onSalvo }) {
  const [form, setForm] = useState({
    marca: "", modelo: "", versao: "", ano: new Date().getFullYear().toString(),
    preco: "", data_entrada: new Date().toISOString().split("T")[0], observacao: "",
  });
  const [salvando, setSalvando] = useState(false);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  async function salvar() {
    if (!form.marca || !form.modelo) return;
    setSalvando(true);
    const me = await base44.auth.me().catch(() => null);
    const novo = await base44.entities.VeiculoChegado.create({
      ...form,
      preco: form.preco ? parseFloat(form.preco) : undefined,
      vendedor_id: me?.id,
    });
    setSalvando(false);
    onSalvo(novo);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-black text-[#031B3D]">Registrar veículo que chegou</p>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "marca", label: "Marca *", placeholder: "Honda" },
            { k: "modelo", label: "Modelo *", placeholder: "HR-V" },
            { k: "versao", label: "Versão", placeholder: "EXL" },
            { k: "ano", label: "Ano", placeholder: "2024" },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</p>
              <input
                value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
                className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-1">Preço (opcional)</p>
            <input
              type="number" value={form.preco} onChange={e => set("preco", e.target.value)} placeholder="Ex: 120000"
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
            />
          </div>
          <div>
            <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-1">Data de entrada</p>
            <input
              type="date" value={form.data_entrada} onChange={e => set("data_entrada", e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-200 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
            />
          </div>
        </div>

        <div>
          <p className="text-caption font-bold text-slate-400 uppercase tracking-wide mb-1">Observação (opcional)</p>
          <textarea
            value={form.observacao} onChange={e => set("observacao", e.target.value)} rows={2}
            placeholder="Ex: baixo km, único dono..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-[#005BFF]"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={salvar} disabled={!form.marca || !form.modelo || salvando}
            className="flex-1 rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white">
            {salvando ? "Salvando..." : "Salvar veículo"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD DO VEÍCULO ──────────────────────────────────────────────────────────
function CardVeiculo({ veiculo, compatíveis, onClick }) {
  const diasAtras = Math.floor((Date.now() - new Date(veiculo.data_entrada)) / 86400000);
  const entradaLabel = diasAtras === 0 ? "Entrou hoje" : diasAtras === 1 ? "Entrou ontem" : `Entrou há ${diasAtras} dias`;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-[#005BFF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-[#031B3D] truncate">{veiculo.marca} {veiculo.modelo} {veiculo.versao}</p>
          <p className="text-xs text-slate-400">{veiculo.ano}{veiculo.preco ? ` · R$ ${veiculo.preco.toLocaleString("pt-BR")}` : ""}</p>
          <p className="text-caption text-[#005BFF] font-semibold mt-0.5">{entradaLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className={`text-xs font-bold ${compatíveis > 0 ? "text-[#031B3D]" : "text-slate-400"}`}>
            {compatíveis} cliente{compatíveis !== 1 ? "s" : ""} compatível{compatíveis !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <Button
        onClick={() => onClick(veiculo)}
        disabled={compatíveis === 0}
        className="w-full rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white text-sm gap-1.5 disabled:opacity-40"
      >
        <Zap className="w-4 h-4" /> Iniciar ataque
      </Button>
    </div>
  );
}

// ─── TELA DE ATAQUE DO VEÍCULO ────────────────────────────────────────────────
function AtaqueVeiculo({ veiculo, clientes, onVoltar, onExecutar, onFicha }) {
  const lista = useMemo(() => clientesCompativeis(clientes, veiculo), [clientes, veiculo]);

  return (
    <div className="space-y-5">
      <button onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-[#005BFF] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Voltar aos veículos
      </button>

      <div className="bg-gradient-to-r from-[#005BFF] to-blue-600 rounded-2xl p-5 text-white">
        <p className="text-caption font-bold text-blue-300 uppercase tracking-wider">Veículo que chegou</p>
        <p className="text-xl font-black mt-1">{veiculo.marca} {veiculo.modelo} {veiculo.versao}</p>
        <p className="text-sm text-blue-200">{veiculo.ano}{veiculo.preco ? ` · R$ ${veiculo.preco.toLocaleString("pt-BR")}` : ""}</p>
        <p className="text-xs text-blue-300 mt-2">Próximo passo sugerido: <strong className="text-white">Apresentar veículo recém-chegado</strong></p>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm font-semibold text-slate-500">Nenhum cliente compatível encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">Verifique os veículos de interesse registrados na carteira.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{lista.length} cliente{lista.length !== 1 ? "s" : ""} compatível{lista.length !== 1 ? "s" : ""}</p>
          {lista.map(c => {
            const situacao = c.situacao_atual || c.momento || "—";
            const iniciais = (c.nome || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
            const temUrgente = ["Visita hoje", "Em negociação ativa", "Proposta enviada", "Financiamento aprovado sem compra"].includes(situacao);

            return (
              <div key={c.id} className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center text-xs font-black text-[#005BFF] shrink-0">{iniciais}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-[#031B3D] truncate">{c.nome}</p>
                    {temUrgente && (
                      <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                        Próximo passo urgente
                      </span>
                    )}
                    <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 shrink-0">
                      Veículo compatível chegou
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 truncate">{c.veiculo_interesse} · {situacao}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => onExecutar(c, veiculo)}
                    className="flex items-center gap-1 text-caption font-bold text-white bg-[#005BFF] hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition-colors">
                    <Zap className="w-3 h-3" /> Executar
                  </button>
                  <button onClick={() => onFicha(c.id)}
                    className="text-caption font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors">
                    Ficha
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FAIXAS DE PREÇO ─────────────────────────────────────────────────────────
const FAIXAS_PRECO = [
  { id: "todas", label: "Todas as faixas", min: 0, max: Infinity },
  { id: "ate_50k", label: "Até R$ 50k", min: 0, max: 50000 },
  { id: "50k_80k", label: "R$ 50k - 80k", min: 50000, max: 80000 },
  { id: "80k_120k", label: "R$ 80k - 120k", min: 80000, max: 120000 },
  { id: "120k_180k", label: "R$ 120k - 180k", min: 120000, max: 180000 },
  { id: "acima_180k", label: "Acima de R$ 180k", min: 180000, max: Infinity },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
export default function VeiculosChegaram({ clientes, onExecutar, onFicha }) {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [veiculoAtaque, setVeiculoAtaque] = useState(null);
  const [faixaPrecoAtiva, setFaixaPrecoAtiva] = useState("todas");

  useEffect(() => {
    // Carregar veículos dos últimos 7 dias
    const limite = new Date();
    limite.setDate(limite.getDate() - 7);
    const limiteStr = limite.toISOString().split("T")[0];

    base44.entities.VeiculoChegado.filter({ data_entrada: { $gte: limiteStr } }, "-data_entrada", 50)
      .then(vs => setVeiculos(vs || []))
      .catch(() => setVeiculos([]))
      .finally(() => setLoading(false));
  }, []);

  const countsFaixa = useMemo(() => {
    const map = {};
    for (const f of FAIXAS_PRECO) {
      if (f.id === "todas") {
        map[f.id] = veiculos.length;
      } else {
        map[f.id] = veiculos.filter(v => {
          const p = Number(v.preco) || 0;
          return p >= f.min && p <= f.max;
        }).length;
      }
    }
    return map;
  }, [veiculos]);

  const veiculosFiltrados = useMemo(() => {
    if (faixaPrecoAtiva === "todas") return veiculos;
    const f = FAIXAS_PRECO.find(x => x.id === faixaPrecoAtiva);
    if (!f) return veiculos;
    return veiculos.filter(v => {
      const p = Number(v.preco) || 0;
      return p >= f.min && p <= f.max;
    });
  }, [veiculos, faixaPrecoAtiva]);

  function handleSalvo(novo) {
    setVeiculos(prev => [novo, ...prev]);
  }

  function handleExecutarCompativel(cliente, veiculo) {
    // Usa o script dedicado de "veículo chegou" em vez do próximo passo genérico do cliente
    onExecutar(cliente, "veiculo_chegou");
  }

  if (veiculoAtaque) {
    return (
      <AtaqueVeiculo
        veiculo={veiculoAtaque}
        clientes={clientes}
        onVoltar={() => setVeiculoAtaque(null)}
        onExecutar={handleExecutarCompativel}
        onFicha={onFicha}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-[#031B3D]">Veículos que chegaram</h2>
          <p className="text-sm text-slate-400 mt-0.5">Encontre clientes da carteira interessados nos veículos recém-entrados.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} variant="outline" className="rounded-xl text-sm gap-1.5 border-[#005BFF] text-[#005BFF] hover:bg-blue-50 whitespace-nowrap">
          <Plus className="w-4 h-4" /> Registrar veículo
        </Button>
      </div>

      {/* Categorização por Faixa de Preço */}
      {veiculos.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-caption font-bold text-slate-400 uppercase tracking-wide mr-1 shrink-0">Faixa de preço:</span>
          {FAIXAS_PRECO.map(f => {
            const count = countsFaixa[f.id] ?? 0;
            const ativo = faixaPrecoAtiva === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFaixaPrecoAtiva(f.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                  ativo
                    ? "bg-[#005BFF] text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 border border-slate-100 hover:bg-slate-100"
                }`}
              >
                {f.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-[#005BFF] rounded-full animate-spin" />
        </div>
      ) : veiculosFiltrados.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center">
          <p className="text-3xl mb-2">🚗</p>
          <p className="text-sm font-semibold text-slate-500">
            {veiculos.length === 0
              ? "Nenhum veículo recém-chegado registrado no momento."
              : "Nenhum veículo encontrado nesta faixa de preço."}
          </p>
          {veiculos.length > 0 ? (
            <button
              onClick={() => setFaixaPrecoAtiva("todas")}
              className="mt-3 text-xs text-[#005BFF] font-bold hover:underline"
            >
              Ver todas as faixas de preço
            </button>
          ) : (
            <Button onClick={() => setModalOpen(true)} className="mt-4 rounded-xl bg-[#005BFF] hover:bg-blue-700 text-white text-sm gap-1.5">
              <Plus className="w-4 h-4" /> Registrar veículo que chegou
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {veiculosFiltrados.map(v => (
            <CardVeiculo
              key={v.id}
              veiculo={v}
              compatíveis={clientesCompativeis(clientes, v).length}
              onClick={setVeiculoAtaque}
            />
          ))}
        </div>
      )}

      {modalOpen && <ModalRegistrarVeiculo onClose={() => setModalOpen(false)} onSalvo={handleSalvo} />}
    </div>
  );
}