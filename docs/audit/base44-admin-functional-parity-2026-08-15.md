# Auditoria de Paridade Funcional Base44 → MXGESTAOPREDITIVA

Data: 15/08/2026  
Branch: `feat/base44-admin-convergence-20260815`

## Escopo

Convergência das áreas administrativas:

- `/clientes`
- `/equipe`
- `/produtos`
- `/indicadores`
- `/planos-acao`
- `/consultoria-mx`

## Fontes auditadas

1. Histórico completo exportado do chat Base44, incluindo as correções posteriores ao protótipo inicial.
2. Código exportado `mx-admin-flow.zip`, contendo páginas, entidades, componentes e utilitários do Módulo Administrador.
3. `CONSULTORIA-CRONOGRAMADEVISITAS`, usado para produtos, encontros e duração padrão.
4. Backlog Priorizado do Módulo Administrador, incluindo MVP vertical, épicos, critérios de aceite, DoR/DoD e roadmap.
5. Código atual do `pglemos/MXGESTAOPREDITIVA`.
6. Schema e dados atuais do Supabase `MX GESTAO PREDITIVA`.
7. Projeto Vercel `mxperformance` e estado do deploy de produção.

## Regra de autoridade

Dentro do mesmo assunto, a decisão funcional mais recente do histórico Base44 prevalece. O Base44 é referência de produto/comportamento; o Supabase atual permanece fonte única dos dados operacionais. O design system e a arquitetura atuais do MXGESTAOPREDITIVA prevalecem sobre o shell visual exportado do Base44.

## Conclusão arquitetural

O sistema atual já possui a maior parte das **instâncias operacionais** necessárias. A migração não deve recriar ClientAccount, Store, UserProfile, JourneyEncounter, IndicatorDefinition ou ActionPlan em tabelas paralelas.

As lacunas reais estão na camada de **governança e versionamento**:

- versões formais de programas de consultoria;
- perfil consultivo e qualificações por produto/encontro;
- pacotes de indicadores por versão do produto;
- biblioteca/versionamento/aplicação idempotente de Planos Padrão;
- metodologia MX versionada por produto/encontro;
- guias internos, entregas, evidências, conteúdos e modelos de relatório padrão.

## Paridade por módulo

### 1. Clientes MX `/clientes`

**Base44 esperado:** Carteira, busca/filtros, onboarding, Razão Social/CNPJ, Matriz/Filiais, horário semanal, Pessoas e Acessos, jornada, módulos, Visão 360, Configurações, readiness e ativação.

**MX atual:** `clientes_consultoria`, `lojas`, `unidades_cliente_consultoria`, `usuarios`, `vinculos_loja`, `atribuicoes_consultoria`, `visitas_consultoria`, `modulos_cliente_consultoria`, auditoria e páginas de CRM de consultoria.

**Status:** PARCIAL. A fonte existe; falta convergir a experiência administrativa e os gates finais sem duplicar cadastros.

### 2. Equipe MX `/equipe`

**Base44 esperado:** Perfil 360 do consultor, edição, produtos habilitados, especialidade por encontro, capacidade Online/Presencial, agenda, ausência/substituição, alocação.

**MX atual:** identidade em `usuarios`, atribuições e agenda existem. Não há camada 1:1 completa de qualificação/capacidade consultiva.

**Status:** PARCIAL. Criar somente extensão consultiva ligada a `usuarios`.

### 3. Produtos de Consultoria `/produtos`

**Base44 esperado:** PMR Online, PMR Híbrido, PMR Plus, PPA; versões; jornada; tempos; módulos padrão; indicadores padrão; publicação e histórico.

**MX atual:** `programas_visita_consultoria` e `etapas_modelo_visita_consultoria` já são catálogo operacional. A rota `/produtos` atualmente representa Produtos Digitais.

**Status:** PARCIAL + conflito de rota. Preservar Produtos Digitais em rota explícita e introduzir Produtos de Consultoria somente para o contexto administrativo interno.

### 4. Indicadores `/indicadores`

**Base44 esperado:** catálogo mestre, fórmulas/dependências, pacote versionado por produto, snapshots para clientes, consolidação multiunidade e parâmetros.

**MX atual:** `catalogo_indicadores_planejamento`, `valores_indicadores_planejamento`, histórico, `catalogo_metricas_consultoria`, conjuntos/valores de parâmetros.

**Status:** PARCIAL. O catálogo mestre já existe; falta pacote versionado por produto e snapshot de implantação.

### 5. Planos de Ação `/planos-acao`

**Base44 esperado:** Biblioteca de Planos Padrão, versões, ações ponderadas, aplicação a cliente, promoção de plano do cliente para biblioteca, idempotência, reconciliação de duplicados, Kanban compartilhado, checklist/progresso/datas.

**MX atual:** `planos_acao` já é uma ação operacional rica, com status, prioridade, progresso, checklist, bloqueios, impacto, aprovação, delegação, reagendamento e histórico. `ActionPlanWorkspace` já possui contrato e transições.

**Status:** PARCIAL. Não remodelar `planos_acao`; adicionar biblioteca/versionamento/aplicação que materializa snapshots no motor atual.

### 6. Consultoria MX `/consultoria-mx`

**Base44 esperado:** domínio de metodologia separado da operação. Produtos definem estrutura; Consultoria MX define conteúdo metodológico; `/consultoria` executa jornadas reais.

**MX atual:** `programas_visita_consultoria`, `etapas_modelo_visita_consultoria`, `visitas_consultoria`, entregas, participantes, evidências e relatórios operacionais já existem. Não existe camada administrativa de metodologia versionada completa.

**Status:** AUSENTE COMO DOMÍNIO SEPARADO. Criar somente governança/metodologia; preservar `/consultoria` para execução.

## Riscos identificados

1. **Três fontes concorrentes:** Base44 original, `src/base44-reference` legado e implementação canônica atual. Solução: adaptadores e mapa de autoridade, nunca copiar entidades cegamente.
2. **Conflito `/produtos`:** hoje significa Produtos Digitais. A mudança precisa ser contextual e compatível com rotas existentes.
3. **Plano de Ação com semântica diferente:** Base44 usa plano-container + itens; MX atual usa cada ação como entidade operacional rica. A biblioteca deve gerar ações, não substituir o modelo.
4. **Atualização silenciosa:** produto/indicador/metodologia publicados não podem alterar clientes existentes automaticamente.
5. **Duplo clique:** aplicação de Plano Padrão precisa de `application_request_id` único e retorno idempotente.
6. **RLS:** toda nova tabela de governança deve usar o contrato atual `eh_area_interna_mx(auth.uid())` e passar pelos advisors.
7. **Produção ativa:** a `main` recebe mudanças frequentes; toda convergência deve ocorrer em branch e Preview antes de promoção.

## Fundação adicionada nesta branch

- mapa tipado de domínio em `src/features/admin-convergence/domainMap.ts`;
- testes de contrato de paridade;
- migration aditiva `20260815110000_base44_admin_governance_foundation.sql`;
- tabelas de versionamento de produto, consultores, pacotes de indicadores, Planos Padrão e Consultoria MX;
- RLS administrativo em todas as novas tabelas;
- `application_request_id` único para preparar aplicação idempotente de Planos Padrão.

## Estado do ambiente

- Produção Vercel permanece inalterada.
- Supabase de produção permanece sem a nova migration aplicada.
- Nenhum dado existente foi alterado ou excluído nesta fase.
- Próximo gate técnico: CI da branch, validação SQL/schema, implementação dos repositórios de governança e rotas administrativas, Preview Vercel e somente então promoção controlada.
