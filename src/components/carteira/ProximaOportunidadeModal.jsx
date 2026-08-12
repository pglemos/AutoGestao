import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Trophy } from "lucide-react";
import { calcularObjetivoEProximoPasso } from "./carteiraUtils";

const MODO_ATAQUE_ACEITO_KEY = "mx_modo_ataque_aceito";

export default function ProximaOportunidadeModal({
  open, proximaOportunidade, onExecutar, onVoltarCarteira, onEntrarModoAtaque
}) {
  if (!open) return null;

  const modoAtaqueAceito = sessionStorage.getItem(MODO_ATAQUE_ACEITO_KEY) === "true";

  // Fila vazia — tela de conclusão
  if (!proximaOportunidade) {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onVoltarCarteira(); }}>
        <DialogContent className="max-w-sm rounded-2xl text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-14 h-14 rounded-full bg-brand-primary-subtle flex items-center justify-center">
              <Trophy className="w-7 h-7 text-status-success-text" />
            </div>
            <div>
              <p className="text-lg font-black text-[#031B3D]">🎉 Excelente!</p>
              <p className="text-sm text-muted-foreground mt-1">Você concluiu todas as oportunidades prioritárias de hoje.</p>
            </div>
            <Button onClick={onVoltarCarteira} className="w-full rounded-xl bg-[#005BFF] hover:bg-status-info text-white">
              Voltar para Carteira
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const { objetivo, proximoPasso } = calcularObjetivoEProximoPasso(proximaOportunidade);

  // Modo Ataque já aceito — avança direto
  if (modoAtaqueAceito) {
    return (
      <Dialog open={open} onOpenChange={v => { if (!v) onVoltarCarteira(); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <div className="flex flex-col gap-4 py-2">
            <div className="flex items-center gap-2 text-status-success-text">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-bold">Resultado registrado</span>
            </div>
            <hr className="border-border-subtle" />
            <div>
              <p className="text-caption font-bold text-muted-foreground uppercase tracking-wide mb-3">Próxima oportunidade</p>
              <div className="bg-status-info-surface rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-base font-black text-[#031B3D]">{proximaOportunidade.nome}</p>
                  {proximaOportunidade.veiculo_interesse && (
                    <p className="text-xs text-muted-foreground mt-0.5">{proximaOportunidade.veiculo_interesse}</p>
                  )}
                </div>
                <div>
                  <p className="text-caption text-status-info-text font-bold uppercase tracking-wide">Próximo passo</p>
                  <p className="text-sm font-bold text-[#031B3D]">{proximoPasso}</p>
                  {objetivo && <p className="text-caption text-muted-foreground mt-0.5">{objetivo}</p>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <Button variant="outline" onClick={onVoltarCarteira} className="flex-1 rounded-xl text-muted-foreground">Voltar</Button>
              <Button onClick={() => onExecutar(proximaOportunidade)} className="flex-1 rounded-xl bg-[#005BFF] hover:bg-status-info text-white gap-2">
                <Zap className="w-4 h-4" /> Executar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Primeira vez — oferece Modo Ataque
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onVoltarCarteira(); }}>
      <DialogContent className="max-w-sm rounded-2xl">
        <div className="flex flex-col gap-4 py-2">
          <div className="flex items-center gap-2 text-status-success-text">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-bold">Resultado registrado</span>
          </div>

          <hr className="border-border-subtle" />

          {/* Convite Modo Ataque */}
          <div className="bg-gradient-to-br from-[#031B3D] to-[#005BFF] rounded-2xl p-5 text-white space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <p className="text-base font-black">🎯 Deseja entrar no Modo Ataque?</p>
            </div>
            <p className="text-sm text-blue-100 leading-snug">
              No Modo Ataque o sistema entrega automaticamente a próxima oportunidade. Você apenas executa e registra o resultado.
            </p>
            <p className="text-caption text-blue-300">
              Próxima: <span className="font-bold text-white">{proximaOportunidade.nome}</span>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => {
                sessionStorage.setItem(MODO_ATAQUE_ACEITO_KEY, "true");
                onEntrarModoAtaque();
              }}
              className="w-full rounded-xl bg-[#005BFF] hover:bg-status-info text-white gap-2 h-11 font-bold"
            >
              <Zap className="w-4 h-4" /> Entrar no Modo Ataque
            </Button>
            <Button
              variant="outline"
              onClick={onVoltarCarteira}
              className="w-full rounded-xl text-muted-foreground"
            >
              Voltar para Carteira
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { MODO_ATAQUE_ACEITO_KEY };