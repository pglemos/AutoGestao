# Design completo do módulo interno MX baseado no módulo Gerente

Data: 24/07/2026

## Objetivo

Reconstruir integralmente a experiência visual dos perfis `administrador_geral`, `administrador_mx` e `consultor_mx` usando o sistema visual real do módulo Gerente como única fonte de verdade. Vendedor, Gerente e Dono permanecem visual e funcionalmente intactos.

## Escopo de páginas

- Painel Geral
- Lojas, detalhes da loja e todas as abas internas
- Consultoria, clientes, detalhes e execução de visitas
- Agenda
- Ranking
- Devolutivas/PDI
- Desenvolvimento
- Produtos Digitais
- Notificações
- Relatório Matinal
- Performance de Vendas
- Performance por Vendedor
- Diagnóstico Operacional
- Configuração Operacional
- Parâmetros PMR
- Reprocessamento
- Configurações
- Perfil e superfícies auxiliares acessadas pelo módulo interno

## Decisão de isolamento

A composição nova será ativada somente quando `isPerfilInternoMx(role)` for verdadeira. Páginas compartilhadas devem manter sua composição atual para Vendedor, Gerente e Dono e renderizar uma composição interna MX dedicada para os três perfis autorizados.

Não será permitido resolver isolamento com CSS global, seletores frágeis, `!important`, detecção por URL sem papel ou alteração do tema de outros perfis.

## Fonte visual canônica

O código real do módulo Gerente, especialmente `ManagerSellerParityHomeCanonical`, seus componentes de cabeçalho, cards, filtros e estados, será a referência. `MxModuleVisualPrimitives` deixa de ser uma camada híbrida e passa a reproduzir integralmente essa anatomia.

### Fundação visual

- Fundo de página `gray-50`.
- Container central `max-w-7xl`, largura fluida, `px-4`, `py-6`, `pb-24`.
- Ritmo vertical principal de 20 px (`space-y-5`).
- Superfícies brancas, `rounded-2xl`, borda `gray-100`, `shadow-sm`.
- Tipografia em `gray-800`, descrições `gray-500`, auxiliares `gray-400`.
- Verde emerald apenas para marca, ação primária e sucesso.
- Azul, violeta, âmbar e vermelho somente para significado semântico.
- Sem títulos decorativos em caixa alta, tracking exagerado, fundos escuros promocionais, glassmorphism ou gradientes sem função.

### Controles

- Altura padrão de 40 px para botões, selects e inputs.
- Cantos `rounded-xl`.
- Ação primária `bg-emerald-600`, hover `emerald-700`, texto branco.
- Ação secundária branca com borda `gray-200`.
- Ação contextual emerald outline.
- Botões de ícone quadrados de 40 px.
- Foco visível por `ring-emerald-500`.
- Estados disabled, loading e destructive semanticamente distintos.

## Arquitetura de componentes

### 1. Escopo interno

Criar ou ajustar `InternalMxVisualScope` para ativar tokens, variantes e composição apenas nos três perfis internos. O wrapper não deve tentar corrigir páginas antigas por cascata; ele apenas estabelece fundo, tipografia e provider de controles.

### 2. Primitivas canônicas

Reconstruir `MxModuleVisualPrimitives` com APIs estáveis e anatomia real do Gerente:

- `MxModulePage`
- `MxModuleHeader`
- `MxHeaderActions`
- `MxMetricGrid`
- `MxMetricCard`
- `MxSectionCard`
- `MxSectionHeader`
- `MxToolbar`
- `MxTabs`
- `MxField`
- `MxInput`, `MxSelect`, `MxTextarea`
- `MxTableSurface`
- `MxDataTable`
- `MxPagination`
- `MxStatusBadge`
- `MxStatusBanner`
- `MxEmptyState`
- `MxLoadingState`
- `MxErrorState`
- `MxModal`, `MxDrawer`, `MxConfirmDialog`
- `MxChartCard`
- `MxSkeleton`

As primitivas não podem importar Supabase, hooks de negócio, rotas ou papéis. Recebem dados e callbacks por props.

### 3. Templates de página

Adotar templates reutilizáveis para reduzir divergência:

- Dashboard: cabeçalho, KPIs, seções analíticas e prioridades.
- Listagem: cabeçalho, toolbar, filtros, tabela/grid e paginação.
- Detalhe: contexto, abas, resumo e painéis internos.
- Configuração: cabeçalho, abas/seções, formulários e barra de ações.
- Relatório: filtros, indicadores, gráficos, tabela e exportação.
- Fluxo operacional: progresso, formulário, evidências e ações.

## Estratégia para páginas densas

Configuração Operacional, Parâmetros PMR e Configurações preservarão todos os campos, permissões e fluxos. O conteúdo será reorganizado em abas e seções do padrão Gerente, sem fragmentar rotas e sem alterar contratos de salvamento.

Regras:

- abas com URL/query string preservada quando já existir;
- formulário dividido por domínio, não por tamanho arbitrário;
- barra de ações consistente no fim da seção ou sticky apenas quando necessário;
- mensagens de validação junto ao campo;
- estados sujos, salvando, salvo e erro explícitos;
- ações destrutivas separadas em zona de risco.

## Dados e comportamento

- Preservar consultas, RPCs, RLS, mutations, filtros, cálculos e regras de negócio.
- Não criar dados fictícios para preencher layouts.
- Não alterar Supabase nesta entrega, salvo descoberta de defeito funcional comprovado e aprovado separadamente.
- Atualização em tempo real permanece invisível como infraestrutura; a interface mostra apenas estado de atualização e horário.
- Erro, vazio, carregamento e ausência de permissão são estados diferentes.

## Responsividade

### Desktop

- Container `max-w-7xl`.
- Grids de 4 a 6 KPIs conforme espaço.
- Tabelas completas e painéis laterais quando úteis.

### Tablet

- Grids de 2 colunas.
- Toolbars quebram em linhas sem overflow.
- Tabelas podem ocultar colunas secundárias ou usar scroll interno controlado.

### Mobile

- Uma coluna.
- Ações essenciais visíveis; secundárias em menu.
- Tabelas viram cards ou mantêm scroll interno com cabeçalho acessível.
- Modais extensos viram drawers de tela cheia.

## Acessibilidade

- Ordem de headings coerente.
- Labels reais em todos os campos.
- Navegação por teclado em tabs, menus, modais e tabelas.
- Contraste AA.
- Estados não dependem apenas de cor.
- `aria-live` em carregamento, salvamento e erros.
- Respeito a `prefers-reduced-motion`.

## Migração por ondas internas

A implementação ocorrerá na mesma branch e será entregue em um único commit consolidado, mas organizada internamente nestas ondas:

1. Fundação, escopo e primitivas.
2. Painel Geral, Lojas, Consultoria e Agenda.
3. Ranking, Desenvolvimento, Produtos e Notificações.
4. Relatórios e Diagnóstico.
5. Configurações, PMR e Reprocessamento.
6. Auditoria visual completa e correções de regressão.

## Testes e gates

Nenhum deploy intermediário.

Antes do único preview final:

- typecheck;
- testes unitários e de contrato;
- lint e acessibilidade;
- build Vite;
- verificação de tokens e proibição de estilos legados;
- auditoria autenticada das 17 áreas em desktop, tablet e mobile;
- console sem erros;
- ausência de overflow horizontal;
- smoke de ações críticas, filtros, abas, modais e formulários;
- confirmação de que Vendedor, Gerente e Dono não sofreram regressão visual.

Somente depois desses gates haverá um único preview Vercel. Produção será atualizada apenas após validação do preview.

## Estratégia de Git e consumo de cotas

- Uma branch existente para todo o trabalho.
- Um commit para esta especificação.
- Um único commit consolidado para implementação e testes.
- Um PR apenas.
- Um preview Vercel final.
- Um merge final.
- Sem commits automáticos por arquivo, sem previews por etapa e sem deploy manual repetido.

## Critérios de aceite

1. As 17 áreas e suas abas usam a mesma anatomia visual do Gerente.
2. Não existem blocos evidentes do design antigo dentro do módulo interno.
3. Páginas compartilhadas permanecem inalteradas para Vendedor, Gerente e Dono.
4. Todos os fluxos existentes continuam funcionais.
5. Estados de erro, vazio, carregamento e sucesso são claros.
6. Desktop, tablet e mobile não apresentam overflow ou quebra de hierarquia.
7. Nenhuma credencial ou nome de fornecedor de infraestrutura aparece na interface.
8. CI, build, testes autenticados e preview final passam antes do merge.
