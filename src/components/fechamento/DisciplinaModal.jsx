import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  X, CheckSquare, Star, Calendar, DollarSign, Clock, ListChecks
} from "lucide-react";

const InfoBox = ({ color, children }) => {
  const styles = {
    blue:   "bg-status-info-surface border-status-info/30 text-status-info-text",
    green:  "bg-brand-primary-subtle border-brand-primary/30 text-brand-primary-active",
    amber:  "bg-status-warning-surface border-status-warning/30 text-status-warning-text",
    red:    "bg-status-error-surface border-status-error/30 text-status-error-text",
    slate:  "bg-muted border-border text-foreground",
  };
  return (
    <div className={`border rounded-xl px-4 py-3 text-[12px] font-semibold leading-snug ${styles[color]}`}>
      {children}
    </div>
  );
};

const Section = ({ icon: Icon, iconColor, number, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2.5">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <span className="text-caption font-bold text-muted-foreground uppercase tracking-widest">Item {number}</span>
        <h3 className="text-[14px] font-bold text-mx-navy leading-tight">{title}</h3>
      </div>
    </div>
    <div className="ml-10.5 space-y-2.5 pl-1 border-l-2 border-border-subtle">
      {children}
    </div>
  </div>
);

const P = ({ children }) => (
  <p className="text-body-sm text-muted-foreground leading-relaxed">{children}</p>
);

const Bullet = ({ children }) => (
  <li className="text-body-sm text-muted-foreground leading-relaxed">{children}</li>
);

const CheckItem = ({ label, value, green }) => (
  <div className="flex items-center gap-2.5">
    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${green ? "bg-brand-primary-subtle" : "bg-muted"}`}>
      <div className={`w-2 h-2 rounded-sm ${green ? "bg-status-success" : "bg-slate-400"}`} />
    </div>
    <span className="text-body-sm text-muted-foreground leading-relaxed flex-1">{label}</span>
    {value && <span className="text-[12px] font-bold text-mx-navy flex-shrink-0">{value}</span>}
  </div>
);

export default function DisciplinaModal({ open, onClose }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="p-0 overflow-hidden flex flex-col"
        style={{ maxWidth: 720, width: "95vw", maxHeight: "85vh", borderRadius: 16 }}
      >
        {/* Header fixo */}
        <div className="flex-shrink-0 px-7 pt-6 pb-5 border-b border-border-subtle bg-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-[18px] font-bold text-mx-navy leading-tight">
                Entenda sua pontuação de Disciplina
              </h2>
              <p className="text-body-sm text-muted-foreground mt-1 leading-relaxed">
                A pontuação do Fechamento Diário mede o quanto você manteve sua rotina comercial organizada no dia.
              </p>
            </div>
            <button
              onClick={onClose}
              className="min-h-[var(--mx-touch-target-min)] min-w-[var(--mx-touch-target-min)] w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors flex-shrink-0 mt-0.5"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto px-7 py-6 space-y-8">

          {/* 1 — 70% */}
          <Section icon={CheckSquare} iconColor="bg-status-info" number="1" title="Fechamento básico — 70%">
            <P>Você garante 70% da pontuação quando informa as quantidades do dia:</P>
            <ul className="space-y-1 list-none">
              <Bullet>Leads recebidos;</Bullet>
              <Bullet>Atendimentos realizados;</Bullet>
              <Bullet>Agendamentos D+1;</Bullet>
              <Bullet>E finaliza o fechamento do dia.</Bullet>
            </ul>
            <P>Ou seja: se você preencher apenas os números e finalizar o fechamento, sua disciplina será de 70%.</P>
            <InfoBox color="blue">✓ Preencheu os números do dia = 70%</InfoBox>
          </Section>

          <div className="border-t border-border-subtle" />

          {/* 2 — +30% */}
          <Section icon={Star} iconColor="bg-status-success" number="2" title="Cadastro dos agendamentos — até +30%">
            <P>Os outros 30% são conquistados quando você detalha, no campo "Cadastrar Novo Cliente", os agendamentos que informou no card "Agendamento D+1".</P>
            <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-2">
              <p className="text-[12px] font-bold text-mx-navy">Exemplo:</p>
              <P>Se você informou no card "Agendamento D+1":</P>
              <ul className="space-y-1 list-none">
                <Bullet>Carteira: 1 agendamento</Bullet>
                <Bullet>Internet: 1 agendamento → Total: 2 agendamentos D+1</Bullet>
              </ul>
              <P>Então você precisa cadastrar 2 clientes, sendo 1 do canal Carteira e 1 do canal Internet.</P>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-white border border-border rounded-lg px-3 py-2 text-center">
                  <span className="text-[18px] font-bold text-status-success">100%</span>
                  <p className="text-caption text-muted-foreground mt-0.5">Cadastrou os 2 clientes</p>
                </div>
                <div className="bg-white border border-border rounded-lg px-3 py-2 text-center">
                  <span className="text-[18px] font-bold text-status-warning-text">85%</span>
                  <p className="text-caption text-muted-foreground mt-0.5">Cadastrou apenas 1 dos 2</p>
                </div>
              </div>
            </div>
            <InfoBox color="green">✓ Detalhou todos os agendamentos D+1 corretamente = 100%</InfoBox>
          </Section>

          <div className="border-t border-border-subtle" />

          {/* 3 — Quando conta */}
          <Section icon={Calendar} iconColor="bg-status-info" number="3" title="Quando um cadastro conta como agendamento?">
            <P>Para o cadastro contar na pontuação extra, ele precisa cumprir estas regras:</P>
            <ul className="space-y-1 list-none">
              <Bullet>O canal deve ser <strong>Carteira</strong> ou <strong>Internet</strong>;</Bullet>
              <Bullet>O campo "Venda Realizada" deve estar como <strong>Em Negociação</strong>;</Bullet>
              <Bullet>A data do agendamento deve ser para o <strong>dia seguinte ao fechamento</strong> (D+1).</Bullet>
            </ul>
            <div className="bg-surface-alt border border-border rounded-xl p-4">
              <p className="text-[12px] font-bold text-mx-navy mb-1">Exemplo:</p>
              <P>Se o fechamento é do dia 22/05, o agendamento deve estar marcado para 23/05.</P>
            </div>
            <InfoBox color="amber">⚠ Para contar como agendamento, a venda deve estar como "Em Negociação".</InfoBox>
          </Section>

          <div className="border-t border-border-subtle" />

          {/* 4 — Data */}
          <Section icon={Calendar} iconColor="bg-status-warning" number="4" title="Atenção à data do agendamento">
            <P>Todo agendamento informado no card "Agendamento D+1" deve ser cadastrado com data para o dia seguinte ao fechamento (D+1).</P>
            <P>Agendamentos com data superior ao D+1 são considerados <strong>agendamentos futuros</strong> e não contam na Disciplina do Fechamento.</P>
            <div className="bg-surface-alt border border-border rounded-xl p-4 space-y-2">
              <p className="text-[12px] font-bold text-mx-navy">Exemplo:</p>
              <P>Fechamento em 27/06 → D+1 = 28/06. Você cadastrou:</P>
              <ul className="space-y-1 list-none">
                <Bullet>2 clientes com data 28/06 → contam para a Disciplina;</Bullet>
                <Bullet>1 cliente com data 30/06 → <strong>agendamento futuro</strong>, não conta na Disciplina.</Bullet>
              </ul>
              <P>O agendamento futuro é salvo na Carteira de Clientes e fortalece a <strong>Qualidade da Carteira</strong>.</P>
            </div>
            <InfoBox color="red">⚠ Agendamentos futuros não contam na Disciplina — apenas os D+1 são considerados.</InfoBox>
          </Section>

          <div className="border-t border-border-subtle" />

          {/* 5 — Venda */}
          <Section icon={DollarSign} iconColor="bg-status-success" number="5" title="Venda não é agendamento">
            <P>Se no cadastro do cliente você marcar <strong>"Venda Realizada = Sim"</strong>, o sistema entende que foi uma venda.</P>
            <P>Esse registro vai contar para:</P>
            <ul className="space-y-1 list-none">
              <Bullet>Vendas realizadas;</Bullet>
              <Bullet>Faturamento;</Bullet>
              <Bullet>Funil de vendas.</Bullet>
            </ul>
            <P>Mas ele <strong>não conta como agendamento D+1</strong>. Para contar como agendamento, o campo deve estar como <strong>"Em Negociação"</strong>.</P>
            <InfoBox color="blue">ℹ Venda Realizada = Sim conta como venda, não como agendamento.</InfoBox>
          </Section>

          <div className="border-t border-border-subtle" />

          {/* 6 — Prazo */}
          <Section icon={Clock} iconColor="bg-muted-foreground" number="6" title="Prazo para fechar o dia anterior">
            <P>Você pode realizar ou corrigir o fechamento do dia anterior até <strong>09h30 da manhã</strong>, no horário de Brasília.</P>
            <P>Depois desse horário, o fechamento fica bloqueado. Caso precise ajustar, solicite liberação ao seu superior.</P>
            <InfoBox color="slate">🔒 Após 09h30, somente o superior poderá liberar o fechamento.</InfoBox>
          </Section>

          <div className="border-t border-border-subtle" />

          {/* 7 — Checklist final */}
          <Section icon={ListChecks} iconColor="bg-status-info" number="7" title="Resumo rápido">
            <div className="space-y-2.5">
              <CheckItem label="Preencheu os números do dia" value="70%" green />
              <CheckItem label="Detalhou todos os agendamentos D+1 corretamente" value="100%" green />
              <CheckItem label="Detalhou apenas parte dos agendamentos" value="proporcional" />
              <CheckItem label="Informou 0 agendamentos D+1 → Disciplina máxima = 70%" />
              <CheckItem label="Agendamento futuro (data > D+1) → salvo na Carteira, não conta na Disciplina" />
              <CheckItem label="Cliente vendido conta como venda, não como agendamento" />
              <CheckItem label="Fechamento do dia anterior fica liberado até 09h30 do dia seguinte" />
            </div>
            <div className="bg-surface-alt border border-border rounded-xl p-4 mt-2">
              <p className="text-body-sm text-muted-foreground leading-relaxed italic">
                "Essa regra existe para manter seu funil atualizado e ajudar você, sua liderança e a loja a acompanharem melhor as oportunidades reais de venda."
              </p>
            </div>
          </Section>

        </div>

        {/* Footer fixo */}
        <div className="flex-shrink-0 px-7 py-4 border-t border-border-subtle bg-white flex items-center justify-end">
          <button
            onClick={onClose}
            className="bg-status-info hover:bg-status-info active:scale-[0.98] transition-all text-white font-bold text-body-sm px-8 h-[40px] rounded-xl shadow-sm shadow-blue-200"
          >
            Entendi
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
