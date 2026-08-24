# GAP matrix Base44 → MX — 2026-08-23

Fonte: `AUDIT-base44-live-2026-08-23.md` × `AUDIT-mx-live-2026-08-23.md`  
Severidade: **P0** bloqueia paridade/aceite · **P1** gap funcional relevante · **P2** cosmético/rota/label

| ID | Área | Gap | Severidade | Evidência MX |
|----|------|-----|------------|--------------|
| G01 | Aceite Admin↔Dono | Célula única validável via Diagnóstico de Dados + overlay CONSOLIDATED; AG ainda sem metas publicadas limita prova numérica | P0→parcial | OwnerDataDiagnosticsPanel; applyOwnerScopeSeries; QA-admin-dono-diag |
| G02 | Panorama KPIs | Com Bloqueios não conta mais ativo só por falta de Master; Ativos≠bloqueios | P0→corrigido | clientBuckets |
| G03 | Clientes onboarding | Coluna Onboarding usa jornada real (`N de M`) em vez de Etapa 1/7 presa | P0→corrigido | PortfolioOverviewTab.onboardingLabel |
| G04 | Dataset demo | Ausência de MX VEÍCULOS TESTE 4 / demo Base44 na carteira live | P1 | `/clientes` carteira 43 reais |
| G05 | Sidebar | Falta **Benchmark e Mercado** | P1 | Sidebar admin — `/mercado` só Dono; sem página Admin |
| G06 | Sidebar | Falta **Dados e Conciliação** | P1→corrigido | Nav `/dados` + routeAccess |
| G07 | Sidebar | Falta **Segurança e Auditoria** | P1→corrigido | Nav `/auditoria` alias + routeAccess (antes só `/seguranca`) |
| G08 | Sidebar | Falta item **Consultoria MX** sob Produto (só Operação) | P2 | Sidebar |
| G09 | Rotas | Paths divergentes (`/plano-estrategico` vs `/indicadores`; `/plano-acao` vs `/planos-acao`; `/universidade-mx`) | P2 | Sidebar hrefs |
| G10 | Início widgets | Ações Rápidas Base44 ≠ Acesso Rápido MX | P2 | `/painel` |
| G11 | Plano Estratégico | Contadores (45 vs 46; arquivados 17 vs 9) | P2 | `/plano-estrategico` |
| G12 | Planos de Ação | Totais templates/rascunhos ≠ Base44; aba extra “Planos da rede” | P2 | `/plano-acao` |
| G13 | AG detalhe | Dono Master não definido (impeditivo) apesar de usuários DONO | P1 | Pessoas AG |
| G14 | AG plano | Plano Estratégico sem metas publicadas; 0 planos de ação no cliente | P0 | Visão geral AG |
| G15 | Tooling evidência | cursor-ide-browser instável (abas evaporam); shots PNG não gravados no workspace pelo DevTools MCP | P2 | Sessão subagent |

## P0 (resumo)

1. **Paridade Admin↔Dono** impossível no aceite VEÍCULOS TESTE 4 / mesma célula — PE sem metas + Dono simulado noutro cliente.  
2. **KPIs do Panorama** com contagem duplicada/errada (43/43/43).  
3. **Carteira** com onboarding/fase inconsistentes (1/7 em massa).  
4. **AG** sem plano estratégico publicado nem planos de ação aplicados.
