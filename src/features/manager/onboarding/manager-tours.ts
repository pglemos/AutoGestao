/**
 * Tour do Gerente — porte de `src/components/onboarding/tours.js` do Base44,
 * com as rotas remapeadas para as do MX.
 *
 * Passo com `selector` vira spotlight sobre o elemento; sem `selector`, vira
 * modal central. Só use `selector` quando a âncora `data-tour` existir de fato
 * na tela — um seletor que não casa cai no modal central, sem quebrar.
 *
 * A tela `/configuracoes` do Base44 não foi portada (depende de campos de loja
 * que o MX não tem), então o tour dela também não existe aqui.
 */

export type ManagerTourStep = {
  title: string
  subtitle?: string
  selector?: string
  description: string
}

export const MANAGER_TOURS: Record<string, ManagerTourStep[]> = {
  '/home': [
    {
      title: 'Início',
      subtitle: 'Painel de Previsibilidade',
      description: 'Bem-vindo ao Dashboard de Previsibilidade Comercial. Aqui você conduz o resultado do dia com base em agendamentos confirmados e na meta da loja.',
    },
    {
      title: 'Previsibilidade do dia',
      subtitle: 'Bloco principal',
      selector: "[data-tour='previsibilidade-dia']",
      description: 'Cruza a previsão de vendas do dia com a necessidade para sustentar a meta mensal. Se a previsão cobre a necessidade, o dia está no caminho certo.',
    },
  ],

  '/gerente/meta-loja': [
    {
      title: 'Meta da Loja',
      subtitle: 'Acompanhamento mensal',
      description: 'Aqui você acompanha o resultado da loja contra a meta mensal e planeja o que falta para alcançá-la. Troque o período e a unidade no topo.',
    },
    {
      title: 'Editar Metas Individuais',
      subtitle: 'Configuração',
      selector: "[data-tour='metas-individuais']",
      description: 'Defina a meta individual de cada vendedor. O painel mostra quem está acima, no ritmo, em risco ou crítico, com recomendações automáticas.',
    },
  ],

  '/rotina': [
    {
      title: 'Rotina do Dia',
      subtitle: 'Seu cockpit diário',
      description: 'Centraliza tudo que você precisa fazer hoje: tarefas automáticas, pendências e acompanhamento da equipe — tudo em uma só tela.',
    },
  ],

  '/fechamento-diario': [
    {
      title: 'Fechamento Diário da Equipe',
      subtitle: 'Conferência',
      description: 'Acompanhe o fechamento de cada vendedor no dia, confira leads e regularize pendências antes do prazo limite.',
    },
  ],

  '/gerente/rotina-equipe': [
    {
      title: 'Rotina da Equipe',
      subtitle: 'Execução',
      description: 'Monitore a execução da rotina diária de cada vendedor: pendências, plano de ataque, prospecção e fechamento.',
    },
  ],

  '/gerente/minha-equipe': [
    {
      title: 'Minha Equipe',
      subtitle: 'Gestão de pessoas',
      description: 'Acompanhe o desempenho individual dos vendedores em pilares de performance e histórico completo.',
    },
    {
      title: 'Kanban de Performance',
      subtitle: 'Visão geral',
      selector: "[data-tour='kanban-equipe']",
      description: 'Quadro com o status de cada vendedor. Clique em um card para ver o perfil completo, feedbacks, PDI e ações rápidas.',
    },
  ],

  '/gerente/mentor': [
    {
      title: 'Mentor Gerencial',
      subtitle: 'Assistente',
      description: 'Área de apoio à gestão com recomendações baseadas em regras objetivas sobre a operação — sem IA e sem números estimados.',
    },
    {
      title: 'Recomendações por Regras',
      subtitle: 'O que tratar hoje',
      selector: "[data-tour='mentor-recomendacoes']",
      description: 'Cada sinal nasce de um fato apurado: fechamento pendente, rotina crítica ou meta proporcional atrasada. Filtre por criticidade e trate na ordem.',
    },
  ],

  '/gerente/feedbacks-pdis': [
    {
      title: 'Desenvolvimento',
      subtitle: 'PDI e Feedback',
      description: 'Gerencie feedbacks e Planos de Desenvolvimento Individual (PDI) da sua equipe em um só lugar.',
    },
  ],

  '/gerente/ranking': [
    {
      title: 'Ranking',
      subtitle: 'Comparativo',
      description: 'Veja o ranking de desempenho dos vendedores no período. Use para reconhecer destaques e direcionar o desenvolvimento.',
    },
    {
      title: 'Comparativo de Vendedores',
      subtitle: 'Insumo de feedback',
      selector: "[data-tour='ranking-comparativo']",
      description: 'Selecione dois vendedores para cruzar resultado, volume e rotina. Os pontos para feedback saem prontos para a conversa individual.',
    },
  ],

  '/gerente/universidade-mx': [
    {
      title: 'Universidade MX',
      subtitle: 'Treinamentos',
      description: 'Acesse treinamentos e materiais de desenvolvimento para você e sua equipe, vinculados às competências do PDI.',
    },
  ],
}

export function getManagerTour(pathname: string): ManagerTourStep[] | null {
  return MANAGER_TOURS[pathname] || null
}
