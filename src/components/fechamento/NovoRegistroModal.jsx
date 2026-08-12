import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { CalendarCheck, ShoppingCart, ShieldCheck, UserCheck, ArrowLeft } from "lucide-react";
import moment from "moment";

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(raw) {
  return (raw || "").replace(/\D/g, "");
}

function formatPhone(raw) {
  const d = (raw || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").replace(/-$/, "");
}

function formatCurrency(raw) {
  const num = (raw || "").replace(/\D/g, "");
  if (!num) return "";
  const val = (parseInt(num, 10) / 100).toFixed(2);
  return "R$ " + parseFloat(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <Label className="text-caption font-bold text-[#64748B] uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </Label>
      {hint && <p className="text-caption text-muted-foreground mb-0.5">{hint}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

const CANAIS = ["Showroom", "Internet", "Carteira"];
const MODALIDADES = ["Visita na loja", "Atendimento externo", "Videochamada"];
const SITUACOES_OPORTUNIDADE = ["Nova", "Validação", "Construção", "Compromisso", "Decisão", "Recuperação"];
const MOTIVOS_GARANTIA = ["Mecânica", "Documentação", "Acessório", "Acabamento", "Promessa comercial", "Outro"];
const URGENCIAS = ["Imediato", "30 dias", "60 dias", "90 dias", "Sem prazo"];
const SIM_NAO = [{ v: "Sim", l: "Sim" }, { v: "Não", l: "Não" }];
const FINANCIAMENTO_OPTS = ["Aprovado", "Recusado", "Não se aplica"];

// ── Busca de cliente ──────────────────────────────────────────────────────────

async function buscarClienteExistente({ telefone, currentUser }) {
  const telNorm = normalizePhone(telefone);
  if (!telNorm || !currentUser) return null;
  const lista = await base44.entities.CarteiraCliente.filter({
    vendedor_id: currentUser.id,
    ativo: true,
  }).catch(() => []);
  return lista.find(c => {
    const norm = c.telefone_whatsapp_normalizado || normalizePhone(c.whatsapp || c.telefone || "");
    return norm === telNorm;
  }) || null;
}

async function buscarOuCriarCliente({ form, tipo, currentUser, closingDate }) {
  const telNorm = normalizePhone(form.whatsapp);
  const agora = new Date().toISOString();
  const clienteExistente = await buscarClienteExistente({ telefone: form.whatsapp, currentUser });
  const payload = buildClientePayload(form, tipo, closingDate, agora);

  let cliente;
  if (clienteExistente) {
    const update = { ...payload, telefone_whatsapp_normalizado: telNorm, ultima_acao_em: agora };
    if (tipo === "garantia" && clienteExistente.status_oportunidade === "Vendida") {
      delete update.status_oportunidade;
      delete update.situacao_oportunidade;
      delete update.status_comercial;
      delete update.situacao_atual;
    }
    cliente = await base44.entities.CarteiraCliente.update(clienteExistente.id, update);
    cliente = { ...clienteExistente, ...cliente };
  } else {
    cliente = await base44.entities.CarteiraCliente.create({
      ...payload,
      vendedor_id: currentUser.id,
      loja_id: currentUser.loja_id || "",
      telefone_whatsapp_normalizado: telNorm,
      canal_entrada: form.canal || "Carteira",
      ativo: true,
      data_cadastro_mx: agora,
      _data_competencia_fechamento: closingDate,
    });
  }
  return { cliente, isNovo: !clienteExistente };
}

function buildClientePayload(form, tipo, closingDate, agora) {
  const base = {
    nome: (form.nome || "").toUpperCase(),
    whatsapp: form.whatsapp,
    telefone: form.whatsapp,
    canal_comercial: form.canal || "Carteira",
    origem_detalhada: form.origem_detalhada || `Fechamento ${closingDate}`,
    _data_competencia_fechamento: closingDate,
    ultima_acao_em: agora,
  };

  if (tipo === "agendamento") {
    const dtHora = form.data_hora_agendamento || "";
      return {
        ...base,
        veiculo_interesse: form.veiculo_texto,
        valor_negociado: form.valor_negociado || "",
        possui_troca: form.possui_troca === "Sim",
        interesse_troca: form.possui_troca === "Sim",
      interesse_financiamento: form.financiamento === "Aprovado",
      status_oportunidade: "Ativa",
      situacao_oportunidade: "Compromisso",
      status_comercial: "Agendado",
      situacao_atual: "Visita agendada",
      preferencia_modalidade: form.modalidade,
      visita_agendada_em: dtHora,
      proximo_passo: "Comparecer ao agendamento",
      data_proximo_passo: dtHora,
      ultima_evolucao_em: agora,
    };
  }

  if (tipo === "venda") {
    return {
      ...base,
      // Campos usados pela tabela do Fechamento Diário
      veiculo_interesse: form.veiculo_texto,
      veiculo_comprado: form.veiculo_texto,
      valor_negociado: form.valor_venda,   // tabela usa valor_negociado para exibir valor
      vendido: true,
      status_oportunidade: "Vendida",
      status_comercial: "Vendido",
      situacao_atual: "Venda realizada",
      data_venda: form.data_venda,
      valor_venda: form.valor_venda,
      financiamento: form.financiamento || "",
      interesse_financiamento: form.financiamento === "Aprovado",
      possui_troca: form.possui_troca === "Sim",
      interesse_troca: form.possui_troca === "Sim",
      ultima_evolucao_em: agora,
    };
  }

  if (tipo === "garantia") {
    return {
      ...base,
      canal_comercial: form.canal || "Carteira",
      ultima_acao_em: agora,
      // Salva veículo e data para exibição na tabela do fechamento
      veiculo_comprado: form.veiculo_texto || "",
      data_venda: form.data_garantia || "",
      situacao_atual: "Garantia em acompanhamento",
      status_comercial: "Garantia",
    };
  }

  if (tipo === "qualificado") {
    return {
      ...base,
      veiculo_interesse: form.veiculo_texto,
      possui_troca: form.possui_troca === "Sim",
      interesse_troca: form.possui_troca === "Sim",
      veiculo_troca: form.veiculo_troca || "",
      valor_esperado_troca: form.valor_esperado_troca || "",
      urgencia_compra: form.urgencia,
      interesse_financiamento: form.financiamento === "Aprovado",
      preferencia_modalidade: form.modalidade || "Não informado",
      status_oportunidade: "Ativa",
      situacao_oportunidade: form.passo_atual || "Nova",
      status_comercial: "Em negociação",
      ultima_evolucao_em: agora,
    };
  }

  return base;
}

// ── Criação de eventos e atividades ──────────────────────────────────────────

async function criarEventos({ tipo, form, cliente, currentUser, closingDate, dailyCloseId }) {
  const agora = new Date().toISOString();
  const hoje = moment().format("YYYY-MM-DD");
  const baseEvento = {
    cliente_id: cliente.id,
    vendedor_id: currentUser.id,
    loja_id: currentUser.loja_id || "",
    nome_cliente_snapshot: cliente.nome,
    canal_mx: form.canal || cliente.canal_comercial || "Carteira",
    canal_snapshot: form.canal || cliente.canal_comercial || "Carteira",
    data_evento: hoje,
    data_hora_evento: agora,
    origem_modulo: "FechamentoDiario",
    fechamento_id: dailyCloseId || "",
  };

  if (tipo === "agendamento") {
    const dtHora = form.data_hora_agendamento || (hoje + "T09:00");
    const dtSo = dtHora.split("T")[0] || hoje;
    const evento = await base44.entities.EventoComercial.create({
      ...baseEvento,
      tipo_evento: "agendamento_criado",
      modalidade: form.modalidade || "",
      status_evento: "Criado",
      resultado_evento: "Agendamento criado",
      veiculo_texto_snapshot: form.veiculo_texto || "",
      observacao: form.observacao || "",
      financiamento: form.financiamento || "",
      valor_negociado: form.valor_negociado || "",
      data_hora_agendamento: dtHora,
    });
    await base44.entities.AtividadeExecucao.create({
      cliente_id: cliente.id,
      vendedor_id: currentUser.id,
      loja_id: currentUser.loja_id || "",
      tipo_atividade: "agendamento",
      titulo: `Agendamento — ${cliente.nome}`,
      descricao: form.observacao || "",
      objetivo: "Confirmar, reagendar ou tratar comparecimento",
      data_execucao: dtSo,
      data_hora_execucao: dtHora,
      status_atividade: "Pendente",
      prioridade: 1,
      nome_cliente_snapshot: cliente.nome,
      telefone_snapshot: cliente.whatsapp || cliente.telefone || form.whatsapp,
      veiculo_snapshot: form.veiculo_texto || "",
      origem_atividade: "FechamentoDiario",
      evento_id: evento.id,
      fechamento_id: dailyCloseId || "",
      ativo: true,
    }).catch(() => {});
  }

  if (tipo === "venda") {
    const evento = await base44.entities.EventoComercial.create({
      ...baseEvento,
      tipo_evento: "venda_realizada",
      data_evento: form.data_venda || hoje,
      data_hora_evento: form.data_venda ? form.data_venda + "T12:00:00.000Z" : agora,
      status_evento: "Realizado",
      resultado_evento: "Venda realizada",
      veiculo_texto_snapshot: form.veiculo_texto || "",
      observacao: form.observacao || "",
      financiamento: form.financiamento || "",
      placa_veiculo: form.placa_veiculo || "",
      data_hora_entrega_prevista: form.data_hora_entrega || "",
    });
    // Cria atividade de entrega sempre que data_hora_entrega estiver preenchida (inclusive hoje)
    if (form.data_hora_entrega) {
      const dtSo = form.data_hora_entrega.split("T")[0] || hoje;
      await base44.entities.AtividadeExecucao.create({
        cliente_id: cliente.id,
        vendedor_id: currentUser.id,
        loja_id: currentUser.loja_id || "",
        tipo_atividade: "entrega",
        titulo: `Entrega — ${cliente.nome}`,
        descricao: form.observacao_entrega || "",
        objetivo: "Confirmar ou registrar entrega do veículo",
        data_execucao: dtSo,
        data_hora_execucao: form.data_hora_entrega,
        status_atividade: "Pendente",
        prioridade: 4,
        nome_cliente_snapshot: cliente.nome,
        telefone_snapshot: cliente.whatsapp || cliente.telefone || form.whatsapp,
        veiculo_snapshot: form.veiculo_texto || "",
        origem_atividade: "FechamentoDiario",
        evento_id: evento.id,
        fechamento_id: dailyCloseId || "",
        ativo: true,
      }).catch(() => {});
    }
  }

  if (tipo === "garantia") {
    const evento = await base44.entities.EventoComercial.create({
      ...baseEvento,
      tipo_evento: "garantia_registrada",
      data_evento: form.data_garantia || hoje,
      data_hora_evento: form.data_garantia ? form.data_garantia + "T12:00:00.000Z" : agora,
      status_evento: "Aberta",
      resultado_evento: "Garantia registrada",
      veiculo_texto_snapshot: form.veiculo_texto || "",
      motivo_evento: form.motivo_garantia || "",
      observacao: form.descricao_garantia || "",
    });
    const dtPos = form.data_posicionamento || closingDate || hoje;
    const horaPos = form.hora_posicionamento || "";
    const dtHoraPos = horaPos ? `${dtPos}T${horaPos}` : `${dtPos}T09:00`;

    // Upsert: verificar se já existe atividade pendente de garantia para este evento
    const existentes = await base44.entities.AtividadeExecucao.filter({
      cliente_id: cliente.id,
      tipo_atividade: "garantia",
      status_atividade: "Pendente",
      evento_id: evento.id,
    }).catch(() => []);

    const payloadAtividade = {
      cliente_id: cliente.id,
      vendedor_id: currentUser.id,
      loja_id: currentUser.loja_id || "",
      tipo_atividade: "garantia",
      titulo: `Garantia — ${cliente.nome}`,
      descricao: form.descricao_garantia || "",
      objetivo: `Posicionar o cliente. Responsável: ${form.responsavel || "a definir"}`,
      data_execucao: dtPos,
      data_hora_execucao: dtHoraPos,
      status_atividade: "Pendente",
      prioridade: 3,
      nome_cliente_snapshot: cliente.nome,
      telefone_snapshot: cliente.whatsapp || cliente.telefone || form.whatsapp,
      veiculo_snapshot: form.veiculo_texto || "",
      origem_atividade: "FechamentoDiario",
      evento_id: evento.id,
      fechamento_id: dailyCloseId || "",
      ativo: true,
    };

    if (existentes.length > 0) {
      await base44.entities.AtividadeExecucao.update(existentes[0].id, payloadAtividade).catch(() => {});
    } else {
      await base44.entities.AtividadeExecucao.create(payloadAtividade).catch(() => {});
    }
  }

  if (tipo === "qualificado") {
    if ((form.canal || "").toLowerCase() === "internet") {
      const eventosExistentes = await base44.entities.EventoComercial.filter({
        cliente_id: cliente.id,
        tipo_evento: "oportunidade_registrada",
      }).catch(() => []);
      if (eventosExistentes.length === 0) {
        await base44.entities.EventoComercial.create({
          ...baseEvento,
          tipo_evento: "oportunidade_registrada",
          status_evento: "Realizado",
          resultado_evento: "Positivo",
          veiculo_texto_snapshot: form.veiculo_texto || "",
          observacao: form.observacao || "",
        }).catch(() => {});
      }
    }
    await base44.entities.EventoComercial.create({
      ...baseEvento,
      tipo_evento: "cliente_qualificado",
      status_evento: "Realizado",
      resultado_evento: "Cliente qualificado",
      veiculo_texto_snapshot: form.veiculo_texto || "",
      observacao: form.observacao || "",
      financiamento: form.financiamento || "",
    });
    // Não cria atividade avulsa na Central para qualificado
  }
}

// ── Tela de seleção de tipo ───────────────────────────────────────────────────

const TIPOS = [
  { id: "agendamento", icon: CalendarCheck, label: "Agendamento", desc: "Compromisso comercial futuro", cor: "border-status-info/30 bg-status-info-surface hover:bg-status-info-surface text-status-info-text", iconCor: "text-status-info" },
  { id: "venda", icon: ShoppingCart, label: "Venda", desc: "Negócio fechado", cor: "border-green-200 bg-green-50 hover:bg-green-100 text-green-700", iconCor: "text-green-500" },
  { id: "garantia", icon: ShieldCheck, label: "Garantia", desc: "Pós-venda ou garantia de veículo", cor: "border-status-warning/30 bg-status-warning-surface hover:bg-status-warning-surface text-status-warning-text", iconCor: "text-status-warning" },
  { id: "qualificado", icon: UserCheck, label: "Qualificado", desc: "Nova oportunidade trabalhável", cor: "border-status-info/30 bg-status-info-surface hover:bg-status-info-surface text-status-info-text", iconCor: "text-status-info-text" },
];

function TipoSelector({ onSelect }) {
  return (
    <div>
      <p className="text-body-sm text-muted-foreground mb-4">Qual tipo de registro você quer adicionar?</p>
      <div className="grid grid-cols-2 gap-3">
        {TIPOS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => onSelect(t.id)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center ${t.cor}`}>
              <Icon className={`w-7 h-7 ${t.iconCor}`} />
              <span className="text-body-sm font-bold">{t.label}</span>
              <span className="text-caption opacity-70">{t.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClienteEncontradoBadge({ cliente }) {
  if (!cliente) return null;
  return (
    <p className="text-caption text-green-600 mt-0.5 font-semibold">
      ✓ Cliente encontrado na Carteira{cliente.status_oportunidade === "Vendida" ? " (já vendido)" : ""}.
    </p>
  );
}

// ── Formulário de Agendamento ─────────────────────────────────────────────────

function FormAgendamento({ form, setF, clienteEncontrado, onPhoneBlur }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="WhatsApp / Telefone" required>
        <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      </Field>
      <Field label="Nome do Cliente" required={!clienteEncontrado}>
        <Input value={form.nome || ""} onChange={e => setF("nome", e.target.value.toUpperCase())}
          placeholder={clienteEncontrado ? clienteEncontrado.nome : "Ex: JOÃO SANTOS"} disabled={!!clienteEncontrado} />
        <ClienteEncontradoBadge cliente={clienteEncontrado} />
      </Field>
      <Field label="Canal MX" required>
        <Select value={form.canal || ""} onValueChange={v => setF("canal", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Origem Detalhada">
        <Input value={form.origem_detalhada || ""} onChange={e => setF("origem_detalhada", e.target.value)} placeholder="Ex: Indicação, Redes Sociais…" />
      </Field>
      <Field label="Data e Hora do Agendamento" required>
        <Input type="datetime-local" value={form.data_hora_agendamento || ""} onChange={e => setF("data_hora_agendamento", e.target.value)} />
      </Field>
      <Field label="Modalidade" required>
        <Select value={form.modalidade || ""} onValueChange={v => setF("modalidade", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{MODALIDADES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Veículo de Interesse" required>
        <Input value={form.veiculo_texto || ""} onChange={e => setF("veiculo_texto", e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT" />
      </Field>
      <Field label="Valor Negociado">
        <Input value={form.valor_negociado || ""} onChange={e => setF("valor_negociado", formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
      </Field>
      <Field label="Financiamento" required>
        <Select value={form.financiamento || ""} onValueChange={v => setF("financiamento", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{FINANCIAMENTO_OPTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Interesse em Troca">
        <Select value={form.possui_troca || "Não"} onValueChange={v => setF("possui_troca", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SIM_NAO.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="col-span-2">
        <Field label="Observação">
          <Input value={form.observacao || ""} onChange={e => setF("observacao", e.target.value)} placeholder="Observações gerais" />
        </Field>
      </div>
    </div>
  );
}

// ── Formulário de Venda ───────────────────────────────────────────────────────

function FormVenda({ form, setF, clienteEncontrado, onPhoneBlur }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="WhatsApp / Telefone" required>
        <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      </Field>
      <Field label="Nome do Cliente" required={!clienteEncontrado}>
        <Input value={form.nome || ""} onChange={e => setF("nome", e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" disabled={!!clienteEncontrado} />
        <ClienteEncontradoBadge cliente={clienteEncontrado} />
      </Field>
      <Field label="Canal MX" required>
        <Select value={form.canal || ""} onValueChange={v => setF("canal", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Origem Detalhada">
        <Input value={form.origem_detalhada || ""} onChange={e => setF("origem_detalhada", e.target.value)} placeholder="Ex: Indicação, Tráfego Pago…" />
      </Field>
      <Field label="Placa do Veículo" required>
        <Input value={form.placa_veiculo || ""} onChange={e => setF("placa_veiculo", e.target.value.toUpperCase())} placeholder="Ex: ABC-1234" maxLength={8} />
      </Field>
      <Field label="Veículo Vendido" required>
        <Input value={form.veiculo_texto || ""} onChange={e => setF("veiculo_texto", e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT 2024" />
      </Field>
      <Field label="Data da Venda" required>
        <Input type="date" value={form.data_venda || ""} onChange={e => setF("data_venda", e.target.value)} />
      </Field>
      <Field label="Valor da Venda" required>
        <Input value={form.valor_venda || ""} onChange={e => setF("valor_venda", formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
      </Field>
      <Field label="Financiamento" required>
        <Select value={form.financiamento || ""} onValueChange={v => setF("financiamento", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{FINANCIAMENTO_OPTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Possui Troca">
        <Select value={form.possui_troca || "Não"} onValueChange={v => setF("possui_troca", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SIM_NAO.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Data e Hora da Entrega Prevista" hint="Se preenchida, cria atividade de entrega na Central">
        <Input type="datetime-local" value={form.data_hora_entrega || ""} onChange={e => setF("data_hora_entrega", e.target.value)} />
      </Field>
      {form.data_hora_entrega && (
        <Field label="Observação da Entrega">
          <Input value={form.observacao_entrega || ""} onChange={e => setF("observacao_entrega", e.target.value)} placeholder="Detalhes da entrega" />
        </Field>
      )}
      <div className="col-span-2">
        <Field label="Observação Geral">
          <Input value={form.observacao || ""} onChange={e => setF("observacao", e.target.value)} placeholder="Observações sobre a venda" />
        </Field>
      </div>
    </div>
  );
}

// ── Formulário de Garantia ────────────────────────────────────────────────────

function FormGarantia({ form, setF, clienteEncontrado, onPhoneBlur }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="WhatsApp / Telefone" required hint="Busca cliente existente automaticamente">
        <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      </Field>
      <Field label="Nome do Cliente" required={!clienteEncontrado}>
        <Input value={form.nome || ""} onChange={e => setF("nome", e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" disabled={!!clienteEncontrado} />
        <ClienteEncontradoBadge cliente={clienteEncontrado} />
      </Field>
      <Field label="Veículo (texto)">
        <Input value={form.veiculo_texto || ""} onChange={e => setF("veiculo_texto", e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT 2024" />
      </Field>
      <Field label="Data da Garantia" required>
        <Input type="date" value={form.data_garantia || ""} onChange={e => setF("data_garantia", e.target.value)} />
      </Field>
      <Field label="Motivo da Garantia" required>
        <Select value={form.motivo_garantia || ""} onValueChange={v => setF("motivo_garantia", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
          <SelectContent>{MOTIVOS_GARANTIA.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Descrição da Garantia" required>
        <Input value={form.descricao_garantia || ""} onChange={e => setF("descricao_garantia", e.target.value)} placeholder="Descreva o problema relatado" />
      </Field>
      <Field label="Data para Posicionar Cliente" required>
        <Input type="date" value={form.data_posicionamento || ""} onChange={e => setF("data_posicionamento", e.target.value)} />
      </Field>
      <Field label="Hora para Posicionar">
        <Input type="time" value={form.hora_posicionamento || ""} onChange={e => setF("hora_posicionamento", e.target.value)} />
      </Field>
      <Field label="Responsável pela Tratativa">
        <Input value={form.responsavel || ""} onChange={e => setF("responsavel", e.target.value)} placeholder="Ex: João / Gerência / Oficina" />
      </Field>
      <Field label="Observação">
        <Input value={form.observacao || ""} onChange={e => setF("observacao", e.target.value)} placeholder="Observações adicionais" />
      </Field>
    </div>
  );
}

// ── Formulário de Qualificado ─────────────────────────────────────────────────

function FormQualificado({ form, setF, clienteEncontrado, onPhoneBlur }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="WhatsApp / Telefone" required>
        <Input value={form.whatsapp || ""} onChange={e => setF("whatsapp", formatPhone(e.target.value))} onBlur={onPhoneBlur} placeholder="(11) 98765-4321" maxLength={15} />
      </Field>
      <Field label="Nome do Cliente" required={!clienteEncontrado}>
        <Input value={form.nome || ""} onChange={e => setF("nome", e.target.value.toUpperCase())} placeholder="Ex: JOÃO SANTOS" disabled={!!clienteEncontrado} />
        <ClienteEncontradoBadge cliente={clienteEncontrado} />
      </Field>
      <Field label="Canal MX" required>
        <Select value={form.canal || ""} onValueChange={v => setF("canal", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{CANAIS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Veículo de Interesse" required>
        <Input value={form.veiculo_texto || ""} onChange={e => setF("veiculo_texto", e.target.value.toUpperCase())} placeholder="Ex: HB20 1.0 COMFORT" />
      </Field>
      <Field label="Orçamento">
        <Input value={form.orcamento || ""} onChange={e => setF("orcamento", formatCurrency(e.target.value))} placeholder="R$ 68.900,00" />
      </Field>
      <Field label="Financiamento" required>
        <Select value={form.financiamento || ""} onValueChange={v => setF("financiamento", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{FINANCIAMENTO_OPTS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Possui Troca">
        <Select value={form.possui_troca || "Não"} onValueChange={v => setF("possui_troca", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SIM_NAO.map(s => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      {form.possui_troca === "Sim" && (
        <>
          <Field label="Veículo para Troca" required>
            <Input value={form.veiculo_troca || ""} onChange={e => setF("veiculo_troca", e.target.value.toUpperCase())} placeholder="Ex: GOL 1.0 2018" />
          </Field>
          <Field label="Valor Esperado na Troca">
            <Input value={form.valor_esperado_troca || ""} onChange={e => setF("valor_esperado_troca", formatCurrency(e.target.value))} placeholder="R$ 25.000,00" />
          </Field>
        </>
      )}
      <Field label="Urgência de Compra">
        <Select value={form.urgencia || ""} onValueChange={v => setF("urgencia", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{URGENCIAS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Preferência de Modalidade">
        <Select value={form.modalidade || "Não informado"} onValueChange={v => setF("modalidade", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {[...MODALIDADES, "Não informado"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Passo Atual da Oportunidade" required>
        <Select value={form.passo_atual || ""} onValueChange={v => setF("passo_atual", v)}>
          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
          <SelectContent>{SITUACOES_OPORTUNIDADE.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <div className="col-span-2">
        <Field label="Observação">
          <Input value={form.observacao || ""} onChange={e => setF("observacao", e.target.value)} placeholder="Observações adicionais" />
        </Field>
      </div>
    </div>
  );
}

// ── Validação por tipo ────────────────────────────────────────────────────────

function canSaveForm(tipo, form, clienteEncontrado) {
  const temNome = clienteEncontrado || form.nome?.trim();
  const temFone = form.whatsapp?.trim();
  if (!temFone || !temNome) return false;

  if (tipo === "agendamento") {
    return !!(form.canal && form.data_hora_agendamento && form.modalidade && form.veiculo_texto?.trim() && form.financiamento);
  }
  if (tipo === "venda") {
    return !!(form.canal && form.placa_veiculo?.trim() && form.veiculo_texto?.trim() && form.data_venda && form.valor_venda && form.financiamento &&
      (form.possui_troca !== "Sim" || form.veiculo_troca?.trim()));
  }
  if (tipo === "garantia") {
    return !!(form.data_garantia && form.motivo_garantia && form.descricao_garantia?.trim());
  }
  if (tipo === "qualificado") {
    return !!(form.canal && form.veiculo_texto?.trim() && form.financiamento && form.passo_atual);
  }
  return false;
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function NovoRegistroModal({ open, onClose, closingDate, dailyCloseId, currentUser, onSaved }) {
  const { toast } = useToast();
  const [tipo, setTipo] = useState(null);
  const [form, setFormState] = useState({});
  const [clienteEncontrado, setClienteEncontrado] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const amanha = moment().add(1, "day").format("YYYY-MM-DD");
  const hoje = moment().format("YYYY-MM-DD");

  const setF = (key, val) => setFormState(f => ({ ...f, [key]: val }));

  const handleWhatsAppBlur = async () => {
    const tel = normalizePhone(form.whatsapp || "");
    if (tel.length < 10 || !currentUser) return;
    setBuscando(true);
    const encontrado = await buscarClienteExistente({ telefone: form.whatsapp, currentUser });
    setClienteEncontrado(encontrado);
    if (encontrado) {
      setFormState(f => ({ ...f, nome: encontrado.nome, canal: f.canal || encontrado.canal_comercial || "" }));
    }
    setBuscando(false);
  };

  const handleSelectTipo = (t) => {
    setTipo(t);
    // Pré-preenche data do agendamento com amanhã (datetime-local format)
    const defaults = {
      data_venda: hoje,
      data_garantia: hoje,
      data_posicionamento: hoje,
    };
    if (t === "agendamento") {
      defaults.data_hora_agendamento = `${amanha}T09:00`;
    }
    setFormState(defaults);
    setClienteEncontrado(null);
    setSaveError(null);
  };

  const handleVoltar = () => { setTipo(null); setClienteEncontrado(null); setSaveError(null); };
  const handleClose = () => { setTipo(null); setFormState({}); setClienteEncontrado(null); setSaveError(null); onClose(); };

  const handleSave = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setSaveError(null);
    setSaving(true);
    try {
      const { cliente, isNovo } = await buscarOuCriarCliente({ form, tipo, currentUser, closingDate });
      await criarEventos({ tipo, form, cliente, currentUser, closingDate, dailyCloseId }).catch((eventErr) => {
        console.warn("[NovoRegistroModal] Registro principal salvo, mas evento auxiliar falhou:", eventErr);
      });
      toast({ title: `${tipo.charAt(0).toUpperCase() + tipo.slice(1)} salvo com sucesso.` });
      onSaved && onSaved({ cliente, tipo, isNovo });
      handleClose();
    } catch (err) {
      console.error("[NovoRegistroModal] Erro ao salvar registro do fechamento:", err);
      const message = err?.message || "Não foi possível salvar. Tente novamente.";
      setSaveError(message);
      toast({
        title: "Não foi possível salvar.",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const TITULO = { agendamento: "Novo Agendamento", venda: "Nova Venda", garantia: "Nova Garantia", qualificado: "Novo Qualificado" };
  const ok = tipo ? canSaveForm(tipo, form, clienteEncontrado) : false;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !saving) handleClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#0F172A] font-bold text-h5 flex items-center gap-2">
            {tipo && (
              <button type="button" onClick={handleVoltar} className="p-1 rounded-lg hover:bg-slate-100 transition-colors mr-1">
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {tipo ? TITULO[tipo] : "Novo Registro"}
          </DialogTitle>
          <p className="text-[12px] text-muted-foreground">
            {tipo ? "Dados salvos na base única de clientes/oportunidades." : "Escolha o tipo de registro para o fechamento de hoje."}
          </p>
        </DialogHeader>

        <div className="mt-2">
          {!tipo && <TipoSelector onSelect={handleSelectTipo} />}
          {tipo === "agendamento" && (
            <FormAgendamento form={form} setF={(k, v) => { setF(k, v); if (k === "whatsapp") setClienteEncontrado(null); }}
              clienteEncontrado={clienteEncontrado} onPhoneBlur={handleWhatsAppBlur} />
          )}
          {tipo === "venda" && (
            <FormVenda form={form} setF={(k, v) => { setF(k, v); if (k === "whatsapp") setClienteEncontrado(null); }}
              clienteEncontrado={clienteEncontrado} onPhoneBlur={handleWhatsAppBlur} />
          )}
          {tipo === "garantia" && (
            <FormGarantia form={form} setF={(k, v) => { setF(k, v); if (k === "whatsapp") setClienteEncontrado(null); }}
              clienteEncontrado={clienteEncontrado} onPhoneBlur={handleWhatsAppBlur} />
          )}
          {tipo === "qualificado" && (
            <FormQualificado form={form} setF={(k, v) => { setF(k, v); if (k === "whatsapp") setClienteEncontrado(null); }}
              clienteEncontrado={clienteEncontrado} onPhoneBlur={handleWhatsAppBlur} />
          )}
        </div>

        {buscando && <p className="text-caption text-muted-foreground mt-1">Buscando cliente…</p>}
        {saveError && <p className="text-[12px] text-[#EF4444] font-semibold mt-3">{saveError}</p>}

        {tipo && (
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-border-subtle">
            <button type="button" onClick={handleClose} disabled={saving}
              className="px-5 py-2.5 text-body-sm font-semibold text-[#64748B] border border-[#E5E7EB] rounded-xl hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={!ok || saving}
              className="px-6 py-2.5 text-body-sm font-bold text-white bg-status-info hover:bg-status-info disabled:opacity-50 rounded-xl transition-colors shadow-[var(--mx-button-shadow)]">
              {saving ? "Salvando…" : `Salvar ${tipo.charAt(0).toUpperCase() + tipo.slice(1)}`}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
