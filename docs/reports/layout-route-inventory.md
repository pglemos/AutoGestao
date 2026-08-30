# Inventário de Rotas — Layout

- Gerado em: 2026-08-30T08:02:51.666Z
- Baseline SHA: `3567d2279ebb79be0aea401294496aadfe54540e`
- Total de rotas: 128

| Path | Rota p/ perfil | Arquivo(s) | Canvas | Template | Estrutural | Width | Clearance | Adotada |
|---|---|---|---|---|---|---|---|---|
| / | *:PublicHome | — | 0 | 0 | 0 | dashboard | — | não |
| /* | *:NotFound | `src/pages/NotFound.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /agenda | *:AgendaAdmin | `src/features/agenda-admin/AgendaAdmin.container.tsx` | 0 | 4 | 0 | dashboard | — | não |
| /ajuda | vendedor:VendedorAjuda, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/VendedorAjuda.tsx` | 0 | 4 | 0 | dashboard | — | não |
| /auditoria | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminSegurancaAuditoriaPage | `src/features/admin-mx/AdminSegurancaAuditoriaPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /banco-talentos | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:Comportamental, admin:Comportamental | `src/features/comportamental/ComportamentalPage.tsx` | 3 | 0 | 0 | dashboard | — | sim |
| /benchmark | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:AdminBenchmarkPage, admin:AdminBenchmarkPage | `src/features/admin-mx/AdminBenchmarkPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /carteira | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /carteira-clientes | vendedor:CarteiraClientes, gerente:CarteiraClientes, dono:CarteiraClientes, admin:CarteiraClientes | `src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx` | 3 | 0 | 0 | wide | navigation | sim |
| /central-de-execucao | vendedor:CentralExecucao, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/central-execucao/pages/CentralExecucaoPage.tsx` | 3 | 0 | 0 | dashboard | navigation | sim |
| /central-execucao | vendedor:CentralExecucao, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/central-execucao/pages/CentralExecucaoPage.tsx` | 3 | 0 | 0 | dashboard | navigation | sim |
| /classificacao | *:Ranking | `src/features/ranking/Ranking.container.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /clientes | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:InternalClientsPage | `src/features/internal-mx-planning/InternalClientsPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /clientes/:clientSlug | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminClienteDetalhePage | `src/features/admin-mx/AdminClienteDetalhePage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /clientes/:clientSlug/consultoria | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminConsultoriaEntregasPage | `src/features/admin-mx/consultoria/AdminConsultoriaEntregasPage.tsx` | 0 | 0 | 1 | wide | navigation | sim |
| /clientes/:clientSlug/plano-acao | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:InternalActionPlanPage | `src/features/internal-mx-planning/InternalActionPlanPage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /clientes/:clientSlug/plano-estrategico | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:InternalStrategicPlanPage | `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx` | 1 | 0 | 0 | dashboard | navigation | sim |
| /clientes/:clientSlug/plano-estrategico/:year | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:InternalStrategicPlanPage | `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx` | 1 | 0 | 0 | dashboard | navigation | sim |
| /clientes/novo | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminNovoClientePage | `src/features/admin-mx/AdminNovoClientePage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /configuracoes | vendedor:VendedorConfiguracoes, gerente:Configuracoes, dono:Configuracoes, admin:Configuracoes | `src/pages/VendedorConfiguracoes.tsx`<br>`src/pages/Configuracoes.tsx` | 0 | 4 | 0 | dashboard | — | não |
| /configuracoes/consultoria-pmr | *:ConsultoriaParametros | `src/pages/ConsultoriaParametros.tsx` | 0 | 0 | 0 | focused | none | sim |
| /configuracoes/remuneracao | *:Configuracoes | `src/pages/Configuracoes.tsx` | 0 | 0 | 0 | dashboard | navigation | sim |
| /consultor-ia | *:ConsultorIaAliasRedirect | — | 0 | 0 | 0 | reading | actions | não |
| /consultoria | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerConsultoria, admin:InternalConsultingPage | `src/features/internal-mx-planning/InternalConsultingPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /consultoria-mx | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminConsultoriaMxPage | `src/features/admin-mx/AdminConsultoriaMxPage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /consultoria/clientes | *:Navigate | — | 0 | 0 | 0 | wide | navigation | não |
| /consultoria/clientes/:clientSlug | *:ConsultoriaClienteDetalhe | `src/pages/ConsultoriaClienteDetalhe.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /consultoria/clientes/:clientSlug/visitas/:visitNumber | *:ConsultoriaVisitaExecucao | `src/pages/ConsultoriaVisitaExecucao.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /dados | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminDadosConciliacaoPage | `src/features/admin-mx/AdminDadosConciliacaoPage.tsx` | 0 | 0 | 1 | dashboard | — | não |
| /dados-conciliacao | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminDadosConciliacaoPage | `src/features/admin-mx/AdminDadosConciliacaoPage.tsx` | 0 | 0 | 1 | wide | navigation | sim |
| /decisoes | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | dashboard | — | não |
| /departamentos | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | dashboard | — | não |
| /departamentos/comercial | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /departamentos/financeiro | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /departamentos/marketing | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /departamentos/operacoes | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /departamentos/pessoas-rh | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /departamentos/produto-e-estoque | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /desenvolvimento | vendedor:VendedorDesenvolvimento, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/VendedorDesenvolvimento.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /devolutivas | vendedor:VendedorDesenvolvimento, gerente:GerenteFeedback, dono:GerenteFeedback, admin:GerenteFeedback | `src/pages/VendedorDesenvolvimento.tsx`<br>`src/features/gerente-feedback/GerenteFeedback.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /dono/* | *:OwnerLegacyPathRedirect | — | 0 | 0 | 0 | dashboard | — | não |
| /equipe | vendedor:TeamAliasRedirect, gerente:TeamAliasRedirect, dono:TeamAliasRedirect, admin:AdminEquipeMxPage | `src/features/admin-mx/AdminEquipeMxPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /falar-consultor | vendedor:ForbiddenRoute, gerente:FalarConsultorDono, dono:FalarConsultorDono, admin:ForbiddenRoute | `src/features/dono/FalarConsultorDono.tsx` | 3 | 0 | 0 | dashboard | navigation | sim |
| /fechamento-diario | vendedor:Checkin, gerente:ManagerDailyClosing, dono:ManagerDailyClosing, admin:ManagerDailyClosing | `src/features/checkin/Checkin.container.tsx`<br>`src/features/manager/daily-closing/ManagerDailyClosing.container.tsx` | 5 | 0 | 1 | dashboard | actions | sim |
| /feedback | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /feedbacks | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /feedbacks-pdis | vendedor:ForbiddenRoute, gerente:ManagerDevelopment, dono:ManagerDevelopment, admin:ManagerDevelopment | `src/pages/ManagerDevelopment.tsx` | 0 | 0 | 0 | focused | — | sim |
| /forgot-password | *:Login | `src/pages/Login.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /funil | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /funil-comercial | vendedor:FunilVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/FunilVendedor.tsx` | 5 | 0 | 1 | dashboard | navigation | sim |
| /funil-vendas | vendedor:ForbiddenRoute, gerente:FunilVendasGerente, dono:FunilVendasGerente, admin:ForbiddenRoute | `src/features/gerente/FunilVendasGerente.tsx` | 3 | 0 | 0 | dashboard | navigation | sim |
| /gerente/* | *:ManagerLegacyPathRedirect | — | 0 | 0 | 0 | dashboard | — | não |
| /home | vendedor:VendedorHome, gerente:DashboardLoja, dono:DashboardLoja, admin:RoleRedirect | `src/pages/VendedorHome.tsx`<br>`src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | dashboard | — | não |
| /indicadores | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminIndicadoresPage | `src/features/admin-mx/AdminIndicadoresPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /lancamento-diario | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | actions | não |
| /liberacao-fechamento | *:LiberacaoFechamento | `src/pages/LiberacaoFechamento.tsx` | 0 | 0 | 2 | wide | — | não |
| /login | *:Login | `src/pages/Login.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /lojas | *:Navigate | — | 0 | 0 | 0 | dashboard | — | não |
| /lojas/:storeSlug | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /lojas/:storeSlug/consultor-ia | vendedor:StoreConsultorIa, gerente:StoreConsultorIa, dono:StoreConsultorIa, admin:StoreConsultorIa | `src/features/central-mx/StoreConsultorIa.container.tsx` | 0 | 6 | 1 | dashboard | navigation | sim |
| /lojas/:storeSlug/equipe | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | wide | — | sim |
| /lojas/:storeSlug/filiais | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:StoreBranches | `src/features/filiais/StoreBranches.container.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /mapa-funcional | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminMapaFuncionalPage | `src/features/admin-mx/AdminMapaFuncionalPage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /mentor | vendedor:ForbiddenRoute, gerente:ManagerMentor, dono:ManagerMentor, admin:ManagerMentor | `src/pages/ManagerMentor.tsx` | 3 | 0 | 1 | dashboard | — | não |
| /mentor-comercial | *:RedirectWithSearch | — | 0 | 0 | 0 | reading | actions | não |
| /mercado | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | dashboard | — | não |
| /meta-loja | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | focused | — | sim |
| /metas | *:Navigate | — | 0 | 0 | 0 | dashboard | — | não |
| /meu-dia | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | navigation | não |
| /meu-funil | vendedor:FunilVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/FunilVendedor.tsx` | 5 | 0 | 1 | dashboard | navigation | sim |
| /meu-perfil | *:RedirectWithSearch | — | 0 | 0 | 0 | form | — | não |
| /meu-perfil-vendedor | *:RedirectWithSearch | — | 0 | 0 | 0 | form | — | não |
| /minha-equipe | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | dashboard | — | sim |
| /minha-meta | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /minha-remuneracao | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /minhas-lojas | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerStoresNetworkPage, admin:ForbiddenRoute | `src/features/owner/OwnerStoresNetworkPage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /notificacoes | vendedor:Notificacoes, gerente:Notificacoes, dono:Notificacoes, admin:Notificacoes | `src/features/notificacoes/Notificacoes.container.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /observabilidade | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminObservabilidadePage | `src/features/admin-mx/AdminObservabilidadePage.tsx` | 0 | 0 | 1 | dashboard | — | não |
| /organograma | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:Organograma, admin:Organograma | `src/features/organograma/OrganogramaPage.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /painel | *:PainelConsultor | `src/pages/PainelConsultor.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /pdi | vendedor:Navigate, gerente:GerentePDI, dono:GerentePDI, admin:GerentePDI | `src/pages/GerentePDI.tsx` | 0 | 8 | 0 | dashboard | — | não |
| /pdi/:id/print | *:ProtectedRoute | — | 0 | 0 | 0 | reading | none | não |
| /perfil | vendedor:MeuPerfilVendedor, gerente:Perfil, dono:Perfil, admin:Perfil | `src/features/vendedor-perfil/MeuPerfilVendedor.container.tsx`<br>`src/pages/Perfil.tsx` | 0 | 6 | 0 | dashboard | — | não |
| /plano-acao | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerPlanoDeAcao, admin:InternalActionPlanPage | `src/features/internal-mx-planning/InternalActionPlanPage.tsx` | 0 | 0 | 0 | focused | actions | não |
| /plano-estrategico | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerPlanoEstrategico, admin:InternalStrategicPlanPage | `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx` | 1 | 0 | 0 | dashboard | navigation | sim |
| /planos-acao | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminPlanosAcaoGlobalPage | `src/features/admin-mx/AdminPlanosAcaoGlobalPage.tsx` | 0 | 0 | 4 | wide | navigation | sim |
| /pre-cadastro/:storeSlug | *:StorePreRegistration | `src/pages/StorePreRegistration.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /privacy | *:Privacy | `src/pages/Privacy.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /produtos | vendedor:ProdutosDigitais, gerente:ProdutosDigitais, dono:ProdutosDigitais, admin:AdminProdutosConsultoriaPage | `src/features/digital-products/DigitalProductsPage.tsx`<br>`src/features/admin-mx/AdminProdutosConsultoriaPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /ranking | *:Ranking | `src/features/ranking/Ranking.container.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /relatorio-matinal | *:MorningReport | `src/pages/MorningReport.tsx` | 3 | 0 | 0 | dashboard | navigation | sim |
| /relatorios | vendedor:RelatoriosVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/crm/RelatoriosVendedor.container.tsx` | 0 | 6 | 0 | dashboard | — | não |
| /relatorios-vendedor | vendedor:RelatoriosVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/crm/RelatoriosVendedor.container.tsx` | 0 | 6 | 0 | wide | navigation | sim |
| /relatorios/performance-vendas | *:SalesPerformance | `src/features/sales-performance/SalesPerformance.container.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /relatorios/performance-vendedor | *:SellerPerformance | `src/features/seller-performance/SellerPerformancePage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /reset-password | *:Login | `src/pages/Login.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /roteiro-testes | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminRoteiroTestesPage | `src/features/admin-mx/AdminRoteiroTestesPage.tsx` | 0 | 0 | 0 | wide | navigation | sim |
| /rotina | vendedor:ForbiddenRoute, gerente:RotinaGerente, dono:OwnerRoutineRoute, admin:RotinaGerente | `src/features/manager/day-routine/ManagerDayRoutineCanonical.container.tsx`<br>`src/features/owner/OwnerRoutineRoute.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /rotina-do-dia | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | actions | não |
| /rotina-equipe | vendedor:ForbiddenRoute, gerente:ManagerTeamRoutine, dono:ManagerTeamRoutine, admin:ManagerTeamRoutine | `src/features/manager/team-routine/ManagerTeamRoutine.container.tsx` | 0 | 0 | 0 | focused | actions | sim |
| /scores | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminScoresAlertasPage | `src/features/admin-mx/AdminScoresAlertasPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /scores-alertas | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminScoresAlertasPage | `src/features/admin-mx/AdminScoresAlertasPage.tsx` | 0 | 0 | 0 | dashboard | navigation | sim |
| /seguranca | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminSegurancaAuditoriaPage | `src/features/admin-mx/AdminSegurancaAuditoriaPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /settings | *:Navigate | — | 0 | 0 | 0 | dashboard | — | não |
| /simulacao | *:Simulacao | `src/pages/Simulacao.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /simulacao/:simulationRole | *:Simulacao | `src/pages/Simulacao.tsx` | 0 | 0 | 0 | focused | — | não |
| /suporte | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:AdminSuporteIncidentesPage | `src/features/admin-mx/AdminSuporteIncidentesPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /team | *:TeamAliasRedirect | — | 0 | 0 | 0 | dashboard | — | não |
| /terminal-mx | vendedor:Checkin, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/checkin/Checkin.container.tsx` | 3 | 0 | 1 | dashboard | navigation | sim |
| /terms | *:Terms | `src/pages/Terms.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /treinamentos | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /universidade | *:Navigate | — | 0 | 0 | 0 | dashboard | — | não |
| /universidade-mx | vendedor:UniversidadeMxRoute, gerente:GerenteTreinamentos, dono:DashboardLoja, admin:ConsultorTreinamentos | `src/pages/GerenteTreinamentos.tsx`<br>`src/features/dashboard-loja/DashboardLoja.container.tsx`<br>`src/pages/ConsultorTreinamentos.tsx` | 5 | 0 | 1 | dashboard | navigation | sim |
| /vendas | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 5 | 0 | 0 | dashboard | — | não |
| /vendedor/carteira | *:RedirectWithSearch | — | 0 | 0 | 0 | wide | navigation | não |
| /vendedor/configuracoes | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | navigation | não |
| /vendedor/desenvolvimento | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /vendedor/devolutivas | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /vendedor/feedback | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /vendedor/funil | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | navigation | não |
| /vendedor/mentor-comercial | *:RedirectWithSearch | — | 0 | 0 | 0 | reading | actions | não |
| /vendedor/meu-funil | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | navigation | não |
| /vendedor/minha-meta | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /vendedor/perfil | *:RedirectWithSearch | — | 0 | 0 | 0 | form | — | não |
| /vendedor/rotina-do-dia | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | actions | não |
| /vendedor/terminal-mx | vendedor:Checkin, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/checkin/Checkin.container.tsx` | 3 | 0 | 1 | dashboard | navigation | sim |
| /vendedor/treinamentos | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /vendedor/universidade-mx | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
