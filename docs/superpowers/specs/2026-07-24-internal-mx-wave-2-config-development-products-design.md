# Onda 2 — Configurações, Desenvolvimento e Produtos Digitais

Data: 24 de julho de 2026  
Projeto: MX Gestão Preditiva / MX Performance  
Escopo aprovado: Configurações completa, Desenvolvimento completo e Produtos Digitais completo  
Branch alvo: `main`  
Estratégia de publicação: um único commit consolidado e um único deploy de produção

## 1. Objetivo

Migrar estruturalmente as áreas internas de Configurações, Desenvolvimento e Produtos Digitais para a fundação canônica criada na Onda 1, removendo shells paralelos, anatomias antigas, CSS corretivo desnecessário e políticas de acesso espalhadas.

A Onda 2 deve preservar regras de negócio, consultas, dados persistidos, rotas, comportamento de domínio e integrações existentes. A mudança é arquitetural, visual, responsiva, de autorização e de testabilidade.

## 2. Princípios obrigatórios

1. O shell da página deve ser controlado pelas primitivas canônicas `MxModule*` e pelos slots definidos na Onda 1.
2. Componentes específicos de domínio permanecem específicos, mas não podem mais controlar a anatomia completa da página.
3. Permissões devem ser aplicadas na interface e na camada de mutação.
4. A fonte de verdade de abas, papéis e modos de leitura deve permanecer centralizada.
5. Nenhuma migration, alteração de schema, RLS, RPC, trigger ou Edge Function será executada.
6. Nenhuma rota pública, de Vendedor, Gerente ou Dono deve sofrer regressão.
7. A `main` será movida uma única vez, após validação integral da árvore final.

## 3. Arquitetura geral

### 3.1. Templates e slots

As três áreas usarão os slots canônicos:

- `page`
- `header`
- `tabs`
- `toolbar`
- `section`
- `table`
- `sidebar`, somente quando a função exigir navegação auxiliar real

O uso de `<main>` próprio, `PageHeading` legado e wrappers de página fora dos templates será proibido nos arquivos migrados.

### 3.2. Estados compartilhados

As três áreas devem usar:

- `MxLoadingState`
- `MxErrorState`
- `MxEmptyState`
- `MxStatusBanner`
- `MxSectionCard`
- `MxTableSurface`

Estados locais podem existir quando específicos do domínio, mas devem ser renderizados dentro do slot estrutural correto.

### 3.3. Responsividade

Viewports mínimos obrigatórios:

- Desktop: 1440 × 900
- Tablet: 1024 × 768
- Mobile: 390 × 844

Critérios:

- zero overflow horizontal da página;
- tabelas com área de rolagem própria;
- tabs com rolagem horizontal ou agrupamento adaptativo;
- ações principais visíveis e acessíveis;
- modais com altura e largura seguras;
- nenhum conteúdo crítico oculto por quebra de layout.

## 4. Configurações

### 4.1. Fonte de verdade

`TAB_REGISTRY` continuará como fonte única de:

- chave da aba;
- rótulo;
- descrição;
- ícone;
- componente;
- papéis permitidos;
- papéis somente leitura;
- agrupamento.

Não será criada uma segunda lista de abas em outro arquivo.

### 4.2. Abas cobertas

A área deve suportar integralmente:

1. Perfil
2. Segurança
3. Notificações
4. Equipe & Usuários
5. Lojas & Rede
6. Operacional
7. Remuneração
8. Consultoria PMR
9. Governança de Conteúdo
10. Comunicados
11. Integrações
12. Sistema MX
13. Minha Aparência

### 4.3. Papéis

#### Administrador Geral

- acessa todas as abas;
- pode editar todas as abas autorizadas pelo domínio;
- mantém privilégios superiores existentes.

#### Administrador MX

- acessa todas as abas internas;
- pode editar as abas autorizadas pelo domínio.

#### Consultor MX

- não recebe Remuneração;
- recebe somente leitura em Equipe & Usuários, Lojas & Rede, Operacional e Sistema MX;
- não deve visualizar controles de gravação nessas abas;
- mutações devem permanecer bloqueadas mesmo por chamada indireta.

### 4.4. Nova composição

A página `Configuracoes` deve usar:

- `MxModulePage`;
- `MxModuleHeader`;
- `MxPageTabs` ou slot `tabs` equivalente;
- resumo da aba ativa dentro de `MxSectionCard`;
- `MxStatusBanner` para somente leitura;
- conteúdo da aba dentro de seção canônica.

A navegação lateral histórica será removida. Não será mantido CSS que transforme artificialmente `<aside>` em tabs horizontais.

### 4.5. Contrato das abas

Todas as abas devem aceitar o contrato mínimo:

```ts
interface SettingsTabProps {
  isReadOnly: boolean
  role: UserRole
}
```

Abas que não usam todas as propriedades podem ignorá-las internamente, mas a assinatura externa deve ser uniforme.

### 4.6. Busca e agrupamento

A busca deve continuar filtrando por:

- grupo;
- rótulo;
- descrição.

Os grupos visuais serão:

- Conta pessoal;
- Rede e lojas;
- Governança MX;
- Sistema.

No mobile, a busca deve ficar acima das tabs e ocupar toda a largura.

## 5. Desenvolvimento

### 5.1. Escopo funcional

A rota deve consolidar:

- Feedback;
- PDI.

O shell atual será substituído por um shell canônico único.

### 5.2. Feedback

A área será dividida em:

- `DevelopmentFeedbackMetrics`;
- `DevelopmentFeedbackFilters`;
- `DevelopmentFeedbackTable`;
- `DevelopmentFeedbackEmptyState`;
- `ManagerFeedbackModal` preservado;
- detalhe de feedback preservado, ajustado ao padrão de modal/drawer adotado.

Funcionalidades preservadas:

- filtro por período;
- filtro por vendedor;
- filtro por tipo;
- filtro por competência;
- filtro por status;
- criação de feedback;
- compartilhamento por WhatsApp;
- consulta de detalhes;
- ciência do vendedor;
- estados de loading, erro e vazio.

### 5.3. PDI

A área será dividida em:

- `DevelopmentPdiTabs`;
- `DevelopmentPdiMetrics`;
- `DevelopmentPdiFilters`;
- `DevelopmentPdiTable`;
- `DevelopmentPdiEmptyState`;
- `TeamCompetencyMap` preservado;
- `WizardPDI` preservado.

Funcionalidades preservadas:

- Meu PDI;
- PDI da Equipe;
- filtro por vendedor;
- filtro por status;
- mapa de competências;
- criação de PDI;
- abertura de impressão/detalhe;
- progresso e ações vencidas;
- estados de loading, erro e vazio.

### 5.4. Regras visuais

- Métricas devem usar `MxMetricCard` ou equivalente canônico.
- Filtros devem usar `MxToolbar` e `MxField`.
- Tabelas devem usar `MxTableSurface`.
- Tabs principais e internas devem usar o mesmo sistema visual.
- Botões primários devem seguir a hierarquia de ação do design system.
- Nenhum componente deve recriar header de página.

## 6. Produtos Digitais

### 6.1. Decomposição obrigatória

O arquivo monolítico atual será dividido em módulos com responsabilidades claras:

```text
src/features/digital-products/
├── DigitalProductsPage.tsx
├── components/
│   ├── DigitalProductMetrics.tsx
│   ├── DigitalProductToolbar.tsx
│   ├── DigitalProductGrid.tsx
│   ├── DigitalProductCard.tsx
│   └── DigitalProductFormModal.tsx
├── hooks/
│   └── useDigitalProductsController.ts
├── lib/
│   ├── digitalProductPolicy.ts
│   ├── digitalProductSchema.ts
│   └── digitalProductCatalog.ts
└── types.ts
```

A rota `src/pages/ProdutosDigitais.tsx` deve se tornar um adaptador mínimo para a feature.

### 6.2. Política de acesso

#### Administrador Geral

- visualiza todos os produtos;
- cria;
- edita;
- arquiva;
- altera público;
- cria catálogo padrão.

#### Administrador MX

- mesmas permissões administrativas da área.

#### Consultor MX

- modo consumo;
- visualiza somente produtos ativos destinados ao papel `consultor_mx`;
- não visualiza ações administrativas;
- não pode executar mutações por chamada indireta.

#### Demais perfis

- continuam recebendo produtos ativos destinados ao respectivo público;
- nenhuma mudança na regra de segmentação existente.

### 6.3. Fluxos preservados

- busca;
- filtro por público;
- filtro por status;
- modo Administração/Consumo para administradores;
- criação de catálogo padrão;
- criação e edição de produto;
- arquivamento sem exclusão histórica;
- ordenação;
- modal de formulário;
- mensagens de erro e sucesso;
- links internos gerados por slug.

### 6.4. Nova composição

A página deve usar:

- `MxModulePage`;
- `MxModuleHeader`;
- `MxMetricGrid` e `MxMetricCard`;
- `MxToolbar`;
- `MxPageTabs` para Administração/Consumo;
- `MxSectionCard`;
- `MxEmptyState`;
- `MxLoadingState`;
- modal padronizado.

Cards de produto continuam específicos, mas devem usar tokens, tipografia e hierarquia canônicos.

## 7. Dados e Supabase

### 7.1. Proibições

Não alterar:

- tabela `produtos_digitais`;
- colunas;
- tipos persistidos;
- policies RLS;
- functions;
- triggers;
- migrations;
- Edge Functions.

### 7.2. Contratos preservados

Produtos Digitais continuará consultando e gravando:

- `id`;
- `name`;
- `description`;
- `link`;
- `category`;
- `target_roles`;
- `status`;
- `sort_order`;
- `created_at`;
- `updated_at`.

Desenvolvimento continuará usando os hooks atuais de feedback, vendedores e PDI, salvo extrações internas que não mudem a interface pública.

## 8. Tratamento de erros

1. Falhas de consulta devem renderizar `MxErrorState` com ação de nova tentativa quando disponível.
2. Falhas de mutação devem manter formulário ou modal aberto e preservar dados digitados.
3. Loading deve ser liberado em sucesso e erro.
4. Ações não autorizadas devem ser bloqueadas antes da chamada ao Supabase e novamente na política de mutação.
5. Nenhum erro esperado deve gerar tela branca.
6. Erros de console não tratados devem reprovar a auditoria Playwright.

## 9. Testes

### 9.1. Contratos estáticos

Adicionar testes para garantir:

- ausência de `PageHeading` nas três áreas;
- ausência de `<main>` próprio nos containers migrados;
- uso dos slots canônicos;
- registro único das 13 abas;
- política correta dos três perfis;
- Produtos Digitais dividido em módulos;
- ausência de seletores CSS específicos por rota.

### 9.2. Testes unitários

Cobrir:

- filtro de abas por papel;
- somente leitura do Consultor MX;
- política de Produtos Digitais;
- normalização de produto;
- filtros e métricas;
- mutações bloqueadas;
- preservação de estado após erro;
- seleção de Feedback/PDI;
- filtros de Feedback e PDI.

### 9.3. Playwright autenticado

Cobrir os três perfis internos em desktop, tablet e mobile.

#### Configurações

- todas as abas visíveis por perfil;
- Remuneração ausente para Consultor MX;
- abas somente leitura sem controles habilitados;
- troca de aba via URL e navegação;
- busca;
- ausência de overflow;
- ausência de erros de console.

#### Desenvolvimento

- Feedback;
- PDI;
- Meu PDI;
- PDI da Equipe;
- filtros;
- modal de feedback;
- Wizard PDI;
- mapa da equipe;
- tabelas responsivas;
- estados vazios.

#### Produtos Digitais

- modo administração para administradores;
- modo consumo para Consultor MX;
- filtros;
- modal de criação/edição;
- arquivamento;
- catálogo vazio;
- produto segmentado;
- ações administrativas invisíveis para Consultor MX.

## 10. Critérios de aceite

A Onda 2 será considerada concluída somente quando:

1. Configurações usar o shell canônico e todas as 13 abas continuarem funcionais.
2. Desenvolvimento usar shell, tabs, métricas, filtros, tabelas e estados canônicos.
3. Produtos Digitais estiver decomposto e com política centralizada.
4. Administrador Geral, Administrador MX e Consultor MX respeitarem suas permissões.
5. Nenhuma mutation de Consultor MX for possível em áreas somente leitura.
6. TypeScript estiver limpo.
7. Testes do pipeline estiverem aprovados.
8. Lint de tokens estiver aprovado.
9. Build Vite estiver aprovado.
10. Deploy de produção estiver `READY`.
11. Smoke tests retornarem HTTP 200 nas rotas principais.
12. Não houver erros de runtime agrupados após o deploy.
13. O comparativo mostrar exatamente um commit consolidado sobre a Onda 1.

## 11. Fora de escopo

- Agenda;
- Ranking;
- Notificações;
- Relatório Matinal;
- Performance de Vendas;
- Detalhes da loja;
- Consultoria detalhada;
- mudanças de banco;
- redesign de módulos Vendedor, Gerente e Dono;
- criação de novos produtos, regras de PDI ou regras de Feedback.

## 12. Estratégia de entrega

1. Preparar arquivos fora da referência da `main`.
2. Validar sintaxe, imports, contratos e políticas.
3. Criar blobs e árvore Git órfãos.
4. Confirmar que a `main` não mudou.
5. Criar um único commit.
6. Fazer fast-forward único da `main`.
7. Acompanhar TypeScript, testes, lint e build.
8. Validar deploy, smoke e runtime.
9. Não realizar segundo commit automático em caso de falha sem diagnóstico completo.
