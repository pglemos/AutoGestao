# Triagem — PROMPT DE CORREÇÃO BASE44

Fonte: `~/Downloads/PROMPT DE CORREÇÃO/PROMPT DE CORREÇÃO BASE44.md` (~48.700 linhas, 1MB, PT-BR). Não é um documento único — é uma pilha de vários prompts de correção colados em sequência, alguns duplicados/sobrepostos, escritos originalmente para corrigir o **protótipo Base44** do Plano Estratégico. Este arquivo rastreia a triagem desse documento contra o estado real do MX (`mxperformance.com.br`), sessão iniciada 2026-08-21.

## Estrutura do documento fonte

| Linhas | Módulo | Status da triagem |
|---|---|---|
| 0–38.775 | Plano Estratégico — protótipo original (build completo, "v1.1") | não lido a fundo — ver nota abaixo |
| 38.776–41.100 | Plano Estratégico Multiunidade — Visão do Dono (2 prompts sobrepostos, itens 1-46 e 1-33) | ✅ triado |
| 41.101–41.837 | Clientes MX — Resumo do Plano Estratégico (metas publicadas/pendentes/versão exibida) | ✅ triado |
| 41.838–48.704 | Pessoas e Acessos — Dono Master, papéis, ativação | 🟡 parcialmente triado |

**Nota sobre 0-38.775:** é o prompt que gerou o protótipo Base44 em si (linguagem "criar telas, formulários, navegação..."). Não corresponde a um módulo que falta no MX — o MX já tem sua própria implementação (não um port 1:1 do Base44). Tratar como referência de comportamento esperado, não como spec a copiar literalmente.

## Achado 1 — Motor do Plano Estratégico (Visão do Dono) já resolve a maioria das regras

`src/features/strategic-plan/` tem um motor maduro, com commits recentes (`ae36ef70`, `07268508`, `26535302`, `20777320`) já endereçando exatamente os bugs do doc:

- `competence.ts` — competência M-1 fechada (item 7 do doc), testado.
- `unitConsolidation.ts` — sem fallback silencioso pro consolidado, status PARCIAL/COMPLETO/SEM_BASE, recálculo de derivados sobre bases consolidadas (itens 10, 11, 15, 18, 19).
- `unitPolicy.ts` — políticas `COMPANY_ONLY`/`SHARED_COMPANY_VALUE`/`PER_UNIT_*` com badge (item 11 do 2º prompt).

⚠️ **Achado paralelo, não corrigido:** existe um `ownerStrategicPlanViewModel.ts` com a MESMA assinatura pedida pelo doc (`getOwnerStrategicPlanViewModel`) mas **zero consumidores em produção** — só o próprio teste. A tela real (`src/pages/owner/PlanoEstrategico.jsx`) usa `StrategicPlanWorkspace` → `useStrategicPlanController`, um caminho *diferente e mais maduro*. Ou esse arquivo é código morto de uma tentativa anterior desta mesma correção, ou é um WIP abandonado. **Não apaguei** — precisa decisão: apagar (dead code) ou é intenção futura de unificar.

**Teste ao vivo (login dono@mxgestaopreditiva.com.br, cliente MX Consultoria):** competência default = Jul/2026 (mês fechado, correto), cards batendo com a tabela mensal, Ano Anterior mostrando "Sem dados" (estado vazio legítimo, não fabricado). Cliente é mono-loja — não dá pra testar o cenário multiunidade (Matriz/BH/Contagem) do doc com essa conta; nenhum cliente real na base parece ter esse cenário exato do doc (que usa dados fictícios "MX VEÍCULOS TESTE 4").

**Conclusão:** módulo "Visão do Dono" parece **substancialmente correto**. Not blocked, mas não 100% verificado em cenário multiunidade real por falta de fixture.

## Achado 2 — "Metas publicadas/pendentes" do doc não existe no MX (terminologia Base44)

Busquei `"Metas publicadas"`, `"Entrega da Consultoria"`, `"Validar e Ativar"`, `StrategicPlanCard` — nada bate no MX. O card equivalente no MX é o **checklist de prontidão** (`buildClientReadiness` em `clientReadiness.ts`), consumido por `AdminClienteDetalhePage.tsx` (Ficha 360) e `PendenciasModal.tsx`.

Achei (e corrigi nesta sessão, PR #190):
1. `correctionRoute` do checklist apontava pra `/admin/clientes` etc. — rota inexistente (canônica é `/clientes`, sem prefixo). Confirmado ao vivo logado como Administrador MX.
2. O check "Dono Master válido" existe no código mas nunca era passado por nenhuma das duas telas que o usam — a linha nunca aparecia. Corrigido (reusa `resolveOwnerMaster`, que já é o "serviço único de validação do Master" pedido no item 21 do 3º bloco do doc).

**Não fiz ainda:** `journey_generated` e `strategic_plan_ready` são campos opcionais no mesmo tipo (`ClientReadinessInput`), também nunca preenchidos por ninguém. Diferente do Dono Master, não achei um serviço pronto pra reusar — precisa:
- `journey_generated`: consultar se a jornada de encontros do cliente foi materializada (tabela de visitas/encontros da consultoria).
- `strategic_plan_ready`: é literalmente o que o doc pede na seção "Clientes MX — Resumo do Plano Estratégico" — contar indicadores com meta na versão publicada vs pendentes. Fonte provável: `src/features/strategic-plan/planCycleRepository.ts` + `clientPlanningRepository.ts` (já existem, usados pelo motor do Achado 1). Precisa uma função `getClientStrategicPlanPublicationSummary` nova ou adaptar as existentes.

## Achado 3 — KPIs 52/52/52 em Clientes MX: investigado, não é bug

Tela `/clientes`, aba Carteira 360, mostrava "Total de Lojas 52", "Ativos 52", "Em Implantação 52" com o mesmo número. Lido `clientPortfolio.ts`: `ativos` e `em_implantacao` não são buckets mutuamente exclusivos (`clientBuckets` empurra o cliente pra os dois quando aplicável), e "Total de Lojas" nem é um bucket — é contagem bruta de lojas. A coincidência é explicável pelos dados reais de hoje: os 52 clientes ativos são todos loja única (52 lojas = 52 clientes) e todos com jornada de encontros incompleta (`visitsDone < visitsTotal`). Fechado — sem ação.

## Achado 4 — Pessoas e Acessos / Dono Master: dois prompts, ambos já resolvidos no MX

Linhas 41.838–44.184 (dois prompts sobrepostos: "Dono Master, papéis e ativação" de 31 itens + "Reconciliação entre designação, usuário, papel e cliente" de 22 itens). Pedido central de ambos: um **serviço único** (`evaluateOwnerMasterReadiness`/`resolveClientOwnerMaster`) consumido por card, lista, checklist, edição e ativação — pra impedir o bug relatado (card mostra "Ativo", checklist diz "usuário não encontrado", porque cada tela lia uma entidade/fonte diferente).

Cruzado com o código: `resolveOwnerMaster()` em `personAccess.ts` já É esse serviço único — resolve por `is_dono_master` + `status === 'ativo'` + papel `DONO`, com os 4 estados que o doc pede em espírito (`NOT_CONFIGURED`/`VALID`/`DUPLICATE_MASTER`/`INACTIVE`). Antes desta sessão só o `DonoMasterCard` (Ficha 360) usava; **Achado 2** já corrigiu os outros dois consumidores (Ficha 360 checklist + Pendências), então agora card, checklist de prontidão e modal de ativação (`ClientActivationModal` é puramente apresentacional, recebe `checks` de fora) leem exatamente a mesma resolução — sem fonte divergente. **Fechado, sem gap adicional identificado.**

Não implementado (nem pedido explicitamente pelo doc como bloqueante pro MX): o formulário "Adicionar Usuário" em blocos separados (Dados Pessoais / Perfis de Acesso / Dono Master / Escopo) com toggle de transferência de Master — o `PersonCreateModal.tsx` atual já cobre papéis múltiplos + toggle Dono Master + lojas autorizadas, mas não foi comparado campo a campo com os 4 blocos do doc. Baixa prioridade — GAP-PARIDADE-BASE44.md já audita `/equipe`+`/clientes` pessoas como ~95% saudável ao vivo.

## Achado 5 — Planos de Ação Padrão vs Plano do Cliente: spot-check positivo

A partir da linha ~44.185 o documento pede: dois modelos de dados separados (template vs execução do cliente), um componente/lógica única de criação usada em ambos os fluxos, escolha inicial "Usar Plano Padrão" ou "Criar Plano Personalizado", e a função "Transformar em Plano Padrão" com saneamento de dados do cliente antes de virar template reutilizável.

Cruzado com `src/features/admin-mx/planos-acao/`: `NewActionChoiceModal.tsx` (a escolha inicial), `ClientActionPlanWizard.tsx` + `TemplateFormModal.tsx` compartilhando `actionPlanWizardLogic.ts` (lógica única, ainda que não seja literalmente o mesmo componente visual pedido pelo doc), `ApplyTemplateModal.tsx`, `PromoteToTemplateModal.tsx` e `templateApplicationIdempotency.ts` — os nomes e a separação batem com o pedido. GAP-PARIDADE-BASE44.md já marca esse módulo auditado ao vivo (commit `26535302`, hardening de atomicidade). **Não abri as telas nem li os arquivos linha a linha** — é spot-check por nome/estrutura, não confirmação funcional. Risco baixo de gap grande aqui; se quiser certeza total, precisa clicar em produção como fez a auditoria de 2026-08-21.

## Achado 6 — smoke test pós-deploy pegou bug que typecheck/testes não pegaram

Depois do merge do PR #190, testei ao vivo em produção (cliente AG AUTOMOVEIS, admin `synvollt@gmail.com`): o novo check "Dono Master válido" **não aparecia** no checklist de prontidão. Causa: eu mesmo tinha passado `owner_master: null` quando `resolveOwnerMaster` retornava `NOT_CONFIGURED` (cliente sem nenhuma pessoa cadastrada) — e `buildClientReadiness` só empurra o check quando o valor não é `null`. Resultado: em vez de mostrar "Nenhum Dono Master configurado" como pendência (o comportamento correto, igual aos outros checks informativos), o item simplesmente sumia da lista — o oposto do que a Achado 2 pretendia corrigir. Nenhum teste unitário pegou porque os testes só cobriam o caso `owner_master` presente; typecheck não pega isso porque é erro de lógica, não de tipo.

Corrigido no mesmo dia (commit `f2fabcbd`, direto em main): `owner_master` agora carrega o status inteiro do `resolveOwnerMaster` (`NOT_CONFIGURED`/`VALID`/`DUPLICATE_MASTER`/`INACTIVE`) em vez de um boolean achatado, e os dois consumidores sempre passam o objeto — nunca `null`. Textos por status alinhados ao item 23 do doc ("Nenhum Dono Master configurado para esta empresa."). 2 testes novos cobrindo exatamente esse caso.

**Lição para a próxima sessão:** depois de qualquer mudança no checklist de prontidão, testar ao vivo em pelo menos um cliente **sem** Dono Master configurado, não só um com. É fácil escrever o caminho feliz certo e esquecer o caminho vazio.

**Confirmado em produção** (commit `f2fabcbd`, deploy `dpl_9g3HiWAoMaENHBwyHENVZ5YC85Rr` READY): cliente AG AUTOMOVEIS agora mostra `Dono Master válido — Nenhum Dono Master configurado para esta empresa. — Pendente` como 11º item do checklist, sem erro no console. Nota: o check "Plano Estratégico" continua propositalmente ausente para esse cliente (nunca teve ciclo de plano criado — `fetchCurrentCycle` retorna null) — comportamento consistente porque nem todo cliente já começou o Plano Estratégico, diferente do Dono Master que é esperado sempre. Se algum dia isso incomodar, é o mesmo padrão de fix.

## Achado 7 — Planos de Ação: duplicação de 7 registros já resolvida, Kanban consistente ao vivo

Continuação da leitura do doc (linha ~44.850+): módulo inteiro sobre um bug específico — aplicar um Plano Padrão gerava 7 `ClientActionPlan` em vez de 1 com 5 itens — mais spec de Kanban (drag-and-drop, colunas, transições, drawer de detalhe). `templateApplicationIdempotency.ts` já implementa exatamente o padrão pedido (`createTemplateApplicationRequestId` + `application_request_id` único, detecção de replay por `transition_metadata`) — bate com os itens 5/6 do doc (operação única + idempotência). `actionPlanReconciliation.ts` e o RPC `action_plan_reconciliation` do commit `26535302` cobrem a reconciliação (item 8).

Testado ao vivo (Planos de Ação → Planos da rede): card "Planos: 2" bate exatamente com a soma das colunas do Kanban (Não iniciada 0 + Em andamento 1 + Atrasada 1 + Concluída 0 = 2) — sem o bug "7 totais e só 6 distribuídas" que o doc descreve (item 9). Amostra pequena (rede real só tem 2 planos hoje), mas nenhuma inconsistência visível.

## ⚠️ Achado 8 — módulo final do doc pede um RESET DESTRUTIVO do banco. NÃO EXECUTADO.

O fim do documento (última seção antes do EOF) é um "PROMPT DE MANUTENÇÃO CONTROLADA — RESET DOS DADOS DE TESTE v1.0": pede apagar **todos** os clientes, usuários de cliente, jornadas, Planos Estratégicos e Planos de Ação classificados como "teste/demo/seed/mock", deixando "banco operacional vazio, nenhum cliente cadastrado" — preservando só dados mestres (produtos, 45 indicadores, Equipe MX, conta admin).

**Não executei nada disso e não vou executar sem confirmação explícita e ao vivo do dono do produto.** Motivos:
1. É destrutivo e, na prática, irreversível (mesmo com checkpoint/backup, restaurar produção é uma operação de alto risco).
2. A rede tem hoje 52 clientes reais em `/clientes` (AG AUTOMOVEIS, ACERTT, MX CONSULTORIA — a própria empresa dona do sistema — entre outros), todos com aparência de dados de produção genuínos: CNPJ, lojas, vendedores, vendas registradas. Não há como eu, sem contexto de negócio, distinguir com segurança "cliente de teste" de "cliente real" só olhando o banco — errar essa classificação apaga um cliente pagante de verdade.
3. O próprio texto do documento reconhece essa ambiguidade ("não declarar concluído quando existir cliente de teste") sem dar um critério técnico objetivo de classificação.

Nota curiosa: o próprio arquivo do doc termina com o texto **idêntico** ao `/goal` desta sessão (mesmos logins, mesmos tokens) — ou seja, o usuário colou o prompt da sessão dentro do próprio arquivo de correção em algum momento. Não é uma instrução de terceiro escondida no documento; é a mesma diretiva que já rege esta sessão, sem conteúdo novo além do módulo de reset acima.

**Se o dono realmente quiser esse reset**, é um trabalho à parte que precisa: (a) lista explícita de quais dos 52 clientes são teste vs. reais, confirmada por humano; (b) checkpoint/backup real do Supabase antes de qualquer DELETE; (c) execução em ambiente de homologação primeiro. Não é algo pra rodar "de madrugada sem perguntar".

## Entregue nesta sessão

- PR [#190](https://github.com/pglemos/MXGESTAOPREDITIVA/pull/190) `fix/admin-mx-readiness-correction-route` — **merged em main** (squash, commit `5a6c096e`):
  1. `correctionRoute` morto corrigido (4 rotas).
  2. Check "Dono Master válido" ligado nos dois consumidores do checklist.
  3. **`strategic_plan_ready` implementado de verdade** — usa `validateCycleReadiness` (a mesma RPC autoritativa que decide se o ciclo pode publicar), não um recálculo paralelo. 4 testes novos, inclusive o cenário exato do bug do doc (publicado com pendência não desaparece, vira WARNING).
  4. `ownerStrategicPlanViewModel.ts` órfão removido (zero consumidores, dead code de tentativa anterior).
  - Typecheck limpo, 264+172 testes verdes, eslint limpo em todos os arquivos tocados.

## Doc totalmente lido

Todo o bloco de correções (linhas 38.776–48.704) foi lido e triado nesta sessão: Plano Estratégico Multiunidade (Achado 1), Clientes MX — Resumo do Plano (Achado 2), Pessoas e Acessos — Dono Master, 2 prompts (Achado 4), Planos de Ação — duplicação e Kanban (Achado 5 e 7), e o módulo de reset destrutivo (Achado 8, **não executado**). As linhas 0–38.775 (prompt original que gerou o protótipo Base44 em si, não uma correção) seguem não lidas — baixa prioridade, MX não é um port 1:1 do Base44.

## Próximos passos (ordem sugerida)

1. Comparar `PersonCreateModal.tsx` campo a campo com os 4 blocos do formulário do doc (baixa prioridade, Achado 4 já fechado por spot-check).
2. Se algum cliente real tiver Matriz + 2+ filiais, testar o cenário multiunidade completo da Visão do Dono ao vivo (Achado 1 ficou sem esse teste).
3. **Decisão do dono, não técnica:** se quiser executar o reset de dados de teste (Achado 8), definir critério explícito de quais dos 52 clientes são teste vs. reais antes de qualquer DELETE.

Consolidar este arquivo em `GAP-PARIDADE-BASE44.md` quando fizer sentido, ou linkar os dois — evitar dois documentos de verdade divergentes sobre o mesmo assunto.
