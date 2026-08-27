# Matriz reproduzível de rotas, autorização e dados

- Rotas declaradas em `src/App.tsx`: **123**
- Rotas protegidas: **114**
- Rotas públicas: **9**
- Rotas protegidas sem regra canônica e sem redirect: **0**
- Caminhos declarados mais de uma vez: **0**
- Tabelas referenciadas pelo runtime: **181**
- RPCs referenciadas pelo runtime: **103**
- Edge Functions invocadas pelo runtime: **14**
- Pares tabela/operação encontrados: **387**

## Rotas

| Caminho | Tipo | Superfície | Redirect | Regra canônica | RoleSwitch negado | Elemento |
|---|---|---|---|---|---|---|
| `/` | route | pública | — | n/a | — | `<PublicHome />` |
| `/login` | route | pública | — | n/a | — | `<Suspense fallback={<Spinner />}><Login /></Suspense>` |
| `/forgot-password` | route | pública | — | n/a | — | `<Suspense fallback={<Spinner />}><Login /></Suspense>` |
| `/reset-password` | route | pública | — | n/a | — | `<Suspense fallback={<Spinner />}><Login /></Suspense>` |
| `/pre-cadastro/:storeSlug` | route | pública | — | n/a | — | `<Suspense fallback={<Spinner />}><StorePreRegistration /></Suspense>` |
| `/privacy` | route | pública | — | n/a | — | `<Suspense fallback={<Spinner />}><Privacy /></Suspense>` |
| `/terms` | route | pública | — | n/a | — | `<Suspense fallback={<Spinner />}><Terms /></Suspense>` |
| `/dono/*` | route | pública | — | n/a | — | `<OwnerLegacyPathRedirect />` |
| `/gerente/*` | route | pública | — | n/a | — | `<ManagerLegacyPathRedirect />` |
| `/pdi/:id/print` | route | protegida | — | `/pdi/:id/print` | — | `<ProtectedRoute><Suspense fallback={<Spinner />}><PDIPrint /></Suspense></ProtectedRoute>` |
| `/` | container | protegida | — | n/a | — | `<ProtectedRoute><Suspense fallback={<Spinner />}><AppShell /></Suspense></ProtectedRoute>` |
| `/settings` | route | protegida | `/configuracoes` | `/settings` | — | `<Navigate to="/configuracoes" replace />` |
| `/plano-estrategico` | route | protegida | — | `/plano-estrategico` | vendedor, gerente | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerPlanoEstrategico />} admin={<InternalStrategicPlanPage />} /></S` |
| `/plano-acao` | route | protegida | — | `/plano-acao` | vendedor, gerente | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerPlanoDeAcao />} admin={<InternalActionPlanPage />} /></Suspense>` |
| `/decisoes` | route | protegida | — | `/decisoes` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/departamentos` | route | protegida | — | `/departamentos` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/departamentos/comercial` | route | protegida | — | `/departamentos/*` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/departamentos/marketing` | route | protegida | — | `/departamentos/*` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/departamentos/produto-e-estoque` | route | protegida | — | `/departamentos/*` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/departamentos/pessoas-rh` | route | protegida | — | `/departamentos/*` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/departamentos/financeiro` | route | protegida | — | `/departamentos/*` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/departamentos/operacoes` | route | protegida | — | `/departamentos/*` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/mercado` | route | protegida | — | `/mercado` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<DashboardLoja />} admin={<ForbiddenRoute />} /></Suspense>` |
| `/team` | route | protegida | — | `/team` | — | `<TeamAliasRedirect />` |
| `/equipe` | route | protegida | — | `/equipe` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<TeamAliasRedirect />} gerente={<TeamAliasRedirect />} dono={<TeamAliasRedirect />} admin={<AdminEquipeMxPage />} /> </Suspe` |
| `/meu-dia` | route | protegida | `/home` | `/meu-dia` | — | `<RedirectWithSearch to="/home" />` |
| `/home` | route | protegida | — | `/home` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<VendedorHome />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<RoleRedirect />} /> </Suspense>` |
| `/minha-remuneracao` | route | protegida | `/home` | `/minha-remuneracao` | — | `<RedirectWithSearch to="/home" />` |
| `/lancamento-diario` | route | protegida | `/terminal-mx` | `/lancamento-diario` | — | `<RedirectWithSearch to="/terminal-mx" />` |
| `/fechamento-diario` | route | protegida | — | `/fechamento-diario` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<Checkin />} gerente={<ManagerDailyClosing />} dono={<ManagerDailyClosing />} admin={<ManagerDailyClosing />} /> </Suspense>` |
| `/vendedor/terminal-mx` | route | protegida | — | `/vendedor/terminal-mx` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<Checkin />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/terminal-mx` | route | protegida | — | `/terminal-mx` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<Checkin />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/liberacao-fechamento` | route | protegida | — | `/liberacao-fechamento` | — | `<Suspense fallback={<Spinner />}><LiberacaoFechamento /></Suspense>` |
| `/carteira-clientes` | route | protegida | — | `/carteira-clientes` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<CarteiraClientes />} gerente={<CarteiraClientes />} dono={<CarteiraClientes />} admin={<CarteiraClientes />} /> </Suspense>` |
| `/carteira` | route | protegida | `/carteira-clientes` | `/carteira` | — | `<RedirectWithSearch to="/carteira-clientes" />` |
| `/vendedor/carteira` | route | protegida | `/carteira-clientes` | `/vendedor/carteira` | — | `<RedirectWithSearch to="/carteira-clientes" />` |
| `/mentor-comercial` | route | protegida | `/carteira-clientes` | `/mentor-comercial` | — | `<RedirectWithSearch to="/carteira-clientes" />` |
| `/vendedor/mentor-comercial` | route | protegida | `/carteira-clientes` | `/vendedor/mentor-comercial` | — | `<RedirectWithSearch to="/carteira-clientes" />` |
| `/funil` | route | protegida | `/meu-funil` | `/funil` | — | `<RedirectWithSearch to="/meu-funil" />` |
| `/minha-meta` | route | protegida | `/meu-funil` | `/minha-meta` | — | `<RedirectWithSearch to="/meu-funil" />` |
| `/vendedor/minha-meta` | route | protegida | `/meu-funil` | `/vendedor/minha-meta` | — | `<RedirectWithSearch to="/meu-funil" />` |
| `/meu-funil` | route | protegida | — | `/meu-funil` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<FunilVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/funil-comercial` | route | protegida | — | `/funil-comercial` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<FunilVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/central-execucao` | route | protegida | — | `/central-execucao` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<CentralExecucao />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/rotina-do-dia` | route | protegida | `/central-execucao` | `/rotina-do-dia` | — | `<RedirectWithSearch to="/central-execucao" />` |
| `/vendedor/rotina-do-dia` | route | protegida | `/central-execucao` | `/vendedor/rotina-do-dia` | — | `<RedirectWithSearch to="/central-execucao" />` |
| `/central-de-execucao` | route | protegida | — | `/central-de-execucao` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<CentralExecucao />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/relatorios-vendedor` | route | protegida | — | `/relatorios-vendedor` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<RelatoriosVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/relatorios` | route | protegida | — | `/relatorios` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<RelatoriosVendedor />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/feedback` | route | protegida | `/devolutivas` | `/feedback` | — | `<RedirectWithSearch to="/devolutivas" />` |
| `/feedbacks` | route | protegida | `/desenvolvimento?tab=feedback` | `/feedbacks` | — | `<RedirectWithSearch to="/desenvolvimento?tab=feedback" />` |
| `/vendedor/funil` | route | protegida | `/meu-funil` | `/vendedor/funil` | — | `<RedirectWithSearch to="/meu-funil" />` |
| `/vendedor/meu-funil` | route | protegida | `/meu-funil` | `/vendedor/meu-funil` | — | `<RedirectWithSearch to="/meu-funil" />` |
| `/vendedor/feedback` | route | protegida | `/desenvolvimento?tab=feedback` | `/vendedor/feedback` | — | `<RedirectWithSearch to="/desenvolvimento?tab=feedback" />` |
| `/vendedor/devolutivas` | route | protegida | `/desenvolvimento?tab=feedback` | `/vendedor/devolutivas` | — | `<RedirectWithSearch to="/desenvolvimento?tab=feedback" />` |
| `/vendedor/desenvolvimento` | route | protegida | `/desenvolvimento` | `/vendedor/desenvolvimento` | — | `<RedirectWithSearch to="/desenvolvimento" />` |
| `/vendedor/treinamentos` | route | protegida | `/universidade-mx` | `/vendedor/treinamentos` | — | `<RedirectWithSearch to="/universidade-mx" />` |
| `/vendedor/universidade-mx` | route | protegida | `/universidade-mx` | `/vendedor/universidade-mx` | — | `<RedirectWithSearch to="/universidade-mx" />` |
| `/vendedor/configuracoes` | route | protegida | `/configuracoes` | `/vendedor/configuracoes` | — | `<RedirectWithSearch to="/configuracoes" />` |
| `/funil-vendas` | route | protegida | — | `/funil-vendas` | vendedor, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<FunilVendasGerente />} dono={<FunilVendasGerente />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/metas` | route | protegida | `/meta-loja` | `/metas` | — | `<Navigate to="/meta-loja" replace />` |
| `/falar-consultor` | route | protegida | — | `/falar-consultor` | vendedor, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<FalarConsultorDono />} dono={<FalarConsultorDono />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/organograma` | route | protegida | — | `/organograma` | vendedor, gerente | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<Organograma />} admin={<Organograma />} /> </Suspense>` |
| `/banco-talentos` | route | protegida | — | `/banco-talentos` | vendedor, gerente | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<Comportamental />} admin={<Comportamental />} /> </Suspense>` |
| `/ajuda` | route | protegida | — | `/ajuda` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<VendedorAjuda />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/ranking` | route | protegida | — | `/ranking` | — | `<Suspense fallback={<Spinner />}><Ranking /></Suspense>` |
| `/classificacao` | route | protegida | — | `/classificacao` | — | `<Suspense fallback={<Spinner />}><Ranking /></Suspense>` |
| `/universidade-mx` | route | protegida | — | `/universidade-mx` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<UniversidadeMxRoute />} gerente={<GerenteTreinamentos />} dono={<DashboardLoja />} admin={<ConsultorTreinamentos />} /> </S` |
| `/treinamentos` | route | protegida | `/universidade-mx` | `/treinamentos` | — | `<RedirectWithSearch to="/universidade-mx" />` |
| `/desenvolvimento` | route | protegida | — | `/desenvolvimento` | gerente, dono, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<VendedorDesenvolvimento />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<ForbiddenRoute />} /> </Suspense` |
| `/devolutivas` | route | protegida | — | `/devolutivas` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<VendedorDesenvolvimento />} gerente={<GerenteFeedback />} dono={<GerenteFeedback />} admin={<GerenteFeedback />} /> </Suspe` |
| `/notificacoes` | route | protegida | — | `/notificacoes` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<Notificacoes />} gerente={<Notificacoes />} dono={<Notificacoes />} admin={<Notificacoes />} /> </Suspense>` |
| `/perfil` | route | protegida | — | `/perfil` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<MeuPerfilVendedor />} gerente={<Perfil />} dono={<Perfil />} admin={<Perfil />} /> </Suspense>` |
| `/meu-perfil` | route | protegida | `/perfil` | `/meu-perfil` | — | `<RedirectWithSearch to="/perfil" />` |
| `/meu-perfil-vendedor` | route | protegida | `/perfil` | `/meu-perfil-vendedor` | — | `<RedirectWithSearch to="/perfil" />` |
| `/vendedor/perfil` | route | protegida | `/perfil` | `/vendedor/perfil` | — | `<RedirectWithSearch to="/perfil" />` |
| `/rotina-equipe` | route | protegida | — | `/rotina-equipe` | vendedor | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerTeamRoutine />} dono={<ManagerTeamRoutine />} admin={<ManagerTeamRoutine />} /></Suspens` |
| `/minha-equipe` | route | protegida | — | `/minha-equipe` | vendedor | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /></Suspense>` |
| `/meta-loja` | route | protegida | — | `/meta-loja` | vendedor | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /></Suspense>` |
| `/vendas` | route | protegida | — | `/vendas` | vendedor | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /></Suspense>` |
| `/mentor` | route | protegida | — | `/mentor` | vendedor | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerMentor />} dono={<ManagerMentor />} admin={<ManagerMentor />} /></Suspense>` |
| `/feedbacks-pdis` | route | protegida | — | `/feedbacks-pdis` | vendedor | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ManagerDevelopment />} dono={<ManagerDevelopment />} admin={<ManagerDevelopment />} /></Suspens` |
| `/lojas/:storeSlug/consultor-ia` | route | protegida | — | `/lojas/:storeSlug/consultor-ia` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<StoreConsultorIa />} gerente={<StoreConsultorIa />} dono={<StoreConsultorIa />} admin={<StoreConsultorIa />} /> </Suspense>` |
| `/lojas/:storeSlug/filiais` | route | protegida | — | `/lojas/:storeSlug/filiais` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<StoreBranches />} /> </Suspense>` |
| `/lojas/:storeSlug` | route | protegida | — | `/lojas/:storeSlug` | vendedor | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /> </Suspense>` |
| `/lojas/:storeSlug/equipe` | route | protegida | — | `/lojas/:storeSlug/*` | vendedor | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<DashboardLoja />} dono={<DashboardLoja />} admin={<DashboardLoja />} /> </Suspense>` |
| `/consultor-ia` | route | protegida | — | `/consultor-ia` | — | `<ConsultorIaAliasRedirect />` |
| `/pdi` | route | protegida | — | `/pdi` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<Navigate to="/desenvolvimento?tab=pdi" replace />} gerente={<GerentePDI />} dono={<GerentePDI />} admin={<GerentePDI />} />` |
| `/minhas-lojas` | route | protegida | — | `/minhas-lojas` | vendedor, gerente, admin | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerStoresNetworkPage />} admin={<ForbiddenRoute />} /> </Suspense>` |
| `/rotina` | route | protegida | — | `/rotina` | vendedor | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<RotinaGerente />} dono={<OwnerRoutineRoute />} admin={<RotinaGerente />} /> </Suspense>` |
| `/painel` | route | protegida | — | `/painel` | — | `<Suspense fallback={<Spinner />}><PainelConsultor /></Suspense>` |
| `/lojas` | route | protegida | `/clientes` | `/lojas` | — | `<Navigate to="/clientes" replace />` |
| `/simulacao` | route | protegida | — | `/simulacao` | — | `<Suspense fallback={<Spinner />}><Simulacao /></Suspense>` |
| `/simulacao/:simulationRole` | route | protegida | — | `/simulacao/*` | — | `<Suspense fallback={<Spinner />}><Simulacao /></Suspense>` |
| `/agenda` | route | protegida | — | `/agenda` | — | `<Suspense fallback={<Spinner />}><AgendaAdmin /></Suspense>` |
| `/consultoria` | container | protegida | — | `/consultoria` | — | `(grupo)` |
| `/consultoria` | index | protegida | — | `/consultoria` | vendedor, gerente | `<Suspense fallback={<Spinner />}><RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<OwnerConsultoria />} admin={<InternalConsultingPage />} /></Suspense>` |
| `/consultoria/clientes` | route | protegida | `/clientes` | `/consultoria/*` | — | `<Navigate to="/clientes" replace />` |
| `/consultoria/clientes/:clientSlug` | route | protegida | — | `/consultoria/*` | — | `<Suspense fallback={<Spinner />}><ConsultoriaClienteDetalhe /></Suspense>` |
| `/consultoria/clientes/:clientSlug/visitas/:visitNumber` | route | protegida | — | `/consultoria/*` | — | `<Suspense fallback={<Spinner />}><ConsultoriaVisitaExecucao /></Suspense>` |
| `/produtos` | route | protegida | — | `/produtos` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ProdutosDigitais />} gerente={<ProdutosDigitais />} dono={<ProdutosDigitais />} admin={<AdminProdutosConsultoriaPage />} />` |
| `/clientes` | route | protegida | — | `/clientes` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<InternalClientsPage />} /> </Suspense>` |
| `/clientes/novo` | route | protegida | — | `/clientes/novo` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminNovoClientePage />} /> </Suspense>` |
| `/clientes/:clientSlug/plano-estrategico` | route | protegida | — | `/clientes/:clientSlug/plano-estrategico` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<InternalStrategicPlanPage />} /> </Suspen` |
| `/clientes/:clientSlug/plano-acao` | route | protegida | — | `/clientes/:clientSlug/plano-acao` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<InternalActionPlanPage />} /> </Suspense>` |
| `/clientes/:clientSlug` | route | protegida | — | `/clientes/:clientSlug` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminClienteDetalhePage />} /> </Suspense` |
| `/consultoria-mx` | route | protegida | — | `/consultoria-mx` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminConsultoriaMxPage />} /> </Suspense>` |
| `/indicadores` | route | protegida | — | `/indicadores` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminIndicadoresPage />} /> </Suspense>` |
| `/planos-acao` | route | protegida | — | `/planos-acao` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminPlanosAcaoGlobalPage />} /> </Suspen` |
| `/configuracoes` | route | protegida | — | `/configuracoes` | — | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<VendedorConfiguracoes />} gerente={<Configuracoes />} dono={<Configuracoes />} admin={<Configuracoes />} /> </Suspense>` |
| `/configuracoes/remuneracao` | route | protegida | — | `/configuracoes/remuneracao` | — | `<Suspense fallback={<Spinner />}><Configuracoes initialTab="remuneracao" /></Suspense>` |
| `/configuracoes/consultoria-pmr` | route | protegida | — | `/configuracoes/consultoria-pmr` | — | `<Suspense fallback={<Spinner />}><ConsultoriaParametros /></Suspense>` |
| `/relatorio-matinal` | route | protegida | — | `/relatorio-matinal` | — | `<Suspense fallback={<Spinner />}><MorningReport /></Suspense>` |
| `/relatorios/performance-vendas` | route | protegida | — | `/relatorios/performance-vendas` | — | `<Suspense fallback={<Spinner />}><SalesPerformance /></Suspense>` |
| `/relatorios/performance-vendedor` | route | protegida | — | `/relatorios/performance-vendedor` | — | `<Suspense fallback={<Spinner />}><SellerPerformance /></Suspense>` |
| `/scores` | route | protegida | — | `/scores` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminScoresAlertasPage />} /> </Suspense>` |
| `/scores-alertas` | route | protegida | — | `/scores-alertas` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminScoresAlertasPage />} /> </Suspense>` |
| `/dados` | route | protegida | — | `/dados` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminDadosConciliacaoPage />} /> </Suspen` |
| `/dados-conciliacao` | route | protegida | — | `/dados-conciliacao` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminDadosConciliacaoPage />} /> </Suspen` |
| `/seguranca` | route | protegida | — | `/seguranca` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminSegurancaAuditoriaPage />} /> </Susp` |
| `/auditoria` | route | protegida | — | `/auditoria` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminSegurancaAuditoriaPage />} /> </Susp` |
| `/suporte` | route | protegida | — | `/suporte` | vendedor, gerente, dono | `<Suspense fallback={<Spinner />}> <RoleSwitch vendedor={<ForbiddenRoute />} gerente={<ForbiddenRoute />} dono={<ForbiddenRoute />} admin={<AdminSuporteIncidentesPage />} /> </Suspe` |
| `/*` | fallback | protegida | — | n/a | — | `<Suspense fallback={<Spinner />}><NotFound /></Suspense>` |

## Tabelas

| Recurso | Arquivos consumidores |
|---|---:|
| `acessos_cliente_consultoria` | 3 |
| `agenda_estrategica_marketing` | 1 |
| `agendamentos` | 10 |
| `alerts` | 1 |
| `artefatos_gerados_consultoria` | 1 |
| `atendimentos` | 2 |
| `atribuicoes_consultoria` | 14 |
| `atribuicoes_trilha_desenvolvimento` | 1 |
| `aula_presencas` | 1 |
| `aulas_ao_vivo` | 1 |
| `banco_talentos` | 1 |
| `benchmark_snapshots` | 1 |
| `benchmarks_loja` | 2 |
| `biblioteca_materiais` | 1 |
| `cadencia_estado_cliente` | 2 |
| `cadencia_fluxos` | 1 |
| `carreira_niveis` | 1 |
| `carteira_empresa` | 1 |
| `carteira_missoes` | 1 |
| `catalogo_indicadores_planejamento` | 1 |
| `catalogo_metricas_consultoria` | 7 |
| `central_execucao_aberturas` | 3 |
| `checkin_audit_logs` | 1 |
| `ciclos_plano_estrategico` | 4 |
| `ciclos_plano_estrategico_indicadores` | 1 |
| `clientes` | 6 |
| `clientes_consultoria` | 31 |
| `clientes_oportunidades` | 1 |
| `comportamental_perfis` | 1 |
| `comportamental_questoes` | 1 |
| `comportamental_respostas` | 1 |
| `comportamental_sessoes` | 1 |
| `configuracoes_cliente_consultoria` | 1 |
| `conjuntos_parametros_consultoria` | 4 |
| `consultor_solucoes` | 3 |
| `consultoria_itens_entrega` | 3 |
| `contatos_cliente_consultoria` | 4 |
| `conteudo_encontro` | 1 |
| `conteudo_referencia_encontro` | 1 |
| `cultura_resultado_registros` | 1 |
| `d1_audit_log` | 3 |
| `data_correction_audit` | 1 |
| `delegacoes_gerenciais` | 1 |
| `departamentos_mx` | 2 |
| `deterministic_action_resolutions` | 1 |
| `devolutiva_acoes` | 4 |
| `devolutivas` | 2 |
| `entradas_vendas_consultoria` | 1 |
| `entregas_encontro` | 1 |
| `etapas_metodologia_consultoria` | 1 |
| `etapas_modelo_visita_consultoria` | 2 |
| `eventos_agenda_consultoria` | 3 |
| `eventos_agenda_executiva` | 2 |
| `eventos_comerciais` | 11 |
| `evidencias_encontro` | 1 |
| `evidencias_planos_acao` | 2 |
| `evidencias_visita` | 2 |
| `evidencias-consultoria` | 2 |
| `execution_actions` | 8 |
| `fechamento_liberacoes` | 2 |
| `financeiro_consultoria` | 4 |
| `funnel_metrics` | 1 |
| `guia_consultor_encontro` | 1 |
| `historico_planos_acao` | 2 |
| `historico_valores_indicadores_planejamento` | 4 |
| `horarios_funcionamento_unidade` | 1 |
| `importacoes_brutas` | 1 |
| `indice_felicidade_agregado` | 1 |
| `inscricoes_autocadastro_cliente` | 1 |
| `internal_mx_admin_audit` | 3 |
| `itens_plano_acao` | 3 |
| `lancamentos_diarios` | 16 |
| `links_autocadastro_cliente` | 1 |
| `logs_auditoria` | 2 |
| `logs_auditoria_consultoria_mx` | 3 |
| `logs_auditoria_loja` | 2 |
| `logs_compartilhamento_whatsapp` | 1 |
| `logs_reprocessamento` | 1 |
| `logs_rotina_gerente` | 1 |
| `lojas` | 34 |
| `manager_daily_tasks` | 1 |
| `manager_lead_conferences` | 1 |
| `marketing_mensal_consultoria` | 1 |
| `mentor_cadence_steps` | 1 |
| `mentor_cadences` | 1 |
| `mentor_pending_flags` | 1 |
| `mentor_score_snapshots` | 1 |
| `mentor_scripts` | 1 |
| `mentor_status_definitions` | 1 |
| `mentor_transitions` | 1 |
| `metas` | 4 |
| `metas_metricas_cliente` | 3 |
| `modelos_formulario_pmr` | 1 |
| `modelos_relatorio` | 1 |
| `modulos_cliente_consultoria` | 8 |
| `modulos_produto_consultoria` | 2 |
| `modulos_sistema` | 1 |
| `notificacoes` | 4 |
| `opcoes_agenda_consultoria` | 1 |
| `oportunidades` | 7 |
| `organograma_nos` | 1 |
| `overrides_parametros_cliente` | 3 |
| `pacotes_indicadores_estrategicos` | 1 |
| `pacotes_indicadores_itens` | 5 |
| `pacotes_indicadores_versoes` | 4 |
| `parametros_estrategicos_mx` | 2 |
| `pdi_avaliacoes_competencia` | 3 |
| `pdi_metas` | 2 |
| `pdi_niveis_cargo` | 1 |
| `pdi_plano_acao` | 2 |
| `pdi_reviews` | 1 |
| `pdi_sessoes` | 4 |
| `pdis` | 1 |
| `perfil_consultor_mx` | 4 |
| `planejamentos_estrategicos` | 1 |
| `planos_acao` | 13 |
| `planos_acao_template_itens` | 4 |
| `planos_acao_template_versoes` | 6 |
| `planos_acao_templates` | 3 |
| `posicionamento_empresa` | 1 |
| `pre_cadastros_loja` | 2 |
| `produtos_digitais` | 2 |
| `programas_visita_consultoria` | 10 |
| `progresso_etapa_trilha` | 1 |
| `progresso_treinamentos` | 3 |
| `prospecting_schedule` | 3 |
| `push_subscriptions` | 1 |
| `qualificacoes_encontro_consultor` | 1 |
| `qualificacoes_produto_consultor` | 1 |
| `recomendacoes_desenvolvimento` | 1 |
| `regras_entrega_loja` | 2 |
| `regras_metas_loja` | 9 |
| `regularizacao_fechamento` | 2 |
| `relatorios_devolutivas_semanais` | 1 |
| `remuneracao_benchmark` | 1 |
| `remuneracao_planos` | 3 |
| `remuneracao_regras` | 1 |
| `respostas_formulario_pmr` | 1 |
| `resultados_metricas_cliente` | 2 |
| `reunioes_google_meet_atas` | 1 |
| `roles` | 1 |
| `routine_activity_templates` | 2 |
| `score_calculations` | 1 |
| `seller_routine_snapshots` | 1 |
| `snapshots_estoque_consultoria` | 2 |
| `solicitacoes_consultoria` | 2 |
| `solicitacoes_correcao_lancamento` | 2 |
| `store_commercial_settings` | 1 |
| `store_target_plans` | 2 |
| `story_ideas` | 2 |
| `sugestoes_conteudo` | 1 |
| `tabela` | 1 |
| `tempos_encontro_produto` | 1 |
| `tokens_oauth_consultoria` | 1 |
| `treinamento_avaliacoes` | 2 |
| `treinamento_presencas` | 1 |
| `treinamento_quiz_questoes` | 1 |
| `treinamento_tarefa_respostas` | 1 |
| `treinamento_tarefas` | 1 |
| `treinamentos` | 6 |
| `trilhas_desenvolvimento` | 1 |
| `unidades_cliente_consultoria` | 12 |
| `universidade_aulas` | 1 |
| `universidade_certificacoes` | 1 |
| `universidade_trilhas` | 1 |
| `user_roles` | 1 |
| `usuarios` | 33 |
| `valores_indicadores_planejamento` | 2 |
| `valores_indicadores_planejamento_vigentes` | 4 |
| `valores_parametros_consultoria` | 3 |
| `vehicle_model_catalog` | 1 |
| `veiculos_estoque` | 4 |
| `vendedor_nivel_carreira` | 1 |
| `vendedor_perfil` | 5 |
| `vendedores_loja` | 9 |
| `versoes_metodologia_produto` | 1 |
| `vinculo_modelo_relatorio_encontro` | 1 |
| `vinculo_plano_acao_encontro` | 1 |
| `vinculos_loja` | 24 |
| `visitas_consultoria` | 13 |
| `vw_jornada_alem_do_contratado` | 1 |

## Operações por tabela

| Recurso | Arquivos consumidores |
|---|---:|
| `acessos_cliente_consultoria:insert` | 2 |
| `acessos_cliente_consultoria:select` | 3 |
| `acessos_cliente_consultoria:update` | 2 |
| `agenda_estrategica_marketing:select` | 1 |
| `agendamentos:delete` | 1 |
| `agendamentos:insert` | 1 |
| `agendamentos:select` | 10 |
| `agendamentos:update` | 2 |
| `agendamentos:upsert` | 1 |
| `alerts:select` | 1 |
| `artefatos_gerados_consultoria:insert` | 1 |
| `artefatos_gerados_consultoria:select` | 1 |
| `atendimentos:delete` | 1 |
| `atendimentos:insert` | 1 |
| `atendimentos:select` | 2 |
| `atribuicoes_consultoria:delete` | 1 |
| `atribuicoes_consultoria:insert` | 2 |
| `atribuicoes_consultoria:select` | 13 |
| `atribuicoes_consultoria:update` | 5 |
| `atribuicoes_consultoria:upsert` | 4 |
| `atribuicoes_trilha_desenvolvimento:select` | 1 |
| `atribuicoes_trilha_desenvolvimento:upsert` | 1 |
| `aula_presencas:select` | 1 |
| `aulas_ao_vivo:select` | 1 |
| `banco_talentos:insert` | 1 |
| `banco_talentos:select` | 1 |
| `benchmark_snapshots:select` | 1 |
| `benchmarks_loja:select` | 2 |
| `benchmarks_loja:upsert` | 2 |
| `biblioteca_materiais:select` | 1 |
| `biblioteca_materiais:update` | 1 |
| `biblioteca_materiais:upsert` | 1 |
| `cadencia_estado_cliente:insert` | 1 |
| `cadencia_estado_cliente:select` | 2 |
| `cadencia_estado_cliente:update` | 1 |
| `cadencia_fluxos:select` | 1 |
| `carreira_niveis:select` | 1 |
| `carreira_niveis:upsert` | 1 |
| `carteira_empresa:select` | 1 |
| `carteira_missoes:select` | 1 |
| `catalogo_indicadores_planejamento:select` | 1 |
| `catalogo_metricas_consultoria:select` | 7 |
| `catalogo_metricas_consultoria:update` | 1 |
| `catalogo_metricas_consultoria:upsert` | 2 |
| `central_execucao_aberturas:select` | 1 |
| `central_execucao_aberturas:upsert` | 2 |
| `checkin_audit_logs:select` | 1 |
| `ciclos_plano_estrategico_indicadores:delete` | 1 |
| `ciclos_plano_estrategico_indicadores:insert` | 1 |
| `ciclos_plano_estrategico_indicadores:select` | 1 |
| `ciclos_plano_estrategico_indicadores:update` | 1 |
| `ciclos_plano_estrategico:select` | 4 |
| `ciclos_plano_estrategico:update` | 1 |
| `clientes_consultoria:delete` | 1 |
| `clientes_consultoria:insert` | 4 |
| `clientes_consultoria:select` | 30 |
| `clientes_consultoria:update` | 7 |
| `clientes_oportunidades:select` | 1 |
| `clientes:delete` | 2 |
| `clientes:insert` | 2 |
| `clientes:select` | 6 |
| `clientes:update` | 2 |
| `comportamental_perfis:upsert` | 1 |
| `comportamental_questoes:insert` | 1 |
| `comportamental_questoes:select` | 1 |
| `comportamental_respostas:insert` | 1 |
| `comportamental_sessoes:insert` | 1 |
| `comportamental_sessoes:select` | 1 |
| `configuracoes_cliente_consultoria:select` | 1 |
| `configuracoes_cliente_consultoria:upsert` | 1 |
| `conjuntos_parametros_consultoria:select` | 4 |
| `consultor_solucoes:insert` | 2 |
| `consultor_solucoes:select` | 2 |
| `consultor_solucoes:update` | 1 |
| `consultoria_itens_entrega:select` | 3 |
| `contatos_cliente_consultoria:insert` | 3 |
| `contatos_cliente_consultoria:select` | 4 |
| `contatos_cliente_consultoria:update` | 1 |
| `conteudo_encontro:insert` | 1 |
| `conteudo_encontro:select` | 1 |
| `conteudo_encontro:upsert` | 1 |
| `conteudo_referencia_encontro:insert` | 1 |
| `conteudo_referencia_encontro:select` | 1 |
| `conteudo_referencia_encontro:update` | 1 |
| `conteudo_referencia_encontro:upsert` | 1 |
| `cultura_resultado_registros:select` | 1 |
| `d1_audit_log:insert` | 2 |
| `d1_audit_log:select` | 3 |
| `data_correction_audit:select` | 1 |
| `delegacoes_gerenciais:insert` | 1 |
| `delegacoes_gerenciais:select` | 1 |
| `delegacoes_gerenciais:update` | 1 |
| `departamentos_mx:select` | 2 |
| `deterministic_action_resolutions:select` | 1 |
| `deterministic_action_resolutions:upsert` | 1 |
| `devolutiva_acoes:delete` | 1 |
| `devolutiva_acoes:select` | 3 |
| `devolutiva_acoes:update` | 1 |
| `devolutiva_acoes:upsert` | 1 |
| `devolutivas:insert` | 1 |
| `devolutivas:select` | 2 |
| `devolutivas:update` | 2 |
| `devolutivas:upsert` | 1 |
| `entradas_vendas_consultoria:select` | 1 |
| `entregas_encontro:insert` | 1 |
| `entregas_encontro:select` | 1 |
| `entregas_encontro:update` | 1 |
| `entregas_encontro:upsert` | 1 |
| `etapas_metodologia_consultoria:select` | 1 |
| `etapas_modelo_visita_consultoria:select` | 2 |
| `eventos_agenda_consultoria:delete` | 1 |
| `eventos_agenda_consultoria:insert` | 1 |
| `eventos_agenda_consultoria:select` | 3 |
| `eventos_agenda_consultoria:update` | 1 |
| `eventos_agenda_executiva:select` | 2 |
| `eventos_comerciais:insert` | 2 |
| `eventos_comerciais:select` | 10 |
| `eventos_comerciais:update` | 1 |
| `eventos_comerciais:upsert` | 2 |
| `evidencias_encontro:insert` | 1 |
| `evidencias_encontro:select` | 1 |
| `evidencias_encontro:update` | 1 |
| `evidencias_encontro:upsert` | 1 |
| `evidencias_planos_acao:delete` | 1 |
| `evidencias_planos_acao:insert` | 1 |
| `evidencias_planos_acao:select` | 2 |
| `evidencias_visita:delete` | 1 |
| `evidencias_visita:insert` | 1 |
| `evidencias_visita:select` | 2 |
| `execution_actions:insert` | 2 |
| `execution_actions:select` | 7 |
| `execution_actions:update` | 3 |
| `execution_actions:upsert` | 1 |
| `fechamento_liberacoes:insert` | 1 |
| `fechamento_liberacoes:select` | 2 |
| `financeiro_consultoria:delete` | 3 |
| `financeiro_consultoria:insert` | 2 |
| `financeiro_consultoria:select` | 4 |
| `financeiro_consultoria:update` | 2 |
| `financeiro_consultoria:upsert` | 1 |
| `funnel_metrics:select` | 1 |
| `guia_consultor_encontro:insert` | 1 |
| `guia_consultor_encontro:select` | 1 |
| `guia_consultor_encontro:upsert` | 1 |
| `historico_planos_acao:select` | 2 |
| `historico_valores_indicadores_planejamento:select` | 4 |
| `horarios_funcionamento_unidade:delete` | 1 |
| `horarios_funcionamento_unidade:insert` | 1 |
| `horarios_funcionamento_unidade:select` | 1 |
| `horarios_funcionamento_unidade:update` | 1 |
| `importacoes_brutas:insert` | 1 |
| `indice_felicidade_agregado:select` | 1 |
| `inscricoes_autocadastro_cliente:select` | 1 |
| `inscricoes_autocadastro_cliente:update` | 1 |
| `internal_mx_admin_audit:insert` | 2 |
| `internal_mx_admin_audit:select` | 2 |
| `itens_plano_acao:insert` | 2 |
| `itens_plano_acao:select` | 2 |
| `itens_plano_acao:update` | 1 |
| `lancamentos_diarios:select` | 16 |
| `links_autocadastro_cliente:insert` | 1 |
| `links_autocadastro_cliente:select` | 1 |
| `links_autocadastro_cliente:update` | 1 |
| `logs_auditoria_consultoria_mx:insert` | 2 |
| `logs_auditoria_consultoria_mx:select` | 2 |
| `logs_auditoria_loja:select` | 2 |
| `logs_auditoria:select` | 2 |
| `logs_compartilhamento_whatsapp:insert` | 1 |
| `logs_reprocessamento:insert` | 1 |
| `logs_reprocessamento:select` | 1 |
| `logs_reprocessamento:update` | 1 |
| `logs_rotina_gerente:select` | 1 |
| `logs_rotina_gerente:upsert` | 1 |
| `lojas:delete` | 1 |
| `lojas:insert` | 3 |
| `lojas:select` | 34 |
| `lojas:update` | 3 |
| `manager_daily_tasks:select` | 1 |
| `manager_daily_tasks:update` | 1 |
| `manager_lead_conferences:select` | 1 |
| `marketing_mensal_consultoria:select` | 1 |
| `mentor_cadence_steps:select` | 1 |
| `mentor_cadences:select` | 1 |
| `mentor_pending_flags:insert` | 1 |
| `mentor_pending_flags:select` | 1 |
| `mentor_pending_flags:update` | 1 |
| `mentor_score_snapshots:upsert` | 1 |
| `mentor_scripts:select` | 1 |
| `mentor_status_definitions:select` | 1 |
| `mentor_transitions:select` | 1 |
| `metas_metricas_cliente:select` | 3 |
| `metas_metricas_cliente:upsert` | 1 |
| `metas:delete` | 1 |
| `metas:insert` | 1 |
| `metas:select` | 4 |
| `metas:update` | 1 |
| `modelos_formulario_pmr:select` | 1 |
| `modelos_relatorio:insert` | 1 |
| `modelos_relatorio:select` | 1 |
| `modelos_relatorio:update` | 1 |
| `modelos_relatorio:upsert` | 1 |
| `modulos_cliente_consultoria:insert` | 2 |
| `modulos_cliente_consultoria:select` | 8 |
| `modulos_cliente_consultoria:upsert` | 2 |
| `modulos_produto_consultoria:select` | 2 |
| `modulos_produto_consultoria:upsert` | 1 |
| `modulos_sistema:select` | 1 |
| `notificacoes:delete` | 1 |
| `notificacoes:insert` | 2 |
| `notificacoes:select` | 3 |
| `notificacoes:update` | 1 |
| `opcoes_agenda_consultoria:delete` | 1 |
| `opcoes_agenda_consultoria:insert` | 1 |
| `opcoes_agenda_consultoria:select` | 1 |
| `opcoes_agenda_consultoria:update` | 1 |
| `oportunidades:delete` | 1 |
| `oportunidades:insert` | 1 |
| `oportunidades:select` | 7 |
| `oportunidades:update` | 3 |
| `organograma_nos:delete` | 1 |
| `organograma_nos:insert` | 1 |
| `organograma_nos:select` | 1 |
| `overrides_parametros_cliente:insert` | 1 |
| `overrides_parametros_cliente:select` | 3 |
| `overrides_parametros_cliente:update` | 1 |
| `pacotes_indicadores_estrategicos:insert` | 1 |
| `pacotes_indicadores_estrategicos:select` | 1 |
| `pacotes_indicadores_estrategicos:update` | 1 |
| `pacotes_indicadores_itens:delete` | 1 |
| `pacotes_indicadores_itens:insert` | 1 |
| `pacotes_indicadores_itens:select` | 5 |
| `pacotes_indicadores_versoes:insert` | 1 |
| `pacotes_indicadores_versoes:select` | 4 |
| `pacotes_indicadores_versoes:update` | 1 |
| `parametros_estrategicos_mx:select` | 2 |
| `parametros_estrategicos_mx:upsert` | 1 |
| `pdi_avaliacoes_competencia:select` | 3 |
| `pdi_avaliacoes_competencia:update` | 1 |
| `pdi_metas:select` | 2 |
| `pdi_metas:update` | 1 |
| `pdi_niveis_cargo:select` | 1 |
| `pdi_plano_acao:select` | 2 |
| `pdi_plano_acao:update` | 1 |
| `pdi_reviews:insert` | 1 |
| `pdi_reviews:select` | 1 |
| `pdi_sessoes:select` | 4 |
| `pdis:select` | 1 |
| `pdis:update` | 1 |
| `perfil_consultor_mx:insert` | 1 |
| `perfil_consultor_mx:select` | 3 |
| `perfil_consultor_mx:upsert` | 1 |
| `planejamentos_estrategicos:insert` | 1 |
| `planejamentos_estrategicos:select` | 1 |
| `planos_acao_template_itens:insert` | 2 |
| `planos_acao_template_itens:select` | 2 |
| `planos_acao_template_versoes:insert` | 2 |
| `planos_acao_template_versoes:select` | 6 |
| `planos_acao_template_versoes:update` | 1 |
| `planos_acao_templates:insert` | 2 |
| `planos_acao_templates:select` | 3 |
| `planos_acao_templates:update` | 1 |
| `planos_acao:delete` | 1 |
| `planos_acao:insert` | 2 |
| `planos_acao:select` | 13 |
| `planos_acao:update` | 1 |
| `posicionamento_empresa:select` | 1 |
| `pre_cadastros_loja:select` | 2 |
| `produtos_digitais:insert` | 1 |
| `produtos_digitais:select` | 2 |
| `produtos_digitais:update` | 1 |
| `programas_visita_consultoria:delete` | 1 |
| `programas_visita_consultoria:insert` | 1 |
| `programas_visita_consultoria:select` | 9 |
| `programas_visita_consultoria:update` | 2 |
| `progresso_etapa_trilha:select` | 1 |
| `progresso_treinamentos:select` | 3 |
| `progresso_treinamentos:upsert` | 1 |
| `prospecting_schedule:select` | 3 |
| `push_subscriptions:update` | 1 |
| `push_subscriptions:upsert` | 1 |
| `qualificacoes_encontro_consultor:delete` | 1 |
| `qualificacoes_encontro_consultor:insert` | 1 |
| `qualificacoes_encontro_consultor:select` | 1 |
| `qualificacoes_produto_consultor:delete` | 1 |
| `qualificacoes_produto_consultor:insert` | 1 |
| `qualificacoes_produto_consultor:select` | 1 |
| `recomendacoes_desenvolvimento:select` | 1 |
| `recomendacoes_desenvolvimento:update` | 1 |
| `regras_entrega_loja:select` | 2 |
| `regras_entrega_loja:upsert` | 2 |
| `regras_metas_loja:delete` | 1 |
| `regras_metas_loja:select` | 9 |
| `regras_metas_loja:upsert` | 3 |
| `regularizacao_fechamento:insert` | 1 |
| `regularizacao_fechamento:select` | 2 |
| `regularizacao_fechamento:update` | 1 |
| `relatorios_devolutivas_semanais:select` | 1 |
| `remuneracao_benchmark:select` | 1 |
| `remuneracao_planos:delete` | 1 |
| `remuneracao_planos:select` | 3 |
| `remuneracao_planos:upsert` | 1 |
| `remuneracao_regras:delete` | 1 |
| `remuneracao_regras:insert` | 1 |
| `remuneracao_regras:select` | 1 |
| `respostas_formulario_pmr:insert` | 1 |
| `respostas_formulario_pmr:select` | 1 |
| `respostas_formulario_pmr:update` | 1 |
| `resultados_metricas_cliente:select` | 2 |
| `resultados_metricas_cliente:upsert` | 1 |
| `reunioes_google_meet_atas:select` | 1 |
| `roles:select` | 1 |
| `routine_activity_templates:select` | 2 |
| `score_calculations:select` | 1 |
| `seller_routine_snapshots:select` | 1 |
| `snapshots_estoque_consultoria:select` | 2 |
| `solicitacoes_consultoria:insert` | 2 |
| `solicitacoes_consultoria:select` | 2 |
| `solicitacoes_correcao_lancamento:select` | 2 |
| `store_commercial_settings:select` | 1 |
| `store_target_plans:select` | 2 |
| `story_ideas:select` | 2 |
| `sugestoes_conteudo:insert` | 1 |
| `sugestoes_conteudo:select` | 1 |
| `tempos_encontro_produto:select` | 1 |
| `tempos_encontro_produto:upsert` | 1 |
| `tokens_oauth_consultoria:select` | 1 |
| `treinamento_avaliacoes:select` | 2 |
| `treinamento_avaliacoes:upsert` | 2 |
| `treinamento_presencas:select` | 1 |
| `treinamento_presencas:upsert` | 1 |
| `treinamento_quiz_questoes:select` | 1 |
| `treinamento_tarefa_respostas:select` | 1 |
| `treinamento_tarefa_respostas:upsert` | 1 |
| `treinamento_tarefas:select` | 1 |
| `treinamentos:insert` | 1 |
| `treinamentos:select` | 5 |
| `trilhas_desenvolvimento:select` | 1 |
| `unidades_cliente_consultoria:delete` | 1 |
| `unidades_cliente_consultoria:insert` | 4 |
| `unidades_cliente_consultoria:select` | 12 |
| `unidades_cliente_consultoria:update` | 2 |
| `universidade_aulas:select` | 1 |
| `universidade_certificacoes:select` | 1 |
| `universidade_trilhas:select` | 1 |
| `user_roles:insert` | 1 |
| `user_roles:select` | 1 |
| `user_roles:update` | 1 |
| `usuarios:delete` | 2 |
| `usuarios:insert` | 1 |
| `usuarios:select` | 30 |
| `usuarios:update` | 6 |
| `usuarios:upsert` | 1 |
| `valores_indicadores_planejamento_vigentes:select` | 4 |
| `valores_indicadores_planejamento:select` | 2 |
| `valores_parametros_consultoria:select` | 3 |
| `valores_parametros_consultoria:upsert` | 2 |
| `vehicle_model_catalog:select` | 1 |
| `veiculos_estoque:insert` | 1 |
| `veiculos_estoque:select` | 4 |
| `veiculos_estoque:update` | 1 |
| `veiculos_estoque:upsert` | 1 |
| `vendedor_nivel_carreira:select` | 1 |
| `vendedor_nivel_carreira:upsert` | 1 |
| `vendedor_perfil:select` | 5 |
| `vendedor_perfil:upsert` | 3 |
| `vendedores_loja:insert` | 3 |
| `vendedores_loja:select` | 8 |
| `vendedores_loja:update` | 2 |
| `versoes_metodologia_produto:insert` | 1 |
| `versoes_metodologia_produto:select` | 1 |
| `versoes_metodologia_produto:update` | 1 |
| `vinculo_modelo_relatorio_encontro:insert` | 1 |
| `vinculo_modelo_relatorio_encontro:select` | 1 |
| `vinculo_modelo_relatorio_encontro:update` | 1 |
| `vinculo_modelo_relatorio_encontro:upsert` | 1 |
| `vinculo_plano_acao_encontro:insert` | 1 |
| `vinculo_plano_acao_encontro:select` | 1 |
| `vinculo_plano_acao_encontro:update` | 1 |
| `vinculos_loja:delete` | 1 |
| `vinculos_loja:insert` | 3 |
| `vinculos_loja:select` | 22 |
| `vinculos_loja:update` | 2 |
| `visitas_consultoria:delete` | 2 |
| `visitas_consultoria:insert` | 5 |
| `visitas_consultoria:select` | 13 |
| `visitas_consultoria:update` | 4 |
| `vw_jornada_alem_do_contratado:select` | 1 |

## RPCs

| Recurso | Arquivos consumidores |
|---|---:|
| `ack_alert` | 1 |
| `adicionar_indicador_ciclo_plano` | 1 |
| `admin_archive_store` | 1 |
| `admin_create_store` | 1 |
| `admin_hard_delete_store` | 2 |
| `admin_restore_store` | 1 |
| `admin_store_live_overview` | 1 |
| `admin_update_store` | 1 |
| `aplicar_regularizacao_fechamento` | 1 |
| `archive_action_plan_template` | 1 |
| `atribuir_trilha_maturidade_vendedor` | 1 |
| `atualizar_etapa_oportunidade_crm` | 1 |
| `atualizar_plano_acao` | 2 |
| `atualizar_plano_acao_patch` | 3 |
| `atualizar_status_agendamento_crm` | 1 |
| `atualizar_visibilidade_indicador_ciclo` | 1 |
| `begin_password_change` | 2 |
| `cancelar_regularizacao_fechamento` | 1 |
| `cancelar_venda` | 1 |
| `carteira_atualizar_missao_v2` | 1 |
| `carteira_iniciar_missao_v2` | 1 |
| `carteira_listar_campanhas` | 1 |
| `carteira_salvar_campanha` | 1 |
| `carteira_salvar_cliente_v2` | 1 |
| `complete_password_change` | 2 |
| `compute_individual_score_mvp` | 1 |
| `concluir_etapa_trilha` | 1 |
| `concluir_visita_consultoria` | 1 |
| `concluir_visitas_legadas_consultoria` | 2 |
| `consolidar_dashboard_departamento` | 1 |
| `consolidate_seller_routine_snapshots` | 1 |
| `consolidate_store_target_plan` | 2 |
| `consultar_liberacao_por_token` | 1 |
| `consultor_ia_sugerir_acao` | 1 |
| `contar_vendedores_ativos_loja` | 2 |
| `convert_action_plan_suggestion` | 1 |
| `create_pdi_session_bundle` | 1 |
| `criar_agendamento_crm` | 1 |
| `criar_oportunidade_crm` | 1 |
| `criar_plano_acao_planejamento_unico` | 1 |
| `criar_plano_acao_v2` | 3 |
| `dismiss_alert` | 1 |
| `duplicate_consulting_product` | 1 |
| `enviar_cobranca_diaria` | 1 |
| `exportar_contatos_cadastros_mx` | 2 |
| `foo` | 1 |
| `gerar_recomendacoes_desenvolvimento_feedback` | 1 |
| `gerar_recomendacoes_desenvolvimento_pdi` | 1 |
| `get_admin_indicator_target_aggregates` | 1 |
| `get_benchmark` | 1 |
| `get_lancamento_por_dia` | 2 |
| `get_lancamentos_por_loja_periodo` | 7 |
| `get_lancamentos_por_vendedor_periodo` | 3 |
| `get_lancamentos_rede_periodo` | 4 |
| `get_lancamentos_referencia_dia` | 6 |
| `get_owner_consultant_contact` | 1 |
| `get_owner_consulting_program_summary` | 1 |
| `get_pdi_form_template` | 1 |
| `get_pdi_print_bundle` | 1 |
| `get_prova_aula` | 1 |
| `get_strategic_plan_indicator_counts` | 1 |
| `get_suggested_actions` | 1 |
| `get_vendas_oficiais_periodo` | 3 |
| `inicializar_cadencia_cliente` | 1 |
| `inicializar_progresso_trilha` | 1 |
| `liberar_fechamento_por_token` | 1 |
| `listar_acoes_cadencia_vendedor` | 1 |
| `listar_responsaveis_tratativa_loja` | 1 |
| `open_action_plan_template_revision` | 1 |
| `operar_ciclo_plano_estrategico` | 1 |
| `pode_gerir_metas_planejamento` | 1 |
| `process_import_data` | 1 |
| `reconcile_action_plan_applications` | 1 |
| `reconcile_action_plan_template_drafts` | 1 |
| `record_d1_contact_action` | 1 |
| `refresh_manager_daily_tasks` | 1 |
| `registrar_auditoria_loja` | 1 |
| `registrar_status_acao_cadencia` | 1 |
| `registrar_venda_direta` | 1 |
| `rejeitar_regularizacao_fechamento` | 1 |
| `resolve_alert` | 1 |
| `restaurar_metas_indicador_planejamento` | 3 |
| `saldo_presencial_cliente` | 2 |
| `salvar_ano_anterior_indicador_planejamento` | 1 |
| `salvar_metas_indicador_planejamento` | 3 |
| `salvar_realizado_indicador_planejamento` | 2 |
| `save_action_plan_template_draft` | 1 |
| `save_manager_lead_conference` | 1 |
| `send_broadcast_notification` | 1 |
| `solicitar_liberacao_fechamento` | 1 |
| `solicitar_regularizacao_fechamento` | 1 |
| `submeter_prova_aula` | 1 |
| `submeter_quiz_treinamento` | 1 |
| `submit_checkin` | 2 |
| `toggle_action_plan_checklist_item` | 1 |
| `update_d1_confirmation` | 1 |
| `update_my_profile` | 1 |
| `upsert_funnel_metrics_snapshot` | 1 |
| `validar_ciclo_plano_estrategico` | 1 |
| `vendedor_concluir_execution_action` | 1 |
| `vendedor_enviar_pdi_acao_central` | 1 |
| `vendedor_performance_oficial` | 2 |
| `vendedor_vincular_conteudo_pdi_acao` | 1 |

## Edge Functions

| Recurso | Arquivos consumidores |
|---|---:|
| `approve-store-registration` | 2 |
| `executive-agenda-google-sync` | 1 |
| `google-calendar-events` | 1 |
| `google-calendar-merged` | 1 |
| `google-calendar-sync` | 2 |
| `google-drive-files` | 1 |
| `google-oauth-handler` | 2 |
| `manage-global-user` | 1 |
| `manage-store-team` | 1 |
| `openrouter-generate` | 1 |
| `register-user` | 2 |
| `relatorio-${type}` | 1 |
| `relatorio-matinal` | 1 |
| `send-visit-report` | 1 |
