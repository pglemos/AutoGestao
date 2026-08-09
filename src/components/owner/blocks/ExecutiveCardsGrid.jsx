import { useState } from "react";
import ExecutiveCard from "@/components/owner/blocks/ExecutiveCard";
import DetailDrawer from "@/components/owner/DetailDrawer";
import StatusBadge from "@/components/owner/StatusBadge";
import EmptyState from "@/components/owner/EmptyState";
import { useOwner } from "@/components/owner/OwnerContext";
import { formatBRL, formatNumber, formatPercent, formatDateTime } from "@/lib/owner-b44/format";
import { DEPARTMENT_LABELS } from "@/lib/owner-b44/status";
import { CardSkeleton } from "@/components/owner/Skeleton";

const kpiByName = (kpis, name) => kpis.find((k) => k.name === name);

const worstStatus = (...statuses) => {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("attention")) return "attention";
  if (statuses.includes("on_track")) return "on_track";
  return "no_data";
};

const toneForStatus = (s) => ({ on_track: "green", attention: "amber", critical: "red", no_data: "slate" }[s] || "slate");

export default function ExecutiveCardsGrid({ data, loading }) {
  const { openConsultantModal, currentCompany } = useOwner();
  const [selected, setSelected] = useState(null);

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!data || (!data.kpis?.length && !data.objectives?.length)) {
    return (
      <EmptyState
        title="Dados executivos ainda não configurados"
        description="Conecte ou importe fontes de resultado, caixa e plano estratégico para visualizar os indicadores do Dono."
        onTalkToConsultant={() => openConsultantModal()}
      />
    );
  }

  const { kpis, objectives, actions } = data;

  // CARD 1 — Resultado e Rentabilidade
  const lucro = kpiByName(kpis, "lucro_operacional");
  const receita = kpiByName(kpis, "receita");
  const card1 = {
    title: "Resultado e Rentabilidade",
    status: lucro?.status || "no_data",
    rows: [
      { label: "Lucro operacional realizado", value: formatBRL(lucro?.actual_value), strong: true },
      { label: "Meta de lucro", value: formatBRL(lucro?.target_value) },
      { label: "Projeção", value: formatBRL(lucro?.projected_value) },
      { label: "Ano anterior", value: formatBRL(lucro?.previous_period_value) },
      { label: "Receita realizada", value: formatBRL(receita?.actual_value) },
      { label: "Meta de receita", value: formatBRL(receita?.target_value) },
    ],
    deviation: lucro?.status_reason,
    updatedAt: lucro?.last_data_at || lucro?.updated_date,
    detail: {
      title: "Resultado e Rentabilidade",
      kpis: [lucro, receita].filter(Boolean),
      summary: "Resultado operacional realizado versus meta, projeção e comparação anual. Receita realizada e meta de receita do período.",
    },
  };

  // CARD 2 — Caixa e Capital
  const caixa = kpiByName(kpis, "caixa_disponivel");
  const compromissos = kpiByName(kpis, "compromissos_30d");
  const capitalEstoque = kpiByName(kpis, "capital_estoque");
  const estoque90 = kpiByName(kpis, "estoque_90d");
  const card2 = {
    title: "Caixa e Capital",
    status: worstStatus(caixa?.status, estoque90?.status),
    rows: [
      { label: "Caixa disponível", value: formatBRL(caixa?.actual_value), strong: true },
      { label: "Compromissos em 30 dias", value: formatBRL(compromissos?.actual_value) },
      { label: "Capital em estoque", value: formatBRL(capitalEstoque?.actual_value) },
      { label: "Estoque acima de 90 dias", value: formatBRL(estoque90?.actual_value) },
    ],
    deviation: estoque90?.status_reason || caixa?.status_reason,
    updatedAt: caixa?.last_data_at || estoque90?.updated_date,
    detail: {
      title: "Caixa e Capital",
      kpis: [caixa, compromissos, capitalEstoque, estoque90].filter(Boolean),
      summary: "Posição de caixa, compromissos previstos para 30 dias, capital imobilizado em estoque e exposição a veículos envelhecidos.",
    },
  };

  // CARD 3 — Plano Estratégico
  const onTrack = objectives.filter((o) => o.status === "on_track").length;
  const attention = objectives.filter((o) => o.status === "attention").length;
  const critical = objectives.filter((o) => o.status === "critical").length;
  const avgProgress = objectives.length
    ? objectives.reduce((s, o) => s + (o.progress || 0), 0) / objectives.length
    : 0;
  const criticalObj = objectives.find((o) => o.status === "critical") || objectives.find((o) => o.status === "attention");
  const card3 = {
    title: "Plano Estratégico",
    status: critical > 0 ? "critical" : attention > 0 ? "attention" : "on_track",
    rows: [
      { label: "Objetivos ativos", value: formatNumber(objectives.length), strong: true },
      { label: "Dentro do esperado", value: formatNumber(onTrack) },
      { label: "Em atenção", value: formatNumber(attention) },
      { label: "Críticos", value: formatNumber(critical) },
    ],
    progress: { label: "Progresso do ciclo", value: avgProgress, tone: toneForStatus(card3_status(objectives)) },
    deviation: criticalObj
      ? `${DEPARTMENT_LABELS[criticalObj.department] || criticalObj.department}: ${criticalObj.title}`
      : "Sem desvios relevantes",
    updatedAt: objectives[0]?.updated_date,
    detail: {
      title: "Plano Estratégico",
      objectives,
      summary: "Distribuição dos objetivos estratégicos por status e progresso médio do ciclo.",
    },
  };

  // CARD 4 — Plano de Ação
  const completed = actions.filter((a) => a.status === "completed").length;
  const inProgress = actions.filter((a) => a.status === "in_progress").length;
  const delayed = actions.filter((a) => a.status === "delayed").length;
  const blocked = actions.filter((a) => a.status === "blocked").length;
  const awaiting = actions.filter((a) => a.status === "awaiting_decision").length;
  const card4 = {
    title: "Plano de Ação",
    status: blocked > 0 ? "critical" : delayed > 0 ? "attention" : "on_track",
    rows: [
      { label: "Total de ações", value: formatNumber(actions.length), strong: true },
      { label: "Concluídas", value: formatNumber(completed) },
      { label: "Em andamento", value: formatNumber(inProgress) },
      { label: "Atrasadas", value: formatNumber(delayed) },
      { label: "Bloqueadas", value: formatNumber(blocked) },
      { label: "Aguardando decisão", value: formatNumber(awaiting) },
    ],
    progress: {
      label: "Concluídas",
      value: actions.length ? (completed / actions.length) * 100 : 0,
      tone: "blue",
    },
    deviation: blocked > 0 ? "Há ações bloqueadas que dependem de decisão." : delayed > 0 ? "Há ações atrasadas." : "Plano de ação dentro do esperado.",
    updatedAt: actions[0]?.updated_date,
    detail: {
      title: "Plano de Ação",
      actions,
      summary: "Distribuição das ações por status: concluídas, em andamento, atrasadas, bloqueadas e aguardando decisão do Dono.",
    },
  };

  const cards = [card1, card2, card3, card4];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <ExecutiveCard
            key={c.title}
            title={c.title}
            status={c.status}
            rows={c.rows}
            progress={c.progress}
            deviation={c.deviation}
            updatedAt={c.updatedAt}
            onClick={() => setSelected(c)}
          />
        ))}
      </div>

      <DetailDrawer
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.detail?.title || ""}
        description={selected?.detail?.summary}
        footer={
          <div className="flex flex-wrap gap-2">
            <button
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => openConsultantModal(buildContext(selected, currentCompany))}
            >
              Falar com Consultor
            </button>
          </div>
        }
      >
        {selected && <CardDetailBody detail={selected.detail} />}
      </DetailDrawer>
    </>
  );
}

function card3_status(objectives) {
  const critical = objectives.filter((o) => o.status === "critical").length;
  const attention = objectives.filter((o) => o.status === "attention").length;
  return critical > 0 ? "critical" : attention > 0 ? "attention" : "on_track";
}

function buildContext(selected, company) {
  return {
    title: selected.detail.title,
    contextType: "executive_card",
    contextId: company?.id,
    snapshot: `Card executivo: ${selected.detail.title}. ${selected.detail.summary}`,
    requestType: "analysis",
  };
}

function CardDetailBody({ detail }) {
  if (detail.kpis) {
    return (
      <div className="space-y-4">
        {detail.kpis.map((k) => (
          <KpiDetail key={k.id} kpi={k} />
        ))}
      </div>
    );
  }
  if (detail.objectives) {
    return (
      <div className="space-y-2.5">
        {detail.objectives.map((o) => (
          <div key={o.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{o.title}</p>
              <StatusBadge status={o.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{DEPARTMENT_LABELS[o.department] || o.department}</p>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Progresso</span>
              <span className="tabular-nums">{formatPercent(o.progress, 0)}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (detail.actions) {
    return (
      <div className="space-y-2.5">
        {detail.actions.map((a) => (
          <div key={a.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{a.title}</p>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{DEPARTMENT_LABELS[a.department] || a.department}</p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function KpiDetail({ kpi }) {
  const tone = toneForStatus(kpi.status);
  const toneBg = { green: "bg-primary", amber: "bg-amber-500", red: "bg-red-500", blue: "bg-blue-500", slate: "bg-muted-foreground/60" }[tone];
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{kpi.name}</p>
        <StatusBadge status={kpi.status} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <Detail label="Meta" value={formatBRL(kpi.target_value)} />
        <Detail label="Realizado" value={formatBRL(kpi.actual_value)} />
        <Detail label="Projeção" value={formatBRL(kpi.projected_value)} />
        <Detail label="Período anterior" value={formatBRL(kpi.previous_period_value)} />
      </div>
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full ${toneBg}`} style={{ width: `${Math.min(100, kpi.target_value ? (kpi.actual_value / kpi.target_value) * 100 : 0)}%` }} />
      </div>
      {kpi.status_reason && (
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Motivo do status:</span> {kpi.status_reason}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-caption text-muted-foreground/80">
        <span>Fonte: {kpi.source || "—"}</span>
        <span>Regra: {kpi.status_rule_used || kpi.target_direction === "lower_better" ? kpi.status_rule_used || "Valores menores são melhores" : "Valores maiores são melhores"}</span>
        <span>Atualizado: {formatDateTime(kpi.last_data_at || kpi.updated_date)}</span>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-muted-foreground/80">{label}</p>
      <p className="tabular-nums text-foreground">{value}</p>
    </div>
  );
}