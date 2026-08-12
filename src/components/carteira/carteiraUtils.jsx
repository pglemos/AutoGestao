import moment from "moment";
import {
  calcularScoreOficial,
  calcularPrioridadeOficial,
  classificacaoScoreOficial,
  objetivoEProximoPassoOficial,
  scriptOficialParaCliente,
  fatosDoCliente,
} from '@/features/mentor-comercial/bridge/carteiraMentorBridge';

// ─── SITUAÇÕES ATUAIS ────────────────────────────────────────────────────────
export const SITUACOES_ATUAIS = [
  "Lead sem resposta",
  "Primeiro contato pendente",
  "Em cadência sem resposta",
  "Cliente respondeu",
  "Necessidade em qualificação",
  "Veículo definido",
  "Cliente quente sem visita",
  "Visita agendada",
  "Visita a confirmar",
  "Visita hoje",
  "Não compareceu",
  "Visita realizada",
  "Proposta enviada",
  "Proposta sem retorno",
  "Financiamento em análise",
  "Financiamento aprovado sem compra",
  "Em negociação ativa",
  "Vai pensar",
  "Aguardando resposta do cliente",
  "Aguardando ação do vendedor",
  "Venda realizada",
  "Venda perdida",
  "Venda cancelada",
  "Pós-venda ativo",
  "Garantia em acompanhamento",
  "Oportunidade futura",
  "Cadência encerrada",
];

// Mantido para compatibilidade com código legado
export const MOMENTOS = SITUACOES_ATUAIS;

// ─── SITUAÇÕES TERMINAIS ─────────────────────────────────────────────────────
// Situações encerradas: o cliente não é oportunidade ativa e não pode ser
// capturado por missão, plano de ataque ou prioridade. "Venda cancelada" é
// terminal próprio — a venda existiu e foi revertida, o que é diferente de
// "Venda perdida" (nunca fechou) e governa a estratégia de recuperação.
export const SITUACOES_ENCERRADAS_SEM_VENDA = [
  "Venda perdida",
  "Venda cancelada",
  "Cadência encerrada",
];

export const SITUACOES_TERMINAIS = [
  "Venda realizada",
  ...SITUACOES_ENCERRADAS_SEM_VENDA,
];

export function isSituacaoTerminal(cliente) {
  return SITUACOES_TERMINAIS.includes(cliente?.situacao_atual || cliente?.momento || "");
}

export function isSituacaoEncerradaSemVenda(cliente) {
  return SITUACOES_ENCERRADAS_SEM_VENDA.includes(cliente?.situacao_atual || cliente?.momento || "");
}

// ─── CANAIS ──────────────────────────────────────────────────────────────────
export const CANAIS_COMERCIAIS = ["Porta", "Internet", "Carteira"];

export const ORIGENS_DETALHADAS = [
  "Lead da loja (site/redes sociais)",
  "Lead campanha empresa",
  "Google Ads empresa",
  "Instagram loja",
  "Marketplace empresa",
  "Atendimento presencial",
  "Indicação",
  "Cliente antigo",
  "Pós-venda",
  "Garantia",
  "Prospecção própria",
  "Publicação própria",
  "Redes sociais próprias",
  "OLX próprio",
  "Tráfego pago próprio",
  "Marketplace próprio",
  "Feirão",
  "Outros",
];

// ─── STATUS COMERCIAL ─────────────────────────────────────────────────────────
export const STATUS_COMERCIAIS = [
  "Novo",
  "Em negociação",
  "Agendado",
  "Vendido",
  "Perdido",
  "Cancelada",
  "Pós-venda",
  "Garantia",
  "Futuro",
];

// ─── TEMPERATURAS ─────────────────────────────────────────────────────────────
export const TEMPERATURAS = ["Frio", "Morno", "Quente"];

// ─── OBJETIVOS COMERCIAIS ────────────────────────────────────────────────────
export const OBJETIVOS = [
  "Iniciar conversa",
  "Qualificar necessidade",
  "Definir veículo",
  "Entender prazo e barreiras",
  "Gerar visita",
  "Confirmar visita",
  "Reagendar visita",
  "Registrar atendimento",
  "Construir proposta",
  "Retomar proposta",
  "Acompanhar financiamento",
  "Converter aprovação",
  "Fechar negociação",
  "Registrar perda",
  "Recuperar oportunidade",
  "Reativar relacionamento",
  "Pedir indicação",
  "Acompanhar garantia",
  "Criar recompra/troca futura",
];

// ─── PRÓXIMOS PASSOS ──────────────────────────────────────────────────────────
export const PROXIMOS_PASSOS = [
  "Enviar primeira abordagem",
  "Enviar segunda abordagem",
  "Fazer pergunta consultiva",
  "Definir veículo de interesse",
  "Convidar para visita",
  "Confirmar visita amanhã",
  "Confirmar visita hoje",
  "Reagendar visita",
  "Enviar resumo do atendimento",
  "Enviar proposta",
  "Retomar proposta",
  "Acompanhar financiamento",
  "Converter financiamento aprovado",
  "Fazer follow-up de decisão",
  "Registrar motivo de perda",
  "Reativar cliente antigo",
  "Pedir indicação",
  "Acompanhar garantia",
  "Programar troca futura",
];

// ─── RESULTADOS PADRONIZADOS ─────────────────────────────────────────────────
export const RESULTADOS = [
  "Cliente não respondeu",
  "Cliente respondeu",
  "Informou veículo",
  "Pediu proposta",
  "Agendou visita",
  "Reagendou visita",
  "Não compareceu",
  "Compareceu",
  "Vai pensar",
  "Pediu financiamento",
  "Financiamento aprovado",
  "Comprou",
  "Sem interesse",
  "Comprou em outra loja",
  "Número inválido",
  "Cliente pediu contato futuro",
];

// ─── MAPEAMENTO RESULTADO → NOVA SITUAÇÃO ────────────────────────────────────
export function resultadoParaSituacao(resultado) {
  const map = {
    "Cliente não respondeu": { situacao: "Aguardando resposta do cliente", temperatura: null, objetivo: "Iniciar conversa", proximoPasso: "Enviar segunda abordagem" },
    "Cliente respondeu": { situacao: "Necessidade em qualificação", temperatura: "Morno", objetivo: "Qualificar necessidade", proximoPasso: "Fazer pergunta consultiva" },
    "Informou veículo": { situacao: "Veículo definido", temperatura: "Morno", objetivo: "Gerar visita", proximoPasso: "Convidar para visita" },
    "Pediu proposta": { situacao: "Proposta enviada", temperatura: "Quente", objetivo: "Retomar proposta", proximoPasso: "Retomar proposta" },
    "Agendou visita": { situacao: "Visita agendada", temperatura: "Quente", objetivo: "Confirmar visita", proximoPasso: "Confirmar visita amanhã" },
    "Reagendou visita": { situacao: "Visita agendada", temperatura: "Quente", objetivo: "Confirmar visita", proximoPasso: "Confirmar visita amanhã" },
    "Não compareceu": { situacao: "Não compareceu", temperatura: "Morno", objetivo: "Reagendar visita", proximoPasso: "Reagendar visita" },
    "Compareceu": { situacao: "Visita realizada", temperatura: "Quente", objetivo: "Construir proposta", proximoPasso: "Enviar proposta" },
    "Vai pensar": { situacao: "Vai pensar", temperatura: "Morno", objetivo: "Fechar negociação", proximoPasso: "Fazer follow-up de decisão" },
    "Pediu financiamento": { situacao: "Financiamento em análise", temperatura: "Quente", objetivo: "Acompanhar financiamento", proximoPasso: "Acompanhar financiamento" },
    "Financiamento aprovado": { situacao: "Financiamento aprovado sem compra", temperatura: "Quente", objetivo: "Converter aprovação", proximoPasso: "Converter financiamento aprovado" },
    "Comprou": { situacao: "Venda realizada", temperatura: "Quente", objetivo: "Pedir indicação", proximoPasso: "Pedir indicação", statusComercial: "Vendido" },
    "Sem interesse": { situacao: "Venda perdida", temperatura: "Frio", objetivo: "Registrar perda", proximoPasso: "Registrar motivo de perda", statusComercial: "Perdido" },
    "Comprou em outra loja": { situacao: "Venda perdida", temperatura: "Frio", objetivo: "Registrar perda", proximoPasso: "Registrar motivo de perda", statusComercial: "Perdido" },
    "Número inválido": { situacao: "Cadência encerrada", temperatura: "Frio", objetivo: "Registrar perda", proximoPasso: "Registrar motivo de perda" },
    "Cliente pediu contato futuro": { situacao: "Oportunidade futura", temperatura: "Frio", objetivo: "Criar recompra/troca futura", proximoPasso: "Programar troca futura", statusComercial: "Futuro" },
  };
  return map[resultado] || { situacao: null, temperatura: null, objetivo: null, proximoPasso: null };
}

// Compatibilidade legada
export function resultadoParaMomento(resultado) {
  const r = resultadoParaSituacao(resultado);
  return { momento: r.situacao, temperatura: r.temperatura };
}

// ─── LÓGICA AUTOMÁTICA: SITUAÇÃO → OBJETIVO + PRÓXIMO PASSO ─────────────────
export function calcularObjetivoEProximoPasso(cliente) {
  // MOTOR SUBSTITUÍDO (parcial). Para as situações legadas com mapeamento PROVADO
  // contra a matriz v1, objetivo e próximo passo vêm do catálogo oficial.
  //
  // Para as demais NÃO se inventa correspondência: a cadeia legada abaixo continua
  // valendo até o proprietário da metodologia dizer a qual dos 86 status cada uma
  // dessas situações corresponde. Ver SITUACOES_LEGADAS_SEM_MAPEAMENTO.
  const oficial = objetivoEProximoPassoOficial(
    cliente?.situacao_atual || cliente?.momento || null,
    fatosDoCliente(cliente),
  );
  if (oficial) {
    return { objetivo: oficial.objetivo, proximoPasso: oficial.proximoPasso };
  }

  // Proteção contra nulos
  if (!cliente) {
    return { objetivo: "Iniciar conversa", proximoPasso: "Enviar primeira abordagem" };
  }

  const s = cliente.situacao_atual || cliente.momento || "";
  const canal = cliente.canal_comercial || cliente.canal_origem || "";
  const visita = cliente.visita_agendada_em || cliente.proxima_acao_data;

  if (s === "Lead sem resposta" || s === "Primeiro contato pendente" || s === "Novo contato")
    return { objetivo: "Iniciar conversa", proximoPasso: "Enviar primeira abordagem" };
  if (s === "Em cadência sem resposta")
    return { objetivo: "Iniciar conversa", proximoPasso: "Enviar segunda abordagem" };
  if (s === "Cliente respondeu" || s === "Aguardando ação do vendedor")
    return { objetivo: "Qualificar necessidade", proximoPasso: "Fazer pergunta consultiva" };
  if (s === "Necessidade em qualificação")
    return { objetivo: "Qualificar necessidade", proximoPasso: "Fazer pergunta consultiva" };
  if (s === "Veículo definido")
    return { objetivo: "Gerar visita", proximoPasso: "Convidar para visita" };
  if (s === "Cliente quente sem visita")
    return { objetivo: "Gerar visita", proximoPasso: "Convidar para visita" };
  if (s === "Visita agendada" && visita) {
    const diff = moment(visita).diff(moment(), "days");
    if (diff <= 1) return { objetivo: "Confirmar visita", proximoPasso: "Confirmar visita hoje" };
    return { objetivo: "Confirmar visita", proximoPasso: "Confirmar visita amanhã" };
  }
  if (s === "Visita a confirmar")
    return { objetivo: "Confirmar visita", proximoPasso: "Confirmar visita amanhã" };
  if (s === "Visita hoje")
    return { objetivo: "Registrar atendimento", proximoPasso: "Confirmar visita hoje" };
  if (s === "Não compareceu")
    return { objetivo: "Reagendar visita", proximoPasso: "Reagendar visita" };
  if (s === "Visita realizada")
    return { objetivo: "Construir proposta", proximoPasso: "Enviar proposta" };
  if (s === "Proposta enviada" || s === "Proposta sem retorno")
    return { objetivo: "Retomar proposta", proximoPasso: "Retomar proposta" };
  if (s === "Financiamento em análise")
    return { objetivo: "Acompanhar financiamento", proximoPasso: "Acompanhar financiamento" };
  if (s === "Financiamento aprovado sem compra")
    return { objetivo: "Converter aprovação", proximoPasso: "Converter financiamento aprovado" };
  if (s === "Em negociação ativa")
    return { objetivo: "Fechar negociação", proximoPasso: "Fazer follow-up de decisão" };
  if (s === "Vai pensar")
    return { objetivo: "Fechar negociação", proximoPasso: "Fazer follow-up de decisão" };
  if (s === "Aguardando resposta do cliente")
    return { objetivo: "Iniciar conversa", proximoPasso: "Enviar segunda abordagem" };
  if (s === "Venda realizada")
    return { objetivo: "Pedir indicação", proximoPasso: "Pedir indicação" };
  if (s === "Pós-venda ativo")
    return { objetivo: "Reativar relacionamento", proximoPasso: "Pedir indicação" };
  if (s === "Garantia em acompanhamento")
    return { objetivo: "Acompanhar garantia", proximoPasso: "Acompanhar garantia" };
  if (s === "Oportunidade futura")
    return { objetivo: "Criar recompra/troca futura", proximoPasso: "Programar troca futura" };
  // A venda cancelada não volta a ser negociação por decisão do sistema: o
  // primeiro passo é registrar a estratégia de recuperação.
  if (s === "Venda cancelada")
    return { objetivo: "Analisar recuperação", proximoPasso: "Analisar recuperação" };
  if (s === "Venda perdida" || s === "Cadência encerrada")
    return { objetivo: "Recuperar oportunidade", proximoPasso: "Reativar cliente antigo" };
  if (canal === "Carteira")
    return { objetivo: "Reativar relacionamento", proximoPasso: "Reativar cliente antigo" };
  return { objetivo: "Iniciar conversa", proximoPasso: "Enviar primeira abordagem" };
}

// Compatibilidade legada
export function calcularProximaAcao(cliente) {
  const { proximoPasso } = calcularObjetivoEProximoPasso(cliente);
  return proximoPasso;
}

// ─── EXPLICAÇÃO "POR QUE ESTÁ AQUI" ─────────────────────────────────────────
export function explicacaoCliente(cliente) {
  // Proteção contra nulos
  if (!cliente) {
    return "Este cliente precisa de atenção e desenvolvimento comercial.";
  }

  const s = cliente.situacao_atual || cliente.momento || "";
  const dias = cliente.ultimo_contato
    ? moment().diff(moment(cliente.ultimo_contato), "days")
    : null;
  const diasStr = dias !== null ? ` há ${dias} dia${dias !== 1 ? "s" : ""}` : "";

  if (s === "Cliente respondeu" || s === "Aguardando ação do vendedor")
    return "Este cliente respondeu sua mensagem e aguarda sua ação agora.";
  if (s === "Visita a confirmar" || s === "Visita hoje")
    return `Este cliente tem visita marcada e precisa de confirmação${diasStr}.`;
  if (s === "Proposta sem retorno" || s === "Proposta enviada")
    return `Este cliente recebeu uma proposta e não respondeu${diasStr}.`;
  if (s === "Cliente quente sem visita")
    return "Este cliente está quente mas ainda não tem visita agendada.";
  if (s === "Financiamento aprovado sem compra")
    return "Este cliente tem financiamento aprovado e ainda não comprou.";
  if (s === "Não compareceu")
    return "Este cliente agendou visita mas não compareceu. Precisa de reagendamento.";
  if (s === "Visita realizada")
    return "Este cliente visitou a loja e ainda não fechou negócio.";
  if (s === "Em negociação ativa" || s === "Vai pensar")
    return "Este cliente está em negociação ativa e aguarda follow-up.";
  if (s === "Financiamento em análise")
    return "Este cliente tem financiamento em análise e precisa de acompanhamento.";
  if (s === "Venda cancelada")
    return "A venda deste cliente foi cancelada. A oportunidade está encerrada. Analise o motivo e decida se vale reativar o relacionamento.";
  if (s === "Venda perdida")
    return "Este cliente não fechou negócio. Entenda o motivo e avalie se há espaço para retomar o relacionamento.";
  if (s === "Oportunidade futura")
    return "Este cliente pediu contato futuro. Mantenha o relacionamento.";
  if (s === "Pós-venda ativo")
    return "Este cliente comprou e está em pós-venda ativo. Cuide do relacionamento.";
  if (s === "Garantia em acompanhamento")
    return "Este cliente está com garantia em andamento. Acompanhe de perto.";
  if (diasStr && cliente.temperatura === "Quente")
    return `Este cliente está quente e sem contato${diasStr}. Risco de perda.`;
  return "Este cliente precisa de atenção e desenvolvimento comercial.";
}

// ─── SCORE DO CLIENTE ────────────────────────────────────────────────────────
export function calcularScore(cliente) {
  // MOTOR SUBSTITUÍDO. A heurística de deduções a partir de 100 saiu; o score
  // agora são os cinco pilares oficiais da aba `07 Score_Prioridade`
  // (Status 15, Próximo passo 20, Execução 30, Cadência 20, Histórico 15).
  //
  // A assinatura e o formato de retorno { score, motivos } são os mesmos de antes,
  // de propósito: nenhuma das oito telas da Carteira precisa mudar.
  return calcularScoreOficial(cliente);
}

export function classificacaoScore(score) {
  // Faixas vêm do motor oficial; as cores continuam sendo decisão da tela.
  const label = classificacaoScoreOficial(score);
  const CORES = {
    "Excelente": "text-green-600 bg-green-50",
    "Boa": "text-blue-600 bg-blue-50",
    "Atenção": "text-amber-600 bg-amber-50",
    "Crítica": "text-red-600 bg-red-50",
  };
  return { label, color: CORES[label] };
}

// ─── PRIORIDADE COMERCIAL ────────────────────────────────────────────────────
export function calcularPrioridade(cliente) {
  // MOTOR SUBSTITUÍDO. O mapa improvisado de potencial e os limiares próprios
  // saíram. Agora é a fórmula oficial do §32:
  //   índice = urgência*0.45 + potencial*0.35 + risco*0.20
  // com os overrides de piso (cliente respondeu, ação vencida >24h, visita hoje,
  // financiamento aprovado, pronto para fechamento).
  //
  // Continua devolvendo o rótulo em português que as telas já consomem.
  return calcularPrioridadeOficial(cliente);
}

// ─── CORES ───────────────────────────────────────────────────────────────────
export function tempColor(t) {
  if (t === "Quente") return "bg-red-50 text-red-600 border-red-100";
  if (t === "Morno") return "bg-amber-50 text-amber-600 border-amber-100";
  return "bg-slate-100 text-muted-foreground border-slate-200";
}

export function prioridadeColor(p) {
  if (p === "Máxima") return "bg-red-100 text-red-700";
  if (p === "Alta") return "bg-red-50 text-red-600";
  if (p === "Média") return "bg-amber-50 text-amber-600";
  return "bg-slate-100 text-muted-foreground";
}

export function statusComercialColor(s) {
  if (s === "Vendido") return "bg-green-50 text-green-600";
  if (s === "Perdido") return "bg-red-50 text-red-500";
  // Cancelada é neutra e âmbar: não é sucesso (verde), não é perda de
  // negociação (vermelho) e não é erro técnico.
  if (s === "Cancelada") return "bg-amber-50 text-amber-700";
  if (s === "Agendado") return "bg-blue-50 text-blue-600";
  if (s === "Em negociação") return "bg-purple-50 text-purple-600";
  if (s === "Futuro") return "bg-slate-100 text-muted-foreground";
  return "bg-slate-50 text-muted-foreground";
}

// ─── SCRIPTS BIBLIOTECA ───────────────────────────────────────────────────────
export const SCRIPTS_BIBLIOTECA = {
  "Enviar primeira abordagem": {
    id: "S01",
    titulo: "Primeira abordagem",
    objetivo: "Iniciar conversa",
    texto: `Oi, {nome}! Tudo bem?\n\nVi seu interesse no {veiculo} e quero te ajudar com as informações certas.\n\nVocê está buscando esse modelo para comprar agora ou ainda está pesquisando opções?`,
  },
  "Enviar segunda abordagem": {
    id: "S02",
    titulo: "Segunda abordagem sem resposta",
    objetivo: "Obter resposta",
    texto: `Oi, {nome}! Passando só para confirmar se ainda faz sentido eu te enviar informações sobre o {veiculo}.\n\nSe não for o melhor momento, sem problema. Posso deixar anotado para te chamar depois.`,
  },
  "Fazer pergunta consultiva": {
    id: "S03",
    titulo: "Qualificação consultiva",
    objetivo: "Entender necessidade",
    texto: `Legal, {nome}.\n\nPara eu te orientar melhor: você procura esse veículo para uso próprio, trabalho ou família?\n\nVocê pensa em comprar agora ou está se planejando para mais adiante?`,
  },
  "Definir veículo de interesse": {
    id: "S04",
    titulo: "Definir veículo",
    objetivo: "Identificar melhor opção",
    texto: `Entendi, {nome}.\n\nAlém do {veiculo}, você considera algum outro modelo ou quer focar exatamente nessa opção?\n\nAssim eu consigo te mostrar as condições mais alinhadas ao que você procura.`,
  },
  "Convidar para visita": {
    id: "S05",
    titulo: "Convite para visita",
    objetivo: "Transformar interesse em presença na loja",
    texto: `{nome}, para você decidir com mais segurança, o ideal é ver o {veiculo} pessoalmente.\n\nTenho horário hoje às {opcao1} ou amanhã às {opcao2}. Qual fica melhor para você?`,
  },
  "Confirmar visita hoje": {
    id: "S06a",
    titulo: "Confirmar visita (hoje)",
    objetivo: "Garantir comparecimento",
    texto: `Oi, {nome}! Tudo bem?\n\nSua visita para ver o {veiculo} está agendada para hoje às {hora}.\n\nVou deixar tudo organizado para te atender bem. Posso manter esse horário?`,
  },
  "Confirmar visita amanhã": {
    id: "S06b",
    titulo: "Confirmar visita (amanhã)",
    objetivo: "Garantir comparecimento",
    texto: `Oi, {nome}! Tudo bem?\n\nSua visita para ver o {veiculo} está agendada para {data} às {hora}.\n\nVou deixar tudo organizado para te atender bem. Posso manter esse horário?`,
  },
  "Reagendar visita": {
    id: "S07",
    titulo: "Reagendar visita perdida",
    objetivo: "Recuperar não comparecimento",
    texto: `Oi, {nome}! Vi que hoje não conseguimos nos encontrar.\n\nSem problema. Ainda faz sentido você ver o {veiculo}?\n\nTenho novos horários disponíveis e posso reagendar para você.`,
  },
  "Enviar resumo do atendimento": {
    id: "S08",
    titulo: "Pós-atendimento Porta",
    objetivo: "Manter negociação viva após visita",
    texto: `Oi, {nome}! Foi um prazer te atender hoje.\n\nFiquei à disposição para te ajudar com o {veiculo}.\n\nSe quiser, posso te enviar um resumo das condições e próximos passos para facilitar sua decisão.`,
  },
  "Retomar proposta": {
    id: "S09",
    titulo: "Proposta enviada",
    objetivo: "Recuperar decisão",
    texto: `Oi, {nome}! Tudo bem?\n\nA proposta do {veiculo} que te passei foi montada com a melhor condição que consegui pra você.\n\nSe deixar pra depois eu corro o risco de não conseguir manter os mesmos números. Posso revisar com você agora?`,
  },
  "Converter financiamento aprovado": {
    id: "S10",
    titulo: "Financiamento aprovado",
    objetivo: "Converter aprovação em venda",
    texto: `Boa notícia, {nome}.\n\nCom a aprovação do financiamento, já conseguimos avançar para a melhor condição possível no {veiculo}.\n\nQuer que eu te mostre o próximo passo para garantirmos essa oportunidade?`,
  },
  "Fazer follow-up de decisão": {
    id: "S11",
    titulo: "Cliente vai pensar",
    objetivo: "Descobrir objeção real",
    texto: `Entendo, {nome}.\n\nSó para eu te ajudar melhor: o que ficou pesando mais na sua decisão sobre o {veiculo}? Valor, entrada, parcela ou a troca?\n\nMe conta que eu vejo se ainda dá pra ajustar do jeito que você precisa.`,
  },
  "Reativar cliente antigo": {
    id: "S12",
    titulo: "Reativar cliente antigo",
    objetivo: "Retomar relacionamento",
    texto: `Oi, {nome}! Tudo bem?\n\nEstou atualizando minha carteira e queria saber se a ideia de comprar ou trocar de veículo ainda está nos seus planos.\n\nSe não for para agora, posso deixar anotado para te chamar no momento certo.`,
  },
  "Pedir indicação": {
    id: "S13",
    titulo: "Pós-venda e indicação",
    objetivo: "Relacionamento e indicação",
    texto: `Oi, {nome}! Tudo bem com o {veiculo}?\n\nPassando para saber se está tudo certo e se você ficou satisfeito com a compra.\n\nSe lembrar de alguém que também esteja procurando carro, pode me indicar. Vou atender com o mesmo cuidado.`,
  },
  "Acompanhar garantia": {
    id: "S14",
    titulo: "Garantia",
    objetivo: "Proteger relacionamento",
    texto: `Oi, {nome}! Tudo bem?\n\nEstou acompanhando a situação do seu veículo e queria saber se houve alguma atualização.\n\nQuero garantir que você seja bem atendido até a resolução.`,
  },
  "Enviar proposta": {
    id: "S09",
    titulo: "Proposta",
    objetivo: "Enviar e recuperar decisão",
    texto: `Oi, {nome}! Tudo bem?\n\nMontei a proposta do {veiculo} com a condição que consegui fechar pensando exatamente no que você me contou.\n\nQuero te passar agora enquanto essa condição ainda está valendo. Posso te enviar?`,
  },
  "Acompanhar financiamento": {
    id: "S10b",
    titulo: "Acompanhar financiamento",
    objetivo: "Manter cliente informado",
    texto: `Oi, {nome}! Tudo bem?\n\nPassando para te atualizar sobre o andamento do financiamento do {veiculo}.\n\nAssim que tiver novidades, te aviso imediatamente.`,
  },

  // Entradas abaixo cobrem os labels oficiais de PASSOS (PP01–PP17, ver proximoPassoLib.js).
  // cliente.proximo_passo é gravado com esses labels após qualquer transição registrada,
  // então precisam existir aqui com o texto EXATO para o lookup direto encontrar.
  "Realizar diagnóstico": {
    id: "S02b",
    titulo: "Diagnóstico de necessidade",
    objetivo: "Entender necessidade, urgência e forma de pagamento",
    texto: `Legal, {nome}!\n\nPra te indicar a melhor opção: você pensa em comprar o {veiculo} à vista, financiado ou tem um veículo pra dar de entrada?\n\nE para quando você pretende fechar negócio?`,
  },
  "Enviar fotos ou vídeo": {
    id: "S03",
    titulo: "Fotos e vídeo do veículo",
    objetivo: "Apresentar o veículo com destaque de valor",
    texto: `{nome}, separei fotos e um vídeo do {veiculo} pra você ver os detalhes de perto.\n\nVou te enviar agora. Qualquer dúvida sobre o carro, me chama!`,
  },
  "Apresentar veículo ideal": {
    id: "S04b",
    titulo: "Apresentação do veículo ideal",
    objetivo: "Conduzir à escolha certa",
    texto: `{nome}, pelo que você me contou, o {veiculo} encaixa bem no que você está buscando.\n\nQuer que eu te explique as condições e os diferenciais dele?`,
  },
  "Simular financiamento": {
    id: "S05b",
    titulo: "Simulação de financiamento",
    objetivo: "Apresentar condições de pagamento",
    texto: `{nome}, fiz uma simulação de financiamento do {veiculo} pra você.\n\nPosso te mostrar as condições de entrada e parcela agora?`,
  },
  "Avaliar usado": {
    id: "S06",
    titulo: "Avaliação do usado",
    objetivo: "Registrar e conduzir avaliação do veículo de troca",
    texto: `{nome}, pra avançar com a troca, preciso de alguns dados do seu veículo atual: modelo, ano e quilometragem.\n\nPode me passar essas informações?`,
  },
  "Agendar visita ou videochamada": {
    id: "S07",
    titulo: "Convite para visita ou videochamada",
    objetivo: "Transformar interesse em presença na loja",
    texto: `{nome}, para você decidir com mais segurança, o ideal é ver o {veiculo} pessoalmente ou por videochamada.\n\nTenho horário hoje às {opcao1} ou amanhã às {opcao2}. Qual fica melhor para você?`,
  },
  "Confirmar agendamento": {
    id: "S08",
    titulo: "Confirmar agendamento",
    objetivo: "Garantir comparecimento",
    texto: `Oi, {nome}! Tudo bem?\n\nSua visita para ver o {veiculo} está confirmada para {data} às {hora}.\n\nVou deixar tudo organizado para te atender bem. Posso manter esse horário?`,
  },
  "Realizar atendimento comercial": {
    id: "S09b",
    titulo: "Atendimento presencial",
    objetivo: "Conduzir o atendimento e avançar na negociação",
    texto: `Oi, {nome}! Já estou te esperando aqui pra falarmos sobre o {veiculo}.\n\nConfirma que consegue vir no horário combinado?`,
  },
  "Trabalhar objeção": {
    id: "S11b",
    titulo: "Trabalhar objeção",
    objetivo: "Identificar e superar a resistência do cliente",
    texto: `Entendo, {nome}.\n\nVocê já chegou até aqui porque o {veiculo} faz sentido pra você. Geralmente quando trava, é só um ponto: valor, entrada, parcela ou a troca.\n\nQual desses tá pesando mais? Assim eu já ajusto pontualmente, sem você ter que recomeçar a conversa do zero.`,
  },
  "Solicitar documentos / ficha": {
    id: "S13",
    titulo: "Solicitar documentos",
    objetivo: "Coletar documentação necessária para fechar",
    texto: `{nome}, para darmos andamento à compra do {veiculo}, preciso de alguns documentos seus.\n\nPosso te enviar a lista agora pelo WhatsApp?`,
  },
  "Confirmar venda": {
    id: "S14",
    titulo: "Confirmar venda",
    objetivo: "Registrar o fechamento e garantir entrega impecável",
    texto: `Parabéns, {nome}! 🎉\n\nSeu {veiculo} está garantido exatamente do jeito que combinamos.\n\nVou cuidar pessoalmente de cada detalhe até a entrega. Qualquer dúvida até lá, me chama.`,
  },
  "Retomar contato": {
    id: "S15",
    titulo: "Retomar contato",
    objetivo: "Reengajar cliente que ficou sem resposta",
    texto: `Oi, {nome}! Passando só para confirmar se ainda faz sentido eu te enviar informações sobre o {veiculo}.\n\nSe não for o melhor momento, sem problema. Posso deixar anotado para te chamar depois.`,
  },
  "Reativar cliente": {
    id: "S16",
    titulo: "Reativar cliente",
    objetivo: "Recuperar cliente frio ou inativo com nova abordagem",
    texto: `Oi, {nome}! Tudo bem?\n\nEstou atualizando minha carteira e queria saber se a ideia de comprar ou trocar de veículo ainda está nos seus planos.\n\nSe não for pra agora, posso deixar anotado para te chamar no momento certo.`,
  },
  "Encerrar oportunidade": {
    id: "S17",
    titulo: "Encerrar oportunidade",
    objetivo: "Finalizar a oportunidade de forma profissional",
    texto: `Oi, {nome}! Agradeço muito o contato até aqui.\n\nSe no futuro fizer sentido retomar a conversa sobre um veículo, fico à disposição.\n\nTudo de bom pra você!`,
  },
  "Registrar motivo de perda": {
    id: "S17b",
    titulo: "Encerramento após perda",
    objetivo: "Encerrar com profissionalismo e manter porta aberta",
    texto: `Oi, {nome}! Tudo bem?\n\nEntendo que esse não era o momento certo. Agradeço por ter considerado a gente.\n\nSe mudar de ideia ou surgir uma nova necessidade, estou à disposição.`,
  },
  "Programar troca futura": {
    id: "S18",
    titulo: "Agendar retorno futuro",
    objetivo: "Manter relacionamento para uma futura troca",
    texto: `Oi, {nome}! Tudo bem?\n\nAnotei aqui que você pensa em trocar de veículo mais pra frente.\n\nVou te chamar quando surgir uma condição boa pra essa troca. Combinado?`,
  },
  "Avisar sobre veículo recém-chegado": {
    id: "S19",
    titulo: "Veículo recém-chegado",
    objetivo: "Aproveitar a chegada do veículo para reengajar o cliente",
    texto: `Oi, {nome}! Chegou aqui um {veiculo} que combina com o que você procurava.\n\nQuer que eu separe mais detalhes e fotos pra você dar uma olhada?`,
  },
};

export function getScriptParaProximoPasso(proximoPasso) {
  // DESATIVADO. A biblioteca paralela de 34 scripts inventados não é mais fonte de
  // texto comercial: a regra é "77 scripts oficiais + SOURCE_BLOCKER explícito",
  // nunca "oficiais com fallback para o legado".
  //
  // Mantida a assinatura porque as telas ainda a chamam; devolve null para que o
  // chamador use getScriptOficial(cliente) e trate o bloqueio explicitamente.
  void proximoPasso;
  return null;
}

/**
 * Script OFICIAL da matriz v1 para o cliente, com renderização estrita.
 *
 * Devolve `{ scriptId, texto, scriptReady, missingVariables, allowWhatsApp, motivo }`.
 * `scriptReady === false` significa que falta variável obrigatória e o envio deve
 * ficar bloqueado. Nada é preenchido por conta própria.
 */
export function getScriptOficial(cliente, tentativa = 1) {
  return scriptOficialParaCliente(cliente, tentativa);
}

// Scripts fora do catálogo de missões (gatilhos avulsos, não uma missão do Plano de Ataque)
const SCRIPT_TEMPLATES_EXTRAS = {
  veiculo_chegou: "Avisar sobre veículo recém-chegado",
};

// `missaoId` chega aqui como o `tipo_missao` persistido (rótulo da missão, ex.:
// "Recuperar propostas") ou uma chave avulsa de SCRIPT_TEMPLATES_EXTRAS — nunca
// o uuid da linha em CarteiraMissao, que não tem como casar com nenhum script.
export function getScriptParaMissao(missaoId) {
  // DESATIVADO pelo mesmo motivo de getScriptParaProximoPasso. O fallback anterior
  // era ainda pior aqui: devolvia "Enviar primeira abordagem" para QUALQUER missão
  // sem script, disparando abordagem inicial numa campanha de recuperação.
  void missaoId;
  return null;
}

// DDD 55 é real (Santa Maria/RS), então não dá pra decidir só pelo prefixo se o
// número já tem DDI — o comprimento total desambigua (com DDI: 12-13 dígitos).
export function normalizarTelefoneWhatsApp(raw) {
  const digitos = (raw || "").replace(/\D/g, "");
  if (!digitos) return "";
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) return digitos;
  return `55${digitos}`;
}

export function preencherScript(script, cliente) {
  // Proteção contra nulos — `script` pode vir nulo agora que os getters legados
  // deixaram de devolver texto inventado.
  if (!script) return "";
  if (!cliente) return script;

  // NÃO INVENTAR VALOR. A versão anterior mandava {opcao1} como "10h" e {opcao2}
  // como "14h", oferecendo ao cliente horários que ninguém combinou, e trocava
  // {veiculo} ausente por "veículo". Variável sem dado real permanece como
  // placeholder visível, para que a ausência apareça em vez de virar mentira.
  // O caminho correto e completo é getScriptOficial(), que bloqueia o envio.
  const visita = cliente.visita_agendada_em || cliente.proxima_acao_data;
  let out = script;
  if (cliente.nome) out = out.replace(/{nome}/g, cliente.nome);
  if (cliente.veiculo_interesse) out = out.replace(/{veiculo}/g, cliente.veiculo_interesse);
  if (visita) {
    out = out
      .replace(/{data}/g, moment(visita).format("DD/MM"))
      .replace(/{hora}/g, moment(visita).format("HH:mm"));
  }
  return out;
}

// ─── MISSÕES DO PLANO DE ATAQUE ───────────────────────────────────────────────
// Nenhuma missão comercial deve capturar um cliente cuja oportunidade foi
// encerrada sem venda (perdida, cancelada ou cadência encerrada) — sem esta
// guarda, uma visita antiga vencida devolvia o cliente com venda cancelada
// para "Reagendar visitas". "Venda realizada" não entra na guarda: existe
// missão de pós-venda que mira justamente quem comprou.
const semOportunidadesEncerradas = (missoes) => missoes.map(missao => ({
  ...missao,
  filtro: cliente => !isSituacaoEncerradaSemVenda(cliente) && missao.filtro(cliente),
}));

export const MISSOES = semOportunidadesEncerradas([
  {
    id: "proposta_sem_retorno",
    nome: "Recuperar propostas",
    icone: "📋",
    prioridade: "Alta",
    objetivo: "Retomar proposta e fechar negócio.",
    porqueAgora: "Clientes com proposta sem resposta têm alto potencial e risco crescente de perda.",
    scriptId: "Retomar proposta",
    filtro: c => (c.situacao_atual === "Proposta enviada" || c.situacao_atual === "Proposta sem retorno" || c.momento === "Proposta enviada"),
  },
  {
    id: "financiamento_aprovado",
    nome: "Converter aprovações",
    icone: "💳",
    prioridade: "Máxima",
    objetivo: "Converter financiamento aprovado em venda.",
    porqueAgora: "Financiamento aprovado sem compra é a oportunidade mais quente da carteira.",
    scriptId: "Converter financiamento aprovado",
    filtro: c => c.situacao_atual === "Financiamento aprovado sem compra" || (c.interesse_financiamento && (c.situacao_atual === "Em negociação ativa" || c.momento === "Em negociação")),
  },
  {
    id: "nao_compareceu",
    nome: "Reagendar visitas",
    icone: "📅",
    prioridade: "Alta",
    objetivo: "Reagendar clientes que não compareceram.",
    porqueAgora: "Cada visita não realizada é uma oportunidade que pode ser recuperada rapidamente.",
    scriptId: "Reagendar visita",
    filtro: c => c.situacao_atual === "Não compareceu" || (c.visita_agendada_em && moment(c.visita_agendada_em).isBefore(moment(), "day") && c.situacao_atual !== "Venda realizada" && c.situacao_atual !== "Venda perdida" && c.situacao_atual !== "Cadência encerrada"),
  },
  {
    id: "confirmar_visita",
    nome: "Confirmar visitas",
    icone: "✅",
    prioridade: "Alta",
    objetivo: "Confirmar presença de clientes agendados.",
    porqueAgora: "Visitas confirmadas têm taxa muito maior de comparecimento.",
    scriptId: "Confirmar visita amanhã",
    filtro: c => c.situacao_atual === "Visita a confirmar" || (c.visita_agendada_em && moment(c.visita_agendada_em).diff(moment(), "days") <= 2 && moment(c.visita_agendada_em).diff(moment(), "days") >= 0),
  },
  {
    id: "cliente_quente",
    nome: "Agendar visitas (quentes)",
    icone: "🔥",
    prioridade: "Alta",
    objetivo: "Transformar interesse quente em visita.",
    porqueAgora: "Clientes quentes sem visita perdem temperatura a cada dia.",
    scriptId: "Convidar para visita",
    filtro: c => c.situacao_atual === "Cliente quente sem visita" || (c.temperatura === "Quente" && !c.visita_agendada_em && c.situacao_atual !== "Venda realizada" && c.situacao_atual !== "Venda perdida"),
  },
  {
    id: "visitou_nao_comprou",
    nome: "Recuperar visitas",
    icone: "🚗",
    prioridade: "Alta",
    objetivo: "Entender barreira e tentar fechar.",
    porqueAgora: "Quem visitou já tem intenção. Falta superar a barreira.",
    scriptId: "Retomar proposta",
    filtro: c => c.situacao_atual === "Visita realizada" || c.momento === "Visita realizada",
  },
  {
    id: "lead_sem_resposta",
    nome: "Retomar leads",
    icone: "👻",
    prioridade: "Média",
    objetivo: "Reativar leads sem resposta.",
    porqueAgora: "Leads frios podem ser reativados com abordagem correta.",
    scriptId: "Enviar segunda abordagem",
    filtro: c => ["Lead sem resposta", "Em cadência sem resposta", "Aguardando resposta do cliente"].includes(c.situacao_atual) || c.temperatura === "Frio" || c.momento === "Cliente frio em nutrição" || c.momento === "Novo contato",
  },
  {
    id: "vai_pensar",
    nome: "Follow-up de decisão",
    icone: "🤔",
    prioridade: "Média",
    objetivo: "Descobrir objeção e converter.",
    porqueAgora: "Clientes 'vão pensar' precisam de follow-up inteligente.",
    scriptId: "Fazer follow-up de decisão",
    filtro: c => c.situacao_atual === "Vai pensar" || c.situacao_atual === "Em negociação ativa" || c.momento === "Em negociação",
  },
  {
    id: "reativar_carteira",
    nome: "Reativar carteira",
    icone: "🔄",
    prioridade: "Média",
    objetivo: "Retomar relacionamento com clientes antigos.",
    porqueAgora: "Clientes antigos compram mais rápido do que leads novos.",
    scriptId: "Reativar cliente antigo",
    filtro: c => (c.canal_comercial === "Carteira" || c.canal_origem === "Carteira") && ["Oportunidade futura", "Cliente frio em nutrição", "Venda realizada"].includes(c.situacao_atual || c.momento),
  },
  {
    id: "pos_venda",
    nome: "Pós-venda e indicação",
    icone: "⭐",
    prioridade: "Média",
    objetivo: "Manter relacionamento e pedir indicação.",
    porqueAgora: "Clientes satisfeitos indicam. Não deixe essa janela fechar.",
    scriptId: "Pedir indicação",
    filtro: c => c.situacao_atual === "Pós-venda ativo" || c.momento === "Pós-venda ativo",
  },
  {
    id: "garantia",
    nome: "Acompanhar garantias",
    icone: "🛡️",
    prioridade: "Baixa",
    objetivo: "Proteger relacionamento pós-venda.",
    porqueAgora: "Clientes com garantia precisam de atenção para manter confiança.",
    scriptId: "Acompanhar garantia",
    filtro: c => c.situacao_atual === "Garantia em acompanhamento" || c.momento === "Garantia em acompanhamento",
  },
  {
    id: "troca_futura",
    nome: "Oportunidades de troca",
    icone: "🔁",
    prioridade: "Baixa",
    objetivo: "Cultivar oportunidade de troca futura.",
    porqueAgora: "Clientes com intenção futura podem antecipar a compra.",
    scriptId: "Reativar cliente antigo",
    filtro: c => c.situacao_atual === "Oportunidade futura" || c.interesse_troca || c.momento === "Oportunidade futura de troca",
  },
]);
