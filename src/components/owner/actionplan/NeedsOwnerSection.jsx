// Seção "Precisam de você" — ações que aguardam decisão do Dono.
import OwnerActionCard from "./OwnerActionCard";

export default function NeedsOwnerSection({ actions, onAnalyze, onApprove, onDelegate, onTalkToConsultant }) {
  const needsOwner = actions.filter((a) => a.requiresOwner && a.status === "awaiting_decision");

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Precisam de você</h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-status-info-surface px-1.5 text-xs font-bold text-status-info-text">
          {needsOwner.length}
        </span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Decisões, aprovações ou intervenções que dependem do Dono.
      </p>

      {needsOwner.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma ação precisa da sua decisão neste momento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {needsOwner.map((action) => (
            <OwnerActionCard
              key={action.id}
              action={action}
              onAnalyze={onAnalyze}
              onApprove={onApprove}
              onDelegate={onDelegate}
              onTalkToConsultant={onTalkToConsultant}
            />
          ))}
        </div>
      )}
    </section>
  );
}