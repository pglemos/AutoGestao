import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Users, ArrowLeft, Car, CheckCircle2, AlertTriangle, Pencil } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { calcularPrioridade } from "./carteiraUtils";
import { resolveCatalogModel, VEHICLE_CATEGORY_OPTIONS, vehicleCategoryLabel } from "@/features/mentor-comercial/catalog/vehicleCatalog";
import { matchVehicleAgainstOpportunities } from "@/features/mentor-comercial/engine/vehicleMatch";
import { captureVehicleMatch, captureCatalogUnresolved, captureCatalogAmbiguous } from "@/features/mentor-comercial/observability/mentorTelemetry";
import { toast } from "@/lib/toast";

// ─── MATCH VIA MOTOR MENTOR (PRODUCT DELTA 2026-08-07 §19) ───────────────────
function perfisOportunidades(clientes) {
  return clientes.map(client => ({
    id: client.id,
    veiculoInteresse: client.veiculo_interesse || null,
    catalogModelId: client.catalog_model_id || null,
    categoriaVeiculo: client.categoria_veiculo || null,
    precoInteresseMin: client.preco_interesse_min ?? null,
    precoInteresseMax: client.preco_interesse_max ?? null,
  }));
}

function compatibilidadesClientes(clientes, veiculo, catalog) {
  const criteria = {
    brand: veiculo.marca || null,
    model: veiculo.modelo || null,
    price: veiculo.preco == null || veiculo.preco === "" ? null : Number(veiculo.preco),
    category: veiculo.categoria || null,
  };
  const { matches } = matchVehicleAgainstOpportunities(criteria, perfisOportunidades(clientes), catalog);
  const byId = new Map(clientes.map(client => [client.id, client]));
  const ordP = { Máxima: 0, Alta: 1, Média: 2, Baixa: 3 };
  return matches
    .map(match => ({ client: byId.get(match.opportunityId), match }))
    .filter(entry => Boolean(entry.client))
    .sort((a, b) => (ordP[calcularPrioridade(a.client)] ?? 3) - (ordP[calcularPrioridade(b.client)] ?? 3));
}

function clientesCompativeis(clientes, veiculo, catalog) {
  return compatibilidadesClientes(clientes, veiculo, catalog).map(entry => entry.client);
}

function formatPrice(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? `R$ ${parsed.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    : null;
}

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function reasonLabel(reason) {
  if (reason.kind === "model") return `Modelo: ${reason.detail}`;
  if (reason.kind === "category") return `Categoria: ${vehicleCategoryLabel(reason.detail)}`;
  return `Preço: ${reason.detail}`;
}

// ─── MODAL REGISTRAR / EDITAR VEÍCULO ─────────────────────────────────────────
function createVehicleForm(veiculo) {
  return {
    marca: veiculo?.marca || "",
    modelo: veiculo?.modelo || "",
    versao: veiculo?.versao || "",
    ano: veiculo?.ano || new Date().getFullYear().toString(),
    preco: veiculo?.preco ?? "",
    data_entrada: veiculo?.data_entrada || new Date().toISOString().split("T")[0],
    categoria: veiculo?.categoria || "",
    observacao: veiculo?.observacao || "",
  };
}

function ModalRegistrarVeiculo({ onClose, onSalvo, catalog, veiculo = null }) {
  const editando = Boolean(veiculo?.id);
  const [form, setForm] = useState(() => createVehicleForm(veiculo));
  const [salvando, setSalvando] = useState(false);

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })); }

  // Classificação via catálogo mentor (delta §9.3, §13): resolvida quando há
  // correspondência única; ambígua/não encontrada deixa o cadastro livre.
  const resolucao = useMemo(() => {
    if (!form.marca || !form.modelo || catalog.length === 0) return null;
    return resolveCatalogModel(form.marca, form.modelo, catalog);
  }, [form.marca, form.modelo, catalog]);

  const classificacao = resolucao?.kind === "resolved" ? resolucao.entry : null;
  const ambigua = resolucao?.kind === "ambiguous";
  const naoEncontrado = resolucao?.kind === "not_found";
  const categoriaSugerida = classificacao?.category || null;
  const catalogSuggestions = useMemo(() => {
    const active = catalog.filter(entry => entry.active !== false);
    const brands = [...new Set(active.map(entry => entry.brand).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    const models = [...new Set(active.flatMap(entry => [entry.model, ...(entry.aliases || [])]).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));
    return { brands, models };
  }, [catalog]);

  async function salvar() {
    if (!form.marca.trim() || !form.modelo.trim()) {
      toast.error("Informe marca e modelo do veículo.");
      return;
    }
    const preco = optionalNumber(form.preco);
    if (form.preco !== "" && (!Number.isFinite(preco) || preco < 0)) {
      toast.error("O preço do veículo está inválido.", { description: "Informe um valor igual ou maior que zero." });
      return;
    }
    setSalvando(true);
    try {
      const me = await base44.auth.me();
      const modelChanged = !veiculo
        || form.marca.trim() !== String(veiculo.marca || "").trim()
        || form.modelo.trim() !== String(veiculo.modelo || "").trim();
      const payload = {
        ...form,
        preco,
        vendedor_id: me?.id,
        categoria: form.categoria || categoriaSugerida || null,
        catalog_model_id: classificacao?.id || (modelChanged ? null : (veiculo?.catalog_model_id || null)),
      classification_source: form.categoria
        ? "manual"
        : (classificacao ? "catalog" : (modelChanged ? null : (veiculo?.classification_source || null))),
      };
      const entidade = base44.entities.VeiculoChegado;
      const salvo = editando
        ? await entidade.update(veiculo.id, payload)
        : await entidade.create(payload);
      if (ambigua) {
        captureCatalogAmbiguous({ kind: "arrived_vehicle" }, { brand: form.marca, model: form.modelo });
      } else if (naoEncontrado) {
        captureCatalogUnresolved({ kind: "arrived_vehicle" }, { brand: form.marca, model: form.modelo });
      }
      toast.success(editando ? "Veículo atualizado." : "Veículo registrado.");
      onSalvo(salvo, editando);
      onClose();
    } catch (cause) {
      toast.error(editando ? "Não foi possível atualizar o veículo." : "Não foi possível registrar o veículo.", { description: cause?.message || "Tente novamente." });
      console.error("[VeiculosChegaram] Falha ao salvar veículo:", cause);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="rounded-2xl" size="md">
        <DialogHeader>
          <DialogTitle className="text-mx-navy font-black">{editando ? "Editar veículo que chegou" : "Registrar veículo que chegou"}</DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { k: "marca", label: "Marca *", placeholder: "Honda" },
            { k: "modelo", label: "Modelo *", placeholder: "HR-V" },
            { k: "versao", label: "Versão", placeholder: "EXL" },
            { k: "ano", label: "Ano", placeholder: "2024" },
          ].map(({ k, label, placeholder }) => (
            <div key={k}>
              <label htmlFor={`veiculo-${k}`} className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1 block">{label}</label>
              <input
                id={`veiculo-${k}`} list={k === "marca" ? "veiculo-marcas" : k === "modelo" ? "veiculo-modelos" : undefined}
                value={form[k]} onChange={e => set(k, e.target.value)} placeholder={placeholder}
                className="w-full min-h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info"
              />
            </div>
          ))}
        </div>

        <datalist id="veiculo-marcas">
          {catalogSuggestions.brands.map(brand => <option key={brand} value={brand} />)}
        </datalist>
        <datalist id="veiculo-modelos">
          {catalogSuggestions.models.map(model => <option key={model} value={model} />)}
        </datalist>

        <div>
          <label htmlFor="veiculo-categoria" className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Categoria</label>
          <select id="veiculo-categoria" value={form.categoria} onChange={e => set("categoria", e.target.value)} className="w-full min-h-11 rounded-xl border border-border bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info">
            <option value="">Automática do catálogo</option>
            {VEHICLE_CATEGORY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>

        {resolucao && (
          <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
            classificacao
              ? "border-brand-primary/30 bg-brand-primary-subtle text-brand-primary-active"
              : ambigua
                ? "border-status-warning/30 bg-status-warning-surface text-status-warning-text"
                : "border-border bg-surface-alt text-muted-foreground"
          }`}>
          {classificacao ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
            <div>
              {classificacao && <p>Classificado no catálogo mentor: <strong>{classificacao.brand} {classificacao.model}</strong> · categoria <strong>{classificacao.category}</strong>.</p>}
              {ambigua && <p>Modelo ambíguo no catálogo. O veículo será salvo com a categoria escolhida manualmente e o match continuará usando o texto livre.</p>}
              {naoEncontrado && <p>Modelo fora do catálogo mentor. O veículo será salvo com a categoria escolhida e o match continuará usando o texto livre.</p>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="veiculo-preco" className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Preço (opcional)</label>
            <input
              id="veiculo-preco" type="number" min="0" value={form.preco} onChange={e => set("preco", e.target.value)} placeholder="Ex: 120000"
              className="w-full min-h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info"
            />
          </div>
          <div>
            <label htmlFor="veiculo-data-entrada" className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Data de entrada</label>
            <input
              id="veiculo-data-entrada" type="date" value={form.data_entrada} onChange={e => set("data_entrada", e.target.value)}
              className="w-full min-h-11 rounded-xl border border-border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-status-info"
            />
          </div>
        </div>

      <div>
        <label htmlFor="veiculo-observacao" className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-1 block">Observação (opcional)</label>
          <textarea
            id="veiculo-observacao" value={form.observacao} onChange={e => set("observacao", e.target.value)} rows={2}
            placeholder="Ex: baixo km, único dono..."
            className="w-full rounded-xl border border-border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-status-info"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancelar</Button>
          <Button onClick={salvar} disabled={!form.marca.trim() || !form.modelo.trim() || salvando}
            className="flex-1 rounded-xl bg-status-info hover:bg-status-info text-white">
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar veículo"}
          </Button>
        </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

// ─── CARD DO VEÍCULO ──────────────────────────────────────────────────────────
function CardVeiculo({ veiculo, compatíveis, onClick, onEdit }) {
  const diasAtras = Math.floor((Date.now() - new Date(veiculo.data_entrada)) / 86400000);
  const entradaLabel = diasAtras === 0 ? "Entrou hoje" : diasAtras === 1 ? "Entrou ontem" : `Entrou há ${diasAtras} dias`;
  const preco = formatPrice(veiculo.preco);

  return (
    <div className="bg-white border border-border-subtle rounded-2xl p-4 space-y-3 hover:shadow-sm transition-all">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-status-info-surface flex items-center justify-center shrink-0">
          <Car className="w-5 h-5 text-status-info-text" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-mx-navy truncate">{veiculo.marca} {veiculo.modelo} {veiculo.versao}</p>
          <p className="text-xs text-muted-foreground">{veiculo.ano}{preco ? ` · ${preco}` : ""}</p>
          {veiculo.categoria && <p className="text-caption text-muted-foreground mt-0.5">Categoria: {vehicleCategoryLabel(veiculo.categoria)}</p>}
          <p className="text-caption text-status-info-text font-semibold mt-0.5">{entradaLabel}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-muted-foreground" />
          <span className={`text-xs font-bold ${compatíveis > 0 ? "text-mx-navy" : "text-muted-foreground"}`}>
            {compatíveis} {compatíveis === 1 ? "cliente compatível" : "clientes compatíveis"}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onEdit(veiculo)}
          className="min-h-11 flex-1 rounded-xl text-sm gap-1.5 border-border"
        >
          <Pencil className="w-4 h-4" /> Editar
        </Button>
        <Button
          type="button"
          onClick={() => onClick(veiculo)}
          className="min-h-11 flex-1 rounded-xl bg-status-info hover:bg-status-info text-white text-sm gap-1.5"
        >
          <Zap className="w-4 h-4" /> Ver clientes
        </Button>
      </div>
    </div>
  );
}

// ─── TELA DE ATAQUE DO VEÍCULO ────────────────────────────────────────────────
function AtaqueVeiculo({ veiculo, clientes, catalog, onVoltar, onExecutar, onFicha }) {
  const lista = useMemo(() => compatibilidadesClientes(clientes, veiculo, catalog), [clientes, veiculo, catalog]);

  useEffect(() => {
    const criteria = {
      brand: veiculo.marca || null,
      model: veiculo.modelo || null,
      price: veiculo.preco == null || veiculo.preco === "" ? null : Number(veiculo.preco),
      category: veiculo.categoria || null,
    };
    const { matches, unresolved } = matchVehicleAgainstOpportunities(criteria, perfisOportunidades(clientes), catalog);
    captureVehicleMatch(
      { kind: "arrived_vehicle", vehicleId: veiculo.id },
      {
        vehicleId: veiculo.id,
        vehicleLabel: `${veiculo.marca || ""} ${veiculo.modelo || ""}`.trim(),
        totalOpportunities: perfisOportunidades(clientes).length,
        matched: matches.length,
        unresolved: unresolved.length,
      },
    );
  }, [veiculo, clientes, catalog]);

  return (
    <div className="space-y-5">
      <button type="button" onClick={onVoltar} className="flex items-center gap-1.5 text-sm text-status-info-text hover:underline">
        <ArrowLeft className="w-4 h-4" /> Voltar aos veículos
      </button>

      <div className="bg-gradient-to-r from-status-info to-status-info rounded-2xl p-5 text-white">
        <p className="text-caption font-bold text-blue-300 uppercase tracking-wider">Veículo que chegou</p>
        <p className="text-xl font-black mt-1">{veiculo.marca} {veiculo.modelo} {veiculo.versao}</p>
        <p className="text-sm text-blue-200">{veiculo.ano}{formatPrice(veiculo.preco) ? ` · ${formatPrice(veiculo.preco)}` : ""}</p>
        {veiculo.categoria && <p className="text-xs text-blue-200 mt-1">Categoria: {vehicleCategoryLabel(veiculo.categoria)}</p>}
        <p className="text-xs text-blue-300 mt-2">Próximo passo sugerido: <strong className="text-white">Apresentar veículo recém-chegado</strong></p>
      </div>

      {lista.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-10 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm font-semibold text-muted-foreground">Nenhum cliente compatível encontrado.</p>
          <p className="text-xs text-muted-foreground mt-1">Verifique os veículos de interesse registrados na carteira.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-black text-muted-foreground uppercase tracking-wider">{lista.length} {lista.length === 1 ? "cliente compatível" : "clientes compatíveis"}</p>
          {lista.map(({ client: c, match }) => {
            const situacao = c.situacao_atual || c.momento || "—";
            const iniciais = (c.nome || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase();
            const temUrgente = ["Visita hoje", "Em negociação ativa", "Proposta enviada", "Financiamento aprovado sem compra"].includes(situacao);

            return (
              <div key={c.id} className="bg-white border border-border-subtle rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-status-info-surface flex items-center justify-center text-xs font-black text-status-info-text shrink-0">{iniciais}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-mx-navy truncate">{c.nome}</p>
                    {temUrgente && (
                      <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-status-warning-surface text-status-warning-text border border-status-warning/30 shrink-0">
                        Próximo passo urgente
                      </span>
                    )}
                    <span className="text-caption font-bold px-2 py-0.5 rounded-full bg-brand-primary-subtle text-brand-primary-hover border border-brand-primary/30 shrink-0">
                      Veículo compatível chegou
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.veiculo_interesse || "Interesse não detalhado"} · {situacao}</p>
                  <div className="flex flex-wrap gap-1 mt-2" aria-label="Razões da compatibilidade">
                    {match.reasons.map(reason => (
                      <span key={`${reason.kind}-${reason.detail}`} className="text-caption font-semibold px-2 py-0.5 rounded-full bg-surface-alt text-muted-foreground border border-border-subtle">
                        {reasonLabel(reason)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button type="button" onClick={() => onExecutar(c, veiculo)}
                    className="min-h-9 flex items-center gap-1 text-caption font-bold text-white bg-status-info hover:bg-status-info px-2.5 py-1.5 rounded-lg transition-colors">
                    <Zap className="w-3 h-3" /> Executar
                  </button>
                  <button type="button" onClick={() => onFicha(c.id)}
                    className="min-h-9 text-caption font-bold text-muted-foreground border border-border hover:bg-surface-alt px-2.5 py-1.5 rounded-lg transition-colors">
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
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [veiculoEditando, setVeiculoEditando] = useState(null);
  const [veiculoAtaque, setVeiculoAtaque] = useState(null);
  const [faixaPrecoAtiva, setFaixaPrecoAtiva] = useState("todas");

  useEffect(() => {
    // Catálogo mentor (delta §9): alimenta autocomplete e match por modelo.
    base44.entities.CatalogoModelos
      .list()
      .then(rows => setCatalog(rows || []))
      .catch(() => setCatalog([]));
  }, []);

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
          const p = Number(v.preco);
          return Number.isFinite(p) && p >= f.min && p <= f.max;
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
      const p = Number(v.preco);
      return Number.isFinite(p) && p >= f.min && p <= f.max;
    });
  }, [veiculos, faixaPrecoAtiva]);

  function handleSalvo(salvo, editando) {
    setVeiculos(prev => editando
      ? prev.map(vehicle => vehicle.id === salvo.id ? salvo : vehicle)
      : [salvo, ...prev]);
  }

  function abrirNovoVeiculo() {
    setVeiculoEditando(null);
    setModalOpen(true);
  }

  function abrirEdicaoVeiculo(veiculo) {
    setVeiculoEditando(veiculo);
    setModalOpen(true);
  }

  function fecharModal() {
    setModalOpen(false);
    setVeiculoEditando(null);
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
        catalog={catalog}
        onVoltar={() => setVeiculoAtaque(null)}
        onExecutar={handleExecutarCompativel}
        onFicha={onFicha}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-mx-navy">Veículos que chegaram</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Encontre clientes da carteira interessados nos veículos recém-entrados.</p>
        </div>
        <Button onClick={abrirNovoVeiculo} variant="outline" className="min-h-11 w-full rounded-xl text-sm gap-1.5 border-status-info text-status-info-text hover:bg-status-info-surface whitespace-nowrap sm:w-auto">
          <Plus className="w-4 h-4" /> Registrar veículo
        </Button>
      </div>

      {/* Categorização por Faixa de Preço */}
      {veiculos.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-caption font-bold text-muted-foreground uppercase tracking-wide mr-1 shrink-0">Faixa de preço:</span>
          {FAIXAS_PRECO.map(f => {
            const count = countsFaixa[f.id] ?? 0;
            const ativo = faixaPrecoAtiva === f.id;
            return (
              <button
                type="button"
                key={f.id}
                onClick={() => setFaixaPrecoAtiva(f.id)}
                className={`min-h-11 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors ${
                  ativo
                    ? "bg-status-info text-white shadow-sm"
                    : "bg-surface-alt text-muted-foreground border border-border-subtle hover:bg-muted"
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
          <div className="w-6 h-6 border-2 border-border border-t-status-info rounded-full animate-spin" />
        </div>
      ) : veiculosFiltrados.length === 0 ? (
        <div className="bg-white border border-border-subtle rounded-2xl p-8 text-center">
          <p className="text-3xl mb-2">🚗</p>
          <p className="text-sm font-semibold text-muted-foreground">
            {veiculos.length === 0
              ? "Nenhum veículo recém-chegado registrado no momento."
              : "Nenhum veículo encontrado nesta faixa de preço."}
          </p>
          {veiculos.length > 0 ? (
            <button
              type="button"
              onClick={() => setFaixaPrecoAtiva("todas")}
              className="mt-3 text-xs text-status-info-text font-bold hover:underline"
            >
              Ver todas as faixas de preço
            </button>
          ) : (
            <Button onClick={abrirNovoVeiculo} className="mt-4 rounded-xl bg-status-info hover:bg-status-info text-white text-sm gap-1.5">
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
              compatíveis={clientesCompativeis(clientes, v, catalog).length}
              onClick={setVeiculoAtaque}
              onEdit={abrirEdicaoVeiculo}
            />
          ))}
        </div>
      )}

      {modalOpen && <ModalRegistrarVeiculo catalog={catalog} veiculo={veiculoEditando} onClose={fecharModal} onSalvo={handleSalvo} />}
    </div>
  );
}
