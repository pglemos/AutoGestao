# MX PERFORMANCE

Sistema operacional de gestão de performance comercial em lojas automotivas, baseado nos rituais da Metodologia MX: lançamento diário, funil 20/60/33, ranking, feedback estruturado, PDI, treinamentos, relatórios recorrentes e reprocessamento de dados.

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3FCF8E?style=flat-square&logo=supabase)](https://supabase.com/)

## Identidade Do Projeto

- Nome do produto: `MX PERFORMANCE`
- Repositório GitHub: `https://github.com/pglemos/MXGESTAOPREDITIVA`
- Projeto Vercel: `mxperformance`
- Vercel Project ID: `prj_fpYjxc851kMs55GzR6tgQEr7uWUj`
- Stack: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, Radix UI, Recharts, Motion, Sonner, Bun (testes)

## O Que Este Projeto Faz

O aplicativo organiza a rotina de vendas por papel operacional:

- **Vendedor** registra o ritual diário no Terminal MX, acompanha funil, carteira de clientes, central de execução, ranking, devolutivas, PDI, Universidade MX (treinamentos), relatórios e notificações.
- **Gerente** audita a grade do dia, cobra pendentes, acompanha painel da loja, equipe, metas, funil de vendas, mentor, feedbacks e PDIs, rotina gerencial e relatórios.
- **Dono** acompanha suas lojas como visão executiva: performance, metas, funil, departamentos, mercado, plano estratégico, central de decisões, organizograma, banco de talentos, relatórios e consultoria.
- **Perfil interno MX** (administrador geral, administrador MX e consultor MX) tem governança total: lojas, usuários, metas, benchmarks, treinamentos, produtos digitais, notificações, reprocessamento, feedback, PDI e consultoria.

## Módulos Principais

- **Autenticação e autorização** via Supabase Auth, tabela `users`, `memberships` e papéis canônicos (`admin_mx`, `master`, `director`, `sales_manager`, `seller`, `consultant`, `marketing`, `product`, `finance`, `hr`, `operations`), com normalização de aliases legados (`owner`, `manager`, `seller`, `consultor`, etc.).
- **Terminal MX** em `daily_checkins`: produção D-1 e agenda D-0, com escopos `daily`, `adjustment` e `historical`.
- **Funil 20/60/33** com diagnóstico por gargalo usando benchmarks 20/60/33.
- **Carteira de clientes** e **mentor comercial** por loja/vendedor.
- **Central de execução** da rotina diária do vendedor.
- **Ranking** por vendedor com vendas, leads, agendamentos, visitas, meta, atingimento e projeção.
- **Metas** por loja e vendedor em `goals`, com regras em `store_meta_rules`.
- **Feedback estruturado** em `feedbacks`, com devolutivas e ciência do vendedor.
- **PDI 2.0** em `pdis` e `pdi_reviews`, com radar de competências, metas de 6/12/24 meses e plano de ações.
- **Universidade MX** em `trainings` e `training_progress`, com progresso por público-alvo e relação com gargalos do funil.
- **Consultoria** em módulo próprio (`consultoria/*`, `consulting_*`): clientes, visitas, plano de ação, plano estratégico, central de decisões e relatórios.
- **Departamentos do dono**: comercial, marketing, produto e estoque, pessoas/RH, financeiro e operações.
- **Organograma**, **banco de talentos** e **mercado** como visões executivas do dono.
- **Notificações** em `notifications`, com marcação de leitura, exclusão e envio interno.
- **Relatórios recorrentes** por Edge Functions: matinal (XLSX, cron 10:30 BRT), feedback semanal e mensal.
- **Reprocessamento e auditoria operacional** em `reprocess_logs` e `audit_logs`.

## Rotas

Rotas públicas:

- `/login`, `/forgot-password`, `/reset-password`
- `/privacy`, `/terms`
- `/pre-cadastro/:storeSlug`

Rotas protegidas (as rotas `vendedor/*` e aliases redirecionam para as canônicas):

- **Rituais diários**: `/terminal-mx`, `/lancamento-diario` (alias), `/fechamento-diario`, `/liberacao-fechamento`
- **Operação do vendedor**: `/home`, `/meu-dia` (alias), `/meu-funil`, `/funil-comercial`, `/central-execucao`, `/relatorios-vendedor`, `/relatorios`, `/minha-remuneracao`
- **Carteira e mentor**: `/carteira-clientes`, `/carteira`, `/mentor-comercial`
- **Desenvolvimento**: `/desenvolvimento`, `/devolutivas`, `/pdi`, `/pdi/:id/print`, `/feedbacks-pdis`, `/universidade-mx`, `/treinamentos`, `/ajuda`
- **Gestão**: `/minha-equipe`, `/meta-loja`, `/metas`, `/funil-vendas`, `/rotina`, `/rotina-equipe`, `/mentor`, `/falar-consultor`, `/organograma`, `/banco-talentos`
- **Executivo dono**: `/minhas-lojas`, `/lojas`, `/lojas/:storeSlug`, `/lojas/:storeSlug/equipe`, `/lojas/:storeSlug/consultor-ia`, `/lojas/:storeSlug/filiais`, `/departamentos/*`, `/mercado`, `/plano-estrategico`, `/plano-acao`, `/decisoes`, `/simulacao`, `/simulacao/:simulationRole`
- **Consultoria**: `/consultoria`, `/consultoria/clientes`, `/consultoria/clientes/:clientSlug`, `/consultoria/clientes/:clientSlug/visitas/:visitNumber`, `/consultor-ia`
- **Administrativo**: `/painel`, `/agenda`, `/produtos`, `/notificacoes`, `/perfil`, `/configuracoes`, `/configuracoes/remuneracao`, `/configuracoes/operacional`, `/configuracoes/consultoria-pmr`, `/configuracoes/reprocessamento`, `/relatorio-matinal`, `/relatorios/performance-vendas`, `/relatorios/performance-vendedor`, `/auditoria`, `/ranking`, `/classificacao`

## Arquitetura

- `src/App.tsx`: roteamento, lazy loading, `RoleSwitch` por papel e redirects de aliases legados.
- `src/features/`: implementação canônica por domínio (57 domínios: `checkin`, `funil`, `carteira-clientes`, `central-execucao`, `consultoria`, `owner`, `manager`, `gerente`, `vendedor-home`, `dashboard-loja`, `pdi`, `treinamentos`, `ranking`, `notificacoes`, `departamentos`, `plano-estrategico`, etc.).
- `src/pages/`: shims finos de compatibilidade que re-exportam a feature canônica.
- `src/design-system/`: design system próprio (tokens, sidebar, shell, componentes de gestão).
- `src/components/`: componentes compartilhados, shell autenticado e navegação.
- `src/hooks/`: hooks de domínio (auth, checkins, metas, ranking, PDI, notificações, consultoria, DRE, performance).
- `src/lib/`: cliente Supabase, cálculos de funil, validação, auth (papéis, capabilities, rota de acesso), schemas.
- `src/api/`: camada de acesso a dados.
- `supabase/migrations/`: schema, RLS, views, crons e ajustes de dados.
- `supabase/functions/`: Edge Functions (relatório matinal, feedback semanal, relatório mensal, sincronização Google Calendar/Drive/Meet, OAuth, notificações, pré-cadastro).
- `whatsapp-service/`: serviço Express separado para integração WhatsApp local/auxiliar.

## Banco E Supabase

- Auth: Supabase Auth com recuperação de senha e política de senha.
- Dados canônicos: `stores`, `store_sellers`, `memberships`, `daily_checkins`, `goals`, `feedbacks`, `pdis`, `pdi_reviews`, `trainings`, `training_progress`, `notifications`, `audit_logs`, `reprocess_logs`.
- Regras por loja: `store_benchmarks`, `store_delivery_rules`, `store_meta_rules`.
- Governança: `view_daily_team_status` identifica **Sem Registro** em D-1 respeitando a vigência de `store_sellers`.
- Segurança: RLS em todas as tabelas de governança, views `security_invoker`, RPCs com ACL hardening.
- Automação: Edge Functions e crons para matinal, feedback semanal e relatório mensal.

## Desenvolvimento

```bash
npm install
cp .env.example .env   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev            # Vite em 0.0.0.0:3000
```

Requisitos: Node.js `>=20 <25` e Bun para a suíte de testes.

## Qualidade

```bash
npm run lint       # tsc --noEmit + lints de tokens/z-index/roots/landmarks + eslint
npm run typecheck  # teste de contrato + tsc --noEmit
npm test           # bun test (src/lib, benchmarks, hooks, components, features, pages, api)
npm run build      # build de produção + verificação de sourcemaps
```

## Deploy

- Plataforma: Vercel (projeto `mxperformance`, Project ID `prj_fpYjxc851kMs55GzR6tgQEr7uWUj`).
- Framework: Vite — build `npm run build`, output `dist`.
- Repositório conectado: `pglemos/MXGESTAOPREDITIVA`, branch de produção `main`.
- Deploy manual: `npm run deploy`.

## Modelo De Vigência (D-1/D-0)

A produção é consolidada em **D-1** e os compromissos são firmados para **D-0 (Hoje)**:

1. **Terminal MX (09:30)**: vendedor registra produção D-1 e agenda D-0.
2. **Command Center (09:45)**: gerente audita a grade bruta, cobra pendentes (WhatsApp/App) e valida agendas.
3. **Matinal Oficial (10:30)**: disparo automático (cron) de relatório **XLSX** para diretoria via Edge Function.
4. **Feedback Semanal**: ritual único por vendedor garantido por constraint de unicidade técnica.

## Licença E Propriedade

Projeto privado de operação MX/Synvolt no GitHub/Vercel indicados acima. Ajuste esta seção caso seja necessária uma licença formal.
