# Design: transições auditáveis da Central de Decisões do Dono

**Data:** 18 de julho de 2026  
**Projeto:** MX Gestão Preditiva  
**Módulo:** Dono da Loja / Central de Decisões  
**Status:** aprovado para planejamento de implementação

## 1. Objetivo

Transformar os itens exibidos na Central de Decisões em ações executáveis e persistentes, com dois comandos canônicos:

- **Aprovar:** iniciar a execução da decisão.
- **Delegar:** atribuir um responsável ativo da loja e iniciar a execução.

A implementação deve sobreviver a recarregamentos, impedir duplicidade, respeitar o escopo da loja, registrar auditoria e reutilizar o domínio existente de Plano de Ação.

## 2. Decisões de produto aprovadas

1. Aprovar equivale a colocar o plano em `em_andamento`.
2. Ao aprovar sem responsável anterior, o usuário autenticado passa a ser o responsável.
3. Delegar exige um responsável ativo vinculado à mesma loja.
4. Delegar coloca o plano em `em_andamento` e registra o novo responsável.
5. Um item resolvido deixa a fila ativa da Central de Decisões e permanece acessível no Plano de Ação.
6. Alertas e recomendações ainda não persistidos são materializados em `public.planos_acao`.
7. Nenhuma tabela paralela de decisões será criada.
8. A auditoria usará `public.historico_planos_acao`, ampliada apenas para registrar o motivo explícito da transição.

## 3. Estado atual relevante

A aplicação já possui:

- `public.planos_acao`, com escopo, departamento, indicador, problema, ação, responsável, prazo, status, prioridade, origem e autoria;
- `public.historico_planos_acao`, preenchida automaticamente quando status, prioridade, prazo, responsável ou eficácia mudam;
- RLS baseada em `public.can_access_mx_scope`;
- RPC `public.criar_plano_acao` para criação canônica;
- vínculos ativos da equipe em `public.vinculos_loja`;
- `OwnerDecisionCenter`, que atualmente apresenta itens gerados em memória e oferece somente análise, navegação para o plano e contato com o consultor.

O problema central é que a fila atual não possui uma transição persistente própria. Um clique não pode apenas mudar estado React e fingir que a empresa tomou uma decisão.

## 4. Abordagens consideradas

### 4.1 Recomendada: estender o Plano de Ação canônico

Materializar ou atualizar cada decisão em `planos_acao`, registrar o vínculo estável com a decisão de origem e executar as transições por uma RPC transacional.

**Vantagens:** domínio único, RLS existente, auditoria existente, integração automática com o Plano de Ação e ausência de sincronização entre tabelas.

### 4.2 Rejeitada: criar `decisoes_dono`

Criaria um segundo estado para o mesmo problema, exigindo sincronização com alertas e planos. A duplicidade aumentaria inconsistência, manutenção e risco de decisões resolvidas reaparecerem.

### 4.3 Rejeitada: persistir somente no navegador

Estado local ou `localStorage` não possui valor operacional, não é compartilhado entre usuários e não oferece auditoria. Seria decoração interativa, não uma funcionalidade de gestão.

## 5. Modelo de dados

### 5.1 Extensão de `public.planos_acao`

Adicionar a coluna opcional:

```sql
origem_ref_key text
```

Adicionar uma restrição para aceitar apenas `NULL` ou uma chave aparada entre 1 e 180 caracteres.

Ela armazenará uma chave textual estável quando a origem não possuir UUID canônico. Para a Central de Decisões:

```text
origem_ref_table = 'owner_decision'
origem_ref_key   = chave estável produzida pelo frontend
```

Criar o índice único parcial exato:

```sql
CREATE UNIQUE INDEX uidx_planos_scope_origin_ref_key
  ON public.planos_acao (
    scope_type,
    scope_id,
    origem_ref_table,
    origem_ref_key
  )
  WHERE origem_ref_key IS NOT NULL;
```

A restrição garante idempotência por loja. Dois cliques, duas abas ou duas requisições concorrentes não devem criar dois planos para a mesma decisão.

### 5.2 Extensão de `public.historico_planos_acao`

Adicionar:

```sql
change_reason text
```

Valores usados por este fluxo:

- `owner_approval`
- `owner_delegation`

Outras atualizações continuam aceitando `NULL`, preservando compatibilidade.

A RPC definirá o motivo dentro da transação com:

```sql
PERFORM set_config('mx.change_reason', v_change_reason, true);
```

A trigger `log_planos_acao_changes()` obterá o valor com:

```sql
NULLIF(current_setting('mx.change_reason', true), '')
```

O terceiro argumento `true` limita a configuração à transação. A trigger salvará o motivo junto de `changed_by`, valores anteriores, valores novos e campos alterados.

### 5.3 Chave estável da decisão

O frontend produzirá uma chave sem índice de array e sem depender da ordem visual:

- ação do motor: `action:<action.id>`;
- alerta: `alert:<hash-estável-do-conteúdo-canônico>`.

O hash do alerta usará título, variante e recomendação normalizados. Mudança material nesses campos gera uma nova decisão. Mudança de ordenação não gera outra decisão.

A função de chave será pura, determinística e coberta por testes unitários. O resultado completo terá no máximo 180 caracteres.

## 6. RPC transacional

Criar a função com assinatura explícita:

```sql
public.transition_owner_decision(
  p_store_id uuid,
  p_decision_key text,
  p_transition text,
  p_departamento text,
  p_indicador text,
  p_problema text,
  p_acao text,
  p_como text DEFAULT NULL,
  p_prioridade public.action_priority DEFAULT 'media',
  p_origem public.action_origin DEFAULT 'manual',
  p_prazo date DEFAULT NULL,
  p_responsavel_id uuid DEFAULT NULL
) RETURNS public.planos_acao
```

A função será `SECURITY DEFINER`, terá `SET search_path = public`, execução revogada de `PUBLIC` e `anon`, e execução concedida apenas a `authenticated`.

### 6.1 Validações

1. Exigir sessão autenticada.
2. Exigir acesso à loja por `can_access_mx_scope('store', p_store_id)`.
3. Exigir papel autorizado para decisão executiva: `master`, `director`, `consultant` ou `admin_mx`.
4. Rejeitar chave vazia, chave acima de 180 caracteres e campos obrigatórios vazios.
5. Aceitar em `p_transition` somente `approve` ou `delegate`.
6. Em delegação, exigir `p_responsavel_id`.
7. Em delegação, exigir vínculo ativo do responsável em `vinculos_loja` para `p_store_id`.
8. Não aceitar responsável de outra loja, mesmo que o cliente envie manualmente o UUID.
9. Aceitar a origem somente no enum real do banco: `alertas`, `score`, `consultor` ou `manual`.

### 6.2 Algoritmo

1. Localizar e bloquear com `FOR UPDATE` o plano da mesma loja e chave de decisão.
2. Quando não existir, executar `INSERT ... ON CONFLICT DO NOTHING` com status inicial `pendente`, preenchendo `created_by`, `origem_ref_table = 'owner_decision'` e `origem_ref_key`.
3. Após o insert, localizar novamente a linha e bloqueá-la com `FOR UPDATE`. Esse segundo passo cobre a corrida em que outra transação criou a mesma decisão.
4. Definir o motivo transacional de auditoria:
   - `owner_approval` para aprovação;
   - `owner_delegation` para delegação.
5. Atualizar o plano:
   - aprovação: `status = 'em_andamento'` e `responsavel_id = COALESCE(responsavel_id, auth.uid())`;
   - delegação: `status = 'em_andamento'` e `responsavel_id = p_responsavel_id`.
6. Manter prazo existente. Para plano recém-criado sem prazo informado, usar `CURRENT_DATE + 7`.
7. Retornar a linha final de `planos_acao`.

A inserção como `pendente` seguida da atualização na mesma transação é intencional. Assim, até a primeira aprovação ou delegação produz uma entrada explícita em `historico_planos_acao`, em vez de depender apenas de `created_at`.

### 6.3 Idempotência e concorrência

- A RPC usará o índice único de referência.
- Em conflito de inserção, relerá a linha existente e aplicará a transição solicitada.
- Aprovar duas vezes mantém um único plano.
- Uma repetição sem mudança real não precisa produzir histórico vazio.
- Delegar para outro responsável altera a mesma linha e gera novo histórico.
- O retorno será sempre a versão persistida final.

## 7. Camada de aplicação

### 7.1 Tipos

Ampliar `CentralMxPlanoAcaoRow` com `origem_ref_key`.

Criar tipos específicos:

```ts
type OwnerDecisionTransition = 'approve' | 'delegate'
type OwnerDecisionItemKind = 'action' | 'alert'
```

Cada `ExecutiveItem` receberá:

- `decisionKey`;
- `kind`;
- dados canônicos necessários para materialização;
- `persistedPlanId`, quando existente;
- `resolved`, derivado do plano persistido.

### 7.2 Hook de transição

Criar `useOwnerDecisionTransitions(storeId)` com responsabilidades limitadas:

- carregar planos cuja `origem_ref_table` seja `owner_decision`;
- indexar planos por `origem_ref_key`;
- executar `approve(item)`;
- executar `delegate(item, responsavelId, prazo)`;
- expor `pendingDecisionKey`, erro e `refresh`;
- atualizar o mapa local somente com a linha devolvida pela RPC;
- emitir toasts de sucesso e erro.

O hook não deve montar modal nem decidir textos de interface.

### 7.3 Responsáveis da loja

Criar uma leitura focada nos vínculos ativos da loja, reutilizando os tipos e selects de equipe quando possível. A lista deve trazer apenas o necessário para delegação:

- `user_id`;
- nome;
- papel;
- vínculo ativo.

A consulta deve filtrar `store_id` e `is_active = true`. Não deve carregar check-ins, ranking ou vigência comercial quando esses dados não forem usados pelo modal.

### 7.4 Integração no cockpit

`OwnerExecutiveCockpit` passará `storeId` para `OwnerDecisionCenter`.

`OwnerDecisionCenter` combinará:

- itens gerados pelo motor;
- alertas executivos;
- mapa de planos já materializados.

Planos com status `em_andamento`, `atrasado`, `validando_eficacia` ou `concluido` serão tratados como resolvidos na fila de decisão. Eles não serão apagados e continuarão disponíveis no Plano de Ação.

## 8. UX

### 8.1 Ações no card

Substituir o conjunto principal por:

- **Analisar**: mantém expansão do direcionamento;
- **Aprovar**: ação primária;
- **Delegar**: abre modal;
- **Falar com Consultor**: permanece como ação secundária.

O link genérico “Abrir plano de ação” deixa de ser a única saída operacional. Após uma transição concluída, o toast incluirá acesso ao Plano de Ação pela navegação existente.

### 8.2 Estado de Aprovar

- botão desabilitado sem loja operacional;
- loading restrito ao item clicado;
- bloqueio contra clique repetido;
- sucesso somente após resposta da RPC;
- remoção do item da fila ativa após sucesso;
- erro mantém o item e apresenta mensagem acionável.

### 8.3 Modal de Delegar

Campos:

- resumo não editável da decisão;
- responsável obrigatório;
- prazo obrigatório, preenchido inicialmente com o prazo calculado ou sete dias à frente;
- indicação do papel do responsável.

Estados:

- carregando responsáveis;
- lista vazia com explicação;
- erro de leitura com tentativa de recarregar;
- salvando;
- erro de validação;
- sucesso e fechamento automático.

O modal deve obedecer foco inicial, `Escape`, retorno de foco, rótulos acessíveis e navegação por teclado.

### 8.4 Métricas

As métricas “Precisam de você”, “Críticas” e “Em atenção” serão calculadas somente sobre itens ainda não resolvidos. Dessa maneira, aprovar algo realmente reduz a fila, uma inovação conceitual surpreendente para dashboards corporativos.

## 9. Tratamento de erros

- **Sem loja:** comandos desabilitados com texto explicativo.
- **Sem permissão:** mensagem de autorização, sem mutação otimista.
- **Responsável inválido ou inativo:** modal permanece aberto e solicita nova escolha.
- **Conflito concorrente:** RPC aplica a transição ao plano único existente e retorna o estado final.
- **Falha de rede:** nenhum item é removido da fila.
- **Plano alterado por outro usuário:** retorno da RPC substitui o estado local.
- **Erro ao carregar decisões persistidas:** a fila permanece visível, mas as mutações ficam bloqueadas para evitar duplicidade silenciosa.

## 10. Segurança

1. A RPC não confiará em papel, loja ou responsável enviados pelo cliente.
2. Toda autorização será validada no banco.
3. O responsável delegado deverá possuir vínculo ativo na loja.
4. O índice único impedirá duplicidade entre sessões.
5. `SECURITY DEFINER` terá `search_path` fixo.
6. Execução será revogada de `PUBLIC` e `anon`.
7. RLS existente continuará protegendo leitura e atualização direta.
8. A migration deverá ser reversível sem remover as tabelas ou os planos canônicos existentes.

## 11. Testes

### 11.1 Unidade

- chave de ação estável;
- chave de alerta estável sob reordenação;
- chave diferente para mudança material;
- mapeamento de status resolvido;
- payload de aprovação;
- payload de delegação;
- normalização de origem `alertas` versus o tipo legado singular no frontend.

### 11.2 Componentes

- renderização dos botões;
- aprovação com loading por item;
- remoção após sucesso;
- preservação após erro;
- abertura e fechamento do modal;
- bloqueio sem responsável;
- seleção de responsável e prazo;
- acessibilidade básica do diálogo.

### 11.3 Banco e contrato

- criação idempotente;
- aprovação gera histórico com `owner_approval`;
- delegação gera histórico com `owner_delegation`;
- segunda delegação para outro usuário altera a mesma linha;
- responsável de outra loja é rejeitado;
- usuário sem papel autorizado é rejeitado;
- usuário sem acesso à loja é rejeitado;
- `anon` não executa a RPC;
- rollback remove função, índice e colunas adicionadas sem remover planos existentes.

### 11.4 Integração

- aprovar, recarregar e confirmar que o item não retorna à fila;
- delegar, recarregar e confirmar responsável no Plano de Ação;
- duas chamadas concorrentes produzem um único plano;
- item resolvido continua visível no painel persistido de planos;
- layouts desktop e mobile sem overflow ou quebra dos botões.

## 12. Implantação

Ordem obrigatória:

1. migration de colunas, índice, trigger e RPC;
2. tipos gerados do Supabase;
3. testes de contrato e RLS;
4. hook de persistência;
5. modal e ações da interface;
6. testes de componente;
7. validação visual autenticada disponível no CI;
8. merge e publicação.

A migration é retrocompatível: colunas novas aceitam `NULL`, planos antigos continuam válidos e os fluxos existentes não precisam conhecer `origem_ref_key` nem `change_reason`.

## 13. Fora de escopo

- fonte canônica de estoque por loja;
- agenda completa do consultor;
- mudança do módulo universal de sidebar;
- criação de novos papéis de usuário;
- notificações externas por WhatsApp, e-mail ou push;
- matriz autenticada integral de produção bloqueada pela issue #127.

## 14. Critérios de aceite

1. Aprovar cria ou reutiliza um único plano e o coloca em andamento.
2. Delegar cria ou reutiliza o mesmo plano, atribui responsável ativo da loja e o coloca em andamento.
3. Toda transição registra usuário, data, valores anteriores, valores novos, campos alterados e motivo.
4. Recarregar a página não faz a decisão resolvida voltar à fila.
5. Decisões resolvidas permanecem acessíveis no Plano de Ação.
6. Cliques repetidos e concorrência não criam duplicidade.
7. Responsável de outra loja ou inativo é rejeitado no banco.
8. Usuário sem autorização não consegue executar a transição.
9. Estados de loading, erro, vazio e sucesso funcionam em desktop e mobile.
10. Nenhuma tabela paralela de decisões é criada.
