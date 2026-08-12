import React, { useMemo, useState } from "react";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";
import DisciplinaModal from "@/components/fechamento/DisciplinaModal";
import DisciplineRing from "@/components/fechamento/DisciplineRing";
import moment from "moment";

function calcDiscipline({ clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado }) {
  const totalPlanejado = agendamentosD1Carteira + agendamentosD1Internet;
  const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
  const hasBasicData = totalLeads > 0 || totalAtend > 0 || agendamentosD1Carteira > 0 || agendamentosD1Internet > 0;
  const baseScore = hasBasicData ? 70 : 40;

  const isAtivoD1 = (c) => {
    if (c.sale_status !== "Em Negociação") return false;
    if (c.channel !== "Carteira" && c.channel !== "Internet") return false;
    if (!c.appointment_datetime) return false;
    if (c.d1_excluido === true) return false;
    return moment(c.appointment_datetime).format("YYYY-MM-DD") === d1Date;
  };

  const ativosCarteira = clients.filter(c => c.channel === "Carteira" && isAtivoD1(c)).length;
  const ativosInternet = clients.filter(c => c.channel === "Internet" && isAtivoD1(c)).length;
  const totalAtivos = ativosCarteira + ativosInternet;

  // PRD: se totalPlanejado === 0, disciplina máxima = 70%
  if (totalPlanejado === 0) {
    const scoreBase = hasBasicData ? 70 : 40;
    const score = penalizado ? Math.max(0, scoreBase - 10) : scoreBase;
    return {
      score,
      message: penalizado
        ? "Fechamento realizado fora do prazo. Penalização de 10% aplicada."
        : hasBasicData
          ? "Fechamento completo. Nenhum agendamento D+1 informado — máximo de 70%."
          : "Preencha os números do fechamento para iniciar a pontuação.",
      creditos: totalAtivos,
      totalD1: 0,
    };
  }

  const creditosCarteira = Math.min(ativosCarteira, agendamentosD1Carteira);
  const creditosInternet = Math.min(ativosInternet, agendamentosD1Internet);
  const totalCreditos = creditosCarteira + creditosInternet;
  const pontosExtras = Math.round(30 * (totalCreditos / totalPlanejado));
  const scoreBase = Math.min(100, baseScore + pontosExtras);
  const score = penalizado ? Math.max(0, scoreBase - 10) : scoreBase;

  const message = penalizado
    ? "Fechamento realizado fora do prazo. Penalização de 10% aplicada."
    : score >= 100
      ? "Fechamento completo. Todos os agendamentos D+1 foram detalhados corretamente."
      : score > 70
        ? `Cadastre mais agendamentos D+1 para aumentar sua pontuação (${totalCreditos}/${totalPlanejado} detalhados).`
        : "Você informou agendamentos D+1 mas não os cadastrou. Cadastre para ganhar até +30%.";

  return { score, message, creditos: totalCreditos, totalD1: totalPlanejado };
}



export default function DisciplinaMobile({
  clients = [], agendamentosD1Carteira = 0, agendamentosD1Internet = 0,
  closingDate, totalLeads, totalAtend, penalizado = false, dailyClose,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const { score, message, creditos, totalD1 } = useMemo(() =>
    calcDiscipline({ clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado }),
    [clients, agendamentosD1Carteira, agendamentosD1Internet, closingDate, totalLeads, totalAtend, penalizado]
  );

  const agendamentosFuturos = useMemo(() => {
    const d1Date = moment(closingDate).add(1, "day").format("YYYY-MM-DD");
    return clients.filter(c =>
      c.sale_status === "Em Negociação" &&
      (c.channel === "Carteira" || c.channel === "Internet") &&
      c.appointment_datetime &&
      !c.d1_excluido &&
      moment(c.appointment_datetime).format("YYYY-MM-DD") > d1Date
    ).length;
  }, [clients, closingDate]);

  const d1WindowOpen = dailyClose?.finalizado && dailyClose?.ajustes_d1_permitidos !== false;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4">
      <p className="text-caption font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">Disciplina — Fechamento Diário</p>

      <div className="flex items-start gap-4">
        <div title="Você cadastrou todos os seus agendamentos. Para a Disciplina do Fechamento, apenas os D+1 são considerados." className="cursor-help">
          <DisciplineRing score={score} size="sm" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {totalD1 > 0 && (
            <p className="text-[12px] text-muted-foreground">
              Agendamentos D+1 detalhados:{" "}
              <strong className="text-mx-navy">{creditos}</strong> de{" "}
              <strong className="text-mx-navy">{totalD1}</strong>
              {d1WindowOpen && <span className="text-status-warning-text ml-1">(provisório)</span>}
            </p>
          )}
          {agendamentosFuturos > 0 && (
            <p className="text-[12px] text-muted-foreground">
              Agendamentos futuros: <strong className="text-mx-navy">{agendamentosFuturos}</strong>{" "}
              <span className="text-status-success-text">✓ Já contabilizado na Qualidade da Carteira</span>
            </p>
          )}

          {message && (
            <div className="flex items-start gap-1.5">
              {penalizado ? (
                <AlertTriangle className="w-3.5 h-3.5 text-status-error flex-shrink-0 mt-0.5" />
              ) : score >= 100 ? (
                <CheckCircle className="w-3.5 h-3.5 text-status-success flex-shrink-0 mt-0.5" />
              ) : null}
              <p className={`text-[12px] leading-relaxed font-medium ${
                penalizado ? "text-status-error" : score >= 100 ? "text-status-success" : "text-muted-foreground"
              }`}>
                {message}
              </p>
            </div>
          )}

          {!penalizado && (
            <p className="text-caption text-muted-foreground">
              70% base + {Math.max(0, score - 70)}% detalhamento
              {totalD1 > 0 && ` (${score >= 100 ? 30 : Math.max(0, score - 70)}/30 pontos extras)`}
            </p>
          )}

          <button
            onClick={() => setModalOpen(true)}
            className="text-[12px] text-status-info-text font-semibold hover:underline flex items-center gap-1 transition-colors"
          >
            Saiba mais <Info className="w-3 h-3" />
          </button>
        </div>
      </div>

      <DisciplinaModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}