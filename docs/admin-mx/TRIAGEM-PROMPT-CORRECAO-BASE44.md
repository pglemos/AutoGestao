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

## Pessoas e Acessos — Dono Master (linhas 41.838–48.704)

Lido só o topo (diagnóstico ETAPA A/B de outro bug do Plano Estratégico, que se repete colado no meio deste bloco — o documento mistura módulos). Os itens específicos de "Pessoas e Acessos" (formulário Adicionar Usuário, blocos de perfil/master, múltiplos papéis, autocadastro) **ainda não foram lidos** nem cruzados com `PersonCreateModal.tsx` / `TeamMemberFormModal.tsx` / `personAccess.ts`. GAP-PARIDADE-BASE44.md já audita `/equipe` como ~95% saudável (auditoria ao vivo de 2026-08-21), então a prioridade real pode já estar coberta — precisa confirmar item a item.

## Entregue nesta sessão

- PR [#190](https://github.com/pglemos/MXGESTAOPREDITIVA/pull/190) `fix/admin-mx-readiness-correction-route`: rotas de correção mortas + Dono Master ausente do checklist. Testes verdes, typecheck limpo.

## Próximos passos (ordem sugerida)

1. Decidir destino do `ownerStrategicPlanViewModel.ts` órfão (Achado 1) — apagar ou documentar por que existe.
2. Implementar `strategic_plan_ready` de verdade no checklist (Achado 2) — é o item mais alinhado ao que o doc pede e ainda falta.
3. Ler e triar o restante de "Pessoas e Acessos" (linhas ~42.100–48.700) contra `personAccess.ts`, `PersonCreateModal.tsx`, `EnrollmentLinkModal.tsx`.
4. Se algum cliente real tiver Matriz + 2+ filiais, testar o cenário multiunidade completo da Visão do Dono ao vivo (Achado 1 ficou sem esse teste).

Consolidar este arquivo em `GAP-PARIDADE-BASE44.md` quando a triagem terminar, ou linkar os dois — evitar dois documentos de verdade divergentes sobre o mesmo assunto.
