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

## Entregue nesta sessão

- PR [#190](https://github.com/pglemos/MXGESTAOPREDITIVA/pull/190) `fix/admin-mx-readiness-correction-route` — **merged em main** (squash, commit `5a6c096e`):
  1. `correctionRoute` morto corrigido (4 rotas).
  2. Check "Dono Master válido" ligado nos dois consumidores do checklist.
  3. **`strategic_plan_ready` implementado de verdade** — usa `validateCycleReadiness` (a mesma RPC autoritativa que decide se o ciclo pode publicar), não um recálculo paralelo. 4 testes novos, inclusive o cenário exato do bug do doc (publicado com pendência não desaparece, vira WARNING).
  4. `ownerStrategicPlanViewModel.ts` órfão removido (zero consumidores, dead code de tentativa anterior).
  - Typecheck limpo, 264+172 testes verdes, eslint limpo em todos os arquivos tocados.

## Próximos passos (ordem sugerida)

1. Ler e triar "Planos de Ação Padrão vs Plano do Cliente" (Achado 5, linha ~44.185 em diante) contra `AdminPlanosAcaoGlobalPage.tsx` e o restante do doc (ainda tem conteúdo depois disso — não mapeado).
2. Comparar `PersonCreateModal.tsx` campo a campo com os 4 blocos do formulário do doc (baixa prioridade).
3. Se algum cliente real tiver Matriz + 2+ filiais, testar o cenário multiunidade completo da Visão do Dono ao vivo (Achado 1 ficou sem esse teste).
4. Merge do PR #190 quando confortável.

Consolidar este arquivo em `GAP-PARIDADE-BASE44.md` quando a triagem terminar, ou linkar os dois — evitar dois documentos de verdade divergentes sobre o mesmo assunto.
