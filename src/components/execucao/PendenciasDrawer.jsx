import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Phone, ExternalLink, Calendar, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import moment from "moment/min/moment-with-locales";
import ResolverModal from "./ResolverModal";
import ReagendarPendenciaModal from "./ReagendarPendenciaModal";

moment.locale("pt-br");

const TIPO_COLOR = {
  "Atendimento": "bg-status-info",
  "Retorno": "bg-status-warning",
  "Documentação": "bg-slate-400",
  "Entrega": "bg-status-info",
  "Pós-venda": "bg-teal-500",
  "Aniversário": "bg-indigo-500",
  "Garantia": "bg-status-warning",
  "Outra atividade comercial": "bg-slate-500",
};

export default function PendenciasDrawer({ open, onClose, pendencias, onResolvida, onReagendada }) {
  const [resolverTarget, setResolverTarget] = useState(null);
  const [reagendarTarget, setReagendarTarget] = useState(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#0F172A] font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-status-warning-text" />
              Pendências anteriores ({pendencias.length})
            </DialogTitle>
          </DialogHeader>

          {pendencias.length === 0 ? (
            <p className="text-body-sm text-muted-foreground text-center py-8">Nenhuma pendência anterior.</p>
          ) : (
            <div className="space-y-3 mt-2">
              {pendencias.map(op => {
                const atraso = moment().diff(moment(op.data_hora_execucao), "days");
                return (
                  <div key={op.id} className="bg-white border border-border rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${TIPO_COLOR[op.tipo] || "bg-slate-400"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-caption font-bold text-muted-foreground uppercase tracking-wider">{op.tipo}</span>
                          <span className="text-caption font-bold text-status-error-text bg-status-error-surface px-2 py-0.5 rounded-full">
                            {atraso === 0 ? "Hoje" : `${atraso}d atraso`}
                          </span>
                        </div>
                        <p className="font-bold text-body-sm text-[#0F172A] truncate">{op.nome_cliente_snapshot || "—"}</p>
                        {op.veiculo_snapshot && <p className="text-[12px] text-muted-foreground truncate">{op.veiculo_snapshot}</p>}
                        <p className="text-[12px] text-muted-foreground mt-0.5">{op.descricao}</p>
                        <p className="text-caption text-text-disabled mt-0.5">{moment(op.data_hora_execucao).format("DD/MM/YYYY HH:mm")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      {op.telefone_snapshot && (
                        <>
                          <a
                            href={`https://wa.me/55${(op.telefone_snapshot || "").replace(/\D/g, "")}`}
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-caption font-bold text-white bg-green-500 hover:bg-green-600 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                          <a
                            href={`tel:${(op.telefone_snapshot || "").replace(/\D/g, "")}`}
                            className="flex items-center gap-1 text-caption font-bold text-muted-foreground border border-border hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors"
                          >
                            <Phone className="w-3 h-3" /> Ligar
                          </a>
                        </>
                      )}
                      {op.cliente_id && (
                        <Link to="/carteira"
                          className="flex items-center gap-1 text-caption font-bold text-status-info-text border border-status-info/30 hover:bg-status-info-surface px-2.5 py-1.5 rounded-lg transition-colors"
                          onClick={onClose}
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir cliente
                        </Link>
                      )}
                      <button onClick={() => setReagendarTarget(op)}
                        className="flex items-center gap-1 text-caption font-bold text-muted-foreground border border-border hover:bg-slate-50 px-2.5 py-1.5 rounded-lg transition-colors">
                        <Calendar className="w-3 h-3" /> Reagendar
                      </button>
                      <button onClick={() => setResolverTarget(op)}
                        className="flex items-center gap-1 text-caption font-bold text-white bg-[#005BFF] hover:bg-status-info px-2.5 py-1.5 rounded-lg transition-colors ml-auto">
                        Resolver
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {resolverTarget && (
        <ResolverModal
          oportunidade={resolverTarget}
          open
          onClose={() => setResolverTarget(null)}
          onResolvida={(id, status, novaData) => {
            setResolverTarget(null);
            onResolvida(id, status, novaData);
          }}
        />
      )}

      {reagendarTarget && (
        <ReagendarPendenciaModal
          oportunidade={reagendarTarget}
          open
          onClose={() => setReagendarTarget(null)}
          onReagendada={(id, novaData) => {
            setReagendarTarget(null);
            onReagendada(id, novaData);
          }}
        />
      )}
    </>
  );
}