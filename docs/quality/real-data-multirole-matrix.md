# Matriz de runtime com dados reais — multi-role

Versão: 1.1.0
Atualizada em: 2026-07-26
Story: `OPS-20260721`

Esta matriz inventaria as rotas protegidas ativas de `src/App.tsx` e `src/lib/auth/routeAccess.ts`. “Vazio” significa estado vazio verdadeiro: nenhuma fixture, número substituto, identidade sintética ou gravação apenas em memória/localStorage pode ocupar o lugar da fonte oficial.

## Perfis e escopo

| Perfil canônico | Experiência | Escopo obrigatório |
| --- | --- | --- |
| `vendedor` | Operação individual | `auth.uid()`, vínculo vendedor ativo e loja vinculada |
| `gerente` | Gestão da loja | vínculos ativos do gerente, `store_id` selecionado |
| `dono` | Gestão executiva | conjunto de lojas vinculadas ao dono; cockpit opera uma loja real por vez |
| `administrador_geral` | Administração MX Master | políticas/RPCs internas e seleção explícita de loja/cliente |
| `administrador_mx` | Admin MX | políticas/RPCs internas e seleção explícita de loja/cliente |
| `consultor_mx` | Consultoria MX | clientes/lojas autorizados e políticas específicas de consultoria |

## Vendedor

| Rotas ativas e aliases | Módulo | Leitura oficial | Escrita oficial | Evidência |
| --- | --- | --- | --- | --- |
| `/home`, `/meu-dia`, `/minha-remuneracao` | Home e remuneração | `lancamentos_diarios`, `metas`, `regras_metas_loja`, `oportunidades`, `vendedor_perfil`, `remuneracao_planos`, `remuneracao_regras`, ranking oficial | nenhuma na home; rotinas por módulos de origem | `useVendedorHomePage`, `useMinhaRemuneracaoDashboard`, contrato anti-ficção |
| `/terminal-mx`, `/vendedor/terminal-mx`, `/lancamento-diario`, `/fechamento-diario` | Terminal/fechamento | fechamento ativo, clientes, oportunidades, agendamentos e eventos da sessão | RPC `submit_checkin`, RPCs de carteira/regularização e tabelas canônicas de fechamento | testes `src/features/checkin/**`, gates globais |
| `/carteira-clientes`, `/carteira`, `/vendedor/carteira`, `/mentor-comercial`, `/vendedor/mentor-comercial` | Carteira e plano de ataque | `clientes`, `oportunidades`, `agendamentos`, `eventos_comerciais`, `carteira_missoes`, `veiculos_estoque` | RPC `carteira_salvar_cliente_v2`, RPCs `carteira_*`, eventos/estoque com idempotência | `carteira-adapter-contract`, `real-data-runtime-contract` |
| `/meu-funil`, `/funil`, `/funil-comercial`, `/minha-meta`, aliases `/vendedor/*` | Funil e meta | `clientes`, `oportunidades`, `eventos_comerciais`, metas e performance oficial | alterações de etapa/cliente por contratos CRM | testes de CRM/funil e gates globais |
| `/central-execucao`, `/central-de-execucao`, `/rotina-do-dia`, `/vendedor/rotina-do-dia` | Execução diária | `execution_actions`, `routine_activity_templates`, `prospecting_schedule`, `story_ideas`, CRM | mutations/RPCs de `execution_actions`, agendamentos e CRM | testes `src/features/central-execucao/**` |
| `/plano-acao` | Plano de Ação compartilhado | `public.planos_acao` nos escopos autorizados; vendedor consulta apenas `scope_type=individual` e `auth.uid()` | vendedor atualiza apenas a própria ação; demais perfis usam RPCs por escopo | smoke multi-role, `useCentralMxPlanosAcaoSegmentado` |
| `/relatorios-vendedor`, `/relatorios` | Relatórios | performance oficial, lançamentos, CRM e metas do vendedor | sem escrita de negócio | gates globais |
| `/universidade-mx`, aliases `/vendedor/treinamentos` | Treinamentos | `treinamentos`, `progresso_treinamentos`, perfil/competências reais | progresso oficial de treinamento | `useVendedorTreinamentos.test.ts` |
| `/desenvolvimento`, `/devolutivas`, `/feedback*`, `/pdi` | Desenvolvimento, feedback e PDI | `pdis`, `devolutivas`, catálogos oficiais | RPCs/tabelas de PDI, devolutivas e comentários autorizados | testes de PDI/devolutivas e matriz RLS |
| `/perfil`, `/meu-perfil*`, `/vendedor/perfil`, `/configuracoes`, `/vendedor/configuracoes` | Perfil e preferências | `usuarios`, `vendedor_perfil`, lojas, jornadas e planos vinculados | atualização restrita de perfil/jornada; preferências permitidas | `perfil-mapper.test.ts`, gates globais |
| `/ajuda`, `/consultor-ia` | Ajuda e Central MX | conteúdo de produto e contexto persistido autorizado | solicitações/conversas pelos contratos do módulo | gates globais |

## Gerente

| Rotas ativas e aliases | Módulo | Leitura oficial | Escrita oficial | Evidência |
| --- | --- | --- | --- | --- |
| `/home`, `/lojas/:storeSlug/*`, `/minha-equipe`, `/meta-loja` | Cockpit/Loja MX | `lojas`, `vinculos_loja`, `vendedores_loja`, `lancamentos_diarios`, metas, CRM, DRE e performance oficial | configurações/metas apenas por contratos autorizados | `useDashboardLojaData`, testes do cockpit e browser por loja |
| `/rotina`, `/rotina-equipe` | Rotina gerencial | fechamento, equipe, ranking e `manager_routine_logs` | log/ações de rotina com `store_id` | testes `manager-day-routine` e `manager-team-routine` |
| `/fechamento-diario`, `/fechamento-diario`, `/liberacao-fechamento` | Fechamento da equipe | lançamentos, regularizações, liberações e agenda D+1 | aprovar/recusar/regularizar por RPCs e tabelas canônicas | testes `manager/daily-closing/**` |
| `/mentor`, `/feedbacks-pdis`, `/devolutivas`, `/pdi` | Mentor e desenvolvimento | equipe, `pdis`, `devolutivas`, planos de ação | contratos de feedback/PDI com escopo de loja | testes de PDI/devolutivas |
| `/funil-vendas`, `/metas`, `/ranking`, `/classificacao`, `/ranking` | Funil, metas e ranking | CRM, metas e lançamentos oficiais | metas somente por contratos autorizados | testes de funil/ranking |
| `/treinamentos`, `/universidade-mx` | Universidade da equipe | treinamentos, trilhas, progresso da equipe | gestão/progresso conforme capability | testes de treinamento |
| `/falar-consultor`, `/lojas/:storeSlug/consultor-ia` | Consultoria/Central MX | loja selecionada, solicitações e contexto oficial | solicitação persistida e ações autorizadas | contratos Central MX |
| `/plano-acao` | Plano de Ação compartilhado | `public.planos_acao` filtrado por unidade/escopo pela RLS | RPC `criar_plano_acao_v2` e `atualizar_plano_acao` conforme papel | smoke multi-role, migration de escopo de departamento |
| `/configuracoes`, `/configuracoes/remuneracao` | Configuração da loja | configurações operacionais e remuneração da loja | RPCs/tabelas canônicas, sem adapter local | testes de remuneração/configuração |

## Dono

| Rotas ativas e aliases | Módulo | Leitura oficial | Escrita oficial | Evidência |
| --- | --- | --- | --- | --- |
| `/dono` e `/dono/{rotina,decisoes,plano-estrategico,plano-acao,consultoria,departamentos/**,mercado,universidade}` | Cockpit executivo canônico | `useDashboardLojaData`: lojas vinculadas, equipe, lançamentos, metas, CRM, DRE, planos/ações e alertas derivados apenas desses fatos | refresh, configuração autorizada e solicitação real ao consultor | `owner-base44-exact-parity-contract`, `real-data-runtime-contract` |
| `/home`, `/funil-vendas`, `/metas`, `/fechamento-diario`, `/minha-equipe`, `/meta-loja` | Visões gerenciais do dono | mesmas fontes reais por loja selecionada | mesmas regras de gerente/dono | testes de cockpit/manager |
| `/organograma`, `/banco-talentos`, `/pdi`, `/devolutivas` | Pessoas e desenvolvimento | `usuarios`, vínculos/equipe, PDI e devolutivas | contratos específicos por recurso | testes de autorização e módulos |
| `/ranking`, `/classificacao`, `/treinamentos`, `/configuracoes/remuneracao` | Ranking, universidade e remuneração | tabelas oficiais dos respectivos domínios | somente mutations canônicas | gates globais |
| `/lojas`, `/lojas/:storeSlug/*` | Loja MX | loja real vinculada e seus fatos operacionais | nenhuma ampliação de escopo por rota | `routeAccess` e browser por vínculo |

## Administrador geral, Admin MX e Consultor MX

| Rotas ativas | Módulo | Leitura oficial | Escrita oficial | Escopo/evidência |
| --- | --- | --- | --- | --- |
| `/painel`, `/simulacao/**` | Painel interno e simulação | `usuarios`, `lojas`, vínculos, clientes e métricas oficiais | simulação é somente contexto de visualização; não cria identidade sintética | `routeAccess`, capabilities e smokes por perfil |
| `/lojas`, `/lojas/:storeSlug/*`, `/lojas/:storeSlug/consultor-ia` | Lojas/Loja MX | loja selecionada, equipe, metas, lançamentos, CRM, agenda, rankings e dashboards | RPCs administrativas específicas; Consultor MX não recebe permissão genérica | matriz RLS e browser por perfil |
| `/plano-acao` | Plano de Ação compartilhado | `public.planos_acao` com seleção explícita de loja e escopos internos | RPCs canônicas com auditoria e RLS | smoke multi-role, `ActionPlanWorkspace` |
| `/agenda` | Agenda interna | `agenda_eventos`, visitas e `opcoes_agenda_consultoria` | CRUD do catálogo oficial somente Admin MX/Master; agenda conforme políticas | `useAgendaOptions`, contrato anti-ficção |
| `/consultoria`, `/consultoria/clientes`, `/consultoria/clientes/:clientSlug`, `/consultoria/clientes/:clientSlug/visitas/:visitNumber` | Consultoria | `clientes_consultoria`, `modulos_cliente_consultoria`, visitas, formulários, métricas PMR, planos, ações, fechamento e DRE | contratos Supabase/Edge Functions com `client_id` explícito | testes de consultoria, schemas e RLS |
| `/produtos` | Produtos digitais | catálogo oficial de produtos/capabilities | somente perfis com capability | `routeAccess`/capabilities |
| `/configuracoes`, `/configuracoes/{remuneracao,operacional,consultoria-pmr,reprocessamento}` | Administração | configurações, remuneração, parâmetros e auditoria oficiais | RPCs/tabelas específicas; reprocessamento restrito | testes de configuração/ACL |
| `/relatorio-matinal`, `/relatorios/performance-vendas`, `/relatorios/performance-vendedor` | Relatórios | agregados oficiais, lançamentos, metas e CRM | leitura/exportação; sem números substitutos | testes de relatórios e gates globais |
| `/auditoria` | Diagnóstico/auditoria | logs e fatos persistidos | ações administrativas auditáveis | ACL e gates globais |
| `/ranking`, `/classificacao`, `/treinamentos`, `/devolutivas`, `/pdi`, `/notificacoes`, `/perfil` | Módulos compartilhados | fontes oficiais de cada domínio | capabilities e políticas por recurso | `routeAccess`, RLS e smokes multi-role |

## Loja MX — prova obrigatória

Toda rota de loja deve resolver um registro existente em `lojas`, nunca uma constante pelo nome. A prova operacional usa o `store_id` retornado pelo vínculo real e cruza, conforme disponibilidade, `vinculos_loja`, `vendedores_loja`, metas/regras, `lancamentos_diarios`, `clientes`, `oportunidades`, `agendamentos`, `eventos_comerciais`, ranking e dashboard. Ausência em qualquer domínio permanece zero/vazio e não aciona seed, fixture ou fallback local.

## Contratos automáticos

- `src/lib/real-data-runtime-contract.test.ts` percorre o grafo importável a partir de `src/App.tsx` e bloqueia mensagens, identificadores e valores fictícios conhecidos.
- `src/lib/auth/routeAccess.test.ts` e `src/lib/auth/security-matrix-contract.test.ts` preservam o mapa de acesso.
- Testes focados de carteira, fechamento, cockpit, ranking, treinamentos, PDI, remuneração e consultoria validam os adaptadores canônicos.
- Os gates finais são `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, CodeRabbit e smokes autenticados por perfil.
