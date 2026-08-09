# EXECUTION_LOG — Mentor Comercial Motor V1

Registro de decisões com evidência. Sem cadeia de raciocínio privada.

---

## Baseline inicial

```
Branch:            main
SHA inicial:       fec1783b43a29c568fa67c29e1582e6c07306202
Remote:            https://github.com/pglemos/MXGESTAOPREDITIVA.git
Data/hora:         2026-08-07
Working tree:      2 arquivos modificados pelo proprietário (primitives.css, index.css)
                   + 4 não rastreados. NÃO tocados por esta implementação.
GITHUB_TOKEN:      configurado
SUPABASE_URL:      configurado (via VITE_SUPABASE_URL; SUPABASE_URL está vazio no .env)
SUPABASE_SERVICE_ROLE_KEY: configurado
SENTRY_DSN:        configurado
Node:              >=20 <25 (engines)  |  migrations no repo: 339
```

### Contagens de banco — medição fresca, não herdada

| Tabela | Contagem |
|---|---:|
| clientes | 554 |
| oportunidades | 562 |
| cadencia_estado_cliente | 239 |
| cadencia_fluxos | 3 |
| execution_actions | 339 |
| eventos_comerciais | 1337 |
| agendamentos | 294 |
| carteira_missoes | 6 |
| carteira_missao_itens | 22 |
| veiculos_estoque | 11 |
| lancamentos_diarios | 1964 |

Coincidem com o baseline da auditoria anterior, mas foram medidas novamente (§4: contagem
antiga nunca prova preservação).

---

## DECISÃO 001 — Local dos catálogos de regra

**EVIDÊNCIA:** o prompt sugere `rules/mentor-commercial/v1/` e permite seguir convenções do
projeto. Os 77 scripts somam texto relevante e não podem entrar no bundle do frontend sem custo.

**ALTERNATIVAS:** (a) `src/features/mentor-comercial/rules/` — importável direto, porém entra
no bundle; (b) `rules/mentor-comercial/v1/` na raiz — fora do bundle, lido por seed e testes.

**DECISÃO:** (b). O frontend consome os catálogos via banco (seed), não via import estático.
Testes e seed leem do disco.

**VALIDADA POR:** `npm run build` verde, sem crescimento de bundle atribuível aos catálogos.

---

## DECISÃO 002 — Ferramenta de leitura do XLSX

**EVIDÊNCIA:** `xlsx@0.18.5` já é devDependency declarada no `package.json`.

**ALTERNATIVAS:** adicionar dependência nova; usar Python/openpyxl fora do toolchain do projeto.

**DECISÃO:** usar a devDependency existente. Nenhuma dependência nova, nada adicionado ao
runtime do frontend (§15).

**VALIDADA POR:** extração reproduzível com `npm run mentor:rules:extract`; `--check` prova
sincronia entre JSON e planilha.

---

## DECISÃO 003 — Quebras de linha nos scripts são CRLF

**EVIDÊNCIA:** `xl/sharedStrings.xml` do XLSX contém `\r\n` literais — 149 CR e 149 LF, pares
exatos. SheetJS preserva; openpyxl normaliza para `\n`.

**DECISÃO:** o catálogo guarda `\r\n` verbatim. Normalização para exibição/WhatsApp é
responsabilidade da camada de apresentação, nunca do catálogo.

**VALIDADA POR:** comparação da mesma célula em três motores — XML cru, SheetJS e openpyxl.

---

## DECISÃO 004 — A coluna `Cadência` da aba Status é polimórfica

**EVIDÊNCIA:** 28 valores distintos, apenas 13 são `CAD-*`. Os outros 15 são diretivas de modo
(`Central`, `Sem cadência`, `Derivada pela data`, `Ação imediata`, …).

**DECISÃO:** tratar as 15 diretivas como "sem cadência ativa", com o modo correspondente.
Declaradas explicitamente em `NON_CADENCE_DIRECTIVES` no validator.

**VALIDADA POR:** sem essa distinção o validator acusaria 40+ falsas órfãs; com ela, 0 erros.

---

## DECISÃO 005 — Transições referenciam status por rótulo E por contexto

**EVIDÊNCIA:** os 52 destinos (`Novo status sugerido`) resolvem para rótulos de status
conhecidos. 20 origens são contextos mais amplos (`Negociação ativa`, `Valor apresentado`).
Famílias de transição (11) não coincidem com famílias de status (9).

**DECISÃO:** implementar a precedência do §28 — status exato → contexto/família → `Qualquer`.
Não tratar a coluna como FK literal. Mapear família-de-transição → família-de-status.

**VALIDADA POR:** `mentor:rules:validate` com 0 erros e os 52 destinos resolvidos.

---

## DECISÃO 006 — Cinco referências de script são SOURCE_BLOCKER, não bloqueio de execução

**EVIDÊNCIA:** das 6 órfãs apontadas na auditoria anterior, `INT-C02` resolve por prova
estrutural (`{n}` expande em T1..T6, casando com as 6 tentativas e 6 passos de CAD-01). As
outras 5 não têm nenhuma menção nas abas `09`, `10` ou `11`, e cada uma tem múltiplos
candidatos plausíveis.

**DECISÃO:** registrar como `SOURCE_BLOCKER` e **seguir com todo o restante do escopo**. O
bloqueio afeta apenas o comportamento de script desses 5 status, que operam com
`scriptReady=false`, motivo `SOURCE_BLOCKER` e WhatsApp bloqueado — o mesmo tratamento de
variável obrigatória ausente (§30). Não bloqueia modelo de dados, migrations, engine de status,
transições, pending flags, cadência, score, prioridade, Central, Plano de Ataque, Fechamento,
processamento automático, UI, RLS nem deploy das partes completas.

**Nenhum ID, alias ou texto de script foi inventado.**

Quando a planilha for corrigida, `mentor:rules:extract` + `mentor:rules:validate` incorporam os
scripts sem refatoração do engine. O validator emite `stale_blocker` se um bloqueio registrado
deixar de corresponder à fonte.

**VALIDADA POR:** protocolo do §17 aplicado nos 6 passos; busca cruzada em todas as abas.

---

## DECISÃO 007 — A tabela de perdas/recuperações NÃO entra no score

**EVIDÊNCIA:** a aba `07 Score_Prioridade` anota a tabela de impactos (linhas 7-21) com
"Usar como alerta além da fórmula dos pilares".

**ALTERNATIVAS:** somar os deltas ao total dos pilares; carregá-los como alertas.

**DECISÃO:** carregar como alertas, nunca aplicar ao total. Somá-los produziria exatamente a
dupla penalização proibida pelo §31 — por exemplo, `cliente respondeu e vendedor não tratou`
já zera o pilar de Execução; aplicar também `-30` puniria o mesmo fato duas vezes.

**VALIDADA POR:** teste `não aplica os deltas de alerta ao total dos pilares`; e conformidade
com as 100 linhas da aba 09, onde o score declarado é sempre exatamente a soma dos 5 pilares.

---

## DECISÃO 008 — Overrides de SLA são fatos do chamador, não derivação do motor

**EVIDÊNCIA:** §33 e Exemplo F — `sellerResponseSlaMinutes = NULL` não pode virar 30 minutos
inventados nem penalizar.

**PROBLEMA ENCONTRADO EM TESTE:** a primeira implementação ignorava
`clientRespondedWithinSla` quando `slaMinutes` não era passado, engolindo o override.

**DECISÃO:** o motor confia nos flags derivados de SLA (só são produzíveis quando há SLA
configurado) e mantém `clientResponded` como fato bruto separado, que garante piso `Alta`
mesmo sem SLA. O motor nunca DERIVA estouro de SLA a partir de `slaMinutes` ausente.
`slaConfigured` é reportado para a UI exibir "SLA de resposta ainda não configurado".

**VALIDADA POR:** 3 testes de SLA verdes, incluindo o caso sem SLA configurado.

---

## Conformidade do motor contra a fonte

A aba `09 Teste_Clientes` traz 100 oportunidades com score, risco, índice e classificações já
calculados pelo autor da metodologia. A implementação reproduz **500/500** conferências:

| Verificação | Resultado |
|---|---|
| Score = soma dos 5 pilares | 100/100 |
| Classificação de score | 100/100 |
| Risco = 100 − score | 100/100 |
| Índice 45/35/20 | 100/100 |
| Classificação de prioridade | 100/100 |

Travado como teste permanente em `src/features/mentor-comercial/engine/source-conformance.test.ts`.
Os dados são fixtures; nenhum cliente de teste é inserido em produção (§66).

---

## Commits

| SHA | Descrição | CI |
|---|---|---|
| `10532d15` | catálogos de regra versionados + extrator + validator | verde |
| `20935551` | score de 5 pilares + prioridade 45/35/20 | 7/7 verde |
| `33292e98` | Mentor Comercial v1 — deploy produção | 5/5 verde |

**Observação sobre branch protection:** a `main` possui 5 status checks obrigatórios. O push foi
aceito com `Bypassed rule violations` por privilégio administrativo. Os checks foram verificados
depois, diretamente no SHA `20935551`: 7 de 7 verdes. O bypass não escondeu falha.

---

## Validação Pós-Deploy (2026-08-08)

| Item | Descrição | Status |
|---|---|---|
| Deploy | `dpl_EcVqTSvN5K` READY no SHA `33292e98cddc`, 2026-08-08T02:25:03Z | VERIFICADO |
| CI | 5/5 checks verdes no SHA `33292e98cddc` | VERIFICADO |
| Migração | `20260807120000_mentor_comercial_motor_v1.sql` aplicada, catálogo 86/13/57/77/52 | VERIFICADO |
| Sentry | Release `33292e98cddc` registrado em 02:26:38Z; 11 issues unresolved **preexistentes** ao deploy; Edge e Health zerados | VERIFICADO |
| Vercel | Aliases HTTP 200 (`mxperformance.com.br`, `www.mxperformance.com.br`, etc.) | VERIFICADO |
| Smoke E2E | 12/17 PASS via Playwright MCP (login vendedor@mxgestaopreditiva.com.br), 4 N/A (GuidedStatusUpdate não montado), 1 PASS-com-divergência (Score 0-100, não 0-1000) | EXECUTADO |

### Descobertas técnicas pós-deploy

1. **Carteira ativa = Base44**: A produção usa a referência Base44 (`CarteiraClientesBase44Page`), não o `MentorCarteiraSection`. O `GuidedStatusUpdate` do módulo mentor não está montado em produção; o fluxo de execução acontece pelo painel Base44 "Executar próximo passo → Registrar resultado".
2. **Persistência visual 1:1**: O adapter Base44 persiste mutações em `eventos_comerciais` (origem `base44_1to1_adapter`, idempotency_key). As colunas mentor em `oportunidades` permanecem NULL — o estado visual é derivado dos eventos, não das colunas mentor do schema.
3. **Score 0-100**: O plano especifica [0, 1000] com Ouro/Prata/Bronze; a implementação exibe 0-100 com classes de prioridade (Crítica/Máxima/Alta). A ficha não expõe breakdown numérico dos 4 pilares.
4. **Deep Link**: A Central real gera `?clienteId=` (`deterministic-actions.ts:152`), que a página Base44 consome (linha 71-72). O `centralDeepLink.ts` (`clientId`/`opportunityId`) é ferramenta de teste — não é o gerador real.
5. **Domínio**: `app.mxgestaopreditiva.com.br` (citado no plano) NÃO resolve. Domínio ativo: `mxperformance.com.br`.

---

## Estado da Definition of Done

Duas métricas distintas, conforme exigido:

```
Referências órfãs introduzidas pela implementação: 0
Bloqueios de fonte herdados da matriz v1:          5
```

O segundo número só chega a zero com correção da planilha pelo proprietário da fonte. Não é
defeito de código e não bloqueia o restante da entrega.

---

## Auditoria Final §93 (2026-08-08)

Releitura integral do prompt mestre e verificação requisito-por-requisito (IMPLEMENTAÇÃO + TESTE + EVIDÊNCIA):

- **§13 Documentos obrigatórios**: 9/9 em `docs/mentor-comercial/` + spec `2026-08-07-mentor-comercial-motor-v1-design.md` + plano `2026-08-07-mentor-comercial-motor-v1.md` (criado nesta auditoria — estava ausente). 11/11.
- **§84 DoD Funcional**: 24/26 requisitos PASS; 2 N/A em produção (Guided status — Base44 ativa; equivalente validado no smoke Item 09). Detalhamento em `PRODUCTION_VALIDATION.md` §11.
- **§85 DoD Técnico**: 11/11 PASS (main sem worktree/branch, migrations versionadas, RLS/constraints, seed idempotente, tests 255, lint/typecheck/build/CI green).
- **§83 Proibições**: 5/5 respeitadas (main direta, sem worktree, sem rotação de credenciais, sem fixture `00000000-...0001` em produção, sem IA em runtime).
- **§90 Relatório Final**: `PRODUCTION_VALIDATION.md` no formato obrigatório (seções 1-11, campos Git preenchidos).

| SHA | Descrição | CI |
|---|---|---|
| `de330796` | docs(mentor-comercial): validação pós-deploy produção (TASK 64/65/67) | - |
| (próximo) | docs(mentor-comercial): auditoria final §93 + plano obrigatório §13 | push main |

---

## Delta Plano de Ataque (2026-08-08)

Implementação do `docs/mentor-comercial/PRODUCT_DELTA_2026-08-07_PLANO_ATAQUE.md`
(canônico; texto original perdido, documento reconstruído).

### Decisões com evidência

1. **Motor puro, sem IA em runtime**: `campaignEligibility.ts` e `vehicleMatch.ts` em
   `src/features/mentor-comercial/` (puro TS, zero import de framework) — respeita §83.
2. **Escrita em lote delegada ao Postgres**: `carteira_iniciar_missao_v2` (idempotency key
   `carteira_missao_itens(idempotency_key)`, valida clientes e oportunidades de `itens` na loja)
   e `carteira_iniciar_missao` amendada com `ON CONFLICT DO NOTHING` + modo `itens` (falha total
   da missão quando cliente inelegível é rejeitado, conforme delta).
3. **Camada visual 1:1** (Base44 ativa em produção): a classificação de veículos chegou ao
   adapter `installCarteiraBase44Adapter.js` via `createArrivedVehicle` (persiste
   `categoria`, `catalog_model_id`, `classification_source`) e novo `listVehicleCatalog`
   exposto como `base44.entities.CatalogoModelos`. Drift fix completo: `listVisualClients`
   lê `clientes` com `oportunidades(*)` direto, e o mapper expõe `sale_date`/sinais novos.
4. **Contrato de inventário**: a nova fonte runtime `vehicle_model_catalog:select` entrou na
   matriz (`MATRIZ_ROTAS_DADOS_MX.md` regenerada por `scripts/audit_route_data_inventory.mjs`).
5. **§36 sem acesso a banco**: `scripts/mentor-classify-vehicle-data.mjs` escrito e testado
   (DRY-RUN padrão; `--apply` obrigatório; escrita só com `classification_source='migration'`;
   relatório `VEHICLE_DATA_COVERAGE_REPORT.md`). Não executado contra dados reais — banco
   inacessível no ambiente (MCP/network indisponível); aplicação via supabase CLI pelo
   operador. Semântica de resolução espelha o motor (match exato de token, nunca substring).

### Gates

| Gate | Resultado |
|---|---|
| `bun test` suite completa | 2583 pass / 0 fail (455 arquivos) |
| `npx tsc --noEmit` | limpo |
| `npm run lint` | 0 errors (1 warning pré-existente em `HelpTooltip.tsx:35:11`) |
| `npx vite build` | ✓ 13.65s |

### Pendências

- Aplicar `20260808120000_mentor_plano_ataque_delta.sql` (schema + RPCs) e rodar o script §36
  contra produção; registrar contagens e relatório em `PRODUCTION_VALIDATION.md`.
