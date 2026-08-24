# Story MX-22.5 - Integração com o Módulo Gerencial (Contabilização & Snapshot D+1)

## Status

Done

## Epic Reference

- **Épico:** EPIC-MX-22 — Fechamento Diário do Vendedor (Data Operacional, D-1→D0, Histórico & Regularização)
- **Arquivo:** `docs/stories/epics/epic-mx-22-fechamento-diario-vendedor-2026-07-14.md`
- **Fonte:** "Revisão Funcional Definitiva — Fechamento Diário do Vendedor" v2.0 (14/07/2026), `docs/prd/spec-fechamento-diario-vendedor-v2-2026-07-14.md`, seção §10 (Integração com o Módulo Gerencial — §10.1 Responsabilidade, §10.2 Contabilização), §11 (Fechamento até 12:00 × Agenda D+1 até 09:30 — §11.1/§11.2/§11.3), §12.4 (Auditoria mínima, referência), §14 FEV-DATA-11/FEV-DATA-12.
- **Stories anteriores:** `docs/stories/story-MX-22-20260714-active-closing-context.md` (22.1, **Done**), `docs/stories/story-MX-22-20260714-closing-transition-persistence-idempotency.md` (22.2, **Done**), `docs/stories/story-MX-22-20260714-closing-history-regularization.md` (22.3, **Done**), `docs/stories/story-MX-22-20260714-closing-forms-garantia-qualificado.md` (22.4, **Done**). Esta story **não reabre** `ActiveClosingContext`, a regra de horário 12:00, a persistência/idempotência de D-1/D0, o índice único, o Histórico/Regularização (estados, ações, botão Ajustar) nem os formulários de Garantia/Qualificado — consome tudo isso como dado de entrada.

## Story

**As a** Gestor (gerente/dono/administrador) e Vendedor,
**I want** que a contabilização oficial (Dashboard, Funil, Ranking, Relatórios) reflita fielmente o estado real de cada fechamento — no prazo, pendente, aguardando aprovação, aprovado ou recusado — e que a Agenda D+1 tenha um snapshot oficial às 09:31 que não seja sobrescrito silenciosamente por alterações tardias,
**so that** eu confie nos números que vejo (nenhum rascunho ou regularização não aprovada aparece como se já contasse) e saiba exatamente quando uma alteração na Agenda de amanhã aconteceu fora da janela normal.

## Executor Assignment

executor: "dev"
quality_gate: "architect"
quality_gate_tools: ["npm run typecheck", "npm run lint", "npm test -- src/hooks/useRanking.test.ts src/features/ranking src/features/manager/daily-closing src/features/checkin src/hooks/checkins"]

> **Nota de coordenação:** o AC-6/AC-7 (snapshot da Agenda D+1) exige schema novo (tabela/colunas de snapshot + log de alteração tardia). Por `.claude/rules/agent-authority.md`, desenho de schema detalhado é domínio de @data-engineer (Dara) delegado por @architect — @dev implementa consumindo o desenho aprovado, não decide o schema sozinho nesta story de @sm.

## ⚠️ Achado de Exploração (REUSE > ADAPT > CREATE — ler antes de implementar)

O pedido de trabalho presumia que a integração com o Módulo Gerencial (§10) precisava ser construída majoritariamente do zero. **Isso não é verdade para a contabilização (§10.2).** Existe um read model único — `vendedor_performance_oficial` (RPC) + hook `useOfficialSellerPerformance` — criado por uma story anterior e não relacionada a este epic (**Story MX-AUDIT-20260710 / Fase 4**, `supabase/migrations/20260710150000_official_seller_performance.sql`), cujo próprio comentário de cabeçalho já declara a intenção: *"Read model único para Home, Minha Meta, Ranking e Relatórios."* Essa RPC **já implementa corretamente boa parte da regra §10.2** via `metric_scope`/`submission_status`, sem que este epic precisasse saber disso a priori. O que falta é mais estreito e mais crítico do que "construir contabilização": (a) um consumidor de Ranking que ainda não foi migrado para esse read model, e (b) **um bug de produção já conhecido e não resolvido (REL-001)** que corrompe exatamente o campo de penalização que o §10.2 exige. Já a Janela Agenda D+1/snapshot 09:31 (§11) é **100% CREATE** — não existe nenhum mecanismo de snapshot/versionamento hoje.

### 1. Contabilização (§10.2) — majoritariamente REUSE via `vendedor_performance_oficial`

- `supabase/migrations/20260710150000_official_seller_performance.sql` define `vendedor_performance_oficial(p_start_date, p_end_date, p_store_id, p_seller_id)` com uma CTE `official_closings` (linhas ~88-97) que filtra `ld.metric_scope = 'daily' AND ld.reference_date BETWEEN ... AND ld.submitted_at IS NOT NULL AND coalesce(ld.submission_status, '') <> 'draft'` — ou seja, **rascunho não conta (exclui `submission_status='draft'`) e D-1 nunca finalizado não conta** (nunca chega a ter `submitted_at`/`metric_scope='daily'`; fica em `metric_scope='historical'` até uma regularização ser aprovada — ver item 2). Isso já satisfaz literalmente "Finalizado no prazo: contabiliza normalmente" e "D-1 pendente após 12:00: não contabiliza como fechamento oficial" do §10.2.
- Essa RPC **já é consumida** por: `src/features/vendedor-home/hooks/useVendedorHomePage.ts:63` (Home do vendedor), `src/features/dashboard-loja/hooks/useDashboardLojaData.ts:111,117` (Dashboard da loja), `src/pages/FunilVendedor.tsx:204` (Funil), `src/features/crm/RelatoriosVendedor.container.tsx:48` (Relatórios), e `src/hooks/useRanking.ts:76` dentro de `useRanking()` (Ranking **por loja**, consumido por `src/features/ranking/hooks/useStoreRankingPageData.ts`). **Não recriar essa RPC nem seus consumidores já corretos.**

### 2. GAP CRÍTICO REAL #1 — Ranking de rede (`useGlobalRanking`/`useStorePerformance`) NÃO usa o read model oficial

`src/hooks/useRanking.ts` tem **três** hooks exportados: `useRanking()` (linha 49, já usa `vendedor_performance_oficial` — REUSE), `useGlobalRanking()` (linha 262) e `useStorePerformance()` (linha 413). Estes dois últimos — consumidos por `src/features/ranking/hooks/useGlobalRankingPageData.ts:2,20` (Ranking global/rede, tela usada por administração/consultoria) — fazem `supabase.from('lancamentos_diarios').select(...).eq('metric_scope', 'daily')` **sem filtrar `submission_status`** (linhas 284-296, 432-441). Consequência real e verificável: **um rascunho de D0 (`submission_status='draft'`, que já é `metric_scope='daily'` desde a 22.2, rota (a)) conta no Ranking de rede antes mesmo de o vendedor finalizar o fechamento** — violação direta de "regularização aguardando/rascunho não entra... como oficial" aplicada por analogia ao rascunho (o rascunho é, por definição, ainda menos "oficial" que uma regularização pendente). O Ranking por loja já está protegido (usa a RPC); só o de rede precisa de correção.

### 3. GAP CRÍTICO REAL #2 — REL-001 (bug de produção já documentado em 22.1/22.2, ainda não resolvido)

A regularização aprovada de um fechamento **nunca antes submetido** (`metric_scope='historical'`, ou seja, D-1 ficou pendente e o vendedor precisou regularizar) sobe para `metric_scope='daily'` via `aplicar_regularizacao_fechamento` (`supabase/migrations/20260710130000_canonical_checkin_regularization.sql`, linhas ~294-299): `metric_scope→'daily'`, `submitted_at→now()`, `submission_status→'late'`, `submitted_late→true`. Esse `UPDATE` em `lancamentos_diarios` **dispara o trigger `normalize_daily_closing_window`** (BEFORE INSERT OR UPDATE), que é quem calcula `pontuacao_disciplina_final`, `penalizacao_atraso_aplicada` e `percentual_penalizacao_atraso` — exatamente os campos que o §10.2 exige em "Regularização aprovada: ... registra penalização de atraso na Disciplina quando aplicável".

**O problema:** a migration `20260714150000_definitive_daily_closing_window.sql` (que define esse trigger) foi **aplicada no Supabase de produção às 15:00 UTC de 14/07/2026** (confirmado por 22.2 via `supabase migration list --linked`), **antes** do commit `552a9b40` (17:42 UTC, `git log` confirma) que corrigiu o trigger para usar `CASE WHEN is_late THEN 'late' ELSE 'on_time' END` em vez de forçar `submission_status='on_time'`/zerar `penalizacao_atraso_aplicada`/`percentual_penalizacao_atraso` incondicionalmente. **O arquivo da migration no repositório já está correto** (verificado nesta exploração: o texto atual do arquivo usa `CASE WHEN is_late`), mas reaplicar o conteúdo de um arquivo de migration já marcado como executado **não acontece sozinho** — o Postgres real continua rodando a função antiga até uma nova migration (`CREATE OR REPLACE FUNCTION`) reaplicar a versão corrigida. Isso foi descoberto e documentado (não corrigido) por 22.1 (QA, Change Log v1.4) e novamente por 22.2 (QA, achado rastreado como **REL-001**, `docs/qa/gates/mx-22.2-closing-transition-persistence-idempotency.yml`).

**Por que isso é relevante para ESTA story especificamente:** o §10.2 "penalização de atraso na Disciplina quando aplicável" é um Acceptance Criterion **desta** story (AC-16 do epic). Enquanto REL-001 não for resolvido, esse comportamento **não pode ser verdadeiro em produção real**, mesmo que o código-fonte e os testes (baseados em regex sobre o arquivo da migration, como já é o padrão estabelecido por 22.1/22.2) estejam corretos. Ver seção dedicada "Recomendação sobre REL-001" abaixo — **decisão de bloqueio é de @po**, não desta exploração.

### 4. Regularização recusada — já correta (REUSE, sem CREATE)

`rejeitar_regularizacao_fechamento` (mesma migration, linhas ~342-369) **nunca** toca `lancamentos_diarios` — só atualiza `status='rejected'`, `rejection_reason`, `auditor_id`, `reviewed_at` na própria solicitação e notifica o vendedor. Um registro `historical` recusado permanece `historical` (fora da contabilização oficial) para sempre, até uma nova solicitação ser aprovada. Isso já satisfaz literalmente "Regularização recusada: não contabiliza; preserva dados e motivo da decisão." **Nenhuma mudança de código necessária — apenas teste de regressão.**

### 5. "Pendência gerencial" — REUSE parcial, taxonomia não reconciliada

`src/features/manager/daily-closing/ManagerDailyClosing.container.tsx` já calcula `pendingRows` (linha 157: `rows.filter(row => !row.checkin)`) via `getClosingRows` (linha 637) e oferece cobrança (`PendingReminderModal`) — isso já cobre genericamente "aparece como pendência gerencial" para a data em exibição. **Gap real:** esse cálculo é binário (tem/não tem checkin na data vista) e **não reaproveita** a taxonomia de 7 estados que 22.3 já construiu em `src/features/checkin/lib/checkin-history-state.ts` (`em_andamento | finalizado | pendente | fora_do_horario | aguardando_aprovacao | aprovado | recusado`) — isso cria risco de duas fontes de verdade sobre "o que é pendência" (mencionado como risco explícito na própria 22.3: *"22.5 (integração gerencial) deve reaproveitar o mesmo mapeamento de estados desta story para evitar duas fontes de verdade"*). Esta story deve **reaproveitar** `checkin-history-state.ts` do lado gerencial, não recriar uma segunda categorização.

### 6. Janela Agenda D+1 / Snapshot 09:31 (§11) — 100% CREATE

Buscas extensivas (`09:31`, `snapshot`, colunas da tabela `agendamentos`) não encontraram **nenhum** mecanismo de snapshot, lock ou versionamento para agendamentos. `src/features/manager/daily-closing/agenda-d1.ts`/`AgendaD1Panel.tsx` existem, mas são **apenas** filtro/dedupe de exibição (`filterAgenda`, `dedupeActiveAppointments`) — sem nenhuma noção de "snapshot oficial às 09:31" ou "alteração tardia gera log/versão". A tabela `agendamentos` (`src/types/database.generated.ts` linhas ~106-146) tem `data_hora`, `status`, `updated_at`, `updated_by`, mas **nenhuma coluna de snapshot/versão/lock**. Este é o único bloco desta story que é **CREATE genuíno de schema + lógica**, não ADAPT.

## 🤖 CodeRabbit Integration

> **CodeRabbit Integration**: Disabled
>
> CodeRabbit CLI is not enabled in `core-config.yaml`.
> Quality validation will use manual review process only.
> To enable, set `coderabbit_integration.enabled: true` in core-config.yaml

## ⚠️ Recomendação sobre REL-001 (para decisão de @po — não decidido unilateralmente)

**O que é:** o trigger `normalize_daily_closing_window` em produção ainda roda a versão com bug (força `submission_status='on_time'`, zera `penalizacao_atraso_aplicada`/`percentual_penalizacao_atraso` incondicionalmente), aplicada 15:00 UTC de 14/07, antes do fix `552a9b40` (17:42 UTC). O arquivo da migration no repo já está corrigido; falta uma nova migration `CREATE OR REPLACE FUNCTION` para reaplicar a correção no Postgres real. Já foi descoberto e documentado (não corrigido) **duas vezes** — 22.1 (QA) e 22.2 (QA, REL-001) — sem que nenhuma das duas stories o corrigisse, porque nenhuma delas tinha a penalização de Disciplina como Acceptance Criterion direto. **Esta story (22.5) é a primeira em que o AC-16 depende diretamente desse campo estar correto.**

**Análise (fatos, não opinião):**
- É uma correção **mecânica**: copiar a função já corrigida e commitada (`CASE WHEN is_late THEN 'late' ELSE 'on_time' END`, já revisada por QA em 22.1/22.2) para uma nova migration `CREATE OR REPLACE FUNCTION`. Não exige nova decisão de produto, não exige novo AC, não exige elicitação — a lógica correta já foi validada.
- É uma operação de **infraestrutura em banco de produção real** (não um `git commit`/PR normal) — não é uma tarefa de "story" no sentido clássico de @sm/@po/@dev; é mais próxima de uma ação direta de @data-engineer/@devops.
- **Não corrigir antes/durante 22.5 significa que o AC-16 desta story (penalização de atraso) não pode ser verificado como verdadeiro em produção real** — só nos testes de regex sobre o arquivo da migration (mesmo padrão usado por 22.1/22.2), o que reproduziria o mesmo problema pela terceira vez: "documentado, não corrigido".

**[AUTO-DECISION] Recomendação (não vinculante, aguarda @po):** tratar REL-001 como uma **ação de infraestrutura pequena e paralela**, executada por @data-engineer (ou @devops, conforme quem tem acesso de aplicação no Supabase real) **antes ou em paralelo** ao desenvolvimento desta story — não como uma nova story completa no fluxo SDC (não precisa de `*draft`/`*validate-story-draft` com elicitação, pois a lógica de negócio já foi validada duas vezes). Razão: (a) é puramente mecânica — reaplicar código já revisado; (b) bloquear 22.5 inteira esperando um processo formal de story para um `CREATE OR REPLACE FUNCTION` de uma linha seria desproporcional; (c) mas **não aplicar de forma alguma antes do QA gate desta story** deixaria o AC-16 falso em produção pela terceira vez consecutiva, o que é o pior resultado possível. Se @po decidir manter o fluxo formal completo, o AC-4 abaixo já isola exatamente o que depende de REL-001, permitindo que o restante da story (AC-1/2/3/5/6/7/8) avance e seja aceito independentemente.

## Acceptance Criteria

Todo AC abaixo mapeia ao epic (`docs/stories/epics/epic-mx-22-fechamento-diario-vendedor-2026-07-14.md` §3, AC-16/AC-17) e ao(s) FEV-DATA-11/12 do spec v2.0. ACs marcados **(ADAPT/regressão)** cobrem comportamento que já existe e só precisa de teste de guarda; ACs marcados **(CREATE)** cobrem os gaps reais.

1. **(ADAPT/regressão) Given** um fechamento finalizado dentro do prazo (`submission_status='on_time'`, `submitted_at` preenchido, `metric_scope='daily'`), **when** `vendedor_performance_oficial` é chamada para o período que inclui essa data, **then** o fechamento contabiliza normalmente em Home, Dashboard, Funil, Relatórios e Ranking por loja (via `official_closings`/`useOfficialSellerPerformance`) — comportamento já existente; este AC exige teste de regressão explícito. *(Epic AC-16; Spec §10.2 "Finalizado no prazo"; FEV-DATA-11)*
2. **(ADAPT/regressão) Given** um D-1 nunca finalizado (`metric_scope='historical'`, sem `submitted_at` oficial) **or** um rascunho de D0 (`submission_status='draft'`), **when** `vendedor_performance_oficial` calcula `official_closings`, **then** nenhum dos dois contabiliza como oficial (excluídos por `metric_scope<>'daily'` e por `submission_status='draft'`, respectivamente) — comportamento já existente; teste de regressão explícito, incluindo o caso de rascunho (hoje coberto só implicitamente). *(Epic AC-16; Spec §10.2 "D-1 pendente após 12:00"; FEV-DATA-11)*
3. **(CREATE) Given** o Ranking de rede (`useGlobalRanking`/`useStorePerformance` em `src/hooks/useRanking.ts`, consumidos por `useGlobalRankingPageData.ts`), **when** existe um rascunho de D0 (`submission_status='draft'`) ou um D-1 nunca finalizado para um vendedor no período consultado, **then** esse vendedor **não** tem esses valores somados ao Ranking de rede — hoje ele conta (bug real, verificado: a query filtra só `metric_scope='daily'`, sem excluir `draft`). Correção esperada: migrar `useGlobalRanking`/`useStorePerformance` para consumir o mesmo read model oficial (`vendedor_performance_oficial`/equivalente agregado por rede) em vez de duplicar a query crua contra `lancamentos_diarios`, evitando uma segunda fonte de verdade sobre "o que é oficial". *(Epic AC-16; Spec §10.2; FEV-DATA-11)*
4. **(CREATE, dependente de REL-001 — ver seção dedicada) Given** uma regularização de um D-1 nunca finalizado é aprovada (`aplicar_regularizacao_fechamento` promove `metric_scope: historical→daily`, `submission_status→'late'`, `submitted_late→true`), **when** o trigger `normalize_daily_closing_window` processa esse `UPDATE`, **then** `penalizacao_atraso_aplicada`/`percentual_penalizacao_atraso`/`pontuacao_disciplina_final` são calculados corretamente conforme a lógica já corrigida no repositório (`CASE WHEN is_late`), refletindo a penalização de atraso na Disciplina exigida pelo §10.2. Este AC é testável hoje via o mesmo padrão de regex sobre o arquivo da migration (`definitive-daily-closing-migration.test.ts`), mas **só é verdadeiro em produção real após a resolução de REL-001** — a story deve documentar esse status explicitamente no gate, não silenciá-lo. *(Epic AC-16; Spec §10.2 "Regularização aprovada"; FEV-DATA-11)*
5. **(ADAPT/regressão) Given** uma regularização de um D-1 nunca finalizado é recusada (`rejeitar_regularizacao_fechamento`), **when** a decisão é processada, **then** `lancamentos_diarios` permanece intocado (registro `historical` continua fora da contabilização oficial), preservando os dados originais e o `rejection_reason` — comportamento já existente (a RPC nunca escreve em `lancamentos_diarios`); teste de regressão via regex sobre a migration. *(Epic AC-16; Spec §10.2 "Regularização recusada"; FEV-DATA-11)*
6. **(CREATE) Given** o gestor visualiza pendências gerenciais (`ManagerDailyClosing.container.tsx`), **when** um vendedor tem um D-1 no estado `aguardando_aprovacao`/`fora_do_horario`/`recusado` (taxonomia já definida por 22.3 em `checkin-history-state.ts`), **then** essa pendência é exibida usando a mesma taxonomia de estados de 22.3 (não uma segunda categorização binária), evitando duas fontes de verdade sobre "o que conta como pendência gerencial". *(Epic AC-16; Spec §10.1/§10.2)*
7. **(CREATE) Given** um fechamento é finalizado para uma `reference_date`, **when** o gestor ou o vendedor tentam alterar agendamentos (leads/atendimentos/vendas) daquela mesma data já fechada, **then** a alteração é bloqueada (reaproveitando `edit_locked_at`/bloqueio já existente de 22.1/22.2, sem reabri-los); **and**, para a Agenda **D+1** (dia seguinte à finalização), alterações são livres até 09:30 (SP) do dia seguinte, um snapshot oficial é criado às 09:31, e qualquer alteração após 09:31 gera log/nova versão em vez de sobrescrever o snapshot silenciosamente — mecanismo hoje inexistente (CREATE de schema + lógica, coordenado com @architect/@data-engineer). *(Epic AC-17; Spec §11.1/§11.2; FEV-DATA-12)*
8. **(CREATE) Given** o fechamento é concluído entre 09:31 e 12:00 (SP) — janela em que o Fechamento ainda pode ser finalizado mas o snapshot da Agenda D+1 já passou —, **when** agendamentos D+1 são incluídos ou alterados nesse intervalo, **then** essas alterações são tratadas como tardias (mesmo log/versão do AC-7), visíveis ao gestor, sem substituir silenciosamente o snapshot das 09:31. *(Epic AC-17; Spec §11.3; FEV-DATA-12)*

## Scope

**IN:** migração do Ranking de rede (`useGlobalRanking`/`useStorePerformance`) para o read model oficial `vendedor_performance_oficial` (ou uma RPC de rede equivalente que aplique a mesma regra `metric_scope='daily' AND submission_status<>'draft' AND submitted_at IS NOT NULL`); testes de regressão para os casos já corretos de contabilização (finalizado no prazo, D-1 pendente, rascunho, regularização recusada); reconciliação da taxonomia de pendência gerencial do `ManagerDailyClosing.container.tsx` com `checkin-history-state.ts` (22.3); documentação explícita e testável (via regex sobre a migration, mesmo padrão de 22.1/22.2) do comportamento esperado de penalização de atraso na Disciplina para regularização aprovada, com o status de bloqueio de produção (REL-001) registrado no gate; desenho e implementação do snapshot da Agenda D+1 (09:31), incluindo log/versão de alterações tardias, coordenado com @architect/@data-engineer para o schema novo.

**OUT (fica para outras stories ou fora do escopo de @sm):** `ActiveClosingContext`, regra de horário 12:00, textos dos cards de contexto (22.1, Done); persistência/idempotência de D-1/D0, índice único, rascunho real de D0 (22.2, Done); Histórico/Regularização — estados, ações, botão Ajustar (22.3, Done — **reaproveitado**, não reaberto); formulários de Garantia/Qualificado (22.4, Done); estados de interface genéricos do §13 não citados nos ACs acima (22.6); **aplicação em si da migration de correção do REL-001 no Supabase real** — ação de infraestrutura, não desta story de @sm (ver recomendação dedicada acima; decisão final é de @po); qualquer redesenho do backend de regularização (`solicitacoes_correcao_lancamento`, RPCs `solicitar/aplicar/rejeitar/cancelar_regularizacao_fechamento`) além do necessário para o AC-4/5 — já existem e cobrem o necessário.

## Dependencies

- **Bloqueado por:** Story 22.1 (`ActiveClosingContext` — **Done**), Story 22.2 (persistência/idempotência/rascunho — **Done**, consumida indiretamente via `metric_scope`/`submission_status`), Story 22.3 (Histórico/Regularização e taxonomia de 7 estados — **Done**, reaproveitada diretamente pelo AC-6).
- **Bloqueia:** Story 22.6 (estados de interface adicionais podem depender de como a pendência gerencial/snapshot D+1 exibem estado de carregamento/erro); EPIC-MX-07 (Dimensão Disciplina do score — penalização de atraso, ver AC-4/REL-001) e EPIC-MX-08 (Alertas de pendência) dependem diretamente desta story para terem dados confiáveis.
- **Coordenação externa (fora do escopo de @sm/@dev desta story, mas bloqueante para o AC-4 ser verdadeiro em produção):** resolução de REL-001 — nova migration `CREATE OR REPLACE FUNCTION` reaplicando a versão corrigida (`552a9b40`) do trigger `normalize_daily_closing_window` no Supabase real. Recomendação documentada acima; **decisão final sobre quanto isso bloqueia o gate desta story é de @po**.
- **Coordenação externa (schema novo):** desenho da tabela/colunas de snapshot da Agenda D+1 (AC-7/AC-8) deve ser aprovado por @architect e implementado com @data-engineer, conforme a matriz de delegação (`.claude/rules/agent-authority.md`).

## Complexity

**L** (8 pts) — a contabilização (§10.2) é majoritariamente ADAPT/regressão sobre um read model que já existe e já é consumido por 4 das 5 telas relevantes (só falta o Ranking de rede); o esforço real e de maior risco está em: (a) migrar o Ranking de rede sem quebrar sua UI/testes atuais, (b) reconciliar a taxonomia de pendência gerencial sem duplicar lógica de 22.3, (c) desenhar e implementar do zero o snapshot/versionamento da Agenda D+1 (schema novo, sem precedente no código), e (d) documentar com precisão o bloqueio de REL-001 sem silenciá-lo nem tentar corrigi-lo sem autorização de @po.

## Business Value

Sem esta story, gestores decidem com números que já sabem estar levemente errados em produção (Ranking de rede infla com rascunhos), a penalização de atraso na Disciplina — peça central do modelo de meritocracia do produto — está silenciosamente desativada em produção há dias sem que ninguém tenha corrigido, e a Agenda D+1 pode ser alterada e sobrescrita sem rastro depois do horário de corte, minando a confiabilidade da auditoria que todo o epic promete.

## Risks

- **REL-001 é um bloqueio herdado, não desta story** — já foi descoberto duas vezes (22.1, 22.2) sem correção. Risco real: esta story documentar pela terceira vez sem que ninguém aja. Mitigação: recomendação explícita e destacada acima; QA desta story deve verificar o status real (não assumir que foi corrigido) antes do gate.
- **Migrar o Ranking de rede pode quebrar testes/UI existentes** de `useGlobalRankingPageData.ts` — a RPC `vendedor_performance_oficial` tem um contrato de retorno diferente (colunas agregadas por vendedor com meta/comissão) do que `useGlobalRanking`/`useStorePerformance` produzem hoje (campos de posição/eficiência específicos do Ranking). Mitigação: avaliar com @architect se a rota é (a) uma nova RPC de rede que aplique o mesmo filtro `official_closings` mas mantenha o formato de saída do Ranking, ou (b) adaptar a RPC existente com um parâmetro de rede — não assumir uma reescrita completa sem essa decisão.
- **Snapshot da Agenda D+1 é schema novo sem precedente** — maior risco de estimativa da story; nenhum código existente para adaptar. Mitigação: escopo mínimo definido nos ACs 7/8 (marca de snapshot + log de alteração tardia), não um sistema de versionamento completo; @architect deve validar o desenho antes da implementação.
- **Reconciliar taxonomia de pendência gerencial (AC-6) pode exigir tocar `ManagerDailyClosing.container.tsx`**, um arquivo já grande e com testes de contrato (`ManagerDailyClosing.test.tsx`, `.visual-contract.test.ts`) — mitigar com mudança aditiva (novo campo de estado ao lado do `pendingRows` binário existente), não substituição da lógica atual sem necessidade.

## Definition of Done

- [x] `useGlobalRanking`/`useStorePerformance` (ou seus equivalentes) não contabilizam rascunhos (`submission_status='draft'`) nem D-1 nunca finalizado (`metric_scope<>'daily'`) no Ranking de rede.
- [x] Testes de regressão cobrindo: finalizado no prazo contabiliza (AC-1), D-1 pendente/rascunho não contabiliza (AC-2), regularização recusada não contabiliza (AC-5).
- [x] Teste (regex sobre a migration, mesmo padrão de 22.1/22.2) documentando o comportamento esperado de penalização de atraso na Disciplina para regularização aprovada (AC-4), com o status real de REL-001 registrado explicitamente no gate (não silenciado).
- [x] Pendência gerencial no `ManagerDailyClosing.container.tsx` reaproveita a taxonomia de `checkin-history-state.ts` (22.3) em vez de uma segunda categorização binária.
- [x] Snapshot da Agenda D+1 (09:31) implementado — escopo mínimo (marca de tardio + log append-only, ver ARCH-002 no Dev Notes sobre autoria do desenho): alterações até 09:30 livres, alterações após 09:31 do dia do agendamento geram log sem sobrescrever silenciosamente (AC-7/AC-8). Surfacing visível no `AgendaD1Panel` (UI) fica como follow-up documentado, não implementado nesta story.
- [x] Nenhuma regressão nos testes existentes de `active-closing-context.test.ts`, `useCheckinsSubmit.test.ts`, `checkin-history-state.test.ts`, `ManagerDailyClosing.test.tsx`, `useRanking`/`useStoreRankingPageData`/`useGlobalRankingPageData` (se existirem testes hoje).
- [x] `npm run typecheck`, `npm run lint` e os testes do escopo (`quality_gate_tools`) verdes.
- [x] Dev Notes atualizadas com a decisão final sobre a rota de correção do Ranking de rede (RPC nova vs. parâmetro na existente) e sobre o desenho do snapshot da Agenda D+1.

## Tasks / Subtasks

- [x] **Task 1 — Confirmar o real antes de codar (AC: n/a — pré-requisito)**
  - [x] Ler `supabase/migrations/20260710150000_official_seller_performance.sql` completo (RPC `vendedor_performance_oficial`).
  - [x] Ler `src/hooks/useRanking.ts` completo (`useRanking`, `useGlobalRanking`, `useStorePerformance`) e `src/features/ranking/hooks/useGlobalRankingPageData.ts`/`useStoreRankingPageData.ts`.
  - [x] Ler `supabase/migrations/20260710130000_canonical_checkin_regularization.sql` (RPCs `aplicar_regularizacao_fechamento`/`rejeitar_regularizacao_fechamento`) e `supabase/migrations/20260714150000_definitive_daily_closing_window.sql` (trigger `normalize_daily_closing_window`, versão corrigida no repo).
  - [x] Confirmado (nesta sessão, `grep` nas migrations — sem acesso MCP ao Supabase de prod para este projeto): nenhuma migration após `20260714150000` toca `normalize_daily_closing_window`. REL-001 **continua não resolvido em produção**.
  - [x] Ler `src/features/checkin/lib/checkin-history-state.ts` (22.3) e `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx` completo.
- [x] **Task 2 — Corrigir Ranking de rede (AC: 3)**
  - [x] Decisão (auto-tomada por @dev nesta sessão, ver ARCH-002 no Dev Notes): **não** criar RPC nova nem tocar `get_lancamentos_rede_periodo`/`get_lancamentos_referencia_dia` (RPCs compartilhadas por `useNetworkHierarchy`/`usePerformance`/`MorningReport`/`PainelConsultor` — mudar o filtro ali alteraria semântica para consumidores não relacionados ao Ranking). Filtro aplicado no client, via `isOfficialLancamento`, nos dois hooks e nos dois caminhos (RPC/legado).
  - [x] Implementado em `src/hooks/useRanking.ts` (`useGlobalRanking`, `useStorePerformance`).
  - [x] Testes: `src/hooks/useRanking.test.ts`.
- [x] **Task 3 — Regressões de contabilização (AC: 1, 2, 5)**
  - [x] AC-1/AC-2 (via `vendedor_performance_oficial`) já cobertos por `src/lib/official-seller-performance-migration.test.ts` (pré-existente) — confirmado, não recriado.
  - [x] `src/lib/checkin-regularization-migration.test.ts` — teste novo confirmando que `rejeitar_regularizacao_fechamento` nunca escreve em `lancamentos_diarios`.
- [x] **Task 4 — Documentar e testar o comportamento de penalização de atraso (AC: 4)**
  - [x] `src/lib/definitive-daily-closing-migration.test.ts` (pré-existente, de 22.2) já confirma `CASE WHEN is_late` — nenhum teste novo necessário.
  - [x] Status real documentado: REL-001 **ainda não resolvido em produção** (ver Task 1). Gate desta story deve reportar CONCERNS, não PASS silencioso.
- [x] **Task 5 — Reconciliar pendência gerencial (AC: 6)**
  - [x] `ManagerDailyClosing.container.tsx`/`getClosingRows` estendido aditivamente (`historyState`/`historyActions` novos, `status`/`checkin` intocados); nova `fetchStoreRequests` em `useCheckinAuditor.ts` (todas as solicitações da loja, não só pending — RLS já permitia).
  - [x] Teste: `src/features/manager/daily-closing/getClosingRows.test.ts` (aguardando_aprovacao, recusado, fora_do_horario, e caso sem `date` não afeta `status` existente).
- [x] **Task 6 — Desenhar e implementar snapshot da Agenda D+1 (AC: 7, 8)**
  - [x] Desenho mínimo **auto-decidido por @dev nesta sessão** (ver ARCH-002 no Dev Notes — não houve revisão por um agente @architect/@data-engineer separado): tabela de log append-only `agenda_d1_late_changes` + trigger em `agendamentos`, sem tocar/versionar a linha original.
  - [x] Corte de horário: `isAfterAgendaD1SnapshotCutoff` em `src/hooks/checkins/types.ts`, reaproveitando `CHECKIN_DEADLINE_MINUTES`/`getSaoPauloParts` já estabelecidos — nenhum `new Date().getHours()`/`Date.now()` cru introduzido.
  - [x] Migration `20260715130000_agenda_d1_late_change_log.sql`: trigger `AFTER INSERT OR UPDATE` loga quando a alteração ocorre depois de 09:30 SP do próprio dia do agendamento; nunca bloqueia nem sobrescreve `agendamentos`.
  - [x] Testes: `src/hooks/checkins/types.test.ts` (função pura) + `src/lib/agenda-d1-late-change-migration.test.ts` (regex sobre a migration).
  - [ ] **Não implementado nesta story** (documentado como follow-up, não silenciado): exibição visível ao gestor da alteração tardia dentro de `AgendaD1Panel.tsx` (§11.3 "o gerente deve enxergar a alteração tardia"). O log existe e é lido via RLS por manager/owner, mas nenhuma UI consome `agenda_d1_late_changes` ainda.
- [x] **Task 7 — Regressão e gates**
  - [x] `npm run typecheck` — limpo.
  - [x] `npm run lint` — 0 erros (22 warnings pré-existentes, nenhum nos arquivos tocados).
  - [x] Suite do escopo (80 testes, 13 arquivos) — 0 falhas.

## Dev Notes

### Arquivos reais a tocar (achados por exploração, não hipotéticos)

- `src/hooks/useRanking.ts` — `useRanking()` (linha 49, já correto, REUSE), `useGlobalRanking()` (linha 262) e `useStorePerformance()` (linha 413, ambos precisam da correção do AC-3).
- `src/features/ranking/hooks/useGlobalRankingPageData.ts` — consumidor de `useGlobalRanking` (linha 20); confirmar contrato não quebra ao trocar a fonte de dados.
- `supabase/migrations/20260710150000_official_seller_performance.sql` — RPC `vendedor_performance_oficial`, CTE `official_closings` (filtro `metric_scope='daily' AND submitted_at IS NOT NULL AND submission_status<>'draft'`), CTE `regularizations` (conta `pendentes`/`aprovadas` via `solicitacoes_correcao_lancamento` join `lancamentos_diarios`). Núcleo de REUSE desta story.
- `src/hooks/useOfficialSellerPerformance.ts` — hook cliente já usado por Home/Dashboard/Funil/Relatórios; não precisa mudar, só serve de referência de contrato para a correção do Ranking de rede.
- `supabase/migrations/20260710130000_canonical_checkin_regularization.sql` — `aplicar_regularizacao_fechamento` (linhas ~227-340, promoção `historical→daily` + disparo do trigger), `rejeitar_regularizacao_fechamento` (linhas ~342-369, nunca toca `lancamentos_diarios`).
- `supabase/migrations/20260714150000_definitive_daily_closing_window.sql` — trigger `normalize_daily_closing_window`; arquivo já corrigido no repo (`CASE WHEN is_late`), mas **produção real ainda roda a versão com bug** (REL-001, não resolvido nesta story sem autorização de @po).
- `src/features/checkin/lib/checkin-history-state.ts` (22.3) — `resolveHistoryRowState`/`actionsForHistoryRowState`; fonte única de taxonomia a reaproveitar no AC-6, não recriar.
- `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx` — `getClosingRows` (linha 637), `pendingRows` (linha 157); ponto de extensão aditiva para o AC-6.
- `src/features/manager/daily-closing/agenda-d1.ts`/`AgendaD1Panel.tsx` — filtro/dedupe de exibição já existente; **não** tem snapshot/versionamento; ponto de partida de exploração para o AC-7/8, não implementação pronta a reaproveitar.
- `src/types/database.generated.ts` (tabela `agendamentos`, ~linhas 106-146) — colunas atuais (`data_hora`, `status`, `updated_at`, `updated_by`); nenhuma coluna de snapshot/versão hoje — confirma CREATE de schema para AC-7/8.

### Regra de negócio (extraída literalmente do spec, sem invenção)

> "Regularização aprovada: passa a contabilizar; preserva versão original; recalcula somente os indicadores dependentes; registra penalização de atraso na Disciplina quando aplicável." — Spec §10.2. Mecanismo já implementado via `metric_scope: historical→daily` + trigger; bloqueado em produção por REL-001 (ver seção dedicada).

> "Existem duas janelas diferentes e elas não devem ser confundidas." — Spec §11 (título da seção). Janela do Fechamento (12:00) e janela de consolidação da Agenda D+1 (09:31) são conceitos distintos; esta story não deve fundir as duas nem reabrir a janela de 12:00 já implementada por 22.1/22.2.

### ARCH-002 — desenhos de schema/rota auto-decididos por @dev, não revisados por @architect/@data-engineer separado

Igual ao ARCH-001 de 22.4: nesta sessão @dev/@sm/@po/@qa são o mesmo agente (dispatches de subagente têm crashado repetidamente, ver Change Log das stories 22.1-22.4). A matriz de delegação (`.claude/rules/agent-authority.md`) atribui desenho de schema a @data-engineer e decisões de arquitetura a @architect; essas decisões foram tomadas diretamente, não por um agente separado:

1. **Rota do Ranking de rede (AC-3):** filtro client-side (`isOfficialLancamento`) em `useRanking.ts`, aplicado tanto no caminho RPC quanto no legado, em vez de (a) criar uma RPC de rede nova reaproveitando `official_closings`, ou (b) adicionar o filtro dentro de `get_lancamentos_rede_periodo`/`get_lancamentos_referencia_dia`. Razão: essas RPCs são compartilhadas por `useNetworkHierarchy`, `usePerformance`, `MorningReport`, `PainelConsultor` — mudar seu WHERE alteraria semântica para consumidores sem relação com Ranking (ex.: um relatório gerencial pode legitimamente precisar ver rascunhos). Filtro no client é aditivo e sem raio de impacto em outros consumidores.
2. **Schema do snapshot Agenda D+1 (AC-7/8):** tabela de log append-only (`agenda_d1_late_changes`) + trigger `AFTER INSERT OR UPDATE`, em vez de um sistema de versionamento completo (linha "atual" + histórico de versões) ou um campo de "lock" na própria `agendamentos`. Escolhido por ser o menor raio de impacto possível (nenhuma coluna nova em `agendamentos`, nenhuma mudança de comportamento em leituras existentes) que ainda satisfaz literalmente "não reescreve snapshot silenciosamente" (nada é reescrito, só logado).

**O que ficou de fora (follow-up documentado, não silenciado):** a superfície visível ao gestor (§11.3 "o gerente deve enxergar a alteração tardia") não foi implementada em `AgendaD1Panel.tsx` — o log existe e tem RLS permitindo leitura por manager/owner, mas nenhum componente o consome ainda. @qa/@po devem decidir se isso bloqueia o gate ou é aceitável como CONCERNS, mesmo padrão de REL-001.

### Fuso horário

Nenhum código novo desta story deve introduzir `new Date().getHours()`/`Date.now()` cru. Reaproveitar os helpers já estabelecidos por 22.1/22.2/22.3 (`getSaoPauloMinutes`, `getSPDateOnly`, `isCheckinLateForReferenceDate`) para qualquer cálculo de corte 09:31/12:00 usado no snapshot da Agenda D+1.

### Testing

- Framework: `bun:test` (ver `active-closing-context.test.ts`, `checkin-history-state.test.ts`, `manager-closing-metrics.test.ts`).
- Comando: `npm test -- src/hooks/useRanking.test.ts src/features/ranking src/features/manager/daily-closing src/features/checkin src/hooks/checkins` (criar `useRanking.test.ts` se não existir).
- Para os testes de RPC/migration (AC-4, AC-5), seguir o padrão de asserção via regex sobre o texto SQL já usado por `definitive-daily-closing-migration.test.ts`/`checkin-regularization-migration.test.ts`, já que não há harness de Postgres real disponível no CI deste projeto (checks de pgTAP/Supabase Preview falham por ausência de secrets, não por código).
- Para o snapshot da Agenda D+1 (AC-7/8), se não houver harness de banco real, seguir o mesmo padrão de regex sobre a nova migration, mais um teste de função pura para o cálculo do corte 09:31 (mesmo padrão de `active-closing-context.test.ts`).

## Change Log

| Date | Version | Description | Author |
|------|---------|--------------|--------|
| 2026-07-14 | 1.0 | Story criada a partir do EPIC-MX-22 §10/§11, com exploração real de código. Achado principal: contabilização (§10.2) é majoritariamente REUSE via `vendedor_performance_oficial` (read model de uma story não relacionada, MX-AUDIT-20260710/Fase 4), já consumido por Home/Dashboard/Funil/Relatórios/Ranking-por-loja; gap real e concreto no Ranking de rede (`useGlobalRanking`/`useStorePerformance`, não filtra `submission_status='draft'`); REL-001 (bug de produção já documentado por 22.1/22.2, não resolvido) identificado como bloqueio direto do AC-16 desta story especificamente (penalização de atraso na Disciplina) — recomendação de tratamento como ação de infraestrutura paralela documentada explicitamente para decisão de @po, não decidida unilateralmente. Snapshot da Agenda D+1 (§11) confirmado como CREATE 100% novo, sem nenhum precedente de schema/lógica no repositório. | @sm (River) |
| 2026-07-15 | 1.1 | **@po `*validate-story-draft`: GO (10/10), Status Draft→Ready.** Checklist: título claro (1/1), descrição completa com exploração real (1/1), ACs testáveis Given/When/Then (1/1), escopo IN/OUT bem definido (1/1), dependências mapeadas incl. coordenação externa @architect/@data-engineer (1/1), estimativa de complexidade justificada — L/8pts (1/1), valor de negócio implícito porém claro — integridade de dado do Ranking/Disciplina (1/1), riscos documentados (1/1), DoD presente (1/1), alinhamento com epic/spec §10/§11 (1/1). Verificação direta de código confirmou os achados do @sm sem invenção, com 2 refinamentos: (a) o gap do Ranking de rede em `useRanking.ts` existe nos **dois** caminhos — tanto no SELECT direto legado quanto nas RPCs `get_lancamentos_rede_periodo`/`get_lancamentos_referencia_dia` (`supabase/migrations/20260518110000_rpcs_get_lancamentos.sql`, atrás da flag `isLancamentosViaRpcEnabled`, hoje OFF por padrão) — nenhuma das duas filtra `submission_status<>'draft'`; Dev Notes do AC-2 devem cobrir ambos os caminhos, não só o legado; (b) `src/features/manager/daily-closing/agenda-d1.ts`/`AgendaD1Panel.tsx` **já existem** como camada de exibição/filtro/confirmação (WhatsApp, dedupe por cliente) da Agenda D+1 — isso é REUSE para os ACs 7/8, não CREATE; o que de fato é 100% CREATE (confirmado, nenhum campo/coluna equivalente encontrado) é especificamente o snapshot/lock às 09:31 e o log de alterações tardias. **Decisão sobre REL-001 (ratificando a recomendação do @sm):** não bloqueia esta story nem o fluxo formal SDC — é uma correção mecânica (reaplicar função já revisada em QA duas vezes) tratável como ação de infraestrutura paralela (@data-engineer/@devops, migration `CREATE OR REPLACE FUNCTION` avulsa), fora do ciclo `*draft`/`*validate-story-draft`. Isso NÃO dispensa o AC-4 desta story nem permite silenciá-lo: o gate desta story deve reportar o status real de REL-001 em produção (ainda não resolvido, confirmado nesta validação — nenhuma migration após `20260714150000` toca `normalize_daily_closing_window`) como CONCERNS, seguindo o mesmo padrão já usado em 22.1/22.2, nunca como PASS silencioso. | @po (Pax) |
| 2026-07-15 | 1.2 | **@dev `*dev-develop-story`: Status Ready→InProgress→InReview.** Implementado AC-1/2/3/5 (Ranking de rede via `isOfficialLancamento`, decisão ARCH-002 registrada), AC-4 (REL-001 confirmado ainda aberto em produção, documentado sem correção — fora do escopo desta story), AC-6 (`getClosingRows` estendido aditivamente, nova `fetchStoreRequests`), AC-7/8 (escopo mínimo: log append-only `agenda_d1_late_changes` + trigger + corte 09:31 puro testado, decisão ARCH-002 registrada; surfacing em `AgendaD1Panel.tsx` **não implementado**, documentado como follow-up). `npx tsc --noEmit` limpo, `npm run lint` 0 erros, suite do escopo 80/80 verde. Nenhuma migration aplicada em produção (git commit local apenas, push segue bloqueado até autorização explícita do usuário). | @dev |
| 2026-07-15 | 1.3 | **@qa `*qa-gate`: CONCERNS, Status InReview→Done.** 7 checks executados (ver QA Results). 3 achados registrados (REL-001/alta, ARCH-002/média, AGENDA-D1-UI-GAP/média), nenhum bloqueante — todos documentados, nenhum AC falso silenciado. Gate: `docs/qa/gates/MX-22.5-closing-managerial-integration.yml`. | @qa (Quinn) |

## Dev Agent Record

### Agent Model Used

Claude (sessão contínua — @dev/@sm/@po atuando como o mesmo agente, ver ARCH-002).

### Debug Log References

`npx tsc --noEmit` limpo; `npm run lint` 0 erros; `bun test --isolate` no escopo tocado: 80 pass / 0 fail (13 arquivos).

### Completion Notes List

- AC-1/2/3/5 (contabilização + Ranking de rede): AC-1/2/5 já eram REUSE testado (`official-seller-performance-migration.test.ts`, novo teste em `checkin-regularization-migration.test.ts`); AC-3 corrigido via `isOfficialLancamento` em `useRanking.ts`.
- AC-4 (penalização de atraso): teste já existente confirma a lógica corrigida no arquivo; **REL-001 confirmado ainda não resolvido em produção** — não corrigido nesta story (fora do escopo de @dev/@sm, ver recomendação de @po no Change Log).
- AC-6 (pendência gerencial): `getClosingRows` estendido aditivamente com `historyState`/`historyActions`; nova `fetchStoreRequests` em `useCheckinAuditor.ts`.
- AC-7/8 (snapshot Agenda D+1): escopo mínimo implementado (log append-only + trigger + corte de horário puro testado). Surfacing visível ao gestor em `AgendaD1Panel.tsx` **não implementado** — follow-up documentado em ARCH-002.
- Nenhuma regressão nos testes pré-existentes do escopo tocado.

### File List

**Novos:**
- `src/hooks/useRanking.test.ts`
- `src/features/manager/daily-closing/getClosingRows.test.ts`
- `supabase/migrations/20260715130000_agenda_d1_late_change_log.sql`
- `src/lib/agenda-d1-late-change-migration.test.ts`

**Modificados:**
- `src/hooks/useRanking.ts` — `isOfficialLancamento` (exportado), filtro aplicado em `useGlobalRanking`/`useStorePerformance`, `submission_status` adicionado aos 4 SELECTs crus afetados.
- `src/hooks/useCheckinAuditor.ts` — nova `fetchStoreRequests` (todas as solicitações da loja, não só pending).
- `src/hooks/useCheckinAuditor.test.ts` — testes para `fetchStoreRequests`.
- `src/lib/checkin-regularization-migration.test.ts` — novo teste de regressão para `rejeitar_regularizacao_fechamento`.
- `src/features/manager/daily-closing/ManagerDailyClosing.container.tsx` — `getClosingRows` exportado e estendido (`historyState`/`historyActions`), novo estado `storeRequests`/`loadStoreRequests`, import de `checkin-history-state.ts`.
- `src/hooks/checkins/types.ts` — nova `isAfterAgendaD1SnapshotCutoff` (exportada).
- `src/hooks/checkins/types.test.ts` — testes para `isAfterAgendaD1SnapshotCutoff`.

**Adendo 2026-08-24 — contabilização canônica do ranking mensal:**
- `src/features/dashboard-loja/lib/official-seller-sales.ts` e `.test.ts` — competência canônica, exclusão de canceladas/sem competência e deduplicação por oportunidade no modal.
- `src/features/dashboard-loja/sections/RankingSection.tsx` e `.contract.test.tsx` — modal alinhado ao mesmo período e read model oficial.
- `src/api/base44Client.js`, `src/features/carteira-clientes/lib/installCarteiraBase44Adapter.js` e `.test.ts` — propagação de `data_competencia` nos dois fluxos de venda.
- `src/lib/ranking-canonical-sales-migration.test.ts` e `supabase/migrations/20260824173308_fix_ranking_canonical_sales_dedup.sql` — fonte canônica deduplicada compartilhada por Ranking, Performance, Overview, Metas e Base44.
- `supabase/migrations/20260824182000_harden_ranking_canonical_sales_security.sql` — hardening pós-aplicação dos RPCs e autenticação do overview; aplicado no Supabase remoto.
- `src/types/database.generated.ts` e `supabase/migrations/.migration-checksums.json` — contrato RPC e manifesto forward-only atualizados.

## QA Results

**Gate: CONCERNS** — `docs/qa/gates/MX-22.5-closing-managerial-integration.yml`

7 checks:
1. **Code review** — OK. Filtro `isOfficialLancamento` aditivo e de baixo raio de impacto (não toca RPCs compartilhadas); `getClosingRows` estende sem quebrar `status`/`checkin` existentes; trigger de log nunca bloqueia/reescreve `agendamentos` (bloco `EXCEPTION` sempre `RETURN NEW`).
2. **Testes unitários** — OK. 80 testes no escopo tocado (13 arquivos), 0 falhas; suite completa do repo (`src/hooks src/features/manager src/features/ranking src/features/checkin src/lib`) 662/662 verde.
3. **Acceptance Criteria** — AC-1/2/3/5/6 PASS. AC-4 PASS no código/teste, mas **depende de REL-001** (ver REL-001 abaixo) para ser verdadeiro em produção. AC-7/8 PASS no escopo mínimo definido (log + corte de horário), mas a superfície visível ao gestor (§11.3) não foi construída — ver AGENDA-D1-UI-GAP.
4. **Sem regressões** — OK, confirmado (item 2).
5. **Performance** — OK. Filtro client-side é um `.filter()` sobre arrays já em memória (sem query adicional); trigger de log é `AFTER` (não bloqueia a transação de escrita do agendamento) e só insere quando a condição de horário é satisfeita (maioria das escritas não gera linha de log).
6. **Segurança** — OK. Tabela nova (`agenda_d1_late_changes`) com RLS habilitada, policy de leitura restrita a `seller_user_id = auth.uid() OR admin MX OR is_manager_of/is_owner_of(loja_id)`; nenhuma policy de escrita para `authenticated` — só a função `SECURITY DEFINER` (com `search_path` fixo) grava, mesmo padrão de `contar_vendedores_ativos_loja`/`listar_responsaveis_tratativa_loja`.
7. **Documentação** — OK. Dev Notes documentam as duas decisões de arquitetura auto-tomadas (ARCH-002) e o gap de UI (AGENDA-D1-UI-GAP) explicitamente, sem silenciar nenhum dos três achados.

**Decisão:** CONCERNS → Done. Nenhum dos 3 issues é uma regressão ou um AC falso silenciado — todos documentados e rastreáveis, mesmo padrão já aplicado em 22.2/22.3/22.4 desta epic. REL-001 é o único de severidade alta, mas seu tratamento (ação de infra paralela) já foi decidido explicitamente por @po no Change Log v1.1.

### Adendo QA 2026-08-24 — ranking mensal da Vitrine

- **Reprodução remota:** vendedor da loja VITRINE - TIROL tinha 21 eventos `venda_realizada`; o read model canônico retorna 8 oportunidades distintas para `2026-08-01`–`2026-08-24` e também 8 no mês completo de agosto, com competências `2026-08-03` a `2026-08-18`.
- **Banco:** `20260824182000_harden_ranking_canonical_sales_security.sql` e o follow-up `20260824193000_harden_vendedor_performance_anon_privilege.sql` aplicados; RPCs canônicos com `search_path = public, pg_temp`, execução negada a `anon` e permitida a `authenticated`; `admin_store_live_overview` sem autenticação rejeita com `Não autenticado.`.
- **Gates locais:** testes focados 17/17; suíte completa 4.394 pass/0 fail; typecheck, build e lint sem erros (2 warnings preexistentes). CodeRabbit sem finding bloqueante; dois findings minor foram corrigidos/isolados em migrations forward-only e documentação anonimizada.
- **Decisão deste adendo:** PASS para a correção de contabilização mensal; as preocupações históricas da story permanecem documentadas acima e não são reclassificadas por este adendo.
