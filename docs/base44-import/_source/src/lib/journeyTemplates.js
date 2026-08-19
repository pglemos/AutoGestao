// Templates de jornada por programa de consultoria
// Fonte única para geração idempotente de encontros a partir do produto contratado
// Nomenclatura e tempos oficiais v1.7 — baseados na planilha
// CONSULTORIA - CRONOGRAMA DE VISITAS(4).xlsx
// Abas: PMR ONLINE, PMR HIBRIDO, ENCONTRO_PMR PLUS, ENCONTRO_PPA

export const JOURNEY_TEMPLATES = {
  PMR_ONLINE: [
    { n: 0, title: 'Onboarding', objective: 'Boas-vindas, validação e preparação para a consultoria', modality: 'ONLINE', audience: 'Todos', scope: 'EMPRESA', is_onboarding: true, duration: null },
    { n: 1, title: 'Diagnóstico', objective: 'Entrevista com equipe, análise de processos e levantamento de dados', modality: 'ONLINE', audience: 'Todos', scope: 'EMPRESA', duration: 6 },
    { n: 2, title: 'Planejamento Estratégico, Metodologia de Vendas por Multicanal, Treinamento Método Vendedor Completo, Gestor Automotivo 4.0, Área do Dono', objective: 'Apresentação do planejamento e implementação da metodologia', modality: 'ONLINE', audience: 'Proprietário', scope: 'EMPRESA', duration: 3 },
    { n: 3, title: 'Fechamento Diário Vendedor e Gerente', objective: 'Implementar o Fechamento Diário e Metas nos módulos', modality: 'ONLINE', audience: 'Vendedor e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 4, title: 'Rotina do Gerente e Rotina do Vendedor', objective: 'Cadastro de clientes, Plano de Ataque, Atualização e Prospecção', modality: 'ONLINE', audience: 'Vendedor e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 5, title: 'Cultura de Resultados', objective: 'Implementar práticas de cultura de alta performance', modality: 'ONLINE', audience: 'Vendedor e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 6, title: 'Marketing: Diagnóstico', objective: 'Diagnóstico de marketing e canais digitais', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1.5 },
    { n: 7, title: 'Marketing: Posicionamento, Estratégia de Conteúdo e Anúncios', objective: 'Estratégia de canais digitais e captação de leads', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1.5 },
    { n: 8, title: 'Feedback Estruturado e Plano de Desenvolvimento Individual', objective: 'Estrutura de cargos, comissionamento e rotinas de equipe', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1.5 },
    { n: 9, title: 'Revisão do TRI 1 e Planejamento TRI 2', objective: 'Definição de metas e leitura de indicadores MX', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1.5 },
    { n: 10, title: 'Acompanhamento 1', objective: 'Consolidação do plano de ação por área', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 11, title: 'Acompanhamento 2', objective: 'Acompanhamento e ajustes do plano', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 12, title: 'Acompanhamento 3', objective: 'Revisão da jornada e plano de continuidade', modality: 'ONLINE', audience: 'Todos', scope: 'EMPRESA', duration: 1 },
  ],
  PMR_HIBRIDO: [
    { n: 0, title: 'Onboarding', objective: 'Boas-vindas, validação e preparação para a consultoria', modality: 'ONLINE', audience: 'Todos', scope: 'EMPRESA', is_onboarding: true, duration: null },
    { n: 1, title: 'Diagnóstico', objective: 'Entrevista com equipe, análise de processos e levantamento de dados', modality: 'PRESENCIAL', audience: 'Todos', scope: 'EMPRESA', duration: 6 },
    { n: 2, title: 'Planejamento Estratégico, Metodologia de Vendas por Multicanal, Treinamento Método Vendedor Completo, Gestor Automotivo 4.0, Área do Dono', objective: 'Apresentação do planejamento e implementação da metodologia', modality: 'ONLINE', audience: 'Proprietário', scope: 'EMPRESA', duration: 2 },
    { n: 3, title: 'Fechamento Diário Vendedor e Gerente', objective: 'Implementar o Fechamento Diário e Metas nos módulos', modality: 'ONLINE', audience: 'Vendedor e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 4, title: 'Rotina do Gerente e Rotina do Vendedor', objective: 'Cadastro de clientes, Plano de Ataque, Atualização e Prospecção', modality: 'ONLINE', audience: 'Vendedor e Gerente', scope: 'TODAS_LOJAS', duration: 1 },
    { n: 5, title: 'Cultura de Resultados', objective: 'Implementar práticas de cultura de alta performance', modality: 'ONLINE', audience: 'Vendedor e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 6, title: 'Marketing: Diagnóstico', objective: 'Diagnóstico de marketing e canais digitais', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1.5 },
    { n: 7, title: 'Marketing: Posicionamento, Estratégia de Conteúdo e Anúncios', objective: 'Estratégia de canais digitais e captação de leads', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1.5 },
    { n: 8, title: 'Feedback Estruturado e Plano de Desenvolvimento Individual', objective: 'Estrutura de cargos, comissionamento e rotinas de equipe', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1.5 },
    { n: 9, title: 'Revisão do TRI 1 e Planejamento TRI 2', objective: 'Definição de metas e leitura de indicadores MX', modality: 'PRESENCIAL', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 6 },
    { n: 10, title: 'Acompanhamento 1', objective: 'Consolidação do plano de ação por área', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 11, title: 'Acompanhamento 2', objective: 'Acompanhamento e ajustes do plano', modality: 'ONLINE', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration: 1 },
    { n: 12, title: 'Acompanhamento 3', objective: 'Revisão da jornada e plano de continuidade', modality: 'ONLINE', audience: 'Todos', scope: 'EMPRESA', duration: 1 },
  ],
  PMR_PLUS: [
    { n: 0, title: 'Onboarding', objective: 'Boas-vindas, validação e preparação para a consultoria', modality: 'ONLINE', audience: 'Proprietário', scope: 'EMPRESA', is_onboarding: true, duration: null },
    { n: 1, title: 'Diagnóstico e Planejamento Financeiro', objective: 'Levantamento avançado e mapeamento financeiro', modality: 'A_DEFINIR', audience: 'Proprietário', scope: 'EMPRESA', duration_online: 3, duration_presential: 6 },
    { n: 2, title: 'DRE, Fluxo de Caixa e Balanço Patrimonial', objective: 'Estruturação da gestão financeira e separação PF/PJ', modality: 'A_DEFINIR', audience: 'Proprietário', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 3, title: 'Revisão dos Processos de Marketing e Vendas', objective: 'Revisão dos processos comerciais e de marketing', modality: 'A_DEFINIR', audience: 'Todos', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 4, title: 'Revisão dos Processos Administrativos e Operacionais', objective: 'Revisão dos processos administrativos e operacionais', modality: 'A_DEFINIR', audience: 'Todos', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 5, title: 'Revisão dos Processos de Gestão', objective: 'Revisão dos processos de gestão e liderança', modality: 'A_DEFINIR', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 6, title: 'Consolidação da Cultura de Resultados', objective: 'Consolidação da cultura de resultados', modality: 'A_DEFINIR', audience: 'Proprietário', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 7, title: 'Acompanhamento 1', objective: 'Acompanhamento e ajustes do plano', modality: 'A_DEFINIR', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 8, title: 'Acompanhamento 2', objective: 'Acompanhamento e ajustes do plano', modality: 'A_DEFINIR', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 9, title: 'Acompanhamento 3', objective: 'Revisão e preparação para PPA', modality: 'A_DEFINIR', audience: 'Proprietário', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
  ],
  PPA: [
    { n: 0, title: 'Onboarding', objective: 'Boas-vindas, validação e preparação para a consultoria', modality: 'ONLINE', audience: 'Proprietário', scope: 'EMPRESA', is_onboarding: true, duration: null },
    { n: 1, title: 'Construção do Modelo de Negócio e Planejamento', objective: 'Análise de performance consolidada', modality: 'A_DEFINIR', audience: 'Proprietário', scope: 'EMPRESA', duration_online: 3, duration_presential: 6 },
    { n: 2, title: 'Diagnóstico e Plano de Maximização de Receitas', objective: 'Otimização de margem por canal e produto', modality: 'A_DEFINIR', audience: 'Proprietário', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 3, title: 'Diagnóstico e Plano de Eficiência em Custo', objective: 'Política de margem por perfil de veículo', modality: 'A_DEFINIR', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 4, title: 'Acompanhamento do Modelo e Ajustes Estratégicos', objective: 'Giro ideal e mix de inventário', modality: 'A_DEFINIR', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 5, title: 'Acompanhamento da Maximização de Receitas', objective: 'Funil comercial e conversão multicanal', modality: 'A_DEFINIR', audience: 'Gerente e Vendedor', scope: 'TODAS_LOJAS', duration_online: 1.5, duration_presential: 3 },
    { n: 6, title: 'Acompanhamento da Eficiência em Custo', objective: 'Comissionamento, trilha de carreira e retenção', modality: 'A_DEFINIR', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 7, title: 'Consolidação do Modelo e Planejamento', objective: 'Scorecard executivo e cadência de revisão', modality: 'A_DEFINIR', audience: 'Proprietário', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 8, title: 'Consolidação e Escala das Receitas', objective: 'Plano de alavancagem de resultados', modality: 'A_DEFINIR', audience: 'Proprietário e Gerente', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
    { n: 9, title: 'Consolidação da Eficiência em Custo', objective: 'Consolidação e plano de continuidade', modality: 'A_DEFINIR', audience: 'Todos', scope: 'EMPRESA', duration_online: 1.5, duration_presential: 3 },
  ],
};

// Retorna o template adequado com base no programa e variante de modalidade
export function getJourneyTemplate(program, modalityVariant) {
  if (program === 'PMR') {
    return modalityVariant === 'ONLINE' ? JOURNEY_TEMPLATES.PMR_ONLINE : JOURNEY_TEMPLATES.PMR_HIBRIDO;
  }
  return JOURNEY_TEMPLATES[program] || JOURNEY_TEMPLATES.PMR_HIBRIDO;
}

// Etapas iniciais do Encontro 0 — Onboarding por programa
// Template inicial editável pela MX
export const ONBOARDING_STAGES = {
  PMR_ONLINE: [
    { order: 1, name: 'Boas-vindas e alinhamento do programa', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 2, name: 'Validação da empresa, Matriz e responsáveis', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 3, name: 'Validação dos usuários e acessos', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 4, name: 'Apresentação do MX Performance e dos módulos iniciais', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 5, name: 'Apresentação da jornada online e dos consultores', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 6, name: 'Confirmação do cronograma e dos canais de comunicação', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 7, name: 'Preparação dos dados e participantes para o Diagnóstico', required: true, responsible_role: 'CONSULTOR_MX' },
  ],
  PMR_HIBRIDO: [
    { order: 1, name: 'Boas-vindas e alinhamento do programa', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 2, name: 'Validação da empresa, Lojas e responsáveis', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 3, name: 'Validação dos usuários e acessos', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 4, name: 'Apresentação do MX Performance e dos módulos iniciais', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 5, name: 'Apresentação da jornada e dos consultores', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 6, name: 'Distribuição inicial das visitas presenciais e alinhamento logístico', required: true, responsible_role: 'CONSULTOR_MX' },
    { order: 7, name: 'Preparação dos dados e participantes para o Diagnóstico', required: true, responsible_role: 'CONSULTOR_MX' },
  ],
  PMR_PLUS: [
    { order: 1, name: 'Validação da conclusão ou transição do PMR', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 2, name: 'Alinhamento dos objetivos do PMR Plus', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 3, name: 'Validação dos responsáveis e das fontes financeiras', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 4, name: 'Apresentação da jornada e dos consultores especialistas', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 5, name: 'Definição inicial das modalidades dos encontros', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 6, name: 'Preparação dos dados para Diagnóstico e Planejamento Financeiro', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 7, name: 'Confirmação do cronograma e dos canais de comunicação', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
  ],
  PPA: [
    { order: 1, name: 'Validação da conclusão ou transição do PMR Plus', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 2, name: 'Alinhamento dos objetivos de lucratividade e consolidação', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 3, name: 'Validação dos responsáveis e das fontes estratégicas', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 4, name: 'Apresentação da jornada e dos consultores especialistas', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 5, name: 'Definição inicial das modalidades dos encontros', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 6, name: 'Preparação dos dados para Modelo de Negócio e Planejamento', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
    { order: 7, name: 'Confirmação do cronograma e dos canais de comunicação', required: true, responsible_role: 'CONSULTOR_ESPECIALISTA' },
  ],
};

export function getOnboardingStages(program, modalityVariant) {
  if (program === 'PMR') {
    return modalityVariant === 'ONLINE' ? ONBOARDING_STAGES.PMR_ONLINE : ONBOARDING_STAGES.PMR_HIBRIDO;
  }
  return ONBOARDING_STAGES[program] || ONBOARDING_STAGES.PMR_HIBRIDO;
}