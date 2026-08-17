# Inventário de Eliminação de Duplicação de Domínios — MX Performance

**Documento de Consolidação Arquitetural**

Este documento detalha o inventário completo de consolidação e resolução de rotas, componentes e contratos para eliminar duplicações na navegação dos perfis de backoffice MX (`admin_mx`, `consultor_mx`, `implantacao`, etc.).

---

## 1. Resumo Executivo da Consolidação

Antes da convergência, existiam pontos de duplicidade onde rotas similares atendiam a propósitos complementares de forma desarticulada. O MX Performance estabeleceu 6 domínios canônicos universais com suporte a múltiplos modos de operação via query parameters e sub-rotas estruturadas, garantindo 100% de compatibilidade retroativa através de redirecionamentos canônicos automáticos.

---

## 2. Inventário dos 6 Domínios Canônicos

### Domínio 1: Clientes e Lojas (`/clientes`)
- **Rota Canônica:** `/clientes`
- **Aliases Legados Redirecionados:** `/lojas` (para perfis internos MX redireciona para `/clientes?mode=lojas`), `/admin/clientes`, `/admin/lojas`.
- **Modos Suportados:**
  - `carteira`: listagem completa de clientes com status de implantação, saúde, consultor responsável e filtros avançados.
  - `lojas`: listagem e gerenciamento de unidades/lojas físicas e filiais de todos os clientes.
  - `cadastros`: gestão cadastral de pessoas jurídicas (CNPJs, matrizes e filiais) e donos masters.
  - `360`: Visão 360 do cliente com histórico contratual, capacitações, alocações de consultores e jornada de onboarding.
- **Componente Principal:** `src/pages/AdminClientesPage.tsx` / `src/features/admin-mx/clientes/`

### Domínio 2: Consultoria MX (`/consultoria`)
- **Rota Canônica:** `/consultoria`
- **Aliases Legados Redirecionados:** `/consultoria-mx`, `/consultoria/clientes`, `/painel-consultor`.
- **Modos Suportados:**
  - `operacao`: cockpit operacional do consultor com cronograma de encontros, status de visitas e tarefas pendentes.
  - `clientes`: visão de clientes sob consultoria com progresso de jornada (PMR Online, PMR Híbrido, PMR Plus, PPA).
  - `metodologia`: construtor e editor de encontros, pautas, objetivos, checklists de entregáveis, requisitos de evidências e guias do consultor.
- **Componente Principal:** `src/pages/AdminConsultoriaMxPage.tsx` / `src/features/admin-mx/consultoria-mx/`

### Domínio 3: Plano Estratégico (`/plano-estrategico`)
- **Rota Canônica:** `/plano-estrategico`
- **Aliases Legados Redirecionados:** `/indicadores`, `/admin/indicadores`.
- **Modos Suportados:**
  - `cliente`: cockpit de acompanhamento de metas e realizado de indicadores por cliente e por unidade.
  - `catalogo`: catálogo mestre de 45 indicadores estratégicos canônicos (KPIs) com fórmulas, polaridades, unidades de medida e frequências.
  - `parametros`: configurações globais e políticas de cálculo (ex.: DRE, margem, ticket médio).
  - `pacotes`: pacotes pré-configurados de indicadores por segmento e produto.
- **Componente Principal:** `src/pages/AdminIndicadoresPage.tsx` / `src/features/admin-mx/indicadores/`

### Domínio 4: Plano de Ação (`/plano-acao`)
- **Rota Canônica:** `/plano-acao`
- **Aliases Legados Redirecionados:** `/planos-acao`, `/admin/planos-acao`.
- **Modos Suportados:**
  - `cliente`: gestão operacional de planos de ação em execução em cada cliente/loja, com kanban, prazos e status.
  - `biblioteca`: biblioteca de modelos e templates globais (ActionPlanTemplate) com versionamento, etapas padrão e sugestões automatizadas.
- **Componente Principal:** `src/pages/AdminPlanosAcaoGlobalPage.tsx` / `src/features/admin-mx/planos-acao/`

### Domínio 5: Equipe MX (`/equipe`)
- **Rota Canônica:** `/equipe`
- **Aliases Legados Redirecionados:** `/team`, `/admin/equipe`.
- **Regra Crítica de Roteamento:** Usuários internos MX (`admin_mx`, `consultor_mx`) que acessarem `/team` são canonicamente roteados para `/equipe` (nunca para `/lojas`).
- **Modos Suportados:**
  - `consultores`: cadastro de consultores MX, perfis, certificações e especialidades de produtos.
  - `alocacoes`: matriz de distribuição de clientes por consultor.
  - `capacidade`: controle de horas, carga horária e slots de atendimento.
- **Componente Principal:** `src/pages/AdminEquipeMxPage.tsx` / `src/features/admin-mx/equipe-mx/`

### Domínio 6: Produtos de Consultoria (`/produtos`)
- **Rota Canônica:** `/produtos`
- **Aliases Legados Redirecionados:** `/admin/produtos`, `/produtos-consultoria`.
- **Modos Suportados:**
  - `produtos`: catálogo dos 4 produtos de consultoria (PMR Online - 12 encontros, PMR Híbrido - 12 encontros, PMR Plus - 9 encontros, PPA - 9 encontros).
  - `versoes`: versionamento de metodologia e publicação de matrizes de encontros.
  - `entregaveis`: templates e matrizes de evidências associadas.
- **Componente Principal:** `src/pages/AdminProdutosConsultoriaPage.tsx` / `src/features/admin-mx/produtos/`

---

## 3. Garantia de Zero Regressão Operacional

As rotas e fluxos dedicados aos perfis operacionais do cliente continuam 100% isolados e funcionais:
- **Dono (`dono`):** `/home`, `/cockpit`, `/dre`, `/funil`, `/universidade`, `/ranking`.
- **Gerente (`gerente`):** `/lojas/:slug/rotina`, `/minha-equipe`, `/lojas/:slug/fechamento-diario`, `/lojas/:slug/pdi`.
- **Vendedor (`vendedor`):** `/minha-rotina`, `/meu-desempenho`, `/meu-funil`, `/meu-perfil`.
- **CRM Comercial:** `/crm`, `/contatos`, `/oportunidades`, `/campanhas`.
