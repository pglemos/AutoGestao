# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Vendedor** — profissional de vendas em loja automotiva. Usa o sistema durante o ritual diário (Terminal MX às 09:30) para registrar produção do dia anterior e firmar agenda do dia. Consulta funil, carteira de clientes, devolutivas, PDI e treinamentos ao longo do dia.
- **Gerente** — gestor de equipe de loja. Usa o sistema ao longo do expediente para auditar a grade, cobrar pendentes, acompanhar painel da loja, metas, funil e feedbacks. Participa do rito de abertura (Command Center às 09:45).
- **Dono** — empresário ou diretor com uma ou mais lojas automotivas. Acompanha visão executiva multi-loja: performance, funil consolidado, departamentos (comercial, marketing, produto, RH, financeiro, operações), mercado, plano estratégico e banco de talentos.
- **Consultor / Admin MX** — equipe interna da MX. Tem governança total: lojas, usuários, metas, benchmarks, treinamentos, produtos digitais, reprocessamento, consultoria (PPA, PMR) e relatórios. Usa o sistema para conduzir e monitorar a consultoria em tempo real.

## Product Purpose

MX Performance é o sistema operacional de gestão de performance comercial em lojas automotivas que centraliza, em tempo real, toda a disciplina operacional da Metodologia MX — rituais diários, funil 20/60/33, ranking, feedback estruturado, PDI, treinamentos e relatórios automáticos — dentro da mesma plataforma de consultoria que a MX utiliza para refinar e polir cada departamento do negócio. Antes a consultoria acontecia em campo e em planilhas; agora acontece dentro do produto, de forma contínua e com dados que não mentem.

## Positioning

A MX é originalmente uma empresa de consultoria automotiva com metodologias comprovadas e números verificados ao longo de anos. O MX Performance não é um CRM genérico: ele incorpora a metodologia MX (funil 20/60/33, PPA, PMR, rituais diários, benchmarks de loja) como lógica de produto, e entrega consultoria em tempo real — algo que nenhum sistema de gestão automotiva do mercado faz, porque eles só registram dados, enquanto o MX Performance diagnóstica gargalos, sugere ações e conecta consultor e cliente na mesma tela.

## Operating Context

- Lojas automotivas (concessionárias e multimarcas) no Brasil.
- Vendedores e gerentes operam o sistema em smartphones e desktops durante o expediente, incluindo situações de baixa atenção (entre atendimentos, em pé no showroom).
- Donos acessam dashboards executivos preferencialmente em desktop.
- Consultores MX acessam o sistema remotamente ou durante visitas à loja.
- Rituais com horário fixo: Terminal MX (09:30), Command Center (09:45), Matinal automático (10:30 — XLSX via Edge Function).
- Sincronização com Google Calendar/Drive/Meet e notificações via WhatsApp para automação de agenda e relatórios.

## Capabilities and Constraints

- **Auth**: Supabase Auth com papéis canônicos (`admin_mx`, `master`, `director`, `sales_manager`, `seller`, `consultant`, `marketing`, `product`, `finance`, `hr`, `operations`) e normalização de aliases legados.
- **Funil 20/60/33**: lógica de diagnóstico de gargalo com benchmarks por loja; cálculo de projeção e atingimento de meta.
- **Vigência D-1/D-0**: produção consolidada em D-1; compromissos firmados em D-0.
- **Relatórios automáticos**: matinal (XLSX cron 10:30 BRT), feedback semanal e relatório mensal via Edge Functions.
- **Consultoria integrada**: módulos PPA, PMR, visitas, plano de ação, plano estratégico e central de decisões.
- **Multi-loja**: donos acompanham N lojas; cada loja tem benchmarks e regras de meta próprias.
- **Stack**: React 19, Vite 6, TypeScript 5.8, Tailwind CSS 4, Radix UI, Recharts, Motion, Sonner, Supabase, Vercel.
- **Deploy**: Vercel, projeto `mxperformance`, branch `main`.
- **Idioma**: português do Brasil. Sem requisito de i18n adicional.

## Brand Commitments

- Nome do produto: **MX Performance** (sigla **MX**).
- Origem de marca: MX é uma empresa de consultoria automotiva com anos de metodologia comprovada em campo. O produto carrega essa autoridade — não é um produto de startup, é a digitalização de uma prática real.
- Tom de voz: direto, operacional, orientado a resultado. Não é aspiracional vago; fala a língua de quem vende carro todos os dias.

## Evidence on Hand

- Screenshots de todas as telas principais disponíveis na raiz do repositório (`login_page.png`, `agenda.png`, `ranking.png`, `simulacao_vendedor.png`, `simulacao_gerente.png`, `simulacao_dono.png`, `painel_geral.png`, `funil-validacao-final-alinhada.png`, entre outros).
- Código de produção completo em `src/features/` com 57 domínios implementados.
- Design system próprio em `src/design-system/` com tokens, sidebar, shell e componentes de gestão.
- Dados reais de lojas automotivas no Supabase (produção ativa).

## Product Principles

1. **Dados que não mentem**: toda métrica tem fonte rastreável e cálculo auditável. O sistema não infla números nem omite pendências.
2. **Ritual antes de relatório**: o produto estrutura a disciplina operacional (rituais, check-ins, feedbacks) antes de gerar visibilidade — porque um relatório bonito em cima de dados ruins não resolve nada.
3. **Papel certo, informação certa**: cada perfil vê exatamente o que precisa para executar seu trabalho, sem ruído de outros papéis.
4. **Consultoria em tempo real**: o consultor MX e o cliente operam na mesma plataforma, com os mesmos dados, eliminando o gap entre diagnóstico e ação.
5. **Velocidade operacional**: o sistema deve ser rápido o suficiente para ser usado entre um atendimento e outro — latência e fricção têm custo de adoção real em chão de loja.
