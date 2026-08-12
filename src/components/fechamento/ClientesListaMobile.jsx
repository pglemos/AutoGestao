import React from "react";
import { Pencil, Trash2, Phone, Car, CalendarDays, ShoppingCart } from "lucide-react";
import { isClienteD1 } from "@/components/fechamento/ClientCard";
import moment from "moment";

const CHANNEL_STYLE = {
  Carteira: "bg-green-100 text-green-700",
  Internet: "bg-blue-100 text-blue-700",
  Showroom: "bg-orange-100 text-orange-700",
  Porta: "bg-orange-100 text-orange-700",
};
const FINANCING_STYLE = {
  "Aprovado": "bg-green-100 text-green-700",
  "Recusado": "bg-red-100 text-red-600",
  "Não se aplica": "bg-slate-100 text-muted-foreground",
};
const SALE_STYLE = {
  "Sim": "bg-green-100 text-green-700",
  "Não": "bg-red-100 text-red-600",
  "Em Negociação": "bg-orange-100 text-orange-700",
  "Venda Realizada": "bg-green-100 text-green-700",
  "Qualificado": "bg-purple-100 text-purple-700",
  "Garantia Registrada": "bg-amber-100 text-amber-700",
  "Venda perdida": "bg-red-100 text-red-600",
};
const BOOL_STYLE = (v) => v === "Sim" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600";

function Badge({ label, className }) {
  return <span className={`inline-block text-caption font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${className}`}>{label}</span>;
}

function ClientMobileCard({ c, closingDate, canEdit, canDelete, onEdit, onDelete }) {
  // Suporte a registros CarteiraCliente (base única) e legado (Client)
  const nomeCliente = c.nome || c.name;
  const telefone = c.whatsapp || c.telefone || c.phone;
  const veiculo = c.veiculo_interesse || c.veiculo_comprado || c.vehicle_sought;
  
  // Status derivado
  let saleStatus;
  if (c._saleDisplay) {
    saleStatus = c._saleDisplay;
  } else if (c.status_comercial === "Vendido" || c.situacao_atual === "Venda realizada") {
    saleStatus = "Venda Realizada";
  } else if (c.status_comercial === "Garantia" || c.situacao_atual === "Garantia em acompanhamento") {
    saleStatus = "Garantia Registrada";
  } else {
    saleStatus = c.sale_status || (c.sale_completed ? "Sim" : "Em Negociação");
  }

  // Data principal
  let dataDisplay = null;
  if (saleStatus === "Venda Realizada") dataDisplay = c.data_venda || c.created_date;
  else if (c.visita_agendada_em) dataDisplay = c.visita_agendada_em;
  else if (c.appointment_datetime) dataDisplay = c.appointment_datetime;
  else dataDisplay = c.created_date;

  // Valor
  let valorDisplay = null;
  if (saleStatus === "Venda Realizada") valorDisplay = c.valor_venda || c.valor_negociado || c.negotiated_value;
  else valorDisplay = c.valor_negociado || c.negotiated_value;

  const eD1 = isClienteD1(c, closingDate);

  return (
    <div className={`rounded-2xl border border-border bg-white p-4 space-y-3 ${eD1 ? "border-blue-200 bg-blue-50/30" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-body font-bold text-[#0F172A] leading-tight">{nomeCliente}</p>
            {eD1 && <span className="text-caption font-bold text-blue-500 bg-blue-100 px-1.5 py-0.5 rounded-full">D+1</span>}
          </div>
          {telefone && (
            <div className="flex items-center gap-1 mt-1">
              <Phone className="w-3 h-3 text-muted-foreground" />
              <span className="text-body-sm text-muted-foreground">{telefone}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => canEdit && onEdit(c)}
            disabled={!canEdit}
            className={`p-2 rounded-xl transition-colors ${canEdit ? "hover:bg-blue-50 text-[#005BFF]" : "text-slate-200 cursor-not-allowed"}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => canDelete && onDelete(c)}
            disabled={!canDelete}
            className={`p-2 rounded-xl transition-colors ${canDelete ? "hover:bg-red-50 text-[#EF4444]" : "text-slate-200 cursor-not-allowed"}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        {veiculo && (
          <div className="flex items-center gap-2">
            <Car className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-body-sm text-muted-foreground">{veiculo}</span>
          </div>
        )}
        {dataDisplay && (
          <div className="flex items-center gap-2">
            <CalendarDays className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-body-sm text-muted-foreground">{moment(dataDisplay).format("DD/MM/YYYY")}</span>
          </div>
        )}
        {valorDisplay && (
          <div className="flex items-center gap-4">
            <span className="text-body-sm font-semibold text-[#0F172A]">{valorDisplay}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {(c.canal_comercial || c.channel) && <Badge label={c.canal_comercial || c.channel} className={CHANNEL_STYLE[c.canal_comercial || c.channel] || "bg-slate-100 text-muted-foreground"} />}
        {c.attended && <Badge label={`Compareceu: ${c.attended}`} className={BOOL_STYLE(c.attended)} />}
        {(c.financiamento || c.financing) && <Badge label={c.financiamento || c.financing} className={FINANCING_STYLE[c.financiamento || c.financing] || "bg-slate-100 text-muted-foreground"} />}
        <Badge label={saleStatus} className={SALE_STYLE[saleStatus] || "bg-slate-100 text-muted-foreground"} />
      </div>
    </div>
  );
}

export default function ClientesListaMobile({ clients = [], closingDate, bloqueado, d1Editavel, onEdit, onDelete }) {
  const podeEditar = (c) => {
    if (bloqueado) return false;
    if (d1Editavel) return isClienteD1(c, closingDate);
    return true;
  };
  const podeExcluir = (c) => {
    if (bloqueado) return false;
    if (d1Editavel) return isClienteD1(c, closingDate);
    return true;
  };

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-sm p-6 flex flex-col items-center gap-2">
        <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
          <ShoppingCart className="w-6 h-6 text-purple-300" />
        </div>
        <p className="text-body-sm text-[#64748B] font-medium">Nenhum cliente cadastrado hoje.</p>
        <p className="text-[12px] text-text-disabled">Adicione um cliente na etapa 4 acima.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider px-1">Clientes cadastrados hoje</p>
      {clients.map(c => (
        <ClientMobileCard
          key={c.id}
          c={c}
          closingDate={closingDate}
          canEdit={podeEditar(c)}
          canDelete={podeExcluir(c)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}