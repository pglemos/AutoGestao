import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, Copy, Check, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getScriptOficial, normalizarTelefoneWhatsApp } from "./carteiraUtils";

const TONS = [
  { id: "consultivo", label: "Consultivo", desc: "Perguntativo, orientado a entender a necessidade" },
  { id: "direto",     label: "Direto",      desc: "Objetivo, claro, sem rodeios" },
  { id: "leve",       label: "Leve",        desc: "Descontraído, próximo, não pressiona" },
  { id: "reativacao", label: "Reativação",  desc: "Para clientes frios ou sem resposta" },
  { id: "audio",      label: "Áudio curto", desc: "Breve, natural, como uma mensagem de voz" },
];


/** Explica, em português claro, por que não há script oficial disponível. */
function descreverBloqueio(oficial) {
  if (!oficial) return "Script oficial indisponível para esta situação.";
  if (oficial.motivo === "SOURCE_BLOCKER") {
    return "Este status referencia um script que ainda não existe na matriz oficial. O envio fica bloqueado até a planilha ser corrigida; as demais ações continuam disponíveis.";
  }
  if (oficial.motivo === "SEM_MAPEAMENTO") {
    return "A situação atual ainda precisa ser classificada para que o script oficial seja definido. Use \"Atualizar situação\".";
  }
  if (oficial.motivo === "TERMINAL_TECNICO") {
    return "Oportunidade cancelada não possui script comercial.";
  }
  if (oficial.missingVariables?.length) {
    return `Faltam dados para montar a mensagem: ${oficial.missingVariables.join(", ")}.`;
  }
  return "Script oficial indisponível para esta situação.";
}

export default function ScriptIA({ cliente, proximoPasso, onWhatsAppClick }) {
  const [tomSelecionado, setTomSelecionado] = useState("consultivo");
  const [script, setScript] = useState("");
  const [bloqueio, setBloqueio] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // FONTE ÚNICA: os 77 scripts oficiais da matriz v1.
  //
  // Antes o texto vinha de scriptTemplatesLocal, um banco paralelo que SORTEAVA uma
  // variação a cada clique. Script comercial sorteado não é determinístico e não é
  // rastreável à metodologia: dois vendedores no mesmo estado mandavam mensagens
  // diferentes, e nenhuma delas constava da matriz.
  //
  // Quando o script oficial não está disponível — variável obrigatória faltando,
  // SOURCE_BLOCKER da planilha, ou situação que ainda depende de classificação — a
  // mensagem NÃO é substituída por outra: o motivo é exibido e o envio fica bloqueado.
  const gerarScript = useCallback(() => {
    if (!cliente) return;
    const oficial = getScriptOficial(cliente);
    if (oficial && oficial.scriptReady && oficial.texto) {
      setScript(oficial.texto);
      setBloqueio(null);
      return;
    }
    setScript("");
    setBloqueio(descreverBloqueio(oficial));
  }, [cliente]);

  useEffect(() => {
    if (!cliente) return;
    gerarScript();
  }, [cliente?.id, gerarScript]);

  const copiar = useCallback(async () => {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = script;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }, [script]);

  const tel = normalizarTelefoneWhatsApp(cliente?.whatsapp || cliente?.telefone || "");
  const waUrl = tel && script ? `https://wa.me/${tel}?text=${encodeURIComponent(script)}` : null;

  return (
    <div className="border border-dashed border-violet-200 rounded-2xl bg-violet-50/40 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-violet-600" />
        </div>
        <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">Script personalizado</p>
      </div>

      {/* Seletor de tom */}
      <div>
        <p className="text-caption font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Tom da mensagem</p>
        <div className="flex flex-wrap gap-1.5">
          {TONS.map(t => (
            <button
              key={t.id}
              onClick={() => { setTomSelecionado(t.id); gerarScript(); }}
              title={t.desc}
              className={`text-caption font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                tomSelecionado === t.id
                  ? "bg-violet-600 text-white border-violet-600"
                  : "bg-white text-muted-foreground border-slate-200 hover:border-violet-300 hover:text-violet-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Motivo do bloqueio — o vendedor precisa saber por que não há mensagem */}
      {!script && bloqueio && (
        <p
          role="status"
          className="text-xs leading-relaxed text-foreground bg-white border border-slate-200 rounded-xl p-3"
        >
          {bloqueio}
        </p>
      )}

      {/* Script oficial */}
      {script && (
        <>
          <div>
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              rows={7}
              className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
            />
            <p className="text-caption text-muted-foreground mt-0.5">Edite antes de enviar se necessário.</p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={copiar} className="flex-1 rounded-xl gap-2 text-xs border-violet-200 text-violet-700 hover:bg-violet-50">
              {copiado ? <><Check className="w-3.5 h-3.5 text-green-500" /> Copiado!</> : <><Copy className="w-3.5 h-3.5" /> Copiar</>}
            </Button>
            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="flex-1" onClick={onWhatsAppClick}>
                <Button className="w-full rounded-xl bg-[#25D366] hover:bg-green-600 text-white gap-2 text-xs">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </Button>
              </a>
            )}
          </div>

          <Button
            variant="ghost"
            onClick={() => gerarScript()}
            className="w-full rounded-xl text-violet-600 hover:bg-violet-100 gap-2 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Gerar outra versão
          </Button>
        </>
      )}
    </div>
  );
}
