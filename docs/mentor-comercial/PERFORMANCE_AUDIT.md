# Auditoria de Performance — Mentor Comercial

**Data:** 2026-08-07
**Escopo da Análise:** `supabaseMentorRepository.ts`, `dailyProcessor.ts`, `centralIntegration.ts`, `CarteiraAtivaList.tsx` e Migration `20260807120000_mentor_comercial_motor_v1.sql`.

---

## 1. Mapeamento e Diagnóstico de Queries N+1

### 1.1 Processamento Diário em Lote (`dailyProcessor.ts`)
- **Evidência no Código:** [`dailyProcessor.ts:203-349`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/application/dailyProcessor.ts#L203-L349)
- **Padrão Detectado:** Iteração `for (const ref of opportunitiesRefs)` sobre a lista de oportunidades da loja.
- **Detalhamento:**
  Para cada oportunidade na iteração:
  1. [`dailyProcessor.ts:204`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/application/dailyProcessor.ts#L204) executa `repository.loadFacts(ref)`, que realiza **3 chamadas individuais ao Supabase em paralelo**:
     - `oportunidades.select('*').eq('id', ref.opportunityId)` ([`supabaseMentorRepository.ts:159`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L159))
     - `cadencia_estado_cliente.select('*').eq('oportunidade_id', ref.opportunityId)` ([`supabaseMentorRepository.ts:164`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L164))
     - `mentor_pending_flags.select('flag_code').eq('oportunidade_id', ref.opportunityId)` ([`supabaseMentorRepository.ts:170`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L170))
  2. [`dailyProcessor.ts:300-337`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/application/dailyProcessor.ts#L300-L337) executa sequencialmente a escrita do estado por item:
     - `saveOpportunityState` (`update oportunidades`)
     - `savePendingFlags` (`select` + `insert`/`update mentor_pending_flags`)
     - `saveCadenceState` (`select` + `update`/`insert cadencia_estado_cliente`)
     - `upsertCentralAction` / `removeCentralAction` (`upsert`/`update execution_actions`)
     - `appendHistory` (`upsert eventos_comerciais`)
     - `appendScoreSnapshot` (`upsert mentor_score_snapshots`)
- **Impacto de Latência:**
  Para uma carteira com $N = 100$ oportunidades, o processador diário realiza entre $300$ e $900$ requisições HTTP/Database sequenciais em vez de efetuar a leitura e a gravação em lote (*bulk*).

### 1.2 Outros Módulos
- **`centralIntegration.ts`:** Não possui iteração de lista. O método [`completeCentralAction`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/application/centralIntegration.ts#L290) processa ações individuais disparadas por eventos do usuário. Sem N+1.
- **`supabaseMentorRepository.ts`:** O método [`loadCatalog`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L39) carrega as 5 tabelas de catálogo via `Promise.all` e armazena os resultados em um cache em memória ([`supabaseMentorRepository.ts:33`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L33)). Chamadas subsequentes não geram requisições de rede.

---

## 2. Análise da Carteira Ativa (`CarteiraAtivaList.tsx`)

- **Evidência no Código:** [`CarteiraAtivaList.tsx:57-180`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/ui/CarteiraAtivaList.tsx#L57-L180)
- **Diagnóstico:** A `CarteiraAtivaList` **NÃO realiza NENHUMA query por card** nem possui chamadas diretas ao banco Supabase.
- **Funcionamento:**
  1. O componente recebe o array completo de dados `oportunidades` via props (`CarteiraAtivaListProps`, linha 20).
  2. Executa a filtragem e a ordenação determinística totalmente em memória usando `useMemo` ([`CarteiraAtivaList.tsx:66-80`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/ui/CarteiraAtivaList.tsx#L66-L80)).
  3. O componente filho [`OportunidadeCard.tsx`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/ui/OportunidadeCard.tsx#L115) é puramente de apresentação (sem `useEffect`, sem chamadas de API ou hooks com efeito colateral).
- **Recomendação de Manutenção:** Garantir que o container pai/hook abasteça o prop `oportunidades` através de uma única consulta em lote na inicialização da página.

---

## 3. Cobertura de Índices da Migration `20260807120000_mentor_comercial_motor_v1.sql`

### 3.1 Índices Utilizados pelas Queries Reais

| Índice na Migration | Tabela | Definição / Colunas | Query Coberta (Arquivo:Linha) |
|---|---|---|---|
| `idx_oportunidades_mentor_priority` | `oportunidades` | `(loja_id, seller_user_id, priority_index DESC) WHERE needs_mentor_classification = false` | Ordenação e listagem da Carteira Ativa por prioridade |
| `idx_oportunidades_mentor_next_action` | `oportunidades` | `(loja_id, seller_user_id, next_action_at) WHERE next_action_at IS NOT NULL` | Filtros da Carteira e ordenação por data de próxima ação |
| `idx_oportunidades_mentor_status` | `oportunidades` | `(current_status_code) WHERE current_status_code IS NOT NULL` | Filtro direto de status |
| `idx_oportunidades_needs_classification` | `oportunidades` | `(loja_id, seller_user_id) WHERE needs_mentor_classification = true` | Fila de oportunidades pendentes de classificação |
| `idx_cadencia_estado_oportunidade` | `cadencia_estado_cliente` | `(oportunidade_id) WHERE oportunidade_id IS NOT NULL` | `loadFacts` (`supabaseMentorRepository.ts:164`) |
| `ux_cadencia_ativa_por_oportunidade` | `cadencia_estado_cliente` | `(oportunidade_id) WHERE status = 'ativo'` | Busca rápida de cadência ativa em `loadFacts` |
| `idx_carteira_missao_itens_oportunidade` | `carteira_missao_itens` | `(oportunidade_id) WHERE oportunidade_id IS NOT NULL` | `getEligibleAttackMission` (`attackMissions.ts`) |
| `idx_mentor_pending_flags_opportunity` | `mentor_pending_flags` | `(oportunidade_id, status)` | `loadFacts` (`supabaseMentorRepository.ts:170`) e `savePendingFlags` |
| `ux_mentor_score_snapshot_idempotency` | `mentor_score_snapshots` | `(idempotency_key) WHERE idempotency_key IS NOT NULL` | `appendScoreSnapshot` (`supabaseMentorRepository.ts:465`) |
| `idx_mentor_score_snapshots_opportunity` | `mentor_score_snapshots` | `(oportunidade_id, created_at DESC)` | Consulta de histórico de score por oportunidade |
| `ux_mentor_cadence_steps_order` | `mentor_cadence_steps` | `(rule_version, cadence_code, step_order)` | `loadCatalog` (`supabaseMentorRepository.ts:55`) ordenando passos |
| PK (`loja_id`) | `store_commercial_settings` | `(loja_id)` | `loadStoreSettings` (`supabaseMentorRepository.ts:136`) |

### 3.2 Índices Não Utilizados / Sem Uso Direto no Repositório Atual

1. **`idx_mentor_transitions_lookup`** ([`20260807120000_mentor_comercial_motor_v1.sql:147`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql#L147)):
   - Definição: `ON mentor_transitions (rule_version, result, family)`
   - Razão: O repositório lê a tabela inteira por `rule_version` e constrói o índice de transições em memória (`buildTransitionIndex`). A busca por `(result, family)` não é executada no banco.
2. **`idx_mentor_status_definitions_family`** ([`20260807120000_mentor_comercial_motor_v1.sql:58`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql#L58)):
   - Definição: `ON mentor_status_definitions (rule_version, family)`
   - Razão: `loadCatalog` busca todos os status onde `rule_version = ? AND active = true`, sem filtrar por `family`.

---

## 4. Análise de Policies RLS e Riscos de Varredura (Seq Scan)

### 4.1 Policy `store_commercial_settings_select`
- **Evidência no SQL:** [`20260807120000_mentor_comercial_motor_v1.sql:489-502`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql#L489-L502)
- **Definição da Regra:**
  ```sql
  EXISTS (
    SELECT 1 FROM public.oportunidades o
     WHERE o.loja_id = store_commercial_settings.loja_id
       AND o.seller_user_id = auth.uid()
  )
  ```
- **Risco Identificado:**
  A tabela `oportunidades` possui apenas **índices parciais** contendo `(loja_id, seller_user_id)` (filtrados por `WHERE needs_mentor_classification = false` ou `WHERE next_action_at IS NOT NULL`). A subconsulta da policy RLS executa uma verificação incondicional sobre `(loja_id, seller_user_id)`. Se um vendedor possuir apenas oportunidades que não atendem às cláusulas dos índices parciais, o PostgreSQL precisará realizar um **Sequential Scan** completo na tabela `oportunidades` para avaliar a permissão de leitura de `store_commercial_settings`.
- **Recomendação de Correção:** Criar índice composto irrestrito `CREATE INDEX idx_oportunidades_loja_seller ON public.oportunidades (loja_id, seller_user_id);`.

### 4.2 Policy `mentor_pending_flags_operacional`
- **Evidência no SQL:** [`20260807120000_mentor_comercial_motor_v1.sql:448-464`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/supabase/migrations/20260807120000_mentor_comercial_motor_v1.sql#L448-L64)
- **Risco Identificado:**
  A policy filtra por `seller_user_id = auth.uid()`. No entanto, a tabela `mentor_pending_flags` possui apenas o índice `idx_mentor_pending_flags_opportunity` em `(oportunidade_id, status)`. Consultas à tabela sem filtro de `oportunidade_id` exigirão varredura sequencial.

---

## 5. Recomendações de Otimização Futura

1. **RPC Transacional e Carregamento em Lote:**
   Implementar função SQL `process_daily_store_batch_rpc(p_store_id uuid)` no PostgreSQL para executar a leitura e atualização de fatos em uma única passagem no servidor.
2. **Substituição de `select('*')` por Projeções Estritas:**
   Em `loadFacts` ([`supabaseMentorRepository.ts:159`](file:///Users/pedroguilherme/PROJETOS/MX%20GESTAO%20PREDITIVA/src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts#L159)), selecionar apenas as colunas necessárias para o motor determinístico em vez de `select('*')`.
