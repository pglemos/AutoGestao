# AUDIT Base44 live — 2026-08-23

Fonte: preview editor `app.base44.com/apps/6a6fd5b82088f81a3baebb5d/editor/preview` (iframe `preview--mx-admin-flow.base44.app` / sandbox). Navegação via campo `/page` do editor (iframe cross-origin bloqueia clique interno).

Evidência: `visual-evidence/agent-browser/base44-live-2026-08-23/`.

## Shell / navegação

Banner amarelo permanente: ambiente de protótipo / dados demonstrativos.

Sidebar (grupos):

### OPERAÇÃO MX
- Início (`/`)
- Clientes MX (`/clientes`) — aparece na sidebar ao estar em /clientes; no Início a carteira é widget
- Consultoria (`/consultoria`)
- Equipe MX (`/equipe`)
- Universidade MX (`/universidade`)

### PRODUTO E METODOLOGIA
- Produtos de Consultoria (`/produtos`)
- Plano Estratégico (`/indicadores` no App.jsx = PlanoEstrategicoGlobal)
- Planos de Ação (`/planos-acao`)
- Consultoria MX (`/consultoria-mx`)
- Scores e Alertas (`/scores`)
- Benchmark e Mercado (`/benchmark`)

### PLATAFORMA E GOVERNANÇA
- Dados e Conciliação (`/dados`)
- Notificações e Agenda (`/notificacoes`)
- Suporte e Incidentes (`/suporte`)
- Segurança e Auditoria (`/seguranca`)

TopBar: busca, sino com badge, avatar AD / Administrador Principal MX.

Rotas com param (`/clientes/:id`, plano-estrategico, visualizacao-dono, plano-acao, consultoria cliente) listadas no `/page` mas **disabled** sem id — abrir só via clique em linha de cliente.

## Início (`/`)

KPIs: Clientes Ativos · Em Implantação · Prontos para Ativar · Com Bloqueios.

Widgets: Carteira de Clientes MX (Ver todos) · Cadastros Pendentes · Alertas Ativos · Ações Rápidas (Novo Cliente MX, Validar Cadastros, Novo Produto, Ver Auditoria).

Carteira demo (amostra): teste, MX CONSULTORIA TESTE 5, **MX VEÍCULOS TESTE 4** (Ativo em Implantação), Cliente Demonstração (Suspenso), TESTE 3, TESTE 2.

## Clientes MX (`/clientes`)

- Subtítulo: N clientes na carteira
- CTA: + Novo Cliente
- Cards: Ativos · Em Implantação · Prontos p/ Ativar · Em Configuração
- Filtros: busca nome/cidade · Todos os status
- Tabela colunas: CLIENTE · STATUS · FASE · ONBOARDING · RESPONSÁVEL · AÇÕES (menu ⋮)
- Status pills: Em Configuração (roxo), Ativo em Implantação (laranja), Suspenso (vermelho)
- Fase: Não definida / Sobrevivência / Crescimento
- Onboarding: Concluído
- MX VEÍCULOS TESTE 4: Lagoa Santa, fase Crescimento, responsável Mariane Durães

## Planos de Ação (`/planos-acao`)

- Título + descrição metodologia
- CTAs: Aplicar a Cliente · Abrir Histórico · + Criar Plano Padrão
- Abas: Planos Padrão · Sugestões ao Dono · Aplicações nos Clientes · Histórico
- Cards departamento: Todos (1 plano, 46 indicadores ativos, 6 rascunho) · Comercial 22 · Marketing 7 · Produtividade 7 · Pessoas · Financeiro 5 · Operações 4
- Filtros: busca, departamento, indicador, status, disponibilidade, prioridade, responsável
- Tabela: Plano Padrão (título+código PA_…) · Departamento · Indicador · Ações · Prioridade · Resp.

## Plano Estratégico / Indicadores (`/indicadores`)

- Sidebar marca **Plano Estratégico**
- Abas: Catálogo de Indicadores · Parâmetros e Fórmulas · Planos por Cliente · Histórico
- CTAs catálogo: Editar Ordem · Criar Demo · Parâmetros · + Criar Indicador
- Contadores: 46/45 Indicadores · 19/18 Digitáveis · 28/27 Calculáveis · 12 Com parâmetro · 13 Parâmetros globais · 9 Arquivados
- Filtros + pills: Todos, Digitáveis, Calculáveis, Com/Sem parâmetro, Padrão MX, Criados, Publicados, Rascunho, Ocultos no Dono, Desabilitados, Arquivados
- Tabela Comercial 22: Ordem · Indicador (nome+código SALES_*) · Unidade · Meta (Calculado/Manual) · Total Anual · Dono (toggle) · Status PUBLICADO · Ações
- Vendas Total = fx/calculado; canais = Manual

## Demais rotas

| Rota | Status audit |
|------|----------------|
| /clientes/novo | mapa ok · shot pendente |
| /equipe /universidade /produtos /consultoria /consultoria-mx | mapa sidebar |
| /scores /benchmark /dados /notificacoes /suporte /seguranca | mapa sidebar |
| /observabilidade /configuracoes /mapa-funcional /roteiro-testes | em App.jsx |
| /clientes/:id + plano / visualizacao-dono | `/page` disabled sem id · iframe bloqueia clique na linha |

## Limitações desta sessão

- Clique dentro do iframe não propaga (cross-origin).
- URL com access_token na aba top-level bloqueada/stripped pelo guard.
- Dump `_source` incompleto (poucas pages JSX); inventário live + App.jsx + PlanosAcaoGlobal.jsx.

## Aceite prompt (referência cruzada)

P0 Admin↔Dono mesma célula (cliente/versão/unidade/indicador/ano/mês/visão) — exigir MX VEÍCULOS TESTE 4 + Visualizar como Dono após abrir ficha cliente.
