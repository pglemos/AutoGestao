import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { MessageSquare, ThumbsUp, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import moment from "moment";

export default function FeedbackPage({ hideHeader = false }) {
  const { toast } = useToast();
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
      toast({ title: "Não foi possível confirmar o feedback.", description: "Tente novamente.", variant: "destructive" });
      return;
    }
    setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, acknowledged: true, user_comment: comment, acknowledged_date: new Date().toISOString() } : f));
    toast({ title: "Feedback confirmado!", description: "Seu líder foi notificado." });
  };

  const feedbackBadge = (f) => (f.hasAttentionPoints
    ? { label: "Desenvolvimento", className: "bg-mx-amber-light text-mx-amber" }
    : { label: "Positivo", className: "bg-mx-green-light text-mx-green" });

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-slate-200 border-t-mx-blue rounded-full animate-spin" /></div>;
  }

  const pending = feedbacks.filter(f => !f.acknowledged);
  const positive = feedbacks.filter(f => !f.hasAttentionPoints).length;
  const development = feedbacks.filter(f => f.hasAttentionPoints).length;

  return (
    <div className="space-y-8">
      {!hideHeader && <PageHeader title="Feedback" subtitle="Comunicação entre líder e liderado" />}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Feedbacks Recebidos" value={feedbacks.length} icon={MessageSquare} color="blue" />
        <StatCard label="Positivos" value={positive} icon={ThumbsUp} color="green" />
        <StatCard label="Desenvolvimento" value={development} icon={TrendingUp} color="amber" />
        <StatCard label="Pendentes" value={pending.length} icon={Clock} color="red" />
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
                      <span className="text-xs text-slate-400">{f.competency}</span>
                      <span className="text-xs text-slate-400">· {moment(f.created_date).format("DD/MM/YYYY")}</span>
                    </div>
                    <p className="text-sm text-slate-700 mb-1">{f.message}</p>
                    <p className="text-xs text-slate-400">Por: {f.responsible}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  <Textarea 
                    placeholder="Meu comentário (opcional)..."
                    value={comments[f.id] || ""}
                    onChange={e => setComments(prev => ({ ...prev, [f.id]: e.target.value }))}
                    className="rounded-xl resize-none"
                    rows={2}
                  />
                  <Button onClick={() => acknowledge(f.id)} className="bg-mx-blue hover:bg-blue-600 rounded-xl gap-2">
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
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="text-base font-semibold text-mx-navy">Histórico</h3>
        </div>
        {feedbacks.filter(f => f.acknowledged).length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhum feedback confirmado ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  {["Data", "Tipo", "Competência", "Responsável", "Comentário", ""].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {feedbacks.filter(f => f.acknowledged).map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3.5 text-sm text-slate-600">{moment(f.created_date).format("DD/MM/YYYY")}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${feedbackBadge(f).className}`}>{feedbackBadge(f).label}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{f.competency}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600">{f.responsible}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 max-w-[200px] truncate">{f.user_comment || "—"}</td>
                    <td className="px-5 py-3.5"><CheckCircle2 className="w-4 h-4 text-mx-green" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}