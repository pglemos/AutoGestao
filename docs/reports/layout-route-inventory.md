# Inventário de Rotas — Layout

- Gerado em: 2026-08-11T17:51:29.425Z
- Baseline SHA: `3d8158ea7be78d794ad845b43fa90f77c24eb238`
- Total de rotas: 107

| Path | Rota p/ perfil | Arquivo(s) | Canvas | Template | Estrutural | Width | Clearance | Adotada |
|---|---|---|---|---|---|---|---|---|
| / | *:PublicHome | — | 0 | 0 | 0 | dashboard | — | não |
| /* | *:NotFound | `src/pages/NotFound.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /agenda | *:AgendaAdmin | `src/features/agenda-admin/AgendaAdmin.container.tsx` | 0 | 4 | 0 | dashboard | — | não |
| /ajuda | vendedor:VendedorAjuda, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/VendedorAjuda.tsx` | 0 | 4 | 0 | dashboard | — | não |
| /auditoria | vendedor:ForbiddenRoute, gerente:AiDiagnostics, dono:ForbiddenRoute, admin:AiDiagnostics | `src/pages/AiDiagnostics.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /banco-talentos | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:Comportamental, admin:Comportamental | `src/features/comportamental/ComportamentalPage.tsx` | 3 | 0 | 0 | dashboard | — | sim |
| /carteira | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /carteira-clientes | vendedor:CarteiraClientes, gerente:CarteiraClientes, dono:CarteiraClientes, admin:CarteiraClientes | `src/features/carteira-clientes/pages/CarteiraClientesBase44Page.tsx` | 0 | 0 | 0 | wide | — | não |
| /central-de-execucao | vendedor:CentralExecucao, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/central-execucao/pages/CentralExecucaoPage.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /central-execucao | vendedor:CentralExecucao, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/central-execucao/pages/CentralExecucaoPage.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /classificacao | *:Ranking | `src/features/ranking/Ranking.container.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /configuracoes | vendedor:VendedorConfiguracoes, gerente:Configuracoes, dono:Configuracoes, admin:Configuracoes | `src/pages/VendedorConfiguracoes.tsx`<br>`src/pages/Configuracoes.tsx` | 0 | 4 | 0 | dashboard | — | não |
| /configuracoes/consultoria-pmr | *:ConsultoriaParametros | `src/pages/ConsultoriaParametros.tsx` | 0 | 0 | 0 | focused | — | não |
| /configuracoes/operacional | *:OperationalSettings | `src/pages/OperationalSettings.tsx` | 0 | 0 | 0 | focused | — | não |
| /configuracoes/remuneracao | *:Configuracoes | `src/pages/Configuracoes.tsx` | 0 | 0 | 0 | focused | — | não |
| /configuracoes/reprocessamento | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:Reprocessamento | `src/features/reprocessing/ReprocessingGuardedPage.tsx` | 0 | 0 | 0 | form | — | não |
| /consultor-ia | *:ConsultorIaAliasRedirect | — | 0 | 0 | 0 | reading | actions | não |
| /consultoria | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerConsultoria, admin:InternalConsultingPage | `src/features/internal-mx-planning/InternalConsultingPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /consultoria/clientes | *:ConsultoriaClientes | `src/pages/ConsultoriaClientes.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /consultoria/clientes/:clientSlug | *:ConsultoriaClienteDetalhe | `src/pages/ConsultoriaClienteDetalhe.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /consultoria/clientes/:clientSlug/visitas/:visitNumber | *:ConsultoriaVisitaExecucao | `src/pages/ConsultoriaVisitaExecucao.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /decisoes | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /departamentos | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /departamentos/comercial | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /departamentos/financeiro | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /departamentos/marketing | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /departamentos/operacoes | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /departamentos/pessoas-rh | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /departamentos/produto-e-estoque | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /desenvolvimento | vendedor:VendedorDesenvolvimento, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/VendedorDesenvolvimento.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /devolutivas | vendedor:VendedorDesenvolvimento, gerente:GerenteFeedback, dono:GerenteFeedback, admin:GerenteFeedback | `src/pages/VendedorDesenvolvimento.tsx`<br>`src/features/gerente-feedback/GerenteFeedback.container.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /dono/* | *:OwnerLegacyPathRedirect | — | 0 | 0 | 0 | dashboard | — | não |
| /equipe | *:TeamAliasRedirect | — | 0 | 0 | 0 | dashboard | — | não |
| /falar-consultor | vendedor:ForbiddenRoute, gerente:FalarConsultorDono, dono:FalarConsultorDono, admin:ForbiddenRoute | `src/features/dono/FalarConsultorDono.tsx` | 3 | 0 | 1 | dashboard | navigation | sim |
| /fechamento-diario | vendedor:Checkin, gerente:ManagerDailyClosing, dono:ManagerDailyClosing, admin:ManagerDailyClosing | `src/features/checkin/Checkin.container.tsx`<br>`src/features/manager/daily-closing/ManagerDailyClosing.container.tsx` | 5 | 0 | 1 | focused | actions | não |
| /feedback | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /feedbacks | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /feedbacks-pdis | vendedor:ForbiddenRoute, gerente:ManagerDevelopment, dono:ManagerDevelopment, admin:ManagerDevelopment | `src/pages/ManagerDevelopment.tsx` | 0 | 0 | 0 | focused | — | não |
| /forgot-password | *:Login | `src/pages/Login.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /funil | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | — | não |
| /funil-comercial | vendedor:FunilVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/FunilVendedor.tsx` | 3 | 0 | 1 | dashboard | navigation | sim |
| /funil-vendas | vendedor:ForbiddenRoute, gerente:FunilVendasGerente, dono:FunilVendasGerente, admin:ForbiddenRoute | `src/features/gerente/FunilVendasGerente.tsx` | 3 | 0 | 0 | dashboard | navigation | sim |
| /home | vendedor:VendedorHome, gerente:DashboardLoja, dono:DashboardLoja, admin:RoleRedirect | `src/pages/VendedorHome.tsx`<br>`src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 1 | dashboard | — | não |
| /lancamento-diario | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | actions | não |
| /liberacao-fechamento | *:LiberacaoFechamento | `src/pages/LiberacaoFechamento.tsx` | 0 | 0 | 2 | wide | — | não |
| /login | *:Login | `src/pages/Login.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /lojas | *:Lojas | `src/features/lojas/Lojas.container.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /lojas/:storeSlug | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | wide | — | não |
| /lojas/:storeSlug/consultor-ia | vendedor:StoreConsultorIa, gerente:StoreConsultorIa, dono:StoreConsultorIa, admin:StoreConsultorIa | `src/features/central-mx/StoreConsultorIa.container.tsx` | 0 | 6 | 1 | focused | — | não |
| /lojas/:storeSlug/equipe | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | wide | — | não |
| /lojas/:storeSlug/filiais | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:StoreBranches | `src/features/filiais/StoreBranches.container.tsx` | 0 | 0 | 0 | wide | — | não |
| /mentor | vendedor:ForbiddenRoute, gerente:ManagerMentor, dono:ManagerMentor, admin:ManagerMentor | `src/pages/ManagerMentor.tsx` | 0 | 0 | 2 | reading | actions | não |
| /mentor-comercial | *:RedirectWithSearch | — | 0 | 0 | 0 | reading | actions | não |
| /mercado | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:DashboardLoja, admin:ForbiddenRoute | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /meta-loja | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | focused | — | não |
| /metas | *:Navigate | — | 0 | 0 | 0 | dashboard | — | não |
| /meu-dia | *:RedirectWithSearch | — | 0 | 0 | 0 | dashboard | navigation | não |
| /meu-funil | vendedor:FunilVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/pages/FunilVendedor.tsx` | 3 | 0 | 1 | dashboard | navigation | sim |
| /meu-perfil | *:RedirectWithSearch | — | 0 | 0 | 0 | form | — | não |
| /meu-perfil-vendedor | *:RedirectWithSearch | — | 0 | 0 | 0 | form | — | não |
| /minha-equipe | vendedor:ForbiddenRoute, gerente:DashboardLoja, dono:DashboardLoja, admin:DashboardLoja | `src/features/dashboard-loja/DashboardLoja.container.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /minha-meta | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /minha-remuneracao | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | — | não |
| /minhas-lojas | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerStoresNetworkPage, admin:ForbiddenRoute | `src/features/owner/OwnerStoresNetworkPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /notificacoes | vendedor:Notificacoes, gerente:Notificacoes, dono:Notificacoes, admin:Notificacoes | `src/features/notificacoes/Notificacoes.container.tsx` | 0 | 0 | 1 | dashboard | — | não |
| /organograma | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:Organograma, admin:Organograma | `src/features/organograma/OrganogramaPage.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /painel | *:PainelConsultor | `src/features/network-dashboard/NetworkDashboardPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /pdi | vendedor:Navigate, gerente:GerentePDI, dono:GerentePDI, admin:GerentePDI | `src/pages/GerentePDI.tsx` | 0 | 6 | 1 | dashboard | — | não |
| /pdi/:id/print | *:PDIPrint | `src/pages/PDIPrint.tsx` | 0 | 0 | 1 | reading | none | não |
| /perfil | vendedor:MeuPerfilVendedor, gerente:Perfil, dono:Perfil, admin:Perfil | `src/features/vendedor-perfil/MeuPerfilVendedor.container.tsx`<br>`src/pages/Perfil.tsx` | 0 | 6 | 0 | dashboard | — | não |
| /plano-acao | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerPlanoDeAcao, admin:InternalActionPlanPage | `src/features/internal-mx-planning/InternalActionPlanPage.tsx` | 0 | 0 | 0 | focused | actions | não |
| /plano-estrategico | vendedor:ForbiddenRoute, gerente:ForbiddenRoute, dono:OwnerPlanoEstrategico, admin:InternalStrategicPlanPage | `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /pre-cadastro/:storeSlug | *:StorePreRegistration | `src/pages/StorePreRegistration.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /privacy | *:Privacy | `src/pages/Privacy.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /produtos | *:ProdutosDigitais | `src/features/digital-products/DigitalProductsPage.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /ranking | *:Ranking | `src/features/ranking/Ranking.container.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /relatorio-matinal | *:MorningReport | `src/pages/MorningReport.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /relatorios | vendedor:RelatoriosVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/crm/RelatoriosVendedor.container.tsx` | 0 | 6 | 0 | dashboard | — | não |
| /relatorios-vendedor | vendedor:RelatoriosVendedor, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/crm/RelatoriosVendedor.container.tsx` | 0 | 6 | 0 | wide | — | não |
| /relatorios/performance-vendas | *:SalesPerformance | `src/features/sales-performance/SalesPerformance.container.tsx` | 0 | 0 | 0 | wide | — | não |
| /relatorios/performance-vendedor | *:SellerPerformance | `src/features/seller-performance/SellerPerformancePage.tsx` | 0 | 0 | 0 | wide | — | não |
| /reset-password | *:Login | `src/pages/Login.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /rotina | vendedor:ForbiddenRoute, gerente:RotinaGerente, dono:OwnerRoutineRoute, admin:RotinaGerente | `src/features/manager/day-routine/ManagerDayRoutineCanonical.container.tsx`<br>`src/features/owner/OwnerRoutineRoute.tsx` | 3 | 0 | 0 | dashboard | — | não |
| /rotina-do-dia | *:RedirectWithSearch | — | 0 | 0 | 0 | focused | actions | não |
| /rotina-equipe | vendedor:ForbiddenRoute, gerente:ManagerTeamRoutine, dono:ManagerTeamRoutine, admin:ManagerTeamRoutine | `src/features/manager/team-routine/ManagerTeamRoutine.container.tsx` | 0 | 0 | 0 | focused | actions | não |
| /settings | *:Navigate | — | 0 | 0 | 0 | dashboard | — | não |
| /simulacao | *:Simulacao | `src/pages/Simulacao.tsx` | 0 | 0 | 0 | dashboard | — | não |
| /simulacao/:simulationRole | *:Simulacao | `src/pages/Simulacao.tsx` | 0 | 0 | 0 | focused | — | não |
| /team | *:TeamAliasRedirect | — | 0 | 0 | 0 | dashboard | — | não |
| /terminal-mx | vendedor:Checkin, gerente:ForbiddenRoute, dono:ForbiddenRoute, admin:ForbiddenRoute | `src/features/checkin/Checkin.container.tsx` | 3 | 0 | 1 | dashboard | navigation | sim |
| /terms | *:Terms | `src/pages/Terms.tsx` | 0 | 0 | 2 | dashboard | — | não |
| /treinamentos | vendedor:RedirectWithSearch, gerente:GerenteTreinamentos, dono:DashboardLoja, admin:ConsultorTreinamentos | `src/pages/GerenteTreinamentos.tsx`<br>`src/features/dashboard-loja/DashboardLoja.container.tsx`<br>`src/pages/ConsultorTreinamentos.tsx` | 3 | 6 | 1 | dashboard | — | não |
| /universidade-mx | vendedor:UniversidadeMxRoute, gerente:GerenteTreinamentos, dono:DashboardLoja, admin:ConsultorTreinamentos | `src/pages/GerenteTreinamentos.tsx`<br>`src/features/dashboard-loja/DashboardLoja.container.tsx`<br>`src/pages/ConsultorTreinamentos.tsx` | 3 | 6 | 1 | dashboard | — | não |
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
