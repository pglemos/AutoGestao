import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import { StatCard } from "@/components/molecules/StatCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Textarea } from "@/components/atoms/Textarea";
import { toast } from "@/lib/toast"
import { MessageSquare, ThumbsUp, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import moment from "moment";
import { ScrollableRegion } from "@/design-system/page/ScrollableRegion";

export default function FeedbackPage({ hideHeader = false }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});

  useEffect(() => {
    base44.entities.Feedback.list('-created_date', 50).then(setFeedbacks).catch(() => []).finally(() => setLoading(false));
  }, []);

  const acknowledge = async (id) => {
    const comment = comments[id] || "";
    try {
      await base44.entities.Feedback.update(id, {
        acknowledged: true,
        user_comment: comment,
        acknowledged_date: new Date().toISOString()
      });
    } catch (error) {
      toast.error("Não foi possível confirmar o feedback.", { description: "Tente novamente." });
      return;
    }
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, acknowledged: true, user_comment: comment, acknowledged_date: new Date().toISOString() } : f));
    toast.info("Feedback confirmado!", { description: "Seu líder foi notificado."  });
  };

  const feedbackBadge = (f) => (f.hasAttentionPoints
    ? { label: "Desenvolvimento", className: "bg-status-warning-surface text-status-warning-text" }
    : { label: "Positivo", className: "bg-brand-primary-subtle text-brand-primary" });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-border border-t-mx-blue rounded-full animate-spin" /></div>;
  }

  const pending = feedbacks.filter(f => !f.acknowledged);
  const positive = feedbacks.filter(f => !f.hasAttentionPoints).length;
  const development = feedbacks.filter(f => f.hasAttentionPoints).length;

  return (
    <div className="space-y-8">
      {!hideHeader && <PageHeader title="Feedback" subtitle="Comunicação entre líder e liderado" />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Feedbacks Recebidos" value={feedbacks.length} icon={<MessageSquare />} tone="blue" />
        <StatCard label="Positivos" value={positive} icon={<ThumbsUp />} tone="green" />
        <StatCard label="Desenvolvimento" value={development} icon={<TrendingUp />} tone="orange" />
        <StatCard label="Pendentes" value={pending.length} icon={<Clock />} tone="red" />
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-mx-navy mb-4">Feedbacks Pendentes</h3>
          <div className="space-y-4">
            {pending.map(f => (
              <div key={f.id} className="bg-white rounded-2xl p-6 shadow-sm border border-status-warning/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${feedbackBadge(f).className}`}>{feedbackBadge(f).label}</span>
                      <span className="text-xs text-muted-foreground">{f.competency}</span>
                      <span className="text-xs text-muted-foreground">· {moment(f.created_date).format("DD/MM/YYYY")}</span>
                    </div>
                    <p className="text-sm text-foreground mb-1">{f.message}</p>
                    <p className="text-xs text-muted-foreground">Por: {f.responsible}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <Textarea 
                    placeholder="Meu comentário (opcional)..."
                    value={comments[f.id] || ""}
                    onChange={e => setComments(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="resize-none"
                    rows={2}
                  />
                  <Button onClick={() => acknowledge(f.id)} className="bg-status-info hover:bg-status-info text-white rounded-xl gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Li e compreendi
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="p-5 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Histórico</h3>
        </div>
        {feedbacks.filter(f => f.acknowledged).length === 0 ? (
          <EmptyState size="sm" variant="dataset" icon={<MessageSquare size={24} />} title="Nenhum feedback confirmado ainda." />
        ) : (
          <ScrollableRegion label="Histórico de devolutivas">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-alt">
                  {["Data", "Tipo", "Competência", "Responsável", "Comentário", ""].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {feedbacks.filter(f => f.acknowledged).map(f => (
                  <tr key={f.id} className="hover:bg-surface-alt/50">
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{moment(f.created_date).format("DD/MM/YYYY")}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${feedbackBadge(f).className}`}>{feedbackBadge(f).label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{f.competency}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground">{f.responsible}</td>
                    <td className="px-5 py-3.5 text-sm text-muted-foreground max-w-[200px] truncate">{f.user_comment || "—"}</td>
                    <td className="px-5 py-3.5"><CheckCircle2 className="w-4 h-4 text-brand-primary" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollableRegion>
        )}
      </div>
    </div>
  );
}