import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, Plus, Eye, Pencil, Ban, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import NovaPoliticaModal from "@/components/remuneracao/NovaPoliticaModal";
import NovaFaixaModal from "@/components/remuneracao/NovaFaixaModal";
import NovaPremiacaoModal from "@/components/remuneracao/NovaPremiacaoModal";
import NovaBonificacaoModal from "@/components/remuneracao/NovaBonificacaoModal";

// ── Permissões ──────────────────────────────────────────────────────────────
const ROLES_ALLOWED = ["admin", "dono", "administrador", "rh", "gestor", "gerente"];
const ROLES_WRITE   = ["admin", "dono", "administrador", "rh"];

function hasAccess(role) {
  return ROLES_ALLOWED.includes((role || "").toLowerCase());
}
function canWrite(role) {
  return ROLES_WRITE.includes((role || "").toLowerCase());
}

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtCurrency = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtDate = d => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

const statusBadge = status => {
  const map = { Ativa: "bg-green-100 text-green-700", Inativa: "bg-slate-100 text-slate-500", Rascunho: "bg-yellow-100 text-yellow-700", Encerrada: "bg-red-100 text-red-500" };
  return `inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${map[status] || "bg-slate-100 text-slate-500"}`;
};

// ── Simulador ────────────────────────────────────────────────────────────────
function calcularSimulacao(politica, faixas, premiacoes, bonificacoes, qtdVendas, valorTotal) {
  if (!politica || !qtdVendas) return null;
  const faixasAtivas = faixas
    .filter(f => f.politica_id === politica.id && f.status === "Ativa")
    .sort((a, b) => a.quantidade_inicial - b.quantidade_inicial);

  const getFaixa = qty => {
    let f = null;
    for (const fx of faixasAtivas) {
      if (qty >= fx.quantidade_inicial) {
        if (!fx.quantidade_final || qty <= fx.quantidade_final) { f = fx; break; }
        else f = fx;
      }
    }
    return f;
  };

  const faixaAtual = getFaixa(qtdVendas);
  let comissao = 0;
  if (faixaAtual) {
    if (faixaAtual.tipo === "Valor fixo por veículo") comissao = qtdVendas * faixaAtual.valor;
    else comissao = (valorTotal || 0) * (faixaAtual.valor / 100);
  }

  // Premiações
  const premAtivas = premiacoes.filter(p => p.politica_id === politica.id && p.status === "Ativa" && p.quantidade_vendas_necessarias <= qtdVendas);
  let totalPremio = 0;
  if (premAtivas.length > 0) {
    if (premAtivas[0].tipo_premiacao === "Acumulativa") totalPremio = premAtivas.reduce((s, p) => s + p.valor_premio, 0);
    else totalPremio = Math.max(...premAtivas.map(p => p.valor_premio));
  }

  // Bonificações ativas
  const bonusTotal = bonificacoes.filter(b => b.status === "Ativa").reduce((s, b) => s + b.valor, 0);

  // Próxima faixa
  const proxIdx = faixasAtivas.findIndex(f => f === faixaAtual) + 1;
  const proxFaixa = faixasAtivas[proxIdx] || null;
  let proxSalto = null;
  if (proxFaixa) {
    const qtdProx = proxFaixa.quantidade_inicial;
    let comissaoProx = 0;
    if (proxFaixa.tipo === "Valor fixo por veículo") comissaoProx = qtdProx * proxFaixa.valor;
    else comissaoProx = (valorTotal || 0) * (proxFaixa.valor / 100);
    proxSalto = {
      faixa: proxFaixa,
      qtdNecessaria: qtdProx,
      faltam: qtdProx - qtdVendas,
      comissaoAtual: comissao,
      comissaoProx,
      ganhoAdicional: comissaoProx - comissao,
    };
  }

  return {
    faixaAtual,
    comissao,
    totalPremio,
    bonusTotal,
    total: comissao + totalPremio + bonusTotal,
    proxSalto,
  };
}

// ── ABAS ─────────────────────────────────────────────────────────────────────
const TABS = ["Políticas", "Faixas de comissão", "Premiações", "Bonificações", "Simulador", "Histórico"];

export default function Remuneracao() {
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [tab, setTab] = useState("Políticas");

  const [politicas, setPoliticas] = useState([]);
  const [faixas, setFaixas] = useState([]);
  const [premiacoes, setPremiacoes] = useState([]);
  const [bonificacoes, setBonificacoes] = useState([]);
  const [historico, setHistorico] = useState([]);

  const [modalPolitica, setModalPolitica] = useState(false);
  const [modalFaixa, setModalFaixa] = useState(false);
  const [modalPremiacao, setModalPremiacao] = useState(false);
  const [modalBonificacao, setModalBonificacao] = useState(false);

  // Simulador
  const [simPoliticaId, setSimPoliticaId] = useState("");
  const [simQtd, setSimQtd] = useState("");
  const [simValor, setSimValor] = useState("");
  const [simResultado, setSimResultado] = useState(null);

  const carregarDados = async () => {
    setErro(false);
    setLoading(true);
    try {
      const [usuario, pols, fxs, prems, bons, hist] = await Promise.all([
        base44.auth.me().catch(() => null),
        base44.entities.PoliticaRemuneracao.list("-created_date", 200).catch(() => []),
        base44.entities.FaixaComissao.list("-created_date", 500).catch(() => []),
        base44.entities.PremiacaoRemuneracao.list("-created_date", 500).catch(() => []),
        base44.entities.BonificacaoRemuneracao.list("-created_date", 200).catch(() => []),
        base44.entities.HistoricoRemuneracao.list("-created_date", 100).catch(() => []),
      ]);
      setMe(usuario);
      setPoliticas(pols);
      setFaixas(fxs);
      setPremiacoes(prems);
      setBonificacoes(bons);
      setHistorico(hist);
    } catch {
      setErro(true);
    }
    setLoading(false);
  };

  useEffect(() => { carregarDados(); }, []);

  const inativarPolitica = async (pol) => {
    await base44.entities.PoliticaRemuneracao.update(pol.id, { status: "Inativa" });
    await base44.entities.HistoricoRemuneracao.create({
      usuario_id: me?.id || "", usuario_nome: me?.full_name || "",
      acao: "Política inativada", entidade: "PoliticaRemuneracao", entidade_id: pol.id,
      dados_antes: JSON.stringify(pol), dados_depois: JSON.stringify({ ...pol, status: "Inativa" }),
    }).catch(() => {});
    setPoliticas(ps => ps.map(p => p.id === pol.id ? { ...p, status: "Inativa" } : p));
  };

  const simPolitica = useMemo(() => politicas.find(p => p.id === simPoliticaId), [politicas, simPoliticaId]);

  const handleSimular = () => {
    const r = calcularSimulacao(simPolitica, faixas, premiacoes, bonificacoes, Number(simQtd), Number(simValor));
    setSimResultado(r);
  };

  // Stats cards
  const statsCards = [
    { label: "Políticas ativas", value: politicas.filter(p => p.status === "Ativa").length, color: "text-[#00A896]" },
    { label: "Vendedores vinculados", value: new Set(politicas.filter(p => p.vendedor_id).map(p => p.vendedor_id)).size, color: "text-blue-600" },
    { label: "Premiações ativas", value: premiacoes.filter(p => p.status === "Ativa").length, color: "text-yellow-600" },
    { label: "Bonificações em andamento", value: bonificacoes.filter(b => b.status === "Ativa").length, color: "text-purple-600" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#00A896] rounded-full animate-spin" />
      </div>
    );
  }

  if (me && !hasAccess(me.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <Ban className="w-10 h-10 text-slate-200" />
        <p className="text-[15px] font-bold text-[#0F172A]">Acesso restrito</p>
        <p className="text-[13px] text-slate-400">Você não tem permissão para acessar este módulo.</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
        <p className="text-[15px] font-bold text-[#0F172A]">Não foi possível carregar as configurações de remuneração.</p>
        <p className="text-[13px] text-slate-400">Tente novamente em alguns instantes.</p>
        <Button onClick={carregarDados} className="gap-2"><RefreshCw className="w-4 h-4" /> Tentar novamente</Button>
      </div>
    );
  }

  const write = canWrite(me?.role);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-body">
      {/* Topbar */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 h-[64px] flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00A896] to-emerald-400 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
              <span>Departamento</span><ChevronRight className="w-3 h-3" /><span>RH</span><ChevronRight className="w-3 h-3" />
            </div>
            <h1 className="text-[18px] font-black text-[#0F172A] tracking-tight leading-none">Remuneração</h1>
          </div>
        </div>
        {write && (
          <Button className="bg-[#00A896] hover:bg-[#008f7e] text-white gap-2 font-bold" onClick={() => setModalPolitica(true)}>
            <Plus className="w-4 h-4" /> Nova política
          </Button>
        )}
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Subtítulo */}
        <p className="text-[13px] text-slate-500">Configure políticas de comissão, premiações e bonificações da equipe comercial.</p>

        {/* Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statsCards.map(c => (
            <div key={c.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">{c.label}</p>
              <p className={`text-[28px] font-black mt-1 ${c.color}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-[13px] font-bold whitespace-nowrap border-b-2 transition-all ${
                  tab === t ? "text-[#00A896] border-[#00A896]" : "text-slate-400 border-transparent hover:text-slate-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* ── ABA POLÍTICAS ── */}
            {tab === "Políticas" && (
              <div>
                {politicas.length === 0 ? (
                  <div className="text-center py-16">
                    <DollarSign className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-[15px] font-bold text-[#0F172A] mb-1">Nenhuma política de remuneração cadastrada.</p>
                    <p className="text-[13px] text-slate-400 mb-4">Crie a primeira política para começar a calcular comissões, premiações e bonificações da equipe.</p>
                    {write && <Button className="bg-[#00A896] hover:bg-[#008f7e] text-white gap-2" onClick={() => setModalPolitica(true)}><Plus className="w-4 h-4" /> Nova política</Button>}
                  </div>
                ) : (
                  <>
                    {write && (
                      <div className="flex justify-end mb-3">
                        <Button className="bg-[#00A896] hover:bg-[#008f7e] text-white gap-2 text-[13px]" onClick={() => setModalPolitica(true)}><Plus className="w-4 h-4" /> Nova política</Button>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {["Nome da política", "Loja", "Departamento", "Cargo", "Tipo de comissão", "Período", "Vigência", "Status", "Ações"].map(h => (
                              <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {politicas.map(p => (
                            <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-3 font-semibold text-[#0F172A] max-w-[200px] truncate">{p.nome}</td>
                              <td className="py-3 px-3 text-slate-600">{p.loja_nome || "—"}</td>
                              <td className="py-3 px-3 text-slate-600">{p.departamento || "—"}</td>
                              <td className="py-3 px-3 text-slate-600">{p.cargo || "—"}</td>
                              <td className="py-3 px-3 text-slate-600 max-w-[160px] truncate">{p.tipo_comissao}</td>
                              <td className="py-3 px-3 text-slate-600">{p.periodo_apuracao}</td>
                              <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{fmtDate(p.data_inicio)}{p.data_fim ? ` a ${fmtDate(p.data_fim)}` : ""}</td>
                              <td className="py-3 px-3"><span className={statusBadge(p.status)}>{p.status}</span></td>
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-1">
                                  <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Visualizar"><Eye className="w-3.5 h-3.5" /></button>
                                  {write && <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>}
                                  {write && p.status === "Ativa" && (
                                    <button className="p-1.5 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors" title="Inativar" onClick={() => inativarPolitica(p)}>
                                      <Ban className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── ABA FAIXAS ── */}
            {tab === "Faixas de comissão" && (
              <div>
                {write && (
                  <div className="flex justify-end mb-3">
                    <Button className="bg-[#00A896] hover:bg-[#008f7e] text-white gap-2 text-[13px]" onClick={() => setModalFaixa(true)}><Plus className="w-4 h-4" /> Nova faixa</Button>
                  </div>
                )}
                {faixas.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-[13px]">Nenhuma faixa cadastrada. Crie uma política primeiro, depois adicione faixas.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Política", "De veículos", "Até veículos", "Tipo", "Valor", "Status", "Ações"].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {faixas.map(f => (
                          <tr key={f.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 px-3 font-medium text-[#0F172A] max-w-[200px] truncate">{f.politica_nome || "—"}</td>
                            <td className="py-3 px-3 text-slate-600">{f.quantidade_inicial}</td>
                            <td className="py-3 px-3 text-slate-600">{f.quantidade_final ?? "em diante"}</td>
                            <td className="py-3 px-3 text-slate-600 max-w-[180px] truncate">{f.tipo}</td>
                            <td className="py-3 px-3 font-semibold text-emerald-700">
                              {f.tipo === "Percentual sobre valor vendido" ? `${f.valor}%` : fmtCurrency(f.valor)}
                            </td>
                            <td className="py-3 px-3"><span className={statusBadge(f.status)}>{f.status}</span></td>
                            <td className="py-3 px-3">
                              {write && <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA PREMIAÇÕES ── */}
            {tab === "Premiações" && (
              <div>
                {write && (
                  <div className="flex justify-end mb-3">
                    <Button className="bg-[#00A896] hover:bg-[#008f7e] text-white gap-2 text-[13px]" onClick={() => setModalPremiacao(true)}><Plus className="w-4 h-4" /> Nova premiação</Button>
                  </div>
                )}
                {premiacoes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-[13px]">Nenhuma premiação cadastrada.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Política", "Gatilho", "Valor do prêmio", "Tipo", "Status", "Ações"].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {premiacoes.map(p => (
                          <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 px-3 font-medium text-[#0F172A] max-w-[200px] truncate">{p.politica_nome || "—"}</td>
                            <td className="py-3 px-3 text-slate-600">Ao atingir {p.quantidade_vendas_necessarias} vendas</td>
                            <td className="py-3 px-3 font-semibold text-emerald-700">{fmtCurrency(p.valor_premio)}</td>
                            <td className="py-3 px-3 text-slate-600">{p.tipo_premiacao}</td>
                            <td className="py-3 px-3"><span className={statusBadge(p.status)}>{p.status}</span></td>
                            <td className="py-3 px-3">
                              {write && <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA BONIFICAÇÕES ── */}
            {tab === "Bonificações" && (
              <div>
                {write && (
                  <div className="flex justify-end mb-3">
                    <Button className="bg-[#00A896] hover:bg-[#008f7e] text-white gap-2 text-[13px]" onClick={() => setModalBonificacao(true)}><Plus className="w-4 h-4" /> Nova bonificação</Button>
                  </div>
                )}
                {bonificacoes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-[13px]">Nenhuma bonificação cadastrada.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Nome", "Tipo", "Critério", "Valor", "Vigência", "Aplicável para", "Status", "Ações"].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {bonificacoes.map(b => (
                          <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 px-3 font-semibold text-[#0F172A]">{b.nome}</td>
                            <td className="py-3 px-3 text-slate-600 max-w-[140px] truncate">{b.tipo}</td>
                            <td className="py-3 px-3 text-slate-500 max-w-[180px] truncate">{b.criterio || "—"}</td>
                            <td className="py-3 px-3 font-semibold text-emerald-700">{fmtCurrency(b.valor)}</td>
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{fmtDate(b.data_inicio)}{b.data_fim ? ` a ${fmtDate(b.data_fim)}` : ""}</td>
                            <td className="py-3 px-3 text-slate-600">{b.aplicavel_para || "—"}</td>
                            <td className="py-3 px-3"><span className={statusBadge(b.status)}>{b.status}</span></td>
                            <td className="py-3 px-3">
                              {write && <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Editar"><Pencil className="w-3.5 h-3.5" /></button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── ABA SIMULADOR ── */}
            {tab === "Simulador" && (
              <div className="max-w-xl mx-auto space-y-4">
                <p className="text-[13px] text-slate-500">Simule a remuneração de um vendedor com base em uma política cadastrada.</p>
                <div>
                  <label className="block text-[13px] font-semibold text-slate-700 mb-1">Política de remuneração</label>
                  <select
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#00A896]"
                    value={simPoliticaId}
                    onChange={e => { setSimPoliticaId(e.target.value); setSimResultado(null); }}
                  >
                    <option value="">Selecione uma política</option>
                    {politicas.filter(p => p.status === "Ativa").map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Quantidade de veículos vendidos</label>
                    <input type="number" min={0} value={simQtd} onChange={e => { setSimQtd(e.target.value); setSimResultado(null); }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#00A896]" placeholder="Ex: 7" />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-slate-700 mb-1">Valor total vendido (R$)</label>
                    <input type="number" min={0} value={simValor} onChange={e => { setSimValor(e.target.value); setSimResultado(null); }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#00A896]" placeholder="Ex: 490000" />
                  </div>
                </div>
                <Button className="w-full bg-[#00A896] hover:bg-[#008f7e] text-white font-bold" onClick={handleSimular} disabled={!simPoliticaId || !simQtd}>
                  Simular remuneração
                </Button>

                {simResultado && (
                  <div className="space-y-3 pt-2">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-2">
                      <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-3">Resultado da simulação</p>
                      <div className="grid grid-cols-2 gap-2 text-[13px]">
                        <div><span className="text-slate-500">Faixa atingida:</span><br /><span className="font-bold text-[#0F172A]">{simResultado.faixaAtual ? `${simResultado.faixaAtual.quantidade_inicial}–${simResultado.faixaAtual.quantidade_final ?? "∞"} veículos` : "Sem faixa"}</span></div>
                        <div><span className="text-slate-500">Comissão estimada:</span><br /><span className="font-bold text-emerald-700">{fmtCurrency(simResultado.comissao)}</span></div>
                        <div><span className="text-slate-500">Premiações:</span><br /><span className="font-bold text-emerald-700">{fmtCurrency(simResultado.totalPremio)}</span></div>
                        <div><span className="text-slate-500">Bonificações:</span><br /><span className="font-bold text-emerald-700">{fmtCurrency(simResultado.bonusTotal)}</span></div>
                      </div>
                      <div className="border-t border-emerald-200 pt-3 mt-2">
                        <span className="text-[12px] text-slate-500">Total estimado</span>
                        <p className="text-[28px] font-black text-emerald-700">{fmtCurrency(simResultado.total)}</p>
                      </div>
                    </div>

                    {simResultado.proxSalto && (
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
                        <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wide mb-3">Próximo salto</p>
                        <div className="space-y-1 text-[13px]">
                          <p className="text-slate-600">Próxima faixa: <span className="font-bold text-[#0F172A]">{simResultado.proxSalto.faixa.quantidade_inicial}+ veículos</span></p>
                          <p className="text-slate-600">Faltam: <span className="font-bold text-[#0F172A]">{simResultado.proxSalto.faltam} veículo(s)</span></p>
                          <div className="border-t border-blue-100 pt-2 mt-2 space-y-1">
                            <p className="text-slate-500">Comissão atual: <span className="font-semibold">{fmtCurrency(simResultado.proxSalto.comissaoAtual)}</span></p>
                            <p className="text-slate-500">Comissão na próxima faixa: <span className="font-semibold text-blue-700">{fmtCurrency(simResultado.proxSalto.comissaoProx)}</span></p>
                            <p className="text-[14px] font-bold text-blue-700">Ganho adicional: +{fmtCurrency(simResultado.proxSalto.ganhoAdicional)}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── ABA HISTÓRICO ── */}
            {tab === "Histórico" && (
              <div>
                {historico.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-[13px]">Nenhuma alteração registrada ainda.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-slate-100">
                          {["Data", "Usuário", "Ação", "Entidade alterada"].map(h => (
                            <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {historico.map(h => (
                          <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                              {h.created_date ? new Date(h.created_date).toLocaleString("pt-BR") : "—"}
                            </td>
                            <td className="py-3 px-3 font-medium text-[#0F172A]">{h.usuario_nome || "—"}</td>
                            <td className="py-3 px-3 text-slate-600">{h.acao}</td>
                            <td className="py-3 px-3 text-slate-500">{h.entidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modais */}
      <NovaPoliticaModal open={modalPolitica} onClose={() => setModalPolitica(false)} onSaved={p => setPoliticas(ps => [p, ...ps])} me={me} />
      <NovaFaixaModal open={modalFaixa} onClose={() => setModalFaixa(false)} onSaved={f => setFaixas(fs => [f, ...fs])} politicas={politicas} me={me} />
      <NovaPremiacaoModal open={modalPremiacao} onClose={() => setModalPremiacao(false)} onSaved={p => setPremiacoes(ps => [p, ...ps])} politicas={politicas} me={me} />
      <NovaBonificacaoModal open={modalBonificacao} onClose={() => setModalBonificacao(false)} onSaved={b => setBonificacoes(bs => [b, ...bs])} me={me} />
    </div>
  );
}