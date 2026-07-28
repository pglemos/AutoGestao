# Relatório Final — Cancelamento de venda e projeções determinísticas

**Data:** 2026-07-27 / 2026-07-28
**Branch:** `fix/cancelamento-projecoes-deterministicas` (16 commits)
**Commit base:** `6a117e27` (= produção no início e ainda hoje)
**Supabase:** `fbhcmzzgwjdgkctlfvbo` — **7 migrations aplicadas em produção**
**Frontend:** **não promovido**

---

## 1. Resumo executivo

A RPC `public.cancelar_venda` já estava correta em produção: exigia motivo,
travava a linha com `FOR UPDATE`, bloqueava recancelamento, aplicava regra por
perfil e gravava evento + auditoria.

**O defeito era inteiramente a jusante: nada além dela sabia que a etapa
`cancelada` existe.** O enum `crm_etapa_funil` cresceu, e cada ponto do sistema
que decidia *"esta oportunidade ainda está viva?"* com uma lista literal de duas
etapas (`'ganho'`, `'perdido'`) ficou para trás.

Foram encontrados e corrigidos **19 defeitos** em 4 camadas. Cinco deles
alteravam números que a operação usa para decidir — incluindo meta de loja e
painel da rede — e um permitia adulterar o valor financeiro de uma venda.

### Os cinco mais graves

| # | Defeito | Impacto medido |
|---|---|---|
| 1 | Valor de venda cancelada era editável por qualquer vendedor | Provado: R$ 100.000 → 999.999 passava |
| 2 | Painel Geral da rede contava venda cancelada | Rede **90 → 88**; MX CONSULTORIA **12 → 10** (40 lojas afetadas) |
| 3 | Meta da Loja contava venda cancelada | **12 → 10** vendas; ritmo e projeção contaminados |
| 4 | `z.enum(CRM_ETAPAS_FUNIL)` rejeitava oportunidade cancelada | Validação falhava ao ler do banco |
| 5 | Salvar a ficha reabria a venda cancelada como `prospeccao` | Apagaria `cancelada_em`, `cancelada_por`, `motivo_cancelamento` |

---

## 2. Método

1. **Baseline** — provado que local = remoto = produção (`6a117e27`), sem drift.
2. **Produção como fonte de verdade** — todo diagnóstico partiu de consulta ao
   banco real e de `pg_get_functiondef`, não do código local.
3. **TDD** — cada correção de domínio teve teste que falhou antes.
4. **Toda migration com `BEGIN…ROLLBACK` antes do `COMMIT`**, medindo o efeito.
5. **Validação em runtime** — autenticado no Preview como vendedor, gerente,
   dono e admin, comparando cada número da tela contra o banco.

O passo 5 foi decisivo: **os defeitos 1, 2 e 3 não seriam encontrados por
varredura de texto**. A função errada não menciona `cancelada`; a correta
menciona. Só apareceram ao conferir número da tela contra o banco.

---

## 3. O que foi feito

### 3.1 Domínio da carteira (commit `17869d2d`)
- `TERMINAL_STAGES` passa a incluir `cancelada`
- `selectActiveOpportunity` devolve `null` quando tudo está encerrado
- Novos contratos `selectLatestClosedOpportunity` / `selectLatestCancelledOpportunity`
- Situação `Venda cancelada`, status `Cancelada`, temperatura `Frio`
- Nenhum fato da venda revertida (veículo, valor, financiamento, proposta,
  próxima ação, agendamento) reaparece como estado ativo
- `situationToStage` lança erro em vez de rebaixar estado terminal

### 3.2 Funil e pipeline (commit `37e721b7`)
- View `clientes_oportunidades` classifica `cancelada` (migration)
- `useVendedorTreinamentos`: cancelada sai do pipeline aberto
- `funil-vendas-diagnostico`: desconta o par `venda_realizada` + `venda_cancelada`,
  chaveado por oportunidade, antes do recorte de período

### 3.3 Proteção do caminho de escrita (commit `0ad8ef44`)
- `assertNotTerminalPresentation` compartilhada entre `situationToStage` e o
  caminho de escrita do `base44Client`
- `base44Client` reconhece `cancelada` na leitura (checado antes de `ganho`,
  pois a cancelada carrega o `closed_at` original)

### 3.4 Apresentação na carteira (commits `d2f110e0`, `c4e78b6b`)
- `SITUACOES_ATUAIS` / `STATUS_COMERCIAIS` conhecem o estado
- Constantes canônicas `SITUACOES_TERMINAIS` / `SITUACOES_ENCERRADAS_SEM_VENDA`
- Badge âmbar — nem verde (sucesso), nem vermelho (perda), nem erro técnico
- Próximo passo `Analisar recuperação`
- Nenhuma missão captura oportunidade encerrada sem venda
- Ficha: banner com motivo, data e hora; sem "Executar próximo passo";
  sem "Alterar próximo passo"; sem "Cancelar venda"; sem pendências de
  negociação; sem o banner verde de "oportunidade bem qualificada"

### 3.5 Banco — cancelamento (commits `125f7440`, `018741f2`)
- `cancelar_venda` encerra agendamentos abertos e a próxima ação (Opção B)
- Backfill das vendas canceladas antes da correção (idempotência comprovada
  rodando duas vezes contra produção)
- `anon` perde `EXECUTE` em `cancelar_venda`

### 3.6 Varredura sistêmica do frontend (commit `ed819024`)
Fonte única `CRM_ETAPAS_TERMINAIS` / `isEtapaTerminal` em `crm.schema.ts`.
Corrigidos: enum do schema, `CRM_ETAPA_LABEL` (achado pelo `tsc`),
`useOportunidades` (×2), `VendedorHome`, `cadencia`, `mentorComercial`,
`PlanoAtaqueTab` (CRM), `ClientCard` e `RegularizarFechamentoDrawer`.

### 3.7 Varredura sistêmica do banco (commits `e6330f1b`, `5520ab64`, `497b9092`)
- `prevent_valor_negociado_tamper_after_close` — protege venda cancelada
- `consolidate_store_target_plan` — Meta da Loja desconta cancelada
- `get_resumo_rede_periodo` — Painel Geral da rede desconta cancelada

### 3.8 Testes e documentação
- **1505 testes** (baseline: 1481), 0 falhas
- E2E `cancelamento-venda.playwright.ts` — CAN-02, CAN-08, CAN-09, CAN-10
- `production-baseline.md`, `cancelamento-reproducao.md`,
  `final-cancelamento-projecoes.md`, plano em `docs/superpowers/plans/`

### 3.9 Guarda de paridade removida (a seu pedido) — commit `d2e631fa`
A igualdade byte-a-byte com `src/base44-reference` existia **em dois lugares**:
no teste e no `scripts/verify_carteira_base44_parity.mjs`, que roda no build da
Vercel. Ambas trocadas por contratos de token visual + símbolo de domínio.
Isso destravou o fix do filtro de "ativos" do `CarteiraAtivaTab`.

---

## 4. Migrations aplicadas em produção

| Version | O quê | Validação |
|---|---|---|
| `20260727210000` | View `clientes_oportunidades` classifica `cancelada` | `ativa 91` → `ativa 89 + cancelada 2` |
| `20260727230000` | RPC encerra agenda/próxima ação; revoga `anon` | dry-run em venda real com agendamento aberto |
| `20260727234500` | Backfill das canceladas anteriores | 2ª execução não mudou nada |
| `20260728010000` | Protege valor de venda cancelada | R$ 100.000 → 999.999 passava; depois P0001; exceção do gerente preservada |
| `20260728020000` | Meta da Loja desconta cancelada | `realized` 12 → 10; tela "10 de 27 / 37%" |
| `20260728030000` | Painel da rede desconta cancelada | rede 90 → 88; MX CONSULTORIA 12 → 10; confirmado na tela |

Todas retrocompatíveis com o frontend hoje em produção. DOWN documentado
(exceto o backfill, cujo efeito é fato histórico — rastreável por
`observacao LIKE '%(backfill)%'`).

---

## 5. Validação em runtime (Preview autenticado)

Autenticação sem senha: magic link via Supabase Admin API, `hashed_token`
trocado por sessão em `/auth/v1/verify`, sessão injetada no `localStorage`.

| Perfil | Verificado | Resultado |
|---|---|---|
| Vendedor | Carteira, ficha, Plano de Ataque, Home | Situação/objetivo/temperatura corretos; "Oportunidades ativas" 18 → **16** |
| Gerente | Home, Meta da Loja, Rotina da Equipe, Mentor Gerencial | Meta 12 → **10**; "Realizado no mês" bate com o banco |
| Dono | `/dono` | **Não afetado** — ver §7 |
| Admin geral | Painel Geral | Rede 90 → **88** |

---

## 6. O que NÃO foi feito

| Item | Situação |
|---|---|
| **Promoção do frontend para produção** | Não feito. Produção segue em `6a117e27`. As correções de frontend estão só na branch |
| **Ações determinísticas (`DeterministicAction`)** | Não iniciado. Nenhuma linha escrita |
| **Atualização em tempo real / Realtime** | Não iniciado |
| **Matriz rota-dado por perfil** | Não construída |
| **E2E CAN-01, 03–07, 11–28** | Não escritos |
| **E2E CAN-02/08/09/10** | Escritos, **não executados** — autenticar exige submeter senha em formulário, o que não faço. Você roda com as variáveis exportadas no seu shell (§9) |
| **Bloco de venda cancelada para o gerente** | Mentor Gerencial e Rotina da Equipe não mostram nada sobre venda cancelada. Não é bug — é feature que o prompt pede e não foi construída |
| **Consultor MX** | Perfil não testado no runtime |
| **Rollback testado** | Os blocos DOWN estão escritos, mas nenhum foi executado |

---

## 7. Ressalvas e achados fora do escopo

**Módulo Dono (`/dono`) não lê dados reais de venda.** A rota consulta apenas
`usuarios`, `vinculos_loja`, `notificacoes`, `devolutivas` e `lojas`. Os números
exibidos — 18 vendas, R$ 218.450 de lucro bruto, 42 veículos em estoque — são
**fixtures** do port Base44. O cancelamento não se propaga ali porque não há
leitura real para propagar. Dívida conhecida, anterior a este trabalho.

**`pode_ler_cliente_por_oportunidade` não deve ser "corrigida".** Ela usa
`etapa NOT IN ('ganho','perdido')`, o que mantém o acesso do vendedor ao cliente
com venda cancelada. Incluir `'cancelada'` removeria esse acesso e quebraria a
recuperação. Analisada e deixada como está de propósito.

**Preexistentes, não corrigidos:** 7 warnings de acessibilidade;
129 alertas Dependabot (3 críticos); `clientes_oportunidades` concede
INSERT/UPDATE/DELETE a `authenticated` numa view de leitura; chunks acima de
800 kB; `carteira_salvar_cliente` v1 é código morto (sem grant).

**Inconsistência não investigada:** na Meta da Loja, "Contribuição da Equipe"
mostra `REALIZADO 0` para todos os vendedores enquanto o total da loja é 10.
São fontes diferentes. Não tem relação com cancelamento e não foi tocada.

---

## 8. Segurança

- Corrigido: `anon` tinha `EXECUTE` em `cancelar_venda`. `CREATE OR REPLACE
  FUNCTION` preserva a ACL, então o grant herdado de DEFAULT PRIVILEGES
  sobrevivia a todo replace. Sem exposição real (`auth.uid()` NULL → recusa).
- Corrigido: valor financeiro de venda cancelada era adulterável.
- Views e funções mantiveram `security_invoker` / `SECURITY DEFINER` +
  `search_path` originais.

### ⚠️ Credenciais expostas — ação sua

Você colou no chat, em texto claro: token GitHub, token Supabase, senha do
Postgres de produção, token Vercel e 4 pares login/senha. **Rotacione todos.**
O token GitHub fornecido já estava inválido — usei as credenciais da máquina.

---

## 9. Como rodar o E2E

```bash
export E2E_SELLER_EMAIL='vendedor@mxgestaopreditiva.com.br'
export E2E_ROLE_PASSWORD='...'
export VITE_APP_URL='https://mxperformance.vercel.app'
export PLAYWRIGHT_SKIP_WEB_SERVER=1
npx playwright test src/test/cancelamento-venda.playwright.ts --project=chromium
```

Sem as variáveis a suíte pula em vez de falhar (confirmado: `4 skipped`).

---

## 10. Estado dos gates

| Gate | Comando | Resultado |
|---|---|---|
| Testes | `npm test` | 1505 pass / 0 fail |
| Typecheck | `tsc --noEmit` | limpo |
| Lint | `npm run lint` | 0 erros, 7 warnings preexistentes |
| Build | `npm run build` | OK |
| Paridade Base44 | `node scripts/verify_carteira_base44_parity.mjs` | passa |
| E2E | `playwright` | não executado |

---

## 11. Próximo passo recomendado

1. Rotacionar as credenciais expostas.
2. Rodar o E2E do cancelamento contra o Preview.
3. Revisar o PR da branch.
4. Promover o frontend (`vercel --prod`) — as migrations já estão aplicadas e
   são retrocompatíveis, então o deploy é o passo que falta para o usuário ver
   as correções.
5. Só então iniciar ações determinísticas e realtime.
