/**
 * Biblioteca Oficial de Próximos Passos v1
 * Fonte única de verdade para códigos PP, resultados permitidos e transições automáticas.
 */

import moment from "moment";

// ─── BIBLIOTECA DE PASSOS ─────────────────────────────────────────────────────

export const PASSOS = {
  PP01: { codigo: "PP01", label: "Enviar primeira abordagem",        objetivo: "Iniciar o contato e despertar interesse consultivo." },
  PP02: { codigo: "PP02", label: "Realizar diagnóstico",             objetivo: "Entender necessidade, urgência, pagamento e situação de troca." },
  PP03: { codigo: "PP03", label: "Enviar fotos ou vídeo",            objetivo: "Apresentar o veículo com destaque de valor e gerar desejo." },
  PP04: { codigo: "PP04", label: "Apresentar veículo ideal",         objetivo: "Conduzir o cliente à escolha do veículo certo para ele." },
  PP05: { codigo: "PP05", label: "Simular financiamento",            objetivo: "Apresentar condições de pagamento e verificar aprovação." },
  PP06: { codigo: "PP06", label: "Avaliar usado",                    objetivo: "Registrar e conduzir avaliação do veículo de troca." },
  PP07: { codigo: "PP07", label: "Agendar visita ou videochamada",   objetivo: "Marcar o momento de apresentação comercial formal." },
  PP08: { codigo: "PP08", label: "Confirmar agendamento",            objetivo: "Garantir o comparecimento do cliente." },
  PP09: { codigo: "PP09", label: "Realizar atendimento comercial",   objetivo: "Conduzir o atendimento e avançar na negociação." },
  PP10: { codigo: "PP10", label: "Enviar proposta",                  objetivo: "Apresentar proposta formal e orientar a decisão." },
  PP11: { codigo: "PP11", label: "Trabalhar objeção",                objetivo: "Identificar e superar a resistência do cliente." },
  PP12: { codigo: "PP12", label: "Fazer follow-up de decisão",       objetivo: "Acompanhar a decisão e manter o cliente engajado." },
  PP13: { codigo: "PP13", label: "Solicitar documentos / ficha",     objetivo: "Coletar documentação necessária para fechar o negócio." },
  PP14: { codigo: "PP14", label: "Confirmar venda",                  objetivo: "Registrar o fechamento e garantir entrega impecável." },
  PP15: { codigo: "PP15", label: "Retomar contato",                  objetivo: "Reengajar cliente que ficou sem resposta." },
  PP16: { codigo: "PP16", label: "Reativar cliente",                 objetivo: "Recuperar cliente frio ou inativo com nova abordagem." },
  PP17: { codigo: "PP17", label: "Encerrar oportunidade",            objetivo: "Finalizar a oportunidade de forma profissional e educada." },
};

export const TODOS_PASSOS = Object.values(PASSOS);

// Detecta o código PP a partir do label salvo no banco
export function detectarCodigo(proximoPasso) {
  if (!proximoPasso) return null;
  const encontrado = TODOS_PASSOS.find(p =>
    p.label.toLowerCase() === proximoPasso.toLowerCase() ||
    proximoPasso.startsWith(p.codigo)
  );
  return encontrado?.codigo || null;
}

// ─── RESULTADOS POR PASSO ─────────────────────────────────────────────────────

export const RESULTADOS_POR_PASSO = {
  PP01: [
    { label: "Cliente respondeu",         emoji: "✅", cor: "green" },
    { label: "Visualizou e não respondeu",emoji: "👁️",  cor: "slate" },
    { label: "Não abriu",                 emoji: "🔕", cor: "slate" },
    { label: "Pediu mais informação",     emoji: "💬", cor: "blue" },
    { label: "Sem interesse declarado",   emoji: "❌", cor: "red" },
  ],
  PP02: [
    { label: "Diagnóstico completo",      emoji: "✅", cor: "green" },
    { label: "Diagnóstico parcial",       emoji: "🔄", cor: "teal" },
    { label: "Não atendeu",              emoji: "🚫", cor: "red" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
    { label: "Sem interesse",            emoji: "❌", cor: "red" },
  ],
  PP03: [
    { label: "Gostou do veículo",        emoji: "✅", cor: "green" },
    { label: "Quer ver outras opções",   emoji: "🔄", cor: "teal" },
    { label: "Pediu proposta",           emoji: "📋", cor: "orange" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
    { label: "Não gostou",              emoji: "❌", cor: "red" },
  ],
  PP04: [
    { label: "Gostou do veículo",        emoji: "✅", cor: "green" },
    { label: "Pediu proposta",           emoji: "📋", cor: "orange" },
    { label: "Quer simular financiamento",emoji: "💰", cor: "blue" },
    { label: "Pediu para avaliar usado", emoji: "🚗", cor: "teal" },
    { label: "Quer agendar visita",      emoji: "📅", cor: "blue" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
  ],
  PP05: [
    { label: "Aprovado e interessado",   emoji: "✅", cor: "green" },
    { label: "Aprovado, avaliando",      emoji: "🔄", cor: "teal" },
    { label: "Recusado, sem alternativa",emoji: "❌", cor: "red" },
    { label: "Quer pensar",              emoji: "💬", cor: "slate" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
  ],
  PP06: [
    { label: "Avaliação aceita",         emoji: "✅", cor: "green" },
    { label: "Avaliação recusada",       emoji: "❌", cor: "red" },
    { label: "Precisa de gerente",       emoji: "🆘", cor: "orange" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
  ],
  PP07: [
    { label: "Agendou visita",           emoji: "📅", cor: "blue" },
    { label: "Prefere videochamada",     emoji: "📹", cor: "blue" },
    { label: "Vai pensar",               emoji: "💬", cor: "slate" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
    { label: "Não tem interesse",        emoji: "❌", cor: "red" },
  ],
  PP08: [
    { label: "Confirmou presença",       emoji: "✅", cor: "green" },
    { label: "Pediu para remarcar",      emoji: "🔄", cor: "teal" },
    { label: "Não atendeu",              emoji: "🚫", cor: "red" },
    { label: "Cancelou",                 emoji: "❌", cor: "red" },
  ],
  PP09: [
    { label: "Atendimento realizado",    emoji: "✅", cor: "green" },
    { label: "Pediu proposta",           emoji: "📋", cor: "orange" },
    { label: "Precisa pensar",           emoji: "💬", cor: "slate" },
    { label: "Não compareceu",           emoji: "🚫", cor: "red" },
    { label: "Perdeu interesse",         emoji: "❌", cor: "red" },
  ],
  PP10: [
    { label: "Proposta aceita",          emoji: "✅", cor: "green" },
    { label: "Pediu desconto",           emoji: "💸", cor: "orange" },
    { label: "Quer pensar",              emoji: "💬", cor: "slate" },
    { label: "Solicitou ficha",          emoji: "📄", cor: "teal" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
    { label: "Recusou",                  emoji: "❌", cor: "red" },
  ],
  PP11: [
    { label: "Objeção superada",         emoji: "✅", cor: "green" },
    { label: "Precisa de gerente",       emoji: "🆘", cor: "orange" },
    { label: "Continua resistente",      emoji: "🔄", cor: "teal" },
    { label: "Encerrou negociação",      emoji: "❌", cor: "red" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
  ],
  PP12: [
    { label: "Vai fechar",               emoji: "✅", cor: "green" },
    { label: "Precisa de mais tempo",    emoji: "🔄", cor: "teal" },
    { label: "Pediu nova proposta",      emoji: "📋", cor: "orange" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
    { label: "Desistiu",                 emoji: "❌", cor: "red" },
  ],
  PP13: [
    { label: "Documentos enviados",      emoji: "✅", cor: "green" },
    { label: "Vai enviar depois",        emoji: "🔄", cor: "teal" },
    { label: "Não respondeu",            emoji: "🔕", cor: "slate" },
    { label: "Desistiu",                 emoji: "❌", cor: "red" },
  ],
  PP14: [
    { label: "Venda realizada",          emoji: "🏆", cor: "yellow" },
    { label: "Adiou fechamento",         emoji: "🔄", cor: "teal" },
    { label: "Desistiu",                 emoji: "❌", cor: "red" },
  ],
  PP15: [
    { label: "Cliente respondeu",        emoji: "✅", cor: "green" },
    { label: "Continua sem resposta",    emoji: "🔕", cor: "slate" },
    { label: "Não tem mais interesse",   emoji: "❌", cor: "red" },
  ],
  PP16: [
    { label: "Cliente reengajado",       emoji: "✅", cor: "green" },
    { label: "Sem retorno",              emoji: "🔕", cor: "slate" },
    { label: "Sem orçamento no momento", emoji: "💸", cor: "orange" },
    { label: "Sem previsão de compra",   emoji: "📅", cor: "slate" },
    { label: "Definitivamente perdido",  emoji: "❌", cor: "red" },
  ],
  PP17: [
    { label: "Encerrado amigavelmente",  emoji: "🤝", cor: "teal" },
    { label: "Sem resposta final",       emoji: "🔕", cor: "slate" },
  ],
};

// Fallback genérico se não encontrar o código
export const RESULTADOS_GENERICOS = [
  { label: "Executado",         emoji: "✅", cor: "green" },
  { label: "Não atendeu",       emoji: "🚫", cor: "red" },
  { label: "Não respondeu",     emoji: "🔕", cor: "slate" },
  { label: "Visita agendada",   emoji: "📅", cor: "blue" },
  { label: "Proposta enviada",  emoji: "📋", cor: "orange" },
  { label: "Remarcar",          emoji: "🔄", cor: "teal" },
  { label: "Perdeu interesse",  emoji: "❌", cor: "red" },
  { label: "Venda realizada",   emoji: "🏆", cor: "yellow" },
];

export function getResultados(proximoPasso) {
  const codigo = detectarCodigo(proximoPasso);
  return RESULTADOS_POR_PASSO[codigo] || RESULTADOS_GENERICOS;
}

// ─── MATRIZ DE TRANSIÇÃO ─────────────────────────────────────────────────────
// { resultado: { proximo_codigo, dias_offset, situacao_atual, temperatura, status_oportunidade, vendido } }
// dias_offset: 0 = hoje, 1 = amanhã, etc.

export const TRANSICAO = {
  PP01: {
    "Cliente respondeu":          { proximo: "PP02", dias: 0, sit: "Cliente respondeu",           temp: "Quente" },
    "Pediu mais informação":      { proximo: "PP02", dias: 0, sit: "Cliente respondeu",           temp: "Quente" },
    "Visualizou e não respondeu": { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
    "Não abriu":                  { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
    "Sem interesse declarado":    { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP02: {
    "Diagnóstico completo":       { proximo: "PP03", dias: 0, sit: "Necessidade em qualificação", temp: "Quente" },
    "Diagnóstico parcial":        { proximo: "PP02", dias: 1, sit: "Necessidade em qualificação", temp: "Morno" },
    "Não atendeu":                { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
    "Não respondeu":              { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
    "Sem interesse":              { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP03: {
    "Gostou do veículo":          { proximo: "PP04", dias: 0, sit: "Veículo definido",            temp: "Quente" },
    "Quer ver outras opções":     { proximo: "PP04", dias: 0, sit: "Necessidade em qualificação", temp: "Morno" },
    "Pediu proposta":             { proximo: "PP10", dias: 0, sit: "Proposta enviada",            temp: "Quente" },
    "Não respondeu":              { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
    "Não gostou":                 { proximo: "PP02", dias: 1, sit: "Necessidade em qualificação", temp: "Morno" },
  },
  PP04: {
    "Gostou do veículo":          { proximo: "PP07", dias: 0, sit: "Cliente quente sem visita",   temp: "Quente" },
    "Pediu proposta":             { proximo: "PP10", dias: 0, sit: "Proposta enviada",            temp: "Quente" },
    "Quer simular financiamento": { proximo: "PP05", dias: 0, sit: "Veículo definido",            temp: "Quente" },
    "Pediu para avaliar usado":   { proximo: "PP06", dias: 0, sit: "Veículo definido",            temp: "Quente" },
    "Quer agendar visita":        { proximo: "PP07", dias: 0, sit: "Cliente quente sem visita",   temp: "Quente" },
    "Não respondeu":              { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
  },
  PP05: {
    "Aprovado e interessado":     { proximo: "PP07", dias: 0, sit: "Financiamento aprovado sem compra", temp: "Quente" },
    "Aprovado, avaliando":        { proximo: "PP12", dias: 1, sit: "Financiamento aprovado sem compra", temp: "Quente" },
    "Recusado, sem alternativa":  { proximo: "PP11", dias: 0, sit: "Em negociação ativa",         temp: "Morno" },
    "Quer pensar":                { proximo: "PP12", dias: 2, sit: "Vai pensar",                  temp: "Morno" },
    "Não respondeu":              { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
  },
  PP06: {
    "Avaliação aceita":           { proximo: "PP10", dias: 0, sit: "Em negociação ativa",         temp: "Quente" },
    "Avaliação recusada":         { proximo: "PP11", dias: 0, sit: "Em negociação ativa",         temp: "Morno" },
    "Precisa de gerente":         { proximo: "PP11", dias: 0, sit: "Em negociação ativa",         temp: "Morno" },
    "Não respondeu":              { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
  },
  PP07: {
    "Agendou visita":             { proximo: "PP08", dias: 0, sit: "Visita agendada",             temp: "Quente", criarAgendamento: true },
    "Prefere videochamada":       { proximo: "PP08", dias: 0, sit: "Visita agendada",             temp: "Quente", criarAgendamento: true },
    "Vai pensar":                 { proximo: "PP12", dias: 2, sit: "Vai pensar",                  temp: "Morno" },
    "Não respondeu":              { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
    "Não tem interesse":          { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP08: {
    "Confirmou presença":         { proximo: "PP09", dias: 0, sit: "Visita a confirmar",          temp: "Quente" },
    "Pediu para remarcar":        { proximo: "PP07", dias: 1, sit: "Visita a confirmar",          temp: "Morno" },
    "Não atendeu":                { proximo: "PP08", dias: 0, sit: "Visita a confirmar",          temp: "Morno" },
    "Cancelou":                   { proximo: "PP15", dias: 1, sit: "Não compareceu",              temp: "Frio" },
  },
  PP09: {
    "Atendimento realizado":      { proximo: "PP10", dias: 0, sit: "Visita realizada",            temp: "Quente" },
    "Pediu proposta":             { proximo: "PP10", dias: 0, sit: "Visita realizada",            temp: "Quente" },
    "Precisa pensar":             { proximo: "PP12", dias: 2, sit: "Vai pensar",                  temp: "Morno" },
    "Não compareceu":             { proximo: "PP15", dias: 0, sit: "Não compareceu",              temp: "Frio" },
    "Perdeu interesse":           { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP10: {
    "Proposta aceita":            { proximo: "PP13", dias: 0, sit: "Proposta enviada",            temp: "Quente" },
    "Pediu desconto":             { proximo: "PP11", dias: 0, sit: "Em negociação ativa",         temp: "Quente" },
    "Quer pensar":                { proximo: "PP12", dias: 2, sit: "Proposta sem retorno",        temp: "Morno" },
    "Solicitou ficha":            { proximo: "PP13", dias: 0, sit: "Em negociação ativa",         temp: "Quente" },
    "Não respondeu":              { proximo: "PP12", dias: 2, sit: "Proposta sem retorno",        temp: "Morno" },
    "Recusou":                    { proximo: "PP11", dias: 0, sit: "Em negociação ativa",         temp: "Morno" },
  },
  PP11: {
    "Objeção superada":           { proximo: "PP10", dias: 0, sit: "Em negociação ativa",         temp: "Quente" },
    "Precisa de gerente":         { proximo: "PP11", dias: 0, sit: "Em negociação ativa",         temp: "Morno" },
    "Continua resistente":        { proximo: "PP12", dias: 3, sit: "Vai pensar",                  temp: "Morno" },
    "Encerrou negociação":        { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
    "Não respondeu":              { proximo: "PP15", dias: 2, sit: "Em cadência sem resposta",    temp: "Morno" },
  },
  PP12: {
    "Vai fechar":                 { proximo: "PP14", dias: 0, sit: "Em negociação ativa",         temp: "Quente" },
    "Precisa de mais tempo":      { proximo: "PP12", dias: 3, sit: "Vai pensar",                  temp: "Morno" },
    "Pediu nova proposta":        { proximo: "PP10", dias: 0, sit: "Em negociação ativa",         temp: "Morno" },
    "Não respondeu":              { proximo: "PP15", dias: 2, sit: "Proposta sem retorno",        temp: "Morno" },
    "Desistiu":                   { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP13: {
    "Documentos enviados":        { proximo: "PP14", dias: 0, sit: "Em negociação ativa",         temp: "Quente" },
    "Vai enviar depois":          { proximo: "PP13", dias: 1, sit: "Aguardando ação do vendedor", temp: "Quente" },
    "Não respondeu":              { proximo: "PP15", dias: 1, sit: "Em cadência sem resposta",    temp: "Morno" },
    "Desistiu":                   { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP14: {
    "Venda realizada":            { proximo: null,   dias: 0, sit: "Venda realizada",             temp: "Quente", status_op: "Vendida", vendido: true },
    "Adiou fechamento":           { proximo: "PP12", dias: 2, sit: "Em negociação ativa",         temp: "Quente" },
    "Desistiu":                   { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP15: {
    "Cliente respondeu":          { proximo: "PP02", dias: 0, sit: "Cliente respondeu",           temp: "Quente" },
    "Continua sem resposta":      { proximo: "PP16", dias: 7, sit: "Em cadência sem resposta",    temp: "Frio" },
    "Não tem mais interesse":     { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP16: {
    "Cliente reengajado":         { proximo: "PP02", dias: 0, sit: "Cliente respondeu",           temp: "Morno" },
    "Sem retorno":                { proximo: "PP17", dias: 0, sit: "Cadência encerrada",          temp: "Frio",  status_op: "Inativa" },
    "Sem orçamento no momento":   { proximo: "PP17", dias: 0, sit: "Oportunidade futura",         temp: "Frio",  status_op: "Inativa" },
    "Sem previsão de compra":     { proximo: "PP17", dias: 0, sit: "Oportunidade futura",         temp: "Frio",  status_op: "Inativa" },
    "Definitivamente perdido":    { proximo: "PP17", dias: 0, sit: "Venda perdida",               temp: "Frio",  status_op: "Encerrada" },
  },
  PP17: {
    "Encerrado amigavelmente":    { proximo: null,   dias: 0, sit: "Cadência encerrada",          temp: "Frio",  status_op: "Encerrada" },
    "Sem resposta final":         { proximo: null,   dias: 0, sit: "Cadência encerrada",          temp: "Frio",  status_op: "Encerrada" },
  },
};

/**
 * Aplica a transição de um resultado e retorna o patch para salvar no banco.
 * @param {string} proximoPassoAtual - label do passo atual salvo no banco
 * @param {string} resultado - label do resultado selecionado
 * @returns {{ patch, novoPassoLabel, criarAgendamento }}
 */
export function aplicarTransicao(proximoPassoAtual, resultado) {
  const agora = new Date().toISOString();
  const hoje = moment().format("YYYY-MM-DD");

  // Venda realizada / Comprou sempre fecha a oportunidade como Vendida/ganho
  if (resultado === "Venda realizada" || resultado === "Comprou" || resultado === "Venda concluída") {
    return {
      patch: {
        ultima_acao_em: agora,
        ultimo_contato: agora,
        ultimo_resultado_contato: resultado,
        situacao_atual: "Venda realizada",
        temperatura: "Quente",
        proximo_passo: null,
        objetivo_atual: null,
        proxima_acao_data: null,
        status_oportunidade: "Vendida",
        status_comercial: "Vendido",
        vendido: true,
        situacao_oportunidade: "Decisão",
        ativo: false,
      },
      novoPassoLabel: null,
      criarAgendamento: false,
    };
  }

  const codigo = detectarCodigo(proximoPassoAtual);
  const mapa = TRANSICAO[codigo] || {};
  const regra = mapa[resultado];

  if (!regra) {
    // Fallback universal para perda caso o passo atual não tenha a regra explícita
    if (
      resultado === "Perdeu interesse" ||
      resultado === "Sem interesse" ||
      resultado === "Desistiu" ||
      resultado === "Definitivamente perdido" ||
      resultado === "Venda perdida"
    ) {
      return {
        patch: {
          ultima_acao_em: agora,
          ultimo_contato: agora,
          ultimo_resultado_contato: resultado,
          situacao_atual: "Venda perdida",
          temperatura: "Frio",
          proximo_passo: null,
          objetivo_atual: null,
          proxima_acao_data: null,
          status_oportunidade: "Encerrada",
          status_comercial: "Perdido",
          ativo: false,
        },
        novoPassoLabel: null,
        criarAgendamento: false,
      };
    }

    // Sem regra específica: apenas registra o resultado e mantém o passo
    return {
      patch: { ultima_acao_em: agora, ultimo_contato: agora, ultimo_resultado_contato: resultado },
      novoPassoLabel: proximoPassoAtual,
      criarAgendamento: false,
    };
  }

  const novoPassoObj = regra.proximo ? PASSOS[regra.proximo] : null;
  const novoPassoLabel = novoPassoObj?.label || null;

  const novaData = regra.dias != null
    ? moment(hoje).add(regra.dias, "days").format("YYYY-MM-DD") + "T09:00:00"
    : null;

  const patch = {
    ultima_acao_em: agora,
    ultimo_contato: agora,
    ultimo_resultado_contato: resultado,
  };

  if (regra.sit)       patch.situacao_atual = regra.sit;
  if (regra.temp)      patch.temperatura = regra.temp;
  if (novoPassoLabel)  patch.proximo_passo = novoPassoLabel;
  if (novoPassoObj)    patch.objetivo_atual = novoPassoObj.objetivo;
  if (novaData)        patch.proxima_acao_data = novaData;

  // Status da oportunidade
  if (regra.status_op === "Vendida") {
    patch.status_oportunidade = "Vendida";
    patch.status_comercial = "Vendido";
    patch.vendido = true;
    patch.situacao_oportunidade = "Decisão";
    patch.ativo = false; // sai da carteira ativa
  } else if (regra.status_op === "Encerrada") {
    patch.status_oportunidade = "Encerrada";
    patch.status_comercial = "Perdido";
    patch.ativo = false;
  } else if (regra.status_op === "Inativa") {
    patch.status_oportunidade = "Inativa";
    patch.status_comercial = "Perdido";
    patch.ativo = false;
  } else {
    patch.status_oportunidade = "Ativa";
  }

  return {
    patch,
    novoPassoLabel,
    criarAgendamento: !!regra.criarAgendamento,
  };
}

// ─── INSTRUÇÃO DE SCRIPT IA POR PASSO ────────────────────────────────────────

export const INSTRUCAO_SCRIPT = {
  PP01: "Tom consultivo e curto. Primeira abordagem: apresente-se, cite o veículo de interesse e faça UMA pergunta para abrir diálogo. Máximo 4 linhas.",
  PP02: "Tom consultivo e investigativo. Faça perguntas abertas para entender necessidade, urgência, condição de pagamento e se possui troca. Não ofereça preço agora.",
  PP03: "Tom de apresentação com destaque de valor. Mencione o veículo, destaque 2 ou 3 pontos de valor relevantes ao cliente. Convide para ver fotos ou vídeo.",
  PP04: "Tom de apresentação consultiva. Conecte o veículo ideal ao perfil e necessidade que o cliente sinalizou. Seja específico, não genérico.",
  PP05: "Tom técnico e acolhedor. Apresente a simulação de financiamento com clareza: entrada, parcelas, prazo. Pergunte se as condições fazem sentido.",
  PP06: "Tom profissional e transparente. Trate a avaliação do veículo de troca com objetividade. Valorize o usado do cliente antes de apresentar o valor.",
  PP07: "Tom de convite. Proponha a visita ou videochamada de forma natural, sem pressão. Ofereça opções de data/hora para facilitar o 'sim'.",
  PP08: "Tom de confirmação amigável. Confirme o agendamento, reforce o local/horário e demonstre entusiasmo em receber o cliente.",
  PP09: "Tom de condução comercial. Oriente o atendimento para descobrir a condição final de compra: veículo, valor, pagamento, entrega.",
  PP10: "Tom de proposta formal e clara. Apresente a proposta com objetividade. Deixe espaço para o cliente reagir. Não pressione.",
  PP11: "Tom empático e solucionador. Valide a objeção, não discorde. Apresente uma saída ou alternativa. Evite repetir o problema.",
  PP12: "Tom de acompanhamento leve. Não pressione pela decisão. Mostre presença, pergunte se surgiu alguma dúvida e deixe o canal aberto.",
  PP13: "Tom de orientação. Liste claramente o que é necessário e por quê. Facilite ao máximo o processo para o cliente.",
  PP14: "Tom de confirmação e entusiasmo. Confirme a venda, parabenize o cliente pela decisão e oriente os próximos passos da entrega.",
  PP15: "Tom de retomada leve. Não cobre. Reacenda o interesse com uma nova informação ou pergunta diferente das anteriores.",
  PP16: "Tom de reativação. Reconheça o tempo sem contato, proponha uma nova abordagem ou oferta relevante. Seja direto e respeitoso.",
  PP17: "Tom educado e profissional de encerramento. Agradeça o contato, deixe a porta aberta para o futuro. Sem pressão.",
};

export function getInstrucaoScript(proximoPasso) {
  const codigo = detectarCodigo(proximoPasso);
  return INSTRUCAO_SCRIPT[codigo] || "Use tom consultivo, personalizado e natural para WhatsApp.";
}