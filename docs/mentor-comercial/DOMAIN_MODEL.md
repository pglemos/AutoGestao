# Modelo de Domínio — Mentor Comercial

Este documento especifica o mapeamento entre os conceitos do domínio do Mentor Comercial e as estruturas de banco de dados e código existentes no MX Performance, detalhando a justificativa arquitetural e as colunas/tabelas adicionadas.

---

## Mapeamento de Conceitos de Domínio

### 1. Client -> clientes

* **Por que essa estrutura:**
  Reuso da tabela mestre de clientes do sistema MX Performance (`clientes`). Evita a duplicação de cadastros de clientes no banco de dados e garante a integridade referencial centralizada no Supabase.
* **O que foi adicionado:**
  A estrutura base da tabela `clientes` foi preservada, estabelecendo a associação com as oportunidades comerciais através do campo chave estrangeira `oportunidades.cliente_id`.

### 2. CommercialOpportunity -> oportunidades

* **Por que essa estrutura:**
  Representa a entidade central do ciclo de vendas. Em vez de criar uma tabela separada para o Mentor Comercial, a tabela mestre de oportunidades existente (`oportunidades`) foi estendida para suportar todos os atributos determinísticos calculados pelo motor.
* **O que foi adicionado:**
  Novas colunas adicionadas pela migration `20260807120000`:
  * `current_status_code`: Código do status atual do catálogo de regras.
  * `previous_status_code`: Código do status imediatamente anterior.
  * `return_status_code`: Código de status para retorno em cadências interrompidas.
  * `status_family`: Família comercial do status (ex.: Prospecção, Negociação, Pós-venda).
  * `current_responsible`: Papel ou usuário responsável pela oportunidade.
  * `temperature`: Classificação de temperatura do lead (Quente, Morno, Frio).
  * `current_objective`: Objetivo comercial do status atual.
  * `current_next_step`: Próxima ação recomendada.
  * `cadence_code`: Código da cadência ativa (ex.: CAD-01).
  * `current_cadence_step`: Número da tentativa/passo atual da cadência.
  * `current_script_code`: Código do script de abordagem associado.
  * `next_action_at`: Timestamp agendado para a próxima ação.
  * `last_interaction_at`: Timestamp da última interação registrada.
  * `appointment_at`: Timestamp do agendamento ou visita.
  * `sale_date`: Data da venda ou fechamento.
  * `potential`: Potencial comercial da oportunidade (Muito alto, Alto, Médio, Baixo).
  * `mentor_score`: Pontuação de qualidade calculada de 0 a 100.
  * `mentor_score_class`: Classificação qualitativa do score (Excelente, Bom, Regular, Crítico).
  * `mentor_score_breakdown`: Desdobramento em JSON dos 5 pilares do score.
  * `priority_index`: Índice numérico de prioridade de atendimento.
  * `priority_class`: Classe de prioridade (P1, P2, P3, P4).
  * `needs_mentor_classification`: Flag indicando necessidade de classificação manual.
  * `channel_entry`: Canal de entrada do lead.
  * `channel_sale`: Canal de conversão da venda.
  * `detailed_origin`: Origem detalhada do lead.
  * `opportunity_type`: Tipo de oportunidade comercial.
  * `trade_interest`: Flag ou detalhe de interesse em troca/veículo usado.
  * `financing_interest`: Flag ou detalhe de interesse em financiamento.
  * `mentor_rule_version`: Versão da matriz de regras aplicada (ex.: v1).
  * `mentor_updated_at`: Timestamp da última atualização pelo Mentor.

### 3. OpportunityAction -> execution_actions

* **Por que essa estrutura:**
  A tabela `execution_actions` atua como a fila operacional unificada da Central de Operações do vendedor. Ações geradas pelo Mentor Comercial são inseridas diretamente nessa tabela para garantir que o vendedor gerencie suas tarefas em uma única interface.
* **O que foi adicionado:**
  Suporte ao tipo de fonte `source_type = 'mentor_comercial'` e inclusão do campo `idempotency_key` derivado da fórmula determinística `mentor:{opportunity_id}:{status_code}:{due_date}` para prevenir a duplicação de tarefas na Central.

### 4. OpportunityHistory -> eventos_comerciais

* **Por que essa estrutura:**
  A tabela `eventos_comerciais` registra a linha do tempo imutável de eventos da oportunidade comercial.
* **O que foi adicionado:**
  Registros de eventos com `event_type` do tipo `mentor_transition` e `mentor_recalculation`, contendo o resultado informado pelo vendedor, status anterior, novo status e a chave de idempotência do evento.

### 5. Cadence -> cadencia_fluxos + cadencia_estado_cliente

* **Por que essa estrutura:**
  Separação explícita entre o catálogo de definição dos fluxos de cadência (`cadencia_fluxos`) e o estado de execução individual de cada cliente/oportunidade (`cadencia_estado_cliente`).
* **O que foi adicionado:**
  Ajuste na tabela `cadencia_estado_cliente` com adição explícita da chave estrangeira `oportunidade_id`, permitindo o vínculo direto com a oportunidade comercial e o acompanhamento de tentativas, agendamentos e elegibilidade a planos de ataque.

### 6. AttackMission -> carteira_missoes

* **Por que essa estrutura:**
  Mapeamento das missões de ataque a carteira (ex.: reconquista de inativos, passagem de bastão, cadências vencidas).
* **O que foi adicionado:**
  Tabela de cabeçalho da missão comercial, agrupando oportunidades elegíveis por tipo de missão, loja e critérios de filtro.

### 7. AttackMissionItem -> carteira_missao_itens

* **Por que essa estrutura:**
  Itens individuais que compõem uma missão de ataque à carteira.
* **O que foi adicionado:**
  Adição da chave estrangeira `oportunidade_id` na tabela `carteira_missao_itens`, conectando cada item da missão à oportunidade e seu respectivo status no Mentor Comercial.

---

## Catálogos do Mentor Comercial (Migration 20260807120000)

Além do mapeamento com tabelas existentes, as seguintes tabelas de catálogo determinístico foram adicionadas:

1. **`mentor_status_definitions`**: Catálogo mestre dos 86 status do Mentor Comercial v1. Armazena canal, família, responsável, objetivo, próximo passo, cadência, script e potencial.
2. **`mentor_cadences`**: Registro das 13 cadências oficiais, incluindo contagem de tentativas e padrão de distribuição de dias.
3. **`mentor_cadence_steps`**: Registro dos 57 passos individuais de cadência mapeados por tentativa e offset temporal (ex.: D0, D+1, D+3, D-2).
4. **`mentor_scripts`**: Biblioteca dos 77 scripts de comunicação oficiais vinculados por código e tentativa.
5. **`mentor_transitions`**: Matriz das 52 regras determinísticas de transição de status com base nos resultados informados.
6. **`mentor_pending_flags`**: Registro de flags de divergência ou pendências determinísticas que demandam atenção.
7. **`mentor_score_snapshots`**: Histórico imutável dos cálculos de Mentor Score e Priority Index para auditoria e rastreabilidade.
8. **`store_commercial_settings`**: Configurações de parâmetros operacionais por loja (SLA de resposta do vendedor em minutos, ativação de pós-venda e garantia).
