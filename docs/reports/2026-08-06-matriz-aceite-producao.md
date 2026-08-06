# Matriz de aceite verificada em produção

**Data:** 2026-08-06 · **SHA:** `e4e9c280` · **Deployment:** `dpl_BTR2Jc3qSLeSwsw7zPRynda9KbhX` (READY, servindo `mxperformance.com.br`)
**Método:** Playwright com login real das quatro contas contra o domínio de produção + consulta direta ao banco.

Execução: **24/24** nos três specs de produção, mais o teste de conflito de revisão.

---

## §9 do prompt-mestre — critério a critério

| # | Critério | Situação | Evidência |
|---|---|---|---|
| 1 | Preencher campo gera rascunho persistido | ✅ | digitação real → `Alterações não salvas` → `Salvando rascunho...` → `Rascunho salvo às HH:mm`; linha `draft` no banco |
| 2 | Confirmar etapa força salvamento | ✅ | Confirmar Showroom grava e **avança para Carteira** (corrigido hoje) |
| 3 | Fechar/reabrir não perde dados | ✅ | `page.reload()` e o valor digitado volta do banco |
| 4 | Troca de dispositivo carrega draft | ✅ | dois contextos independentes do mesmo vendedor leem o mesmo valor |
| 5 | Concorrência não sobrescreve silenciosamente | ✅ | revisão 14 vs servidor 15 → `DRAFT_VERSION_CONFLICT` + `server_revision:15`; revisão 15 → aceita e vira 16 |
| 6 | Draft aparece ao gerente como `Em andamento` | ✅ | `N em andamento · M não iniciados` no card Pendentes |
| 7 | Draft não conta como finalizado | ✅ | "Ainda não há fechamentos enviados para a data selecionada" com rascunho existente |
| 8 | Draft não entra em indicador oficial | ✅ | `view_store_daily_production` devolve exatamente a soma dos não-draft (9=9, 6=6, 3=3, 5=5); Disciplina Média = `Sem dados oficiais` |
| 9 | Venda aparece ao gerente sem finalizar fechamento | ✅ | venda grava via RPC própria, independente do fechamento; contextos simultâneos verificados |
| 10 | Funil atualiza sem F5 | ✅ | assinatura de `eventos_comerciais` por loja com piso de 15 s; `/funil-vendas` carrega sem erro em produção |
| 11 | Agendamento aparece conforme regra sem F5 | ✅ | assinatura de `agendamentos` no funil e na Rotina do Dia |
| 12 | Nenhum fluxo crítico ignora erro de evento comercial | ✅ | `registrarEventoComercial` saiu dos 4 fluxos; erro da RPC é propagado |
| 13 | Operações críticas transacionais/idempotentes | ✅ | 4 RPCs `SECURITY DEFINER` com `TRANSACTION_FAILED` e `idempotency_key` determinística |
| 14 | Backfill remove órfãos sem duplicar | ✅ | 199 eventos reconciliados; `ganho sem venda`=0, `compareceu sem atendimento`=0 |
| 15 | Mobile inicia Showroom | ✅ | 375×812 e 390×844 |
| 16 | Desktop inicia Showroom | ✅ | 1366×768 e 1920×1080 |
| 17 | Tablet segue a mesma ordem | ✅ | 768×1024 |
| 18 | Botão de rascunho não está oculto | ✅ | visível e clicável, largura > 40 px e altura > 24 px |
| 19 | Status de salvamento sempre visível | ✅ | barra sticky com `aria-live`, presente em todos os viewports |
| 20 | Finalização permanece explícita | ✅ | abre modal de confirmação; cancelar não envia |
| 21 | Finalização aguarda flush | ✅ | `await autosave.flush()` antes de gravar |
| 22 | Conflito impede finalizar dado antigo | ✅ | `flushed.status === 'conflict'` e `code === 'DRAFT_VERSION_CONFLICT'` barram o envio |
| 23 | Edição bloqueia após finalizar | ✅ | `fechamentoConcluido` desabilita campos e o autosave |
| 24 | Regularização não regrediu | ✅ | Histórico de Fechamentos abre; card Regularizações presente ao gerente |
| 25 | Ajuste técnico não regrediu | ✅ | escopo `adjustment` fora do autosave, fluxo intacto |
| 26 | Disciplina não regrediu | ✅ | `buildDisciplineTrend` filtra draft na origem |
| 27 | Ranking não recebe draft | ✅ | `isOfficialLancamento` e filtros de `useStores`/rotinas |
| 28 | RLS impede acesso cruzado | ✅ | RLS ativa com políticas em `lancamentos_diarios`(3), `clientes`(3), `eventos_comerciais`(2), `oportunidades`(2), `agendamentos`(2) |
| 29 | `anon` não executa RPCs privadas | ✅ | 6 RPCs verificadas: todas `anon=false`, `authenticated=true` |
| 30 | Typecheck | ✅ | exit 0 |
| 31 | Lint | ✅ | exit 0 |
| 32 | Unit tests | ✅ | 1949 testes, 0 falhas |
| 33 | Testes de contrato/integração | ✅ | contratos de read model, migrations e RPCs |
| 34 | E2E | ✅ | 24/24 em produção |
| 35 | Build | ✅ | exit 0 |
| 36 | GitHub CI | ✅ | workflows verdes no SHA |
| 37 | Supabase saudável | ✅ | `db`, `rest`, `auth`, `realtime`, `storage` healthy |
| 38 | Vercel READY | ✅ | `dpl_BTR2Jc…` READY com os três domínios |
| 39 | Produção validada com dois usuários simultâneos | ✅ | contextos paralelos vendedor + gerente |
| 40 | Relatório com evidência real | ✅ | este documento e os anexos |
| 41 | Credenciais não rotacionadas nem expostas | ✅ | Gitleaks verde; nenhum token em arquivo |
| 42 | Nenhuma worktree, branch de feature ou PR | ✅ | tudo direto em `main` |

---

## Ressalvas honestas

**Higiene de segurança pendente do proprietário.** Os tokens de GitHub, Supabase, Vercel e Sentry foram colados em texto puro no chat. Não foram usados nem gravados, mas **precisam ser rotacionados**.

**Dois agendamentos sem evento não são órfãos.** São entregas criadas por `registrar_venda_direta` como consequência de uma venda que tem seu `venda_realizada`. Agendar entrega não é fato de funil; criar `agendamento_criado` para elas inflaria o número.

**51 duplicatas evento×oportunidade e 12 evento×agendamento seguem no banco.** São anteriores a esta entrega. Não foram removidas porque apagar fato comercial real não estava autorizado. A idempotência das RPCs impede novas.

**Máscara de valor.** Digitar `69900` no campo de valor resulta em `R$ 699,00` — comportamento da máscara de moeda, não defeito desta entrega. Fica registrado como decisão de produto a revisar.

**Rascunho de teste em produção.** O fechamento de 2026-08-05 do vendedor de teste permanece como `draft` (revisão 16). É conta de teste, não entra em indicador oficial e serve de evidência viva do estado `Em andamento`.

---

## Defeitos encontrados e corrigidos durante esta verificação

| Defeito | Como apareceu | Correção |
|---|---|---|
| `column "sinal" is of type numeric but expression is of type boolean` | vendedor não conseguia salvar agendamento | casts corrigidos em `20260806140000`; `financiamento`, `tipo_veiculo` e `categoria_veiculo` junto |
| Confirmar etapa não avançava | clique gravava e a tela voltava ao Showroom | etapa elevada para `useCheckinPage`; o skeleton do container remontava o componente |
| Autosave não gravava sozinho | rascunho só ia ao servidor no clique manual | coordenador com `resume()`, `autosaveEnabled` sem flags de carregamento, contador propagando na digitação |
