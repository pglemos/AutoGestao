# Especificação de Design — Motor Determinístico do Mentor Comercial v1

- **Data**: 2026-08-07
- **Projeto**: MX Performance
- **Status**: Aprovado e Implementado
- **Fonte da Verdade**: `Mentor_Comercial_Motor_Regras_v1.xlsx` (SHA-256: `3268de238076e64f0f0189e96033ea3c423c6afe93d276b700fe750915d7be8e`)

---

## 1. Visão Geral e Princípios Arquiteturais

O **Motor Determinístico do Mentor Comercial v1** é a camada central de inteligência comercial do MX Performance. Ele substitui heurísticas soltas por uma máquina de decisão determinística rigorosamente alinhada à planilha de regras de negócio.

### Princípios Fundamentais
1. **100% Determinístico**: Isento de chamadas a modelos de IA em tempo de execução. Para os mesmos dados de entrada, a decisão gerada é rigorosamente idêntica.
2. **Arquitetura em Camadas Desacopladas**: Separação clara de responsabilidades entre Interface (UI), Serviços de Aplicação (Application), Motor Puro (Engine) e Persistência (Repositories / Supabase).
3. **Rastrabilidade Total**: Todos os 86 status, 13 cadências, 57 passos, 77 scripts e 52 transições correspondem exatamente à especificação catalogada.
4. **Resiliência a Defeitos da Fonte**: Tratamento defensivo para os 5 scripts classificados como `SOURCE_BLOCKER` (`INT-Q07`, `INT-N04`, `POR-A04`, `CAR-C07`, `CAR-C08`), evitando falhas de execução no cliente.
5. **Tipagem Estrita**: Desenvolvido em TypeScript sem uso de `any` ou supressões `@ts-ignore`.

---

## 2. Arquitetura em Camadas

```
+-----------------------------------------------------------------------+
|                             UI Layer                                  |
| (GuidedStatusUpdate, ExecuteNextStepPanel, CarteiraAtivaList, etc.)   |
+-----------------------------------------------------------------------+
                                   |
                                   v
+-----------------------------------------------------------------------+
|                         Application Layer                             |
|  (mentorApplicationService, dailyProcessor, attackMissions, etc.)    |
+-----------------------------------------------------------------------+
                         |                    |
                         v                    v
+---------------------------------+  +----------------------------------+
|          Engine Layer           |  |        Repository Layer          |
| (Pure Engine, Score, Priority,  |  |  (supabaseMentorRepository)      |
|  Cadence, Script, Transition)   |  +----------------------------------+
+---------------------------------+                   |
                                                      v
                                     +----------------------------------+
                                     |         Supabase / Database      |
                                     | (Tables & Schema Migration)      |
                                     +----------------------------------+
```

---

## 3. Detalhamento dos Componentes por Camada

### 3.1. Camada de Interface do Usuário (UI Layer)
Localizada em `src/features/mentor-comercial/ui/`:
- **`GuidedStatusUpdate.tsx`**: Componente de transição orientada de status com validação de regras e inputs específicos.
- **`ExecuteNextStepPanel.tsx`**: Painel de execução do próximo passo comercial recomendado pelo Mentor.
- **`CarteiraAtivaList.tsx`**: Listagem da carteira de oportunidades ativas ordenada por prioridade e urgência.
- **`OportunidadeCard.tsx`**: Card visual da oportunidade contendo score, prioridade, badge de cadência e ações imediatas.
- **`FichaOportunidade.tsx`**: Visão detalhada da oportunidade, histórico de transições e status da cadência.
- **Utilitários e Hooks de UI**:
  - `carteiraOrdering.ts`: Regras determinísticas de ordenação da carteira.
  - `fichaBlocks.ts`: Composição modular dos blocos de informação na ficha.
  - `guidedStatusOptions.ts`: Opções de transição de status filtradas pelas transições permitidas.
  - `useExecuteNextStep.ts`: Hook customizado para orquestração da execução das ações de próximo passo.

### 3.2. Camada de Aplicação (Application Layer)
Localizada em `src/features/mentor-comercial/application/`:
- **`mentorApplicationService.ts`**: Serviço principal da aplicação contendo `applyMentorEvent`, a porta da interface `MentorRepository` e a função helper `buildCentralActionKey`.
- **`dailyProcessor.ts`**: Processador diário determinístico para avanço automático de cadências e cálculo de atrasos.
- **`attackMissions.ts`**: Gerador de missões de ataque comerciais agrupadas por oportunidade e objetivo.
- **`centralIntegration.ts`**: Módulo de sincronização e integração com a Central Comercial do sistema.
- **`closingIntegration.ts`**: Módulo de integração e atualização de eventos de fechamento de vendas.

### 3.3. Camada do Motor Determinístico (Engine Layer)
Localizada em `src/features/mentor-comercial/engine/`:
- **`engine.ts`**: Exporta `resolveMentorDecision(input): MentorDecision`. Ponto de entrada puro que combina pontuação, priorização, decisão de cadência, scripts e transições.
- **`score.ts`**: Exporta `computeScore(input)`, `classifyScore(n)` e `SCORE_PILLAR_WEIGHTS`. Calcula a pontuação da oportunidade com base nos pilares comerciais.
- **`priority.ts`**: Exporta `computePriority(input)`, `classifyPriority(n)`, `POTENTIAL_POINTS` e `URGENCY_POINTS`. Determina o índice de prioridade e a classe de urgência.
- **`cadence.ts`**: Exporta `planCadence`, `advanceCadence`, `registerClientResponse`, `parseOffset` e `isCadenceRef`. Gerencia o plano de cadência e prazos.
- **`script.ts`**: Exporta `renderScript`, `resolveScriptRef`, `OFFICIAL_PLACEHOLDERS` e `SOURCE_BLOCKED_STATUSES`. Realiza a interpolação de variáveis e tratamento de bloqueios.
- **`transition.ts`**: Exporta `buildTransitionIndex` e `resolveTransition`. Garante o cumprimento estrito do mapa de 52 transições de status.

### 3.4. Camada de Repositório (Repository Layer)
Localizada em `src/features/mentor-comercial/infrastructure/`:
- **`supabaseMentorRepository.ts`**: Implementação concreta da porta `MentorRepository`. Executa a leitura e gravação no Supabase, mantendo isolamento da lógica de negócio.

### 3.5. Camada de Persistência e Supabase (Database Layer)
Garantida pela migration aditiva `20260807120000_mentor_comercial_schema.sql`:
- **Tabelas de Catálogo**: `mentor_status_definitions`, `mentor_cadences`, `mentor_cadence_steps`, `mentor_scripts`, `mentor_transitions`, `mentor_pending_flags`, `mentor_score_snapshots`, `store_commercial_settings`.
- **Colunas Adicionadas em `oportunidades`**: `current_status_code`, `previous_status_code`, `return_status_code`, `status_family`, `current_responsible`, `temperature`, `current_objective`, `current_next_step`, `cadence_code`, `current_cadence_step`, `current_script_code`, `next_action_at`, `last_interaction_at`, `appointment_at`, `sale_date`, `potential`, `mentor_score`, `mentor_score_class`, `mentor_score_breakdown`, `priority_index`, `priority_class`, `needs_mentor_classification`, `channel_entry`, `channel_sale`, `detailed_origin`, `opportunity_type`, `trade_interest`, `financing_interest`, `mentor_rule_version`, `mentor_updated_at`.
- **Tabelas de Estado de Cadência e Missões**: `cadencia_estado_cliente` e `carteira_missao_itens`.

---

## 4. Fluxo de Execução

1. Um evento comercial (alteração de status, resposta do cliente ou tick diário) é disparado pela UI ou rotina em background.
2. O `mentorApplicationService` carrega o contexto da oportunidade via `MentorRepository`.
3. O `resolveMentorDecision` (Engine) recebe o contexto e executa as etapas puras sem efeito colateral:
   - Recálculo de Score e Prioridade.
   - Resolução da transição de status válida.
   - Avaliação da cadência e cálculo do próximo passo (`next_action_at`).
   - Renderização do script comercial com os placeholders preenchidos.
4. O `mentorApplicationService` persiste o novo estado no Supabase via `MentorRepository` e atualiza a telemetry em `mentorTelemetry.ts`.

---

## 5. Roteamento da Aplicação

O aceso à interface do Mentor Comercial é gerenciado pela rota canônica `/carteira-clientes`, com aliases de compatibilidade retroativa para `/carteira`, `/vendedor/carteira`, `/mentor-comercial` e `/vendedor/mentor-comercial`.
