import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Phone, MessageCircle, Car, User, Calendar, FileText, X } from "lucide-react";
import moment from "moment";

const statusColors = {
  "Em Andamento": "bg-status-info-surface text-status-info-text",
  "Aguardando Cliente": "bg-status-warning-surface text-status-warning-text",
  "Sem Resposta": "bg-status-error-surface text-status-error-text",
  "Vendido": "bg-brand-primary-subtle text-brand-primary-hover",
  "Perdido": "bg-muted text-muted-foreground",
};

const saleStatusColors = {
  "Sim": "bg-brand-primary-subtle text-brand-primary-hover",
  "Não": "bg-status-error-surface text-status-error-text",
  "Em Negociação": "bg-status-info-surface text-status-info-text",
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-caption text-muted-foreground font-semibold uppercase tracking-wide">{label}</span>
      <span className="text-body-sm text-mx-navy font-medium">{value}</span>
    </div>
  );
}

export default function ClienteFichaSheet({ clienteId, clienteObj, open, onClose }) {
  const [cliente, setCliente] = useState(clienteObj || null);
  const [loading, setLoading] = useState(!clienteObj && !!clienteId);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (clienteObj) {
      setCliente(clienteObj);
      setLoading(false);
      setNotFound(false);
      return;
    }
    if (!clienteId) return;
    setLoading(true);
    setNotFound(false);
    base44.entities.Client.get(clienteId)
      .then(c => { setCliente(c); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [open, clienteId, clienteObj]);

  const tel = cliente?.phone?.replace(/\D/g, "") || "";
  const waUrl = tel ? `https://wa.me/55${tel}` : null;

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-mx-navy">Ficha do Cliente</SheetTitle>
        </SheetHeader>

        {loading && (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-4 border-border border-t-status-info rounded-full animate-spin" />
          </div>
        )}

        {notFound && (
          <div className="mt-10 text-center space-y-3">
            <User className="w-10 h-10 text-text-disabled mx-auto" />
            <p className="text-[14px] font-bold text-muted-foreground">Cliente não encontrado na Carteira de Clientes.</p>
            <button onClick={onClose}
              className="text-[12px] font-bold text-status-info-text hover:underline">
              Voltar
            </button>
          </div>
        )}

        {!loading && !notFound && cliente && (
          <div className="mt-6 space-y-6">
            {/* Cabeçalho do cliente */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-status-info-surface flex items-center justify-center text-[16px] font-bold text-status-info-text">
                {(cliente.name || "?").split(" ").slice(0, 2).map(p => p[0]).join("").toUpperCase()}
              </div>
              <div>
                <h3 className="text-h5 font-bold text-mx-navy">{cliente.name}</h3>
                <p className="text-[12px] text-muted-foreground">{cliente.channel} · {cliente.status}</p>
              </div>
              {cliente.status && (
                <span className={`ml-auto text-caption font-bold px-2.5 py-1 rounded-full ${statusColors[cliente.status] || "bg-muted text-muted-foreground"}`}>
                  {cliente.status}
                </span>
              )}
            </div>

            {/* Ações rápidas */}
            <div className="flex gap-2">
              {waUrl && (
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-brand-primary hover:bg-brand-primary px-3 py-2 rounded-xl transition-colors flex-1 justify-center">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {tel && (
                <a href={`tel:${tel}`}
                  className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground border border-border hover:bg-surface-alt px-3 py-2 rounded-xl transition-colors flex-1 justify-center">
                  <Phone className="w-4 h-4" /> Ligar
                </a>
              )}
            </div>

            {/* Dados do cliente */}
            <div className="bg-surface-alt rounded-2xl p-4 space-y-4">
              <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider">Informações</p>
              <div className="grid grid-cols-2 gap-4">
                <InfoRow label="Telefone" value={cliente.phone} />
                <InfoRow label="Canal" value={cliente.channel} />
                <InfoRow label="Veículo de Interesse" value={cliente.vehicle_sought} />
                <InfoRow label="Valor Negociado" value={cliente.negotiated_value} />
                <InfoRow label="Status da Venda" value={cliente.sale_status} />
                <InfoRow label="Financiamento" value={cliente.financing} />
                <InfoRow label="Compareceu" value={cliente.attended} />
                <InfoRow label="Carro Avaliado" value={cliente.car_evaluated} />
              </div>
              {cliente.appointment_datetime && (
                <InfoRow
                  label="Agendamento"
                  value={moment(cliente.appointment_datetime).format("DD/MM/YYYY [às] HH:mm")}
                />
              )}
              {cliente.notes && (
                <div className="flex flex-col gap-0.5">
                  <span className="text-caption text-muted-foreground font-semibold uppercase tracking-wide">Observações</span>
                  <p className="text-body-sm text-mx-navy">{cliente.notes}</p>
                </div>
              )}
              {cliente.loss_reason && (
                <InfoRow label="Motivo da Perda" value={cliente.loss_reason} />
              )}
            </div>

            {/* Datas */}
            <div className="text-caption text-muted-foreground space-y-1">
              {cliente.created_date && (
                <p>Cadastrado em {moment(cliente.created_date).format("DD/MM/YYYY")}</p>
              )}
              {cliente.updated_date && (
                <p>Atualizado em {moment(cliente.updated_date).format("DD/MM/YYYY [às] HH:mm")}</p>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}