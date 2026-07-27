# Design técnico: superfícies funcionais compartilhadas do módulo interno MX

**Data:** 27 de julho de 2026  
**Projeto:** MX Gestão Preditiva  
**Escopo desta especificação:** PR funcional anterior ao PR de tema global  
**Perfis abrangidos:** `administrador_geral`, `administrador_mx`, `consultor_mx`

## 1. Contexto

O contrato global de autorização dos três perfis internos já foi equalizado. Administrador Geral, Administrador MX e Consultor MX possuem acesso global a lojas, usuários, equipes, planejamento, consultoria e superfícies operacionais autorizadas.

A lacuna atual não é a permissão básica. A lacuna está na experiência funcional e na cobertura das telas internas:

- o módulo do Dono possui Plano Estratégico e Plano de Ação mais completos;
- o módulo interno mantém implementações reduzidas e paralelas;
- a página interna de Consultoria funciona principalmente como entrada para a carteira global, sem reunir toda a jornada consultiva no contexto da loja selecionada;
- o Painel Geral já possui dados e Realtime, mas ainda precisa conectar melhor indicadores, responsáveis, lojas e ações executáveis;
- manter versões independentes por perfil aumenta divergência, retrabalho e risco de regressão.

Esta especificação define a convergência funcional dessas superfícies, preservando uma única fonte de dados no Supabase e um contrato comum de componentes por loja e papel.

## 2. Decisões aprovadas

1. Funcionalidades serão implementadas antes do tema global.
2. O tema visual institucional `#198653` será tratado em PR separado.
3. Os três perfis internos terão a mesma capacidade funcional global.
4. O módulo interno reutilizará superfícies, repositórios e regras já existentes no módulo do Dono sempre que forem compatíveis.
5. Não serão criadas coleções duplicadas para Plano Estratégico, Plano de Ação ou Consultoria.
6. O trecho mais recente de cada especificação fornecida prevalece quando houver conflito explícito com uma instrução anterior.
7. O frontend não será considerado fronteira de segurança. RLS, RPCs transacionais e validação server-side continuarão obrigatórios.

## 3. Objetivos

### 3.1 Objetivo principal

Transformar o módulo interno MX em um ambiente global de gestão, acompanhamento e intervenção, permitindo que qualquer um dos três perfis internos:

- visualize todas as lojas autorizadas;
- acompanhe evolução de vendedores, gerentes, donos e lojas;
- crie, edite, exclua, restaure, delegue, aprove e valide registros compatíveis com seu domínio;
- navegue entre visão de rede, loja, pessoa, planejamento e consultoria sem perder contexto;
- veja alterações críticas refletidas em tempo real;
- execute ações com histórico e auditoria.

### 3.2 Resultados esperados

- uma única experiência funcional compartilhada entre Dono e perfis internos, adaptada ao contexto de autorização;
- menos componentes paralelos com capacidades diferentes;
- consistência entre Plano Estratégico e Plano de Ação;
- Consultoria contextualizada por cliente, loja, programa e encontro;
- drill-down do Painel Geral para loja, gerente, vendedor, plano e consultoria;
- estados de carregamento, vazio, erro e sem permissão consistentes;
- nenhuma regressão nas rotas do Vendedor, Gerente ou Dono.

## 4. Não objetivos deste PR

Este PR não deve:

- aplicar o novo tema global `#198653`;
- redesenhar visualmente todas as páginas do aplicativo;
- substituir os tokens globais de cor;
- alterar regras comerciais sem necessidade funcional comprovada;
- recriar integrações externas;
- introduzir uma segunda fonte de dados fictícios;
- mover rotas existentes sem compatibilidade ou redirecionamento;
- eliminar a experiência específica do Dono quando ela tiver informações exclusivas de governança;
- criar automações externas de e-mail, WhatsApp ou Google Calendar que não existam no contrato atual;
- semear dados demonstrativos em produção para simular cobertura.

## 5. Princípios arquiteturais

### 5.1 Fonte única

Cada domínio terá um repositório canônico:

- Plano Estratégico: `strategicPlanRepository` e tabelas de planejamento;
- Plano de Ação: `actionPlanLiveRepository` e tabelas relacionadas;
- Consultoria: repositórios e hooks existentes do domínio de consultoria;
- evolução operacional: snapshots e consultas do Network Dashboard.

As superfícies internas não devem manter cópias locais independentes dos registros reais.

### 5.2 Componentes compartilhados, shells diferentes

A experiência será dividida em:

- **shell de contexto**, responsável por perfil, loja, unidade, navegação, atualização e permissões;
- **workspace funcional**, responsável pelo domínio da tela;
- **adaptador de dados**, responsável por fornecer a loja e o ator corretos aos repositórios existentes;
- **política de ações**, responsável por mostrar ou ocultar operações com base em capacidade e estado do registro.

O Dono poderá continuar usando `OwnerLayout`, enquanto o módulo interno continuará usando `MxSidebarShell`. O conteúdo funcional deverá ser compartilhado sempre que possível.

### 5.3 Ausência de `any` em novos contratos

Novos adaptadores, hooks e payloads devem possuir tipos explícitos. Conversões temporárias de componentes legados devem ficar isoladas em um adaptador documentado, sem espalhar `as any` por páginas e repositórios.

### 5.4 Operações atômicas

Operações que alteram múltiplas tabelas ou Auth + banco devem continuar usando RPCs transacionais ou Edge Functions com compensação. Nenhuma operação deve deixar vínculo, usuário, histórico ou registro principal parcialmente atualizado.

## 6. Contexto interno compartilhado

Será criado um contexto ou hook de workspace interno, com responsabilidade única de resolver:

- `activeStoreId` e loja selecionada;
- lista de lojas ativas autorizadas;
- empresa, unidade e cliente de consultoria relacionados;
- ator autenticado;
- papel interno atual;
- capacidades do papel;
- estado de carregamento e erro;
- persistência do `storeId` na query string;
- função de atualização manual;
- inscrição Realtime consolidada;
- navegação contextual para loja, pessoa e módulo.

### 6.1 Requisitos da seleção de loja

- deve aceitar `?storeId=<uuid>`;
- deve preservar a seleção ao trocar entre Plano Estratégico, Plano de Ação e Consultoria;
- deve atualizar `activeStoreId` do contexto de autenticação;
- não deve selecionar loja inativa automaticamente;
- deve apresentar estado claro quando nenhuma loja estiver selecionada;
- deve impedir consultas globais acidentais quando o domínio exigir loja específica.

### 6.2 Realtime

O hook Realtime deve:

- compartilhar um canal por workspace, evitando múltiplas inscrições redundantes;
- aplicar debounce ou single-flight para rajadas de eventos;
- reagir apenas às tabelas necessárias ao módulo aberto;
- exibir estado de conexão quando relevante;
- realizar uma recarga final após reconexão;
- remover canais no unmount.

## 7. Contrato de autorização

### 7.1 Paridade interna

`administrador_geral`, `administrador_mx` e `consultor_mx` terão o mesmo conjunto de capacidades funcionais neste escopo:

- visualizar todas as lojas autorizadas;
- criar e editar registros globais;
- excluir registros quando a regra do domínio permitir;
- aprovar, delegar, bloquear, desbloquear, validar, devolver e reabrir ações;
- editar metas persistidas;
- administrar dados consultivos;
- visualizar evolução operacional e estratégica.

### 7.2 Proteções obrigatórias

- exclusão irreversível exige confirmação nominal ou textual;
- ações críticas devem registrar ator, data e contexto;
- nenhuma resposta de erro ao cliente deve expor detalhe sensível do banco;
- registros de auditoria não devem ser apagados por cascata;
- ações indisponíveis por estado não devem aparecer na interface;
- chamadas diretas ao Supabase devem respeitar RLS e políticas existentes.

## 8. Plano Estratégico compartilhado

### 8.1 Direção de implementação

A página `InternalStrategicPlanPage` será substituída por um workspace compartilhado derivado da experiência completa do Dono. A implementação não deve copiar o arquivo do Dono. Deve extrair a lógica de tela para um componente parametrizado por contexto.

### 8.2 Funcionalidades obrigatórias

- abas `Resumo` e `Visão Geral`;
- seleção de indicador;
- filtro por área;
- catálogo completo persistido;
- meta, realizado e ano anterior;
- visualização em tabela, gráfico ou ambas quando suportado;
- leitura do indicador;
- direcionamento recomendado;
- edição de metas permitidas;
- histórico de metas;
- exportação;
- criação de Plano de Ação vinculada ao indicador;
- abertura da ação existente quando já houver vínculo;
- persistência de aba, indicador e modo de exibição;
- atualização Realtime.

### 8.3 Dados canônicos

- `catalogo_indicadores_planejamento`;
- `valores_indicadores_planejamento`;
- `regras_metas_loja`;
- `planos_acao`;
- tabelas operacionais usadas para indicadores derivados.

### 8.4 Regras de vínculo com Plano de Ação

Ao criar uma ação a partir de um indicador:

- preencher loja, objetivo, indicador, origem e contexto;
- solicitar apenas informações ainda ausentes;
- criar o registro no repositório canônico;
- impedir duplicidade automática para o mesmo vínculo;
- alterar o CTA para abrir a ação existente;
- refletir a criação imediatamente no Plano de Ação.

### 8.5 Estados

- carregamento com skeleton mantendo dimensões;
- erro com mensagem e `Tentar novamente`;
- sem loja selecionada;
- indicador sem dados;
- indicador derivado não editável;
- ausência de meta;
- ausência de ação vinculada.

## 9. Plano de Ação compartilhado

### 9.1 Direção de implementação

A página `InternalActionPlanPage` deixará de manter uma tabela simplificada e um calendário linear. O módulo interno usará o mesmo workspace funcional do Dono, parametrizado por loja, ator e capacidades.

### 9.2 Modos obrigatórios

- Foco executivo;
- Kanban;
- Lista;
- Calendário;
- filtros compartilhados;
- preferências persistidas.

### 9.3 Ciclo completo da ação

Operações obrigatórias:

- criar;
- editar;
- excluir definitivamente quando permitido;
- aprovar;
- delegar;
- iniciar;
- atualizar progresso;
- bloquear;
- desbloquear;
- enviar para validação;
- aprovar conclusão;
- devolver para execução;
- reabrir;
- cancelar;
- duplicar;
- comentar;
- adicionar, editar e concluir checklist;
- adicionar e remover evidências;
- alterar prazo;
- medir impacto;
- exportar.

### 9.4 Transições

As transições devem utilizar uma matriz única de regras. O drag and drop e o menu `Mover para` devem chamar a mesma função de domínio.

Regras mínimas:

- decisão do Dono não muda de estado sem aprovação;
- início registra ator e data;
- bloqueio exige motivo e responsável pela resolução;
- envio para validação exige progresso e requisitos obrigatórios;
- validação registra validador e conclusão;
- devolução exige justificativa;
- concluída só muda por reabertura;
- cancelada não entra no progresso ativo;
- atraso continua sendo condição calculada, não status principal.

### 9.5 Drawer compartilhado

O drawer deve manter as áreas:

- Resumo;
- Execução;
- Evidências;
- Histórico e Impacto.

Ele deve preservar a tela ao fundo, filtros, modo, coluna e posição de rolagem.

### 9.6 Dados canônicos

- `planos_acao`;
- `historico_planos_acao`;
- `evidencias_planos_acao`;
- checklist e comentários persistidos no contrato atual;
- dados de usuários e lojas para responsáveis e participantes.

### 9.7 Compatibilidade com Dono, Gerente e Vendedor

A extração não pode aumentar permissões de Gerente ou Vendedor. O workspace deve receber uma política de ações:

- perfis internos: administração completa;
- Dono: governança e validação da própria unidade;
- Gerente: ações permitidas no próprio escopo;
- Vendedor: ações individuais e operações autorizadas.

## 10. Consultoria compartilhada

### 10.1 Direção de implementação

A página interna de Consultoria será um workspace de administração global por cliente e loja. Ela não será apenas um resumo com link para outra rota.

A implementação final deve respeitar as últimas instruções consolidadas:

- abrir detalhes do encontro em modal central;
- unir Aula e Visão Geral em uma única aba;
- usar `Entrega`, não `Preparação`;
- manter `Progresso`;
- remover a aba redundante `Ações` quando o conteúdo estiver em Entrega;
- manter a coluna de contexto visível no modal;
- não simular automações externas inexistentes.

### 10.2 Estrutura do workspace

- seletor de cliente e loja;
- programa contratado;
- progresso da jornada;
- encontros realizados e previstos;
- próximo encontro;
- histórico de encontros;
- indicadores e evidências;
- situação financeira quando autorizada;
- solicitações e suporte;
- administração de módulos habilitados.

### 10.3 Modal do encontro

Abas finais:

1. `Aula e Visão Geral`;
2. `Entrega`;
3. `Progresso`.

#### Aula e Visão Geral

- objetivo do encontro;
- conteúdo;
- vídeo ou material;
- participantes;
- presença;
- prova e resultado;
- observações;
- resumo executivo.

#### Entrega

- checklist do encontro;
- evidências;
- materiais;
- itens entregues;
- pendências;
- próximos passos;
- vínculo com Plano de Ação quando aplicável.

#### Progresso

- evolução do programa;
- encontros concluídos;
- indicadores relacionados;
- comparação de resultados;
- riscos;
- impacto observado;
- recomendações.

### 10.4 Dados canônicos

A implementação deve reutilizar, conforme o contrato atual:

- `clientes_consultoria`;
- `unidades_cliente_consultoria`;
- `contatos_cliente_consultoria`;
- `atribuicoes_consultoria`;
- `modulos_cliente_consultoria`;
- `visitas_consultoria`;
- `evidencias_visita`;
- `aulas_ao_vivo`;
- `aula_presencas`;
- `aula_provas`;
- `eventos_agenda_consultoria`;
- `financeiro_consultoria`;
- `solicitacoes_consultoria`;
- tabelas de Drive e artefatos quando utilizadas pela tela.

### 10.5 Campos sem estrutura persistente

Quando uma informação solicitada não possuir coluna ou entidade compatível:

1. verificar se já existe campo JSONB apropriado;
2. preferir extensão compatível do domínio atual;
3. criar migration somente quando necessário;
4. adicionar RLS, índice, auditoria e tipos gerados;
5. não guardar dados críticos apenas em estado local ou localStorage.

## 11. Painel Geral e evolução em tempo real

### 11.1 Papel do Painel Geral

O Painel Geral será o ponto de entrada para leitura da rede. Ele não substituirá as páginas especializadas.

Deve permitir navegar para:

- loja;
- gerente;
- vendedor;
- dono ou responsáveis da unidade;
- Plano Estratégico;
- Plano de Ação;
- Consultoria;
- fechamento diário;
- rotina e indicadores operacionais.

### 11.2 Indicadores mínimos

Quando disponíveis no banco:

- vendedores ativos;
- gerentes ativos;
- lojas ativas;
- fechamento realizado e pendente;
- vendas;
- leads;
- agendamentos;
- visitas;
- conversões;
- meta e projeção;
- ações atrasadas;
- ações bloqueadas;
- ações aguardando validação;
- progresso estratégico;
- visitas de consultoria;
- risco por loja e responsável.

### 11.3 Fontes

- `seller_routine_snapshots`;
- `manager_routine_snapshots`;
- `planos_acao`;
- `regras_metas_loja`;
- `valores_indicadores_planejamento`;
- `clientes_consultoria`;
- `visitas_consultoria`;
- fontes operacionais existentes do Network Dashboard.

### 11.4 Drill-down

Todo indicador agregado deve informar seu universo e permitir abrir a origem correspondente. Não serão criados scores sem explicação ou números sem origem rastreável.

## 12. Exclusão, restauração e auditoria

### 12.1 Exclusões comuns

- usar modal controlado;
- informar impacto;
- exigir confirmação;
- registrar ator e data;
- atualizar a tela sem reload completo.

### 12.2 Exclusões irreversíveis

- exigir texto exato, nome, código ou e-mail;
- chamar RPC ou Edge Function autorizada;
- preservar identificadores nos registros de auditoria;
- invalidar caches e recarregar dados afetados;
- produzir mensagem genérica ao cliente e log estruturado no servidor.

### 12.3 Histórico

Históricos devem registrar:

- criação;
- edição;
- mudança de responsável;
- mudança de prazo;
- mudança de estado;
- aprovação;
- bloqueio e desbloqueio;
- validação e devolução;
- cancelamento e reabertura;
- evidência;
- comentário;
- impacto.

## 13. Erros e resiliência

- consultas independentes não devem derrubar a página inteira;
- erro em uma loja não deve ocultar todas as demais;
- mutações devem bloquear cliques repetidos;
- respostas devem ser idempotentes quando o domínio já possuir chave de idempotência;
- Realtime não deve disparar recargas paralelas ilimitadas;
- erros de validação devem aparecer próximos ao campo;
- erros de permissão devem usar mensagem clara sem revelar registros;
- falhas de rede devem permitir nova tentativa.

## 14. Acessibilidade

- navegação por teclado;
- foco visível;
- modais e drawers com controle de foco;
- alternativa ao drag and drop;
- status com texto e cor;
- labels e descrições associadas;
- botões com verbos claros;
- tabelas com cabeçalhos semânticos;
- áreas clicáveis adequadas;
- respeito a movimento reduzido.

## 15. Responsividade

### Desktop

- alta densidade sem sobreposição;
- filtros e ações principais visíveis;
- drawers largos;
- Kanban com rolagem interna;
- tabelas com colunas fixas quando necessário.

### Tablet

- grids em duas colunas quando houver espaço;
- filtros recolhíveis;
- drawers com até 70% da largura;
- Kanban horizontal interno.

### Mobile

- conteúdo em uma coluna;
- drawers e modais em tela cheia;
- filtros em drawer;
- menus de ações em vez de depender de hover;
- `Mover para` como alternativa principal ao drag and drop;
- nenhuma rolagem horizontal na página, exceto tabelas e Kanban internos.

## 16. Estratégia de implementação

### Fase 1. Infraestrutura compartilhada

- contexto de loja e ator;
- adaptadores tipados;
- política de capacidades;
- Realtime consolidado;
- testes do contexto.

### Fase 2. Plano Estratégico

- extração do workspace completo;
- montagem no Dono e no módulo interno;
- vínculo com Plano de Ação;
- testes de metas, filtros e exportação.

### Fase 3. Plano de Ação

- extração do workspace completo;
- política por papel;
- montagem no Dono e no módulo interno;
- testes de transições, persistência e calendário.

### Fase 4. Consultoria

- workspace por cliente e loja;
- modal central de encontro;
- abas finais;
- CRUD e evidências;
- testes do programa e encontros.

### Fase 5. Painel Geral

- links de drill-down;
- indicadores faltantes;
- reconciliação Realtime;
- testes de navegação e atualização.

### Fase 6. Validação integrada

- testes por perfil;
- build e typecheck;
- preview da Vercel;
- validação do Supabase;
- runtime logs;
- auditoria responsiva.

## 17. Estratégia de testes

### 17.1 Unitários

- políticas de capacidade;
- filtros e agregações;
- matriz de transição;
- cálculo de atraso e progresso;
- adaptadores de dados;
- normalização de papéis e estados.

### 17.2 Integração

- carregamento por loja;
- criação de ação a partir de indicador;
- persistência de meta;
- aprovação e validação de ação;
- evidências e histórico;
- edição consultiva;
- atualização após evento Realtime.

### 17.3 Contrato de banco

- RLS para os três perfis internos;
- acesso negado para papéis fora do escopo;
- RPCs transacionais;
- grants de funções críticas;
- presença das tabelas no Realtime quando necessária;
- migrações reversíveis ou documentadas;
- tipos gerados sincronizados.

### 17.4 E2E e visual

- login de perfil interno autorizado;
- seleção de loja;
- navegação entre os três módulos;
- ações principais;
- persistência após refresh;
- 1440 px, 1024 px, 768 px e 390 px;
- ausência de erro no console;
- ausência de rolagem horizontal global indevida.

### 17.5 Gates obrigatórios

- typecheck;
- lint;
- testes unitários;
- testes de integração;
- build de produção;
- verificações de migrations;
- preview Vercel em estado READY;
- ausência de runtime errors relevantes.

## 18. Rollout

1. criar branch funcional isolada;
2. implementar fases em commits pequenos;
3. abrir PR funcional;
4. executar CI e preview;
5. validar dados e RLS no Supabase;
6. corrigir todas as regressões críticas;
7. realizar squash merge;
8. validar produção;
9. somente depois abrir PR separado de tema global.

Não haverá alteração direta na `main` nem deploy manual de código não revisado.

## 19. Critérios de aceite

A implementação funcional será considerada concluída quando:

1. os três perfis internos apresentarem as mesmas capacidades globais previstas;
2. Plano Estratégico interno oferecer a experiência completa compartilhada;
3. Plano de Ação interno oferecer foco, Kanban, lista, calendário e ciclo completo;
4. Consultoria interna permitir administrar cliente, programa, encontros, entregas e progresso;
5. alterações refletirem na mesma fonte de dados usada pelo Dono;
6. nenhuma coleção paralela for criada;
7. o Painel Geral permitir drill-down para as superfícies relacionadas;
8. Realtime atualizar dados sem rajadas de recarga concorrente;
9. operações críticas possuírem confirmação e auditoria;
10. RLS impedir acesso indevido;
11. telas funcionarem nos quatro breakpoints definidos;
12. não houver botões sem comportamento;
13. não houver erros de console bloqueantes;
14. CI, build e preview estiverem aprovados;
15. nenhuma regra ou tela fora do escopo tiver regressão;
16. o tema global permanecer fora deste PR.

## 20. Evidências exigidas no relatório final

O relatório do PR funcional deverá informar:

- rotas atualizadas;
- componentes extraídos e compartilhados;
- páginas removidas ou reduzidas a wrappers;
- repositórios reutilizados;
- migrations criadas;
- políticas RLS e RPCs alteradas;
- tabelas inscritas no Realtime;
- testes executados e resultados;
- preview validado;
- limitações reais encontradas;
- confirmação de que o tema global não foi aplicado;
- confirmação de que nenhuma credencial foi gravada no código, documentação ou logs.

## 21. Riscos e mitigação

### Divergência entre Dono e módulo interno

**Mitigação:** workspace compartilhado e políticas por papel.

### Componentes legados sem tipagem

**Mitigação:** adaptadores tipados e extração gradual, sem reescrever o domínio inteiro.

### Consultoria com dados distribuídos

**Mitigação:** camada de consulta por cliente/loja, testes de contrato e migrations somente quando necessárias.

### Rajadas de Realtime

**Mitigação:** single-flight, debounce e recarga final após eventos agrupados.

### Excesso de escopo em um único PR

**Mitigação:** commits por fase, testes por domínio e possibilidade de dividir o PR funcional em PRs encadeados sem mudar esta arquitetura.

### Regressão visual durante extração

**Mitigação:** preservar os estilos atuais neste PR e executar testes visuais autenticados. O novo tema será aplicado apenas depois.

## 22. Decisão final de arquitetura

A solução aprovada é **workspace funcional compartilhado com shells por perfil**, apoiado por repositórios canônicos e política explícita de capacidades.

Não será usada a alternativa de duplicar as páginas completas no módulo interno. Também não será feita uma reescrita total do aplicativo. A implementação aproveitará o que já funciona, eliminará versões simplificadas redundantes e ampliará apenas os contratos necessários para administração global, observabilidade e execução em tempo real.
