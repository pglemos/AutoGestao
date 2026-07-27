# Design técnico aprovado: superfícies funcionais compartilhadas do módulo interno MX

**Data:** 27 de julho de 2026  
**Projeto:** MX Gestão Preditiva  
**Escopo:** PR funcional anterior ao PR de tema global  
**Perfis internos:** `administrador_geral`, `administrador_mx`, `consultor_mx`  
**Status:** aprovado tecnicamente após consolidação das instruções finais

## 1. Contexto e decisão

Os três perfis internos já possuem contrato global de autorização. A lacuna está nas superfícies funcionais: Plano Estratégico e Plano de Ação internos são versões reduzidas, Consultoria não reúne toda a jornada de autonomia assistida e o Painel Geral ainda precisa de drill-down rastreável.

A solução aprovada é **workspace funcional compartilhado, shells por perfil, repositórios canônicos, política explícita de capacidades, Supabase como fonte de verdade e Realtime consolidado**.

Decisões vinculantes:

1. Funcionalidades serão entregues antes do tema global.
2. O tema institucional `#198653`, a sidebar clara e a migração global de tokens serão tratados em PR separado.
3. Ajustes de hierarquia e layout específicos de Plano Estratégico, Plano de Ação e Consultoria fazem parte do PR funcional.
4. Os três perfis internos terão a mesma capacidade funcional global.
5. Dono, Gerente e Vendedor permanecem limitados ao próprio escopo.
6. Não serão criadas páginas, repositórios ou tabelas paralelas para o mesmo domínio.
7. A instrução mais recente de cada especificação prevalece em conflitos.
8. RLS, RPCs transacionais, validação server-side e auditoria são obrigatórios.
9. Dados reais não serão substituídos por fixtures.
10. Números demonstrativos só podem aparecer em modo de demonstração explicitamente identificado.

## 2. Objetivo

Permitir que os três perfis internos:

- visualizem todas as lojas autorizadas;
- acompanhem vendedores, gerentes, donos e lojas;
- criem, editem, excluam, restaurem, deleguem, aprovem e validem registros;
- naveguem entre rede, loja, pessoa, estratégia, ação e consultoria sem perder contexto;
- vejam alterações refletidas em tempo real;
- executem operações com histórico e auditoria;
- utilizem as mesmas regras e dados das superfícies do Dono.

## 3. Fora do escopo

Este PR não deve:

- aplicar o tema global `#198653`;
- trocar a sidebar global;
- substituir todos os tokens CSS;
- redesenhar páginas fora das superfícies previstas;
- alterar fórmulas ou regras comerciais sem necessidade comprovada;
- criar integrações externas fictícias;
- semear dados demonstrativos em produção;
- ampliar permissões de Gerente ou Vendedor;
- usar localStorage como fonte principal de dados operacionais;
- gravar credenciais em código, documentação ou logs.

## 4. Arquitetura

### 4.1 Componentes

A experiência será dividida em:

- **shell por perfil**, responsável por navegação e composição;
- **contexto de workspace**, responsável por loja, ator, capacidades e URL;
- **workspace funcional**, responsável pela tela;
- **adaptador de dados**, responsável por parametrizar repositórios;
- **política de ações**, responsável pelas operações permitidas;
- **repositório canônico**, responsável pela persistência;
- **assinatura Realtime**, responsável pela sincronização.

O Dono continua em `OwnerLayout`. Os perfis internos continuam em `MxSidebarShell`. O conteúdo funcional é compartilhado.

### 4.2 Proibições

Não é permitido:

- copiar a página do Dono para outra pasta;
- criar segundo repositório com a mesma finalidade;
- criar tabela equivalente apenas para o módulo interno;
- manter regra de status diferente em cada superfície;
- espalhar `as any` pelos novos contratos;
- deixar uma operação composta parcialmente persistida.

Operações envolvendo múltiplas tabelas, Auth ou relacionamentos devem usar RPC transacional ou Edge Function com compensação.

## 5. Contexto interno compartilhado

O contexto deve resolver:

- `activeStoreId`;
- loja e unidade selecionadas;
- cliente de consultoria relacionado;
- lista de lojas autorizadas;
- ator autenticado;
- papel e capacidades;
- carregamento e erro;
- atualização manual;
- navegação contextual;
- Realtime consolidado;
- persistência de `?storeId=<uuid>`.

Regras:

- preservar a loja ao trocar de módulo;
- não selecionar loja inativa automaticamente;
- impedir consultas globais acidentais quando o domínio exigir loja;
- manter estado claro sem loja selecionada;
- agrupar rajadas Realtime com debounce ou single-flight;
- recarregar apenas o domínio afetado;
- refazer a consulta após reconexão;
- remover canais no unmount;
- refletir mutações locais imediatamente.

## 6. Autorização

### 6.1 Paridade interna

`administrador_geral`, `administrador_mx` e `consultor_mx` podem:

- visualizar todas as lojas autorizadas;
- administrar metas e indicadores persistidos;
- administrar ações e dados consultivos;
- aprovar, delegar, bloquear, desbloquear, validar, devolver e reabrir;
- excluir quando a regra do domínio permitir;
- acompanhar evolução operacional e estratégica.

### 6.2 Proteções

- exclusão irreversível exige confirmação textual;
- ações críticas registram ator, data, loja e origem;
- logs de auditoria não são apagados por cascata;
- operações indisponíveis pelo estado não aparecem;
- mensagens não expõem detalhes sensíveis do banco;
- RLS permanece a fronteira principal.

# 7. Plano Estratégico compartilhado

## 7.1 Direção

`InternalStrategicPlanPage` será reduzida a wrapper do workspace compartilhado extraído da experiência completa do Dono. A extração preserva cálculos, catálogo, metas, realizado, ano anterior, histórico, exportação, criação de ação, preferências, persistência, rotas e permissões.

## 7.2 Cabeçalho e abas

Cabeçalho compacto:

- título `Planejamento Estratégico`;
- subtítulo `Acompanhe metas, resultados e evolução dos principais indicadores da empresa.`;
- sem saudação nessa página.

Abas:

1. `Resumo`;
2. `Visão Geral`.

Usar controle segmentado. O badge `Dados fictícios — modelo em validação` só aparece quando a fonte ativa for uma fixture de demonstração.

## 7.3 Barra compacta

Na aba Resumo, organizar em uma linha no desktop:

Esquerda:

- Indicador;
- Área;
- Exibição.

Direita:

- Editar Metas;
- Criar Plano de Ação;
- Exportar.

O seletor de indicador recebe a maior largura. A barra não deve virar card alto.

## 7.4 Exibição

Controle segmentado:

- `Ambos`;
- `Tabela`;
- `Gráfico`.

Regras:

- desktop inicia em Ambos;
- tabela à esquerda e gráfico à direita;
- preferência persistida;
- trocar indicador preserva o modo e a rolagem;
- tablet pode empilhar;
- mobile oculta Ambos e oferece Tabela ou Gráfico.

## 7.5 Resumo do Indicador

Substituir quatro cards grandes por uma faixa horizontal única.

Lado esquerdo:

- ícone;
- nome;
- código;
- área;
- direção;
- status.

Lado direito:

1. Meta do mês;
2. Resultado do mês;
3. Atingimento da meta;
4. Variação contra o ano anterior.

## 7.6 Área principal

No modo Ambos:

- tabela: aproximadamente 58%;
- gráfico: aproximadamente 42%;
- gap: 16 a 20 px;
- mesma altura externa;
- altura entre 340 e 380 px;
- sem rolagem horizontal da página.

Entre 1280 e 1499 px, a proporção pode aproximar-se de 55% e 45%. Em 1600 × 900, com sidebar aberta e zoom de 100%, título, abas, controles, resumo, tabela e gráfico devem ficar visíveis sem rolagem vertical sempre que a densidade do sistema permitir.

## 7.7 Tabela

Preservar:

- Meta;
- Resultado Atual;
- `% da Meta`;
- Ano Anterior;
- Variação contra Ano Anterior;
- janeiro a dezembro;
- consolidado.

No modo Ambos:

- rolagem interna;
- primeira coluna fixa;
- cabeçalho fixo;
- mês selecionado destacado e centralizado;
- altura igual à do gráfico;
- ausência não pode virar zero.

## 7.8 Gráfico

Preservar Meta, Resultado Atual e Ano Anterior.

Regras:

- gráfico de linhas;
- Resultado Atual com maior peso;
- Meta tracejada;
- Ano Anterior com menor peso;
- legenda clicável e acessível;
- mês selecionado destacado;
- tooltip com Meta, Resultado, Ano Anterior e Atingimento;
- meses futuros sem resultado não são conectados como zero;
- unidade correta por indicador.

## 7.9 Leitura, direcionamento e Visão Geral

Abaixo da análise, manter `Leitura do indicador` e `Direcionamento MX`. O direcionamento pode oferecer Criar Plano de Ação.

A Visão Geral preserva cards executivos, filtros, departamentos, busca, minigráficos e todos os **45 indicadores**. Quantidade, códigos, áreas, direções, tipos, fórmulas e agregações não podem ser alterados.

## 7.10 Metas e ações

Editar Metas preserva drawer, histórico, resumo consolidado, valores alterados e ações Salvar, Restaurar e Cancelar.

Criar Plano de Ação deve:

- reutilizar o formulário canônico;
- mostrar indicador, resultado, meta, distância e status;
- preencher contexto conhecido;
- solicitar apenas campos ausentes;
- impedir duplicidade automática;
- criar em `planos_acao`;
- trocar o CTA para abrir a ação existente;
- refletir imediatamente no Plano de Ação.

Dados canônicos:

- `catalogo_indicadores_planejamento`;
- `valores_indicadores_planejamento`;
- `regras_metas_loja`;
- `planos_acao`;
- tabelas operacionais dos indicadores derivados.

# 8. Plano de Ação compartilhado

## 8.1 Estrutura principal

A página deve possuir somente:

1. `Ações`;
2. `Calendário`.

Regras:

- Ações abre por padrão;
- usar `?tab=acoes` e `?tab=calendario`;
- preservar preferência após atualização;
- remover links e estados da antiga Visão Executiva;
- reutilizar dentro de Ações os elementos ainda funcionais;
- não apagar lógica antes da migração.

## 8.2 Cabeçalho

- título `Plano de Ação`;
- subtítulo `Transforme as prioridades estratégicas em execução.`;
- ciclo estratégico;
- período;
- dias restantes;
- Exportar;
- Nova Ação.

O badge de dados fictícios só aparece em modo de demonstração.

## 8.3 Cinco cards executivos

Exibir exatamente nesta ordem:

1. `Ações`;
2. `Não Iniciadas`;
3. `Atrasadas`;
4. `Em Andamento`;
5. `Concluídas`.

Os valores são calculados da fonte canônica. Em fixture oficial de validação podem resultar em 24, 3, 3, 7 e 4. Em produção, mostrar números reais.

Regras:

- Ações conta todas as não canceladas;
- Não Iniciadas filtra status Não iniciada;
- Atrasadas usa prazo vencido e exclui Concluída e Cancelada;
- atraso é condição calculada, não status;
- Em Andamento filtra status Em andamento;
- Concluídas filtra status Concluída;
- clicar aplica filtro;
- clicar novamente remove;
- seleção atualiza Foco, Kanban e Lista;
- card selecionado indica `Filtro ativo`.

Não incluir nessa faixa Aguardando você, Bloqueadas, Aguardando validação, score, gauge ou progresso geral.

## 8.4 Modos de Ações

- `Foco`;
- `Kanban`;
- `Lista`.

Foco abre por padrão. Os três modos usam os mesmos filtros e a mesma fonte.

## 8.5 Foco

Seções obrigatórias:

### Precisam de você

Ações dependentes de decisão. Mostrar título, motivo, impacto, responsável, prazo, prioridade e `Analisar e decidir`. Aprovar, Delegar e Falar com Consultor ficam no drawer.

### Em risco

Incluir ações atrasadas, bloqueadas, com prazo em até dois dias e progresso inferior a 50%, sem atualização há mais de sete dias ou prioridade crítica sem execução. Ordenar por atraso, bloqueio, prioridade e prazo.

### Em execução

Ações Em andamento, ordenadas por prioridade, prazo e menor progresso. Ação rápida `Atualizar`.

### Aguardando validação

Mostrar ação, responsável, evidência, data, impacto e `Validar`, reutilizando o fluxo canônico.

### Concluídas recentemente

Últimas quatro concluídas, com impacto positivo, parcial, sem impacto comprovado ou ainda não medido.

## 8.6 Ferramentas

Esquerda:

- pesquisa;
- Departamento;
- Responsável;
- Status;
- Prioridade;
- Mais filtros.

Direita:

- Foco;
- Kanban;
- Lista;
- Ordenar;
- Nova Ação.

Filtros avançados: Objetivo, Indicador, Origem, Período, Impacto, Sem atualização e Requer decisão do Dono. Exibir chips ativos.

## 8.7 Kanban, Lista e Calendário

Kanban preserva as seis colunas:

1. Aguardando decisão;
2. Não iniciada;
3. Em andamento;
4. Bloqueada;
5. Aguardando validação;
6. Concluída.

Preservar drag and drop, Mover para, validações, modais, histórico e persistência. Drag and drop e Mover para chamam a mesma função de domínio.

Lista preserva seleção, ordenação, ações em lote, exportação, filtros e drawer.

Calendário preserva Mês, Semana, Agenda, filtros, próximos prazos, detalhes do dia, criação por data, alteração de prazo, histórico, exportação e impressão. Não repetir os cinco cards executivos. Desktop inicia em Mês e mobile em Agenda.

## 8.8 Ciclo completo

Operações:

- criar e editar;
- excluir quando permitido;
- aprovar e delegar;
- iniciar e atualizar progresso;
- bloquear e desbloquear;
- enviar para validação;
- validar e devolver;
- reabrir e cancelar;
- duplicar e comentar;
- alterar checklist;
- anexar evidências;
- alterar prazo;
- medir impacto;
- exportar.

Regras mínimas:

- decisão do Dono exige aprovação;
- início registra ator e data;
- bloqueio exige motivo e responsável pela resolução;
- validação exige requisitos obrigatórios;
- devolução exige justificativa;
- concluída só muda por reabertura;
- cancelada não entra no progresso ativo;
- atraso permanece condição calculada;
- toda transição registra histórico.

O drawer mantém Resumo, Execução, Evidências e Histórico e Impacto, preservando filtros, modo e posição de rolagem.

## 8.9 Atualização imediata

Criar, iniciar, concluir, cancelar, reabrir, mudar status, prazo, aprovar, bloquear, desbloquear, validar ou devolver deve atualizar imediatamente cinco cards, Foco, Kanban, Lista e Calendário, sem reload.

Dados canônicos:

- `planos_acao`;
- `historico_planos_acao`;
- `evidencias_planos_acao`;
- `itens_plano_acao`;
- comentários, usuários e lojas relacionados.

# 9. Consultoria com autonomia assistida

## 9.1 Direção

A Consultoria interna será workspace global por cliente e loja. A implementação acrescenta autonomia assistida sobre a estrutura aprovada, sem redesenhar toda a página.

Regras finais:

- substituir `Próximo encontro` por `Próximo passo`;
- ajustar nomes da jornada para não sobrepor;
- `Assistir aula` abre a aula real;
- clicar no encontro abre **modal central**, não drawer lateral;
- manter a jornada ao fundo quando possível;
- não navegar para página desconectada;
- aula não equivale a encontro realizado;
- cliente não aprova a própria implantação.

## 9.2 Barras e jornada

Manter três leituras independentes:

1. Progresso da jornada;
2. Progresso das implantações;
3. Evidências aprovadas.

Cada encontro pode mostrar no máximo duas informações compactas: aula disponível ou concluída, entrega iniciada, pronto para antecipar, antecipação em análise, encontro atual, bloqueado, realizado, implantação validada ou evidência pendente.

Encontro bloqueado não mostra vídeo nem checklist.

## 9.3 Modal central

Abas finais:

1. `Aula e Visão Geral`;
2. `Entrega`;
3. `Evidências`.

Não existe aba Ações. Não existe aba separada Progresso. O progresso permanece nas barras, jornada e resumos de Entrega e Evidências.

### Aula e Visão Geral

A aula aparece primeiro. Mostrar:

- player;
- título, descrição, objetivo e duração;
- obrigatória ou opcional;
- progresso e retomada;
- arquivos e materiais abaixo do vídeo;
- número, título, programa, fase e pilar;
- modalidade, data, consultor e participantes;
- status, objetivo, motivo e resultado esperado;
- possibilidade de antecipação.

Ocultar a área de aula quando não houver vídeo, sem bloco vazio.

### Entrega

Substitui Preparação. Mostrar checklist de tudo que o usuário deve entregar:

- aulas obrigatórias;
- participantes;
- documentos e dados;
- materiais e tarefas;
- itens obrigatórios e opcionais;
- responsável, prazo, status e observação;
- upload de arquivo ou link.

Cada item pode ser iniciado, concluído, comentado, atribuído e reaberto. Item ligado a aula atualiza automaticamente após a conclusão da aula.

### Evidências

Manter aba própria em formato de checklist com upload.

Permitir arquivo, imagem, planilha, PDF, link, texto e observação.

Cada evidência mostra tipo, nome, responsável, data, encontro, item relacionado, status e observação do consultor.

Status:

- Pendente;
- Enviada;
- Em análise;
- Aprovada;
- Devolvida.

Ações:

- Visualizar;
- Substituir;
- Remover quando permitido;
- Reenviar;
- Ver devolutiva.

## 9.4 Vídeo e progresso

Usar player incorporado compatível com o provedor, incluindo YouTube IFrame Player API quando aplicável.

Requisitos:

- 16:9 responsivo;
- play, pause, volume, velocidade e tela cheia;
- assistir vídeo completo;
- continuar do ponto salvo;
- assistir do início e novamente;
- materiais complementares;
- controles acessíveis.

Salvar a cada cinco segundos e ao pausar, trocar aba, fechar modal, sair da página e terminar.

Persistir posição atual, duração, segundos efetivamente reproduzidos, percentual, última reprodução, início e conclusão.

Fórmula:

`segundos efetivamente reproduzidos / duração total × 100`

Regras:

- incrementar apenas enquanto reproduz;
- avançar para o final não conclui;
- aula obrigatória conclui com pelo menos 90% efetivamente reproduzidos;
- conclusão atualiza Entrega;
- conclusão não marca encontro realizado;
- assistir novamente não apaga conclusão.

## 9.5 Comece por aqui e Próximo passo

`Comece por aqui` abre o modal central na aula correta, respeitando progresso e permissão.

O card usa `Próximo passo`.

Quando existir `google_meet_link` válido e o encontro estiver disponível, mostrar `Entrar na Reunião`.

Regras:

- abrir link real do evento;
- não gerar URL fictícia;
- respeitar data, status e autorização;
- refletir antecipação aprovada ou em análise.

## 9.6 Participantes e Plano de Ação

Confirmar participantes abre modal com papel, pessoa, obrigatoriedade, confirmação e observação. A confirmação atualiza Entrega e progresso.

A aba Ações foi removida, mas o vínculo permanece. CTA contextual em Entrega ou Evidências pode abrir o formulário canônico de Plano de Ação, preenchendo origem Consultoria, programa, encontro, motivo, objetivo, departamento, evidência esperada, consultor, empresa e unidade. Solicitar apenas campos ausentes e impedir duplicidade. A Consultoria mostra somente o vínculo resumido.

## 9.7 Progresso da entrega e antecipação

Calcular:

`itens obrigatórios concluídos / itens obrigatórios totais × 100`

Itens opcionais não bloqueiam.

Pronto para antecipar exige:

- aulas obrigatórias concluídas;
- checklist obrigatório concluído;
- participantes obrigatórios confirmados;
- evidências obrigatórias enviadas;
- nenhuma pendência crítica;
- encontro anterior realizado ou validado quando aplicável.

Somente o próximo encontro elegível pode ser antecipado, salvo liberação do consultor.

O botão fica bloqueado enquanto houver pendências e lista o que falta.

Modal de antecipação:

- encontro;
- data atual;
- motivo;
- modalidade;
- três opções de data;
- observações;
- confirmação de participantes.

Validações:

- entrega obrigatória concluída;
- datas futuras;
- participantes confirmados;
- sem solicitação ativa;
- encontro não realizado nem concluído;
- programa ativo;
- usuário autorizado;
- modalidade permitida.

Ao enviar, persistir solicitação em `Em análise`, ator, horário e snapshot da entrega/evidências; atualizar Próximo passo e jornada.

Estados:

- Rascunho;
- Em análise;
- Aprovada;
- Ajuste de data solicitado;
- Recusada;
- Cancelada.

Aprovada registra data anterior e nova, atualiza agenda, jornada e Próximo passo e preserva histórico. Cancelamento é permitido enquanto Em análise, com confirmação.

## 9.8 Programas

### PMR

- `PMR — Programa de Maximização de Resultados`;
- foco em Estruturação de Processos;
- 9 encontros de implementação;
- 3 de acompanhamento;
- total de 12;
- presencial, online ou híbrido;
- aulas e entregas conforme participantes.

### PMR Plus

Continuação do PMR. Elegível quando participante do PMR, PMR concluído ou liberado pela Administração MX.

Preservar encontros, aulas, ações, evidências, implantações, resultados, documentos e histórico. Mostrar `Continuação do PMR`. Não reiniciar progresso nem exigir aulas concluídas novamente.

### PPA

Pilares:

- Modelo de Negócio;
- Planejamento Estratégico;
- Maximização de Receita;
- Eficiência em Custo.

Conteúdo estratégico completo permitido para Dono, Sócio autorizado, Consultor e perfis internos MX autorizados.

Gerentes e colaboradores não recebem automaticamente vídeos, aulas, análises, relatórios, decisões ou encontro completo.

Ações podem ser delegadas. O delegado vê apenas ação, orientação operacional, prazo, responsável, evidência esperada e contexto mínimo. Delegação nunca libera o conteúdo integral do PPA.

## 9.9 Persistência

Reutilizar primeiro:

- `clientes_consultoria`;
- `unidades_cliente_consultoria`;
- `contatos_cliente_consultoria`;
- `atribuicoes_consultoria`;
- `modulos_cliente_consultoria`;
- `visitas_consultoria`;
- `evidencias_visita`;
- `universidade_aulas` ou entidade equivalente;
- `aula_presencas`;
- `aula_provas`;
- `eventos_agenda_consultoria`;
- `financeiro_consultoria`;
- `solicitacoes_consultoria`;
- entidades de Drive e artefatos existentes.

Antes de criar estrutura nova:

1. verificar coluna ou JSONB existente;
2. verificar entidade equivalente;
3. estender o domínio atual;
4. criar migration mínima apenas quando necessário;
5. adicionar RLS, índice, auditoria e tipos.

Estruturas ausentes podem representar progresso de aula, entrega do encontro, itens de entrega, solicitação de antecipação e materiais. Não criar tabelas em inglês duplicando entidades portuguesas existentes.

Supabase é a fonte de verdade em produção. Fixtures locais são permitidas apenas em desenvolvimento e testes.

# 10. Painel Geral e evolução em tempo real

O Painel Geral deve navegar para loja, vendedor, gerente, dono, fechamento diário, Plano Estratégico, Plano de Ação, Consultoria e rotina.

Indicadores mínimos, quando houver fonte real:

- vendedores, gerentes e lojas ativos;
- fechamento realizado e pendente;
- vendas, leads, agendamentos, visitas e conversão;
- meta e projeção;
- ações atrasadas, bloqueadas e aguardando validação;
- progresso estratégico;
- visitas de consultoria;
- risco por loja e responsável.

Evolução:

- vendedor: snapshots, fechamento, carteira, vendas e conversão;
- gerente: snapshots, equipe, ações e indicadores;
- dono: estratégia, ações, consultoria e resultados da unidade;
- loja: agregação rastreável dos papéis e módulos.

Não criar score de Dono sem fonte e fórmula explicável.

Fontes:

- `seller_routine_snapshots`;
- `manager_routine_snapshots`;
- `planos_acao`;
- `regras_metas_loja`;
- `valores_indicadores_planejamento`;
- `clientes_consultoria`;
- `visitas_consultoria`;
- fontes do Network Dashboard.

Todo número agregado deve informar universo e permitir abrir a origem.

# 11. Auditoria, erros e acessibilidade

Exclusões comuns usam modal, impacto, confirmação, ator, data e atualização sem reload.

Exclusões irreversíveis exigem texto exato, RPC ou Edge Function, preservação de identificadores, invalidação das consultas e log seguro.

Histórico registra criação, edição, responsável, prazo, estado, aprovação, bloqueio, validação, devolução, cancelamento, reabertura, comentário, evidência, impacto, antecipação e progresso de aula.

Todas as telas possuem loading estável, vazio contextual, erro parcial, tentar novamente, sem loja, sem permissão e estado de reconexão quando necessário.

Acessibilidade:

- teclado e foco visível;
- modal com foco controlado;
- alternativa ao drag and drop;
- status com texto e cor;
- labels associados;
- controles de vídeo acessíveis;
- tabelas semânticas;
- áreas clicáveis adequadas;
- movimento reduzido.

# 12. Responsividade

Desktop:

- alta densidade sem sobreposição;
- tabela e gráfico conforme proporções;
- Kanban com rolagem interna;
- modal de Consultoria central e amplo.

Tablet:

- filtros recolhíveis;
- grids adaptáveis;
- tabela e gráfico podem empilhar;
- Kanban interno;
- modal até 90% da viewport.

Mobile:

- uma coluna;
- filtros em drawer;
- drawers e modal de encontro em tela cheia;
- Foco inicial em Ações;
- Agenda inicial no Calendário;
- tabela e Kanban com rolagem interna;
- nenhuma rolagem horizontal da página;
- nenhuma ação dependente de hover.

# 13. Fases

1. Infraestrutura compartilhada: contexto, políticas, adaptadores, Realtime e testes.
2. Plano Estratégico: extração, 45 indicadores, layout final, metas, gráfico, tabela, exportação e ação.
3. Plano de Ação: Ações e Calendário, cinco cards, Foco e preservação de Kanban, Lista, drawer e calendário.
4. Consultoria: modal central, três abas, vídeo, Entrega, Evidências, Meet, antecipação, PMR, PMR Plus e PPA.
5. Painel Geral: drill-down, indicadores e rastreabilidade.
6. Validação integrada: papéis, RLS, typecheck, lint, build, preview, logs e responsividade.

# 14. Testes obrigatórios

## 14.1 Plano Estratégico

- 45 indicadores;
- Resumo e Visão Geral;
- Ambos inicial no desktop;
- Tabela e Gráfico isolados;
- preferência persistida;
- proporção 58/42 e mesma altura;
- mês selecionado;
- meses futuros sem zero;
- Editar Metas e histórico;
- Criar Plano de Ação sem duplicidade;
- Exportar;
- mobile sem Ambos.

## 14.2 Plano de Ação

- somente Ações e Calendário;
- Ações inicial;
- Foco inicial;
- cinco cards na ordem;
- contagens por dados reais;
- card aplica e remove filtro;
- atraso não vira status;
- cinco seções do Foco;
- iniciar, concluir, reabrir e criar atualizam contagens;
- Kanban, Lista e Calendário preservados;
- Calendário sem cards duplicados;
- alteração de prazo sincronizada;
- nenhuma duplicação.

## 14.3 Consultoria

- aula parcial retoma do ponto salvo;
- percentual persiste ao pausar, trocar aba, fechar modal, sair e terminar;
- 90% efetivo conclui aula;
- avançar ao final não conclui;
- aula concluída atualiza Entrega, mas não conclui encontro;
- Entrega conclui, persiste e reabre item;
- Evidência envia, substitui, reenvia e mostra devolutiva;
- antecipação bloqueada lista pendências;
- antecipação disponível após requisitos;
- solicitação persiste, atualiza Próximo passo e pode ser cancelada;
- Google Meet usa link real;
- Gerente delegado no PPA vê ação, não conteúdo estratégico;
- PMR Plus preserva histórico, aulas, ações e evidências.

## 14.4 Integração e E2E

- RLS para três perfis internos;
- negação para papéis fora do escopo;
- RPCs e Realtime;
- migrations documentadas;
- tipos gerados;
- Consultoria sincronizada com Plano de Ação;
- indicador sincronizado com Plano de Ação;
- nenhuma tabela paralela;
- login, seleção de loja e navegação;
- persistência após refresh;
- 1440, 1024, 768 e 390 px;
- console sem erro bloqueante;
- sem rolagem horizontal global;
- sem regressão em Dono, Gerente e Vendedor.

Gates:

- typecheck;
- lint;
- unitários;
- integração;
- E2E;
- build;
- migrations verificadas;
- preview Vercel READY;
- ausência de runtime errors relevantes.

# 15. Critérios de aceite finais

A implementação só estará concluída quando:

1. os três perfis internos tiverem paridade global;
2. Plano Estratégico usar o workspace completo;
3. os 45 indicadores forem preservados;
4. Ambos, Tabela e Gráfico funcionarem conforme definido;
5. Plano de Ação possuir somente Ações e Calendário;
6. cinco cards forem calculados e filtrarem;
7. Foco, Kanban e Lista funcionarem;
8. Calendário não repetir os cards;
9. ciclo completo da ação funcionar;
10. Consultoria usar Próximo passo;
11. Assistir aula abrir a aula real;
12. encontro abrir em modal central;
13. existirem Aula e Visão Geral, Entrega e Evidências;
14. não existir aba Ações na Consultoria;
15. vídeo salvar e retomar progresso;
16. avançar ao final não concluir;
17. 90% efetivo concluir a aula;
18. aula não concluir encontro;
19. Arquivos aparecerem abaixo do vídeo;
20. Entrega e Evidências aceitarem uploads;
21. Google Meet usar link real;
22. antecipação respeitar pré-requisitos;
23. PMR Plus preservar PMR;
24. PPA proteger conteúdo estratégico;
25. ação delegada do PPA não liberar encontro;
26. Painel Geral possuir drill-down rastreável;
27. Realtime não causar rajadas;
28. RLS impedir acesso indevido;
29. operações críticas possuírem auditoria;
30. telas funcionarem nos breakpoints;
31. nenhum botão ficar sem comportamento;
32. nenhuma credencial entrar no repositório;
33. tema global permanecer fora deste PR;
34. nenhuma fonte paralela ou duplicação existir;
35. não houver regressão nas demais páginas.

# 16. Rollout e relatório

Rollout:

1. branch funcional isolada;
2. commits por fase;
3. PR funcional;
4. CI e preview;
5. validação de RLS e dados;
6. correções;
7. merge revisado;
8. validação de produção;
9. PR separado do tema global.

O relatório final informa rotas, componentes, wrappers, repositórios, migrations, RLS, RPCs, Realtime, testes, preview, limitações, vídeos, materiais, medição de progresso, Plano de Ação, antecipação, PMR, PMR Plus, PPA, confirmação de que aula não conclui encontro, ausência de credenciais e ausência do tema global.

## 17. Decisão final

Não será feita duplicação de páginas nem reescrita total. A implementação aproveitará o que já funciona, eliminará versões simplificadas redundantes e adicionará somente os contratos necessários para administração global, observabilidade e execução em tempo real.
