// Consultoria do Dono — resumo exclusivamente do programa persistido da unidade.

import { useEffect } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { Calendar, CheckCircle2, Clock3, FileCheck, TrendingUp, Users, Video } from "lucide-react";
import { useOwner } from "@/components/owner/OwnerContext";
import { useOwnerConsultingProgram } from "@/features/dashboard-loja/hooks/useOwnerConsultingProgram";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import OwnerPageHeading from "@/components/owner/OwnerPageHeading";

function formatDate(value) {
  if (!value) return "A agendar";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Metric({ icon: Icon, label, value, total, description }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex-1 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-xs font-medium text-foreground">{label}</p>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-lg font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">de {total}</span>
        <span className="ml-auto text-xs font-medium text-muted-foreground">{percent}%</span>
      </div>
      <Progress value={percent} className="mt-1.5 h-1.5" />
      {description && <p className="mt-2 text-[11px] text-muted-foreground">{description}</p>}
    </div>
  );
}

export default function Consultoria() {
  const { setLastUpdated } = useOutletContext() || {};
  const { currentUnits, unitId, openConsultantModal } = useOwner();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = unitId || currentUnits?.[0]?.id || null;
  const { program, loading, error, refresh } = useOwnerConsultingProgram(storeId, true);

  useEffect(() => {
    setLastUpdated?.(new Date());
  }, [program, setLastUpdated]);

  useEffect(() => {
    if (searchParams.get("openConsultant") !== "1") return;
    openConsultantModal(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("openConsultant");
    setSearchParams(nextParams, { replace: true });
  }, [openConsultantModal, searchParams, setSearchParams]);

  if (loading) {
    return (
      <div id="page-consultoria" aria-label="Consultoria" className="flex min-h-0 flex-1 flex-col space-y-6 pb-20 lg:pb-0" aria-busy="true">
        <div className="h-8 w-56 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-card" />
      </div>
    );
  }

  if (error) {
    return (
      <div id="page-consultoria" aria-label="Consultoria" className="flex min-h-0 flex-1 flex-col space-y-6 pb-20 lg:pb-0">
        <section className="rounded-xl border border-destructive/30 bg-card p-6" role="alert">
          <h1 className="text-lg font-semibold text-foreground">Não foi possível carregar a Consultoria</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={() => void refresh()}>Tentar novamente</Button>
        </section>
      </div>
    );
  }

  return (
    <div id="page-consultoria" aria-label="Consultoria" className="flex min-h-0 flex-1 flex-col space-y-6 pb-20 lg:pb-0">
      <OwnerPageHeading
        icon={Users}
        title="Consultoria"
        subtitle="Acompanhe o programa e os encontros persistidos da unidade."
        actions={(
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            <TrendingUp className="h-3.5 w-3.5" />
            {program ? `Status: ${program.clientStatus}` : "Sem programa vinculado"}
          </span>
        )}
      />

      {!program ? (
        <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground">Nenhum programa de consultoria vinculado</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A unidade selecionada ainda não possui um programa ativo persistido. Solicite o vínculo ao time MX para liberar a jornada.
          </p>
          <Button className="mt-4" onClick={() => openConsultantModal({ title: "Vincular programa de consultoria", requestType: "general_support", priority: "medium", contextType: "consulting" })}>
            Falar com Consultor
          </Button>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 space-y-4">
                <div>
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Programa contratado</span>
                  <div className="mt-2 flex items-center gap-2">
                    <h2 className="text-2xl font-bold text-foreground">{program.programName}</h2>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"><span className="mr-1 h-1.5 w-1.5 rounded-full bg-primary" />{program.clientStatus}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Dados agregados pelo contrato seguro de Consultoria do Dono.</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Modalidade: <span className="font-medium text-foreground">{program.clientModality || "Não informada"}</span></span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Unidade: <span className="font-medium text-foreground">{currentUnits?.find((unit) => unit.id === storeId)?.name || "Selecionada"}</span></span>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Metric icon={Users} label="Encontros realizados" value={program.visitsCompleted} total={program.totalVisits} />
                  <Metric icon={CheckCircle2} label="Encontros previstos" value={program.totalVisits} total={program.totalVisits} description="Catálogo persistido do programa." />
                  <Metric icon={FileCheck} label="Próximo encontro" value={program.nextVisitNumber ? 1 : 0} total={program.nextVisitNumber ? 1 : 0} description={program.nextVisitNumber ? "Agendamento encontrado." : "Nenhum agendamento persistido."} />
                </div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 lg:w-64 xl:w-72">
                <p className="text-xs font-medium text-muted-foreground">Próximo encontro</p>
                {program.nextVisitNumber ? (
                  <>
                    <p className="mt-1 text-sm font-semibold text-foreground">Encontro {program.nextVisitNumber}</p>
                    <p className="text-sm text-foreground">{program.nextVisitObjective || "Objetivo não informado"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(program.nextVisitScheduledAt)}</p>
                    {program.nextVisitMeetLink && <a href={program.nextVisitMeetLink} target="_blank" rel="noopener noreferrer"><Button size="sm" className="mt-3 w-full"><Video className="h-3.5 w-3.5" /> Entrar na reunião</Button></a>}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Nenhum encontro agendado no banco.</p>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-semibold text-foreground">Jornada do programa</h3></div>
              <div className="mt-4 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">
                {program.visitsCompleted > 0 ? `${program.visitsCompleted} encontro(s) concluído(s) no banco.` : "Nenhum encontro concluído no banco para a unidade selecionada."}
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground">Detalhes</h3>
              <div className="mt-3 space-y-2.5 text-xs">
                <div><span className="text-muted-foreground">Programa: </span><span className="font-medium text-foreground">{program.programKey}</span></div>
                <div><span className="text-muted-foreground">Visitas previstas: </span><span className="font-medium text-foreground">{program.totalVisits}</span></div>
                <div><span className="text-muted-foreground">Dados: </span><span className="font-medium text-foreground">Supabase</span></div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
