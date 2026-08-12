import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ChevronRight, ChevronDown, ExternalLink, BookOpen, Instagram, MessageCircle, ShoppingBag, Users, Star, Zap, Brain, FolderOpen, UserPlus, Phone, Headphones, ListChecks, CheckCircle2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import moment from "moment";

// ── Prospecção schedule ───────────────────────────────────────────────────────
const PROSPECAO_SCHEDULE = {
  1: [
    { tipo: "Instagram Stories", meta: "5/dia", publico: "Morno", exemplo: "Enquete de engajamento sobre carros ou comparativos", instrucoes: ["Publique 2 enquetes sobre carros", "Abra caixa de perguntas", "Escolha tema: dúvidas, avaliação ou financiamento", "Responda algumas perguntas em vídeo"] },
    { tipo: "Status WhatsApp", meta: "5/dia", publico: "Morno", exemplo: "Foto de um carro bacana com chamada discreta", instrucoes: ["Escolha 1 veículo em destaque", "Adicione texto curto com diferencial", "Insira link do catálogo ou WhatsApp"] },
    { tipo: "Catálogo WhatsApp", meta: "10/semana", publico: "Frio e Morno", exemplo: "Catálogo atualizado com preços e condições", instrucoes: ["Atualize o catálogo no WhatsApp Business", "Inclua fotos de qualidade", "Adicione preços e condições atuais", "Compartilhe com 5 contatos frios"] },
  ],
  2: [
    { tipo: "Instagram Stories", meta: "5/dia", publico: "Morno", exemplo: "Caixa de perguntas sobre carros", instrucoes: ["Publique uma enquete de engajamento", "Publique segunda enquete", "Abra caixa de perguntas", "Escolha tema: dúvidas, avaliação ou financiamento", "Responda algumas perguntas em vídeo"] },
    { tipo: "Status WhatsApp", meta: "5/dia", publico: "Morno", instrucoes: ["Poste uma novidade do estoque", "Use linguagem próxima", "Finalize com pergunta ou chamada para ação"] },
    { tipo: "Instagram Feed", meta: "2/semana", publico: "Frio e Morno", exemplo: "Post de produto com foco em benefícios", instrucoes: ["Escolha veículo em destaque", "Escreva legenda focada em benefícios", "Use hashtags do segmento", "Finalize com chamada para Direct ou WhatsApp"] },
  ],
  3: [
    { tipo: "Instagram Stories", meta: "5/dia", publico: "Morno", exemplo: "Story Temático", instrucoes: ["Abra com enquete", "Apresente o problema do cliente", "Pergunte se quer uma dica", "Grave vídeo curto com orientação"] },
    { tipo: "Status WhatsApp", meta: "5/dia", publico: "Morno", instrucoes: ["Story de humanização ou bastidores", "Mostre o dia a dia na concessionária"] },
    { tipo: "Grupo de Ofertas", meta: "3/semana", publico: "Morno e Quente", instrucoes: ["Escolha 3 veículos para divulgar", "Crie mensagem com preço, parcela e destaque", "Envie no grupo com imagem de qualidade"] },
    { tipo: "Indicação de Amigos", meta: "10/mês", publico: "Frio", semana: [2], instrucoes: ["Liste clientes satisfeitos recentes", "Envie mensagem personalizada pedindo indicação", "Ofereça benefício pela indicação"] },
    { tipo: "Intermediadores", meta: "5/mês", publico: "Quente", semana: [4], instrucoes: ["Contate parceiros: despachantes, mecânicos, corretores", "Apresente condições especiais para indicações", "Mantenha relacionamento ativo"] },
  ],
  4: [
    { tipo: "Instagram Stories", meta: "5/dia", publico: "Morno", exemplo: "Enquetes e Quiz", instrucoes: ["Crie desafio sobre carros", "Faça entre 5 e 7 perguntas", "Termine com chamada para Direct"] },
    { tipo: "Status WhatsApp", meta: "5/dia", publico: "Morno", instrucoes: ["Post motivacional ou dica sobre carros", "Fácil de compartilhar"] },
    { tipo: "Instagram Reels", meta: "1/semana", publico: "Frio e Morno", exemplo: "Reels comparando dois modelos populares", instrucoes: ["Grave vídeo curto de 30–60s", "Use trending sound", "Mostre diferencial do veículo", "Finalize com chamada para ação"] },
  ],
  5: [
    { tipo: "Instagram Stories", meta: "5/dia", publico: "Morno", exemplo: "Venda com Chamada para Ação", instrucoes: ["Publique até 8 ofertas", "Mostre veículo, condição e diferencial", "Termine com link do WhatsApp ou chamada para Direct"] },
    { tipo: "Status WhatsApp", meta: "5/dia", publico: "Morno", instrucoes: ["Resumo das melhores ofertas da semana", "Use formato lista"] },
    { tipo: "Marketplace", meta: "5/quinzena", publico: "Frio", semana: [1, 3], instrucoes: ["Selecione 5 veículos para anunciar", "Tire fotos de qualidade", "Escreva descrição completa com diferenciais", "Publique no OLX, Mercado Livre ou Facebook Marketplace"] },
    { tipo: "Indicação de Clientes", meta: "10/mês", publico: "Frio", semana: [2], instrucoes: ["Selecione clientes que compraram há 3–12 meses", "Envie mensagem agradecendo e pedindo indicação", "Ofereça revisão gratuita ou presente"] },
    { tipo: "Parceria Consórcio", meta: "5/mês", publico: "Morno", semana: [4], instrucoes: ["Contate vendedores de consórcio da região", "Proponha troca de indicações", "Apresente condições especiais para clientes deles"] },
  ],
  6: [
    { tipo: "Instagram Stories", meta: "3/dia", publico: "Morno", instrucoes: ["Conteúdo pessoal: família, hobbies, bastidores", "Evite assuntos polêmicos", "Humanize sua marca pessoal"] },
    { tipo: "Status WhatsApp", meta: "2/dia", publico: "Morno", instrucoes: ["Conteúdo leve e pessoal", "Não force vendas no sábado"] },
  ],
  0: [
    { tipo: "Conteúdo de Humanização", meta: "opcional", publico: "Todos", instrucoes: ["Conteúdo pessoal opcional", "Família, hobbies, inspiração", "Evite assuntos polêmicos"] },
  ],
};

const TIPO_ICONS = {
  "Instagram Stories": Instagram,
  "Status WhatsApp": MessageCircle,
  "Instagram Feed": Instagram,
  "Instagram Reels": Instagram,
  "Marketplace": ShoppingBag,
  "Catálogo WhatsApp": MessageCircle,
  "Grupo de Ofertas": Users,
  "Indicação de Amigos": Users,
  "Indicação de Clientes": Users,
  "Intermediadores": Star,
  "Parceria Consórcio": Users,
  "Conteúdo de Humanização": Star,
};

const ROUTINE_STEPS = [
  {
    id: "motivacao", label: "Foco do Dia", icon: Brain, offset: 0, duracao: 15,
    objetivo: "Preparar foco, energia e direção para o dia.",
    instrucoes: ["Revise sua meta do mês", "Veja quantas vendas faltam", "Defina o principal resultado do dia", "Escolha uma negociação prioritária", "Conecte-se ao seu objetivo profissional"],
    atalhos: [{ label: "Ver Meu PDI", to: "/pdi" }, { label: "Ver Treinamentos", to: "/treinamentos" }],
  },
  {
    id: "organizacao", label: "Organização do Dia", icon: FolderOpen, offset: 15, duracao: 40,
    objetivo: "Sair da organização sabendo quais clientes e ações devem ser priorizados.",
    instrucoes: ["Confira os agendamentos de hoje", "Responda retornos pendentes de ontem", "Identifique clientes quentes", "Confirme agendamentos", "Resolva pendências comerciais", "Defina retornos da manhã, tarde e fim do dia"],
    atalhos: [{ label: "Clientes de Hoje", to: "/execucao" }, { label: "Abrir Carteira", to: "/carteira" }],
  },
  {
    id: "novos_clientes", label: "Contato com Novos Clientes", icon: UserPlus, offset: 45, duracao: 75,
    objetivo: "Responder, qualificar e definir a próxima ação.",
    instrucoes: ["Envie uma mensagem de apresentação", "Identifique o veículo procurado", "Entenda o prazo de compra", "Verifique carro na troca", "Verifique necessidade de financiamento", "Classifique o cliente (Frio, Morno ou Quente)", "Defina próxima ação e data"],
    atalhos: [{ label: "Abrir Carteira", to: "/carteira" }],
  },
  {
    id: "prospeccao", label: "Prospecção", icon: Phone, offset: 180, duracao: 90,
    objetivo: "Gerar novas oportunidades para o canal Carteira.",
    instrucoes: [],
    atalhos: [],
  },
  {
    id: "atendimento", label: "Atendimento", icon: Headphones, offsetAlmoco: true, duracao: 120,
    objetivo: "Atender clientes e avançar negociações.",
    instrucoes: ["Consulte o veículo de interesse", "Verifique carro na troca", "Verifique financiamento", "Leia observações anteriores", "Defina o próximo avanço desejado"],
    atalhos: [{ label: "Clientes de Hoje", to: "/execucao" }, { label: "Abrir Carteira", to: "/carteira" }],
  },
  {
    id: "lista_quente", label: "Lista Quente", icon: ListChecks, offsetSaida: -120, duracao: 60,
    objetivo: "Retomar negociações com maior chance de fechamento.",
    instrucoes: ["Filtre clientes com status 'Em Negociação'", "Priorize os com agendamento mais antigo", "Escolha a abordagem correta para cada objeção"],
    atalhos: [{ label: "Abrir Carteira", to: "/carteira" }],
  },
  {
    id: "fechamento", label: "Fechamento do Dia", icon: CheckCircle2, offsetSaida: -60, duracao: 60,
    objetivo: "Encerrar o dia com informações organizadas e preparar o próximo.",
    instrucoes: ["Registre interações relevantes", "Atualize clientes que mudaram de etapa", "Revise resultados do dia", "Defina prioridades D+1", "Realize o Fechamento Diário"],
    atalhos: [{ label: "Ir para o Fechamento Diário", to: "/fechamento", primary: true }],
  },
];

const OBJECOES = [
  { label: "Preço", dicas: ["Reforce o valor e não apenas o preço", "Mostre garantia e diferenciais", "Apresente alternativas de veículo ou entrada", "Evite discutir apenas desconto"] },
  { label: "Avaliação do Usado", dicas: ["Explique os critérios de avaliação com transparência", "Mostre os benefícios de trocar pelo novo agora", "Apresente uma alternativa de entrada sem troca"] },
  { label: "Financiamento", dicas: ["Apresente todas as opções disponíveis", "Faça uma simulação personalizada", "Explique preservação de capital", "Mostre alternativas: consórcio, capital próprio"] },
  { label: "Pediu para pensar", dicas: ["Pergunte o que ainda está em aberto", "Reformule a objeção em forma de pergunta", "Apresente dados concretos e provas sociais", "Ofereça uma visita ou contato de retorno específico"] },
  { label: "Não respondeu", dicas: ["Tente por outro canal (ligação, e-mail)", "Envie mensagem curta com pergunta aberta", "Aguarde 48h e tente novamente", "Se persistir, mova para cadência longa"] },
];

// ── Context engine ─────────────────────────────────────────────────────────────

function buildContext({ profile, clients, clientesHoje, pdi, perdasRecentes }) {
  const meta = profile?.monthly_goal || 10;
  const hoje = moment().format("YYYY-MM-DD");
  const mes = moment().format("YYYY-MM");
  const vendasMes = clients.filter(c => c.sale_status === "Sim" && (c.updated_date || "").startsWith(mes)).length;
  const faltam = Math.max(0, meta - vendasMes);
  const quentes = clients.filter(c => c.sale_status === "Em Negociação").length;
  const diaSemana = moment().day(); // 0=dom
  const semanaStr = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"][diaSemana];
  const agendadosHoje = clientesHoje.length;

  // Objeção mais frequente nas perdas recentes
  const objecaoPerdas = (() => {
    if (!perdasRecentes || perdasRecentes.length === 0) return null;
    const contagem = {};
    perdasRecentes.forEach(c => { if (c.loss_reason) contagem[c.loss_reason] = (contagem[c.loss_reason] || 0) + 1; });
    const max = Object.entries(contagem).sort((a, b) => b[1] - a[1])[0];
    return max ? max[0] : null;
  })();

  return { meta, vendasMes, faltam, quentes, diaSemana, semanaStr, agendadosHoje, objecaoPerdas };
}

// Gera conteúdo dinâmico para o Momento Motivacional
function motivacaoConteudo(ctx) {
  const { faltam, quentes, agendadosHoje, diaSemana, objecaoPerdas } = ctx;

  if (diaSemana === 1) {
    return {
      titulo: "Segunda-feira — comece com direção",
      itens: [
        "Comece a semana definindo sua principal venda-alvo.",
        "Revise clientes pendentes do fim de semana.",
        "Organize retornos da manhã, tarde e fim do dia.",
        "Escolha uma negociação para avançar hoje.",
        "Entre no dia com direção antes de velocidade.",
      ],
    };
  }
  if (diaSemana === 5) {
    return {
      titulo: "Sexta-feira — busque decisão",
      itens: [
        "Hoje é dia de buscar decisão.",
        "Retome clientes que ficaram no \"vou pensar\".",
        "Priorize quem pode avançar para proposta, sinal ou visita.",
        "Não termine a semana com negociação sem próxima ação.",
        "Feche o dia deixando o próximo passo definido.",
      ],
    };
  }
  if (objecaoPerdas && objecaoPerdas.toLowerCase().includes("preço")) {
    return {
      titulo: "Foco em valor, não em preço",
      itens: [
        "Hoje, antes de falar preço, reforce valor.",
        "Mostre segurança, garantia, procedência e diferencial.",
        "Não entre direto em desconto.",
        "Faça perguntas antes de responder objeções.",
        "Conduza o cliente para comparar valor, não apenas parcela.",
      ],
    };
  }
  if (agendadosHoje === 0) {
    return {
      titulo: "Agenda leve — crie movimento",
      itens: [
        "Hoje sua agenda está leve. Use isso a favor.",
        "Escolha clientes da carteira que merecem retomada.",
        "Defina uma ação de prospecção antes do primeiro atendimento.",
        "Gere movimento antes de esperar o movimento da loja.",
        "Comece o dia criando oportunidade.",
      ],
    };
  }
  if (faltam > 3) {
    return {
      titulo: `Faltam ${faltam} vendas para sua meta`,
      itens: [
        `Faltam ${faltam} vendas para sua meta do mês.`,
        "Escolha uma negociação com maior chance de avanço.",
        "Antes de buscar volume, defina sua venda mais importante do dia.",
        "Use energia máxima no primeiro atendimento.",
        "Comece pelo método: postura, pergunta certa e próximo passo.",
      ],
    };
  }
  // Padrão
  return {
    titulo: "Prepare-se para um bom dia",
    itens: [
      quentes > 0 ? `Você tem ${quentes} cliente${quentes > 1 ? "s" : ""} em negociação ativa.` : "Revise sua carteira e identifique as melhores oportunidades.",
      "Defina sua venda prioritária antes de começar os atendimentos.",
      "Chegue pronto para o primeiro contato do dia.",
      "Pequenas ações consistentes geram resultados grandes.",
      "Concentre-se no próximo passo, não no resultado final.",
    ],
  };
}

// Gera instruções dinâmicas para a Organização do Dia
function organizacaoConteudo(ctx) {
  const { agendadosHoje, quentes } = ctx;
  const base = [
    agendadosHoje > 0
      ? `Você tem ${agendadosHoje} cliente${agendadosHoje > 1 ? "s" : ""} agendado${agendadosHoje > 1 ? "s" : ""} para hoje — confirme presença.`
      : "Nenhum cliente agendado hoje — organize retornos e prospecção.",
    "Responda retornos pendentes de ontem.",
    quentes > 0 ? `Identifique os mais quentes entre seus ${quentes} em negociação.` : "Identifique clientes com maior probabilidade de avançar.",
    "Resolva pendências comerciais.",
    "Defina retornos da manhã, tarde e fim do dia.",
  ];
  return base;
}

// Gera instruções dinâmicas para a Lista Quente
function listaQuenteConteudo(ctx) {
  const { quentes, diaSemana, objecaoPerdas } = ctx;
  const base = [];
  if (quentes === 0) {
    base.push("Sua lista quente está vazia — use este tempo para prospecção.");
    base.push("Identifique leads inativos para reativar.");
  } else {
    base.push(`Filtre seus ${quentes} cliente${quentes > 1 ? "s" : ""} em negociação.`);
    if (objecaoPerdas) base.push(`Atenção: objeção mais frequente recente foi "${objecaoPerdas}". Use os roteiros abaixo.`);
    base.push("Priorize quem tem proposta em aberto ou agendamento vencido.");
    base.push("Escolha a abordagem correta para cada objeção.");
    if (diaSemana === 5) base.push("Sexta: ideal para buscar decisão antes do fim de semana.");
  }
  return base;
}

// Gera instruções dinâmicas para o Fechamento
function fechamentoConteudo(ctx) {
  const { faltam, agendadosHoje } = ctx;
  return [
    "Registre interações relevantes do dia.",
    "Atualize clientes que mudaram de etapa.",
    faltam > 0 ? `Faltam ${faltam} vendas para sua meta — defina prioridades para amanhã.` : "Você está na meta — mantenha o ritmo amanhã.",
    agendadosHoje > 0 ? "Confirme agendamentos de amanhã." : "Defina pelo menos 1 agendamento para D+1.",
    "Realize o Fechamento Diário no sistema.",
  ];
}

// Gera a frase curta do card recolhido (preview)
function frasePreview(stepId, ctx, acoesDia) {
  const { faltam, quentes, agendadosHoje, diaSemana, objecaoPerdas } = ctx;
  switch (stepId) {
    case "motivacao":
      if (diaSemana === 5) return "Sexta-feira: retome clientes que ficaram no \"vou pensar\".";
      if (diaSemana === 1) return "Segunda: defina sua principal venda-alvo da semana.";
      if (agendadosHoje === 0) return "Agenda leve — use este tempo para criar movimento.";
      if (faltam > 0) return `Faltam ${faltam} venda${faltam > 1 ? "s" : ""} para sua meta do mês.`;
      return "Prepare foco e direção antes de começar.";
    case "organizacao":
      if (agendadosHoje > 0) return `Você tem ${agendadosHoje} cliente${agendadosHoje > 1 ? "s" : ""} agendado${agendadosHoje > 1 ? "s" : ""} para hoje.`;
      return "Organize seus retornos e prioridades do dia.";
    case "novos_clientes":
      return "Qualifique e defina a próxima ação para cada novo lead.";
    case "prospeccao":
      if (acoesDia.length > 0) return `Hoje: ${acoesDia.map(a => a.tipo).join(" + ")}.`;
      return "Gere novas oportunidades para sua carteira.";
    case "atendimento":
      if (agendadosHoje > 0) return `Use este momento para preparar seus ${agendadosHoje} atendimento${agendadosHoje > 1 ? "s" : ""} de hoje.`;
      return "Use este momento para preparar o primeiro atendimento.";
    case "lista_quente":
      if (quentes > 0) return `Você tem ${quentes} cliente${quentes > 1 ? "s" : ""} quente${quentes > 1 ? "s" : ""} para retomar.`;
      if (objecaoPerdas) return `Objeção recorrente recente: "${objecaoPerdas}". Veja os roteiros.`;
      return "Retome negociações com maior chance de fechamento.";
    case "fechamento":
      if (faltam > 0) return `Faltam ${faltam} vendas. Defina prioridades para amanhã.`;
      return "Encerre o dia e prepare o próximo.";
    default:
      return "";
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ProspeccaoCard({ acao, onVerComoFazer }) {
  const Icon = TIPO_ICONS[acao.tipo] || Zap;
  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-[#005BFF]" />
          </div>
          <div>
            <p className="font-bold text-body-sm text-[#0F172A]">{acao.tipo}</p>
            <p className="text-caption text-muted-foreground">{acao.publico}</p>
          </div>
        </div>
        <span className="text-caption font-bold text-[#005BFF] bg-blue-50 px-2.5 py-1 rounded-full flex-shrink-0">{acao.meta}</span>
      </div>
      {acao.exemplo && <p className="text-[12px] text-muted-foreground italic">"{acao.exemplo}"</p>}
      <button
        onClick={() => { onVerComoFazer(acao); base44.analytics.track({ eventName: "rotina_ver_como_fazer", properties: { tipo: acao.tipo } }); }}
        className="flex items-center gap-1.5 text-[12px] font-bold text-[#005BFF] hover:underline mt-auto"
      >
        <BookOpen className="w-3.5 h-3.5" /> Ver como fazer
      </button>
    </div>
  );
}

function ComoFazerDrawer({ acao, onClose }) {
  if (!acao) return null;
  const Icon = TIPO_ICONS[acao.tipo] || Zap;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#0F172A]">
            <Icon className="w-5 h-5 text-[#005BFF]" /> {acao.tipo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-3 bg-blue-50 rounded-xl p-3">
            <span className="text-[12px] font-semibold text-[#005BFF]">Meta: {acao.meta}</span>
            <span className="text-[12px] text-muted-foreground">• Público: {acao.publico}</span>
          </div>
          {acao.objetivo && <p className="text-body-sm text-muted-foreground">{acao.objetivo}</p>}
          <div>
            <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-2">Como fazer</p>
            <ol className="space-y-2">
              {acao.instrucoes.map((inst, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#005BFF] text-white text-caption font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                  <span className="text-body-sm text-foreground">{inst}</span>
                </li>
              ))}
            </ol>
          </div>
          {acao.exemplo && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-caption font-bold text-muted-foreground uppercase tracking-wider mb-1">Exemplo</p>
              <p className="text-body-sm text-muted-foreground italic">"{acao.exemplo}"</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function AbaRotina({ profile, clients = [], clientesHoje = [], pdi = null, perdasRecentes = [] }) {
  const [expandedStep, setExpandedStep] = useState(null);
  const [comoFazerAcao, setComoFazerAcao] = useState(null);
  const [objecaoAberta, setObjecaoAberta] = useState(null);
  const [routineSteps, setRoutineSteps] = useState(ROUTINE_STEPS);
  const [prospeccaoSchedule, setProspeccaoSchedule] = useState(PROSPECAO_SCHEDULE);

  useEffect(() => {
    Promise.all([
      base44.entities.RoutineActivityTemplate.list().catch(() => []),
      base44.entities.ProspectingSchedule.list().catch(() => []),
      base44.entities.StoryIdea.list().catch(() => []),
    ]).then(([steps, schedule, stories]) => {
      if (steps && steps.length > 0) {
        const TIPO_ID_MAP = {
          mentalidade: "motivacao",
          organizacao: "organizacao",
          novos_leads: "novos_clientes",
          prospeccao: "prospeccao",
          atendimento: "atendimento",
          lista_quente: "lista_quente",
          fechamento: "fechamento",
        };
        const TIPO_ICON_MAP = {
          mentalidade: Brain,
          organizacao: FolderOpen,
          novos_leads: UserPlus,
          prospeccao: Phone,
          atendimento: Headphones,
          lista_quente: ListChecks,
          fechamento: CheckCircle2,
        };
        const mappedSteps = steps.map(s => {
          const matched = ROUTINE_STEPS.find(rs => rs.id === TIPO_ID_MAP[s.tipo]);
          return {
            id: TIPO_ID_MAP[s.tipo] || s.tipo,
            label: s.nome,
            icon: TIPO_ICON_MAP[s.tipo] || Brain,
            offset: matched?.offset ?? 0,
            duracao: s.duracao_minutos || matched?.duracao || 30,
            objetivo: s.objetivo,
            instrucoes: Array.isArray(s.instrucoes) ? s.instrucoes : [],
            atalhos: Array.isArray(s.atalhos) ? s.atalhos.map(a => ({ label: a.label, to: a.target || "/" })) : [],
            offsetAlmoco: matched?.offsetAlmoco,
            offsetSaida: matched?.offsetSaida,
          };
        });
        setRoutineSteps(mappedSteps);
      }
      
      if (schedule && schedule.length > 0) {
        const grouped = {};
        for (let d = 0; d <= 6; d++) {
          grouped[d] = [];
        }
        
        schedule.forEach(item => {
          const actionItem = {
            tipo: item.tipo_acao,
            meta: item.quantidade ? `${item.quantidade}/${item.periodicidade || 'dia'}` : 'opcional',
            publico: item.publico || 'Todos',
            exemplo: '',
            instrucoes: Array.isArray(item.instrucoes) ? item.instrucoes : [],
            semana: item.semana_mes ? [item.semana_mes] : undefined
          };
          
          if (item.tipo_acao === 'instagram_stories' || item.tipo_acao === 'status_whatsapp' || item.tipo_acao === 'conteudo_humanizacao') {
            const storyForDay = stories.find(st => st.dia_semana === item.dia_semana);
            if (storyForDay) {
              actionItem.exemplo = storyForDay.titulo;
              if (actionItem.instrucoes.length === 0 && Array.isArray(storyForDay.passos)) {
                actionItem.instrucoes = storyForDay.passos;
              }
            }
          }
          
          grouped[item.dia_semana].push(actionItem);
        });
        
        setProspeccaoSchedule(grouped);
      }
    }).catch(console.error);
  }, []);

  const entradaMin = useMemo(() => {
    const t = profile?.work_start || "08:00";
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }, [profile]);

  const saidaMin = useMemo(() => {
    const t = profile?.work_end || "18:00";
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  }, [profile]);

  const almocoMin = useMemo(() => entradaMin + 240, [entradaMin]);

  const nowMin = useMemo(() => {
    const n = moment();
    return n.hours() * 60 + n.minutes();
  }, []);

  const stepTime = (step) => {
    if (step.offsetSaida !== undefined) return saidaMin + step.offsetSaida;
    if (step.offsetAlmoco) return almocoMin;
    return entradaMin + (step.offset || 0);
  };

  const formatMin = (min) => {
    const h = Math.floor(min / 60).toString().padStart(2, "0");
    const m = (min % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };

  const currentStepId = useMemo(() => {
    const sorted = [...routineSteps].sort((a, b) => stepTime(a) - stepTime(b));
    let cur = sorted[0];
    for (const s of sorted) {
      if (stepTime(s) <= nowMin) cur = s;
    }
    return cur.id;
  }, [nowMin, entradaMin, saidaMin, almocoMin]);

  // Abrir automaticamente a etapa atual ao montar
  useEffect(() => {
    setExpandedStep(currentStepId);
    base44.analytics.track({ eventName: "rotina_abriu_aba", properties: { etapa_atual: currentStepId } });
  }, [currentStepId]);

  const diaSemana = moment().day();
  const semanaMes = Math.ceil(moment().date() / 7);
  const acoesDia = useMemo(() => {
    return (PROSPECAO_SCHEDULE[diaSemana] || []).filter(a => !a.semana || a.semana.includes(semanaMes));
  }, [diaSemana, semanaMes]);

  // Contexto dinâmico
  const ctx = useMemo(() =>
    buildContext({ profile, clients, clientesHoje, pdi, perdasRecentes }),
    [profile, clients, clientesHoje, pdi, perdasRecentes]
  );

  const conflito = clientesHoje.length > 0 && currentStepId === "prospeccao";

  const handleToggleStep = (stepId) => {
    const isOpen = expandedStep === stepId;
    setExpandedStep(isOpen ? null : stepId);
    if (!isOpen) {
      base44.analytics.track({ eventName: "rotina_abriu_etapa", properties: { etapa: stepId } });
    }
  };

  // Gera o conteúdo contextual das instruções de cada etapa
  const getInstrucoes = (step) => {
    switch (step.id) {
      case "motivacao": return motivacaoConteudo(ctx).itens;
      case "organizacao": return organizacaoConteudo(ctx);
      case "lista_quente": return listaQuenteConteudo(ctx);
      case "fechamento": return fechamentoConteudo(ctx);
      default: return step.instrucoes;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Main steps */}
      <div className="lg:col-span-2 space-y-4">
        {conflito && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-body-sm text-amber-800 font-medium">
              Você possui um cliente agendado neste horário. Priorize o atendimento e retome sua rotina depois.
            </p>
          </div>
        )}

        {routineSteps.map(step => {
          const isCurrent = step.id === currentStepId;
          const isExpanded = expandedStep === step.id;
          const time = formatMin(stepTime(step));
          const Icon = step.icon;
          const isPast = stepTime(step) < nowMin && !isCurrent;
          const preview = frasePreview(step.id, ctx, acoesDia);
          const instrucoesDinamicas = getInstrucoes(step);

          return (
            <div key={step.id} className={`bg-white rounded-2xl border shadow-sm transition-all ${isCurrent ? "border-[#005BFF] shadow-blue-100" : "border-border"}`}>
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                onClick={() => handleToggleStep(step.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isCurrent ? "bg-[#005BFF] text-white" : isPast ? "bg-green-100 text-green-600" : "bg-slate-100 text-muted-foreground"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-caption font-bold px-2 py-0.5 rounded-lg ${isCurrent ? "bg-[#005BFF] text-white" : "bg-slate-100 text-muted-foreground"}`}>{time}</span>
                    <span className={`text-[14px] font-bold ${isCurrent ? "text-[#0F172A]" : "text-muted-foreground"}`}>{step.label}</span>
                    {isCurrent && <span className="text-caption font-bold text-[#005BFF] bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Agora</span>}
                  </div>
                  {/* Frase contextual no card recolhido */}
                  {!isExpanded && (
                    <p className={`text-[12px] mt-0.5 truncate ${isCurrent ? "text-[#005BFF] font-semibold" : "text-muted-foreground"}`}>
                      {isCurrent && preview ? preview : step.objetivo}
                    </p>
                  )}
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-border-subtle">
                  {/* Título contextual para Foco do Dia */}
                  {step.id === "motivacao" && (
                    <p className="text-[12px] font-bold text-[#005BFF] mt-3 mb-1 uppercase tracking-wider">
                      {motivacaoConteudo(ctx).titulo}
                    </p>
                  )}
                  <p className="text-body-sm text-muted-foreground mt-3 mb-4">{step.objetivo}</p>

                  {/* Prospecção */}
                  {step.id === "prospeccao" ? (
                    <div>
                      <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Ações de hoje — {moment().format("dddd")}</p>
                      {acoesDia.length === 0 ? (
                        <p className="text-body-sm text-muted-foreground">Sem ações programadas para hoje. Aproveite para avançar na carteira.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {acoesDia.map((a, i) => <ProspeccaoCard key={i} acao={a} onVerComoFazer={setComoFazerAcao} />)}
                        </div>
                      )}
                    </div>
                  ) : step.id === "lista_quente" ? (
                    <div>
                      {/* Instruções dinâmicas */}
                      {instrucoesDinamicas.length > 0 && (
                        <div className="mb-4">
                          <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Faça agora</p>
                          <ol className="space-y-2">
                            {instrucoesDinamicas.map((inst, i) => (
                              <li key={i} className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-slate-100 text-muted-foreground text-caption font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                                <span className="text-body-sm text-foreground">{inst}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Selecione a objeção para ver o roteiro</p>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {OBJECOES.map(o => (
                          <button key={o.label} onClick={() => setObjecaoAberta(objecaoAberta === o.label ? null : o.label)}
                            className={`px-3 py-1.5 text-[12px] font-bold rounded-xl border transition-colors ${objecaoAberta === o.label ? "bg-[#005BFF] text-white border-[#005BFF]" : "border-border text-muted-foreground hover:bg-slate-50"}`}>
                            {o.label}
                          </button>
                        ))}
                      </div>
                      {objecaoAberta && (
                        <div className="bg-blue-50 rounded-xl p-4">
                          <p className="text-[12px] font-bold text-[#005BFF] mb-2">{objecaoAberta}</p>
                          <ul className="space-y-1.5">
                            {OBJECOES.find(o => o.label === objecaoAberta)?.dicas.map((d, i) => (
                              <li key={i} className="flex items-start gap-2 text-body-sm text-foreground">
                                <span className="text-[#005BFF] font-bold mt-0.5">→</span>{d}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    instrucoesDinamicas.length > 0 && (
                      <div className="mb-4">
                        <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Faça agora</p>
                        <ol className="space-y-2">
                          {instrucoesDinamicas.map((inst, i) => (
                            <li key={i} className="flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-muted-foreground text-caption font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                              <span className="text-body-sm text-foreground">{inst}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )
                  )}

                  {/* Atalhos */}
                  {step.atalhos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {step.atalhos.map(a => (
                        <Link key={a.label} to={a.to}
                          onClick={() => base44.analytics.track({ eventName: "rotina_clicou_atalho", properties: { atalho: a.label, etapa: step.id } })}
                          className={`flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 rounded-xl transition-colors ${a.primary ? "bg-[#005BFF] text-white hover:bg-blue-700" : "border border-[#005BFF] text-[#005BFF] hover:bg-blue-50"}`}>
                          <ExternalLink className="w-3 h-3" />{a.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Timeline sidebar */}
      <div className="bg-white rounded-2xl border border-border shadow-sm p-5 sticky top-6">
        <p className="text-caption font-bold text-muted-foreground uppercase tracking-[0.15em] mb-4">Linha do Tempo</p>
        <div className="space-y-0.5">
          {[...routineSteps].sort((a, b) => stepTime(a) - stepTime(b)).map((step, idx, arr) => {
            const isCurrent = step.id === currentStepId;
            const isPast = stepTime(step) < nowMin && !isCurrent;
            const Icon = step.icon;
            return (
              <div key={step.id} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrent ? "bg-[#005BFF] text-white" : isPast ? "bg-green-100 text-green-600" : "bg-slate-100 text-muted-foreground"}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  {idx < arr.length - 1 && <div className={`w-px h-5 ${isPast ? "bg-green-200" : "bg-slate-100"}`} />}
                </div>
                <div className="pb-3 pt-0.5">
                  <p className={`text-caption font-bold ${isCurrent ? "text-[#005BFF]" : "text-muted-foreground"}`}>{formatMin(stepTime(step))}</p>
                  <p className={`text-[12px] font-semibold leading-tight ${isCurrent ? "text-[#0F172A]" : "text-muted-foreground"}`}>{step.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {comoFazerAcao && <ComoFazerDrawer acao={comoFazerAcao} onClose={() => setComoFazerAcao(null)} />}
    </div>
  );
}