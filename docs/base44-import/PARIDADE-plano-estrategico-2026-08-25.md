# Paridade /plano-estrategico (MX) × /indicadores (Base44) — 2026-08-25

Comparação lado a lado, aba por aba, com as duas telas abertas e autenticadas
(MX prod + preview `preview--mx-admin-flow.base44.app`).

## Catálogo de Indicadores — paridade OK (MX é superset)

| Base44 | MX |
|---|---|
| Cabeçalho: Ordem, Criar Demo, Parâmetros, Criar Indicador | idem + Atualizar |
| Busca + 2 selects + Limpar | busca + 6 selects (área, status, cálculo, tipo, origem, parâmetro) |
| 12 chips de filtro rápido | os mesmos 12 |
| Colunas: Ordem Oficial, Indicador, Unidade, Meta, Total anual, Dono, Status, Ações | idem + Leitura + Origem |
| Ações: Abrir, Ocultar no Dono, Histórico | Abrir, Editar, Arquivar, Histórico + toggle Dono |

Divergência remanescente é **de dados, não de código**: Base44 mostra 46/45
indicadores e 9 arquivados; MX mostra 45 e 17. Catálogos com conteúdo diferente.

## Parâmetros e Fórmulas — **gap fechado nesta rodada**

Base44 tinha a tabela dos 13 parâmetros da metodologia
(Parâmetro | Valor | Unidade | Ajuste cliente | Dependentes | Status | Editar).
No MX os 13 existiam só como constante de código, sem tela, sem persistência e
sem chegar ao cálculo — a lógica pura (`parameterCatalog.ts`, com hierarquia de
override e prévia de impacto) estava escrita e nunca ligada.

Entregue:
- migration `20260825180000_parametros_estrategicos_mx.sql` (tabela + RLS + seed dos 13);
- `strategicParameters.ts` (definições, persistência, dependentes, fonte efetiva);
- `StrategicParametersSection.tsx` com as colunas do Base44, editar e restaurar padrão;
- os 13 parâmetros entram na personalização por cliente;
- `recalculateAndPersistCycle` passa a usar os parâmetros efetivos do cliente.

A grade por indicador (Meta padrão / mercado / melhor prática / faixas) que o MX
já tinha nessa aba continua: é funcionalidade adicional, não substitui.

## Planos por Cliente — paridade OK (MX é superset)

Base44: Cliente, Ano, Indicadores, Responsável, Status, Ações (Abrir, Preview Dono).
MX: idem + Unidades + Atualizado + 6 cards de resumo + busca e filtros de ano/status.

## Editor do plano (Abrir) — paridade OK

"Ações da Loja" do Base44 já existem na aba Cadastro rápido: Exportar metas
preenchidas, Baixar modelo em branco, Copiar entre lojas, Importar tabela.
Publicar / Validar / Abrir revisão / Adicionar indicador / Visualizar como Dono
também estão presentes.

## Aberto (não é paridade de tela)

- P0 do `GAP-matrix`: AG sem metas publicadas e prova numérica Admin↔Dono na mesma célula.
- Contadores do catálogo (45 vs 46 / 17 vs 9 arquivados) dependem de limpeza de dados.

---

## Segunda rodada — três defeitos de dado encontrados na verificação

Provados no AG AUTOMÓVEIS (ciclo `bd5f482d`, publicado, 3 unidades, 1548 células).

### 1. Leitura truncada em 1000 linhas (P0)

O PostgREST devolve no máximo 1000 linhas e não sinaliza corte. O ciclo tem
1548; a aplicação via 1000. Efeitos medidos antes do fix:

| | Banco | Tela (antes) |
|---|---|---|
| Células da filial 3 PISO | 504 | **0** |
| Células da matriz | 540 | 496 |
| Consolidado Vendas Total (Mar) | 48+55+55 = 158 | **103 PARCIAL** |

Prontidão, validação e publicação decidiam sobre dado truncado. Corrigido com
`fetchAllRows` nas três leituras multi-loja. Depois: 540/504/504 e **158 COMPLETO**.

### 2. "12 impedimento(s) críticos" num plano publicado

`UNIT_POLICY_DEFAULTS` é chaveado pelo código canônico (`ADDITIONAL_REVENUE`);
o roster persistido usa `additional_revenue`. 12 dos 45 indicadores ficavam sem
política — que conta como impedimento crítico. O fallback agora percorre
`catalogAliasKeys`. Banner passa a "41 de 45 indicadores prontos, 48 metas
mensais por preencher" (pendência de dado real, não bug).

### 3. Cabeçalho de área repetido na matriz

`groupEditorIndicatorsByArea` agrupava por sequência, e a ordem oficial intercala
departamentos: o mesmo bloco aparecia várias vezes e o React acusava chave
duplicada. Agora são 6 blocos, um por departamento.

## Paridade Admin↔Dono — provada

Mesma célula, `sales_total` · Mar · 2026:

| Origem | Valor |
|---|---|
| Banco (matriz) | 48 |
| Admin → Revisão completa, unidade matriz | 48 |
| Dono → Visão do Plano, loja matriz | 48 |
| Banco (soma das 3 unidades) | 158 |
| Admin → Consolidado | 158 COMPLETO |
| Dono → escopo "Todas as unidades" | 158 |

Fecha o P0 #1 do `GAP-matrix` (aceite Admin↔Dono na mesma célula). O P0 #4 ("AG
sem plano publicado") já estava vencido: o ciclo está publicado com 1548 metas.

---

## Terceira rodada — verificação em produção (2026-08-25, release 51eebdca)

Tudo abaixo conferido em `www.mxperformance.com.br`, autenticado, não em ambiente local.

### Defeito P0 que só existia em produção: CSP bloqueava o cálculo

Todo indicador **calculado** aparecia vazio em produção. `evaluateFormula` e o
total anual terminavam em `Function('"use strict"; return (...)')()`, e a CSP do
`vercel.json` declara `script-src 'self'` sem `'unsafe-eval'`: o construtor
lançava `EvalError` e a exceção morria no `catch { return null }`.

Invisível pelos canais normais — console limpo, suíte verde, mesmo commit, mesmo
banco. `vite dev` e `vite preview` não aplicam CSP, então local sempre funcionou.
Só apareceu ao importar o bundle publicado (`/assets/indicatorFormulas-*.js`) e
executar a função com o mesmo input do bundle local: produção `null`, local `48`.

Anterior a esta sessão: o deployment de 3h antes, sem nenhuma mudança minha,
mostrava o mesmo "—".

Corrigido com `evaluateArithmetic` (parser de descida recursiva, sem eval) e um
guard em `src/lib/no-eval-guard.test.ts`.

### Estado verificado em produção

| Verificação | Resultado |
|---|---|
| Release servida | `51eebdca` |
| Vendas Total (matriz, Jan–Mar) | 48 / 48 / 48 · total anual 576 |
| Células por unidade | 540 / 504 / 504 |
| Consolidado Vendas Total | 158 COMPLETO |
| Visão do Dono, mesma célula | 48 |
| Prontidão do plano | "41 de 45 indicadores prontos" (sem impedimento falso) |
| Parâmetros estratégicos | 13 linhas; editar gravou 0.275 e restaurar voltou a 0.20 |
| /plano-acao | 4 abas, filtro de indicador com rótulo certo, prioridade sem repetição |
| Criar Plano Padrão | gravou `pa_comercial_visittosaleconversion_060` com FK `visit_to_sale_rate` (registro de teste removido) |
| /classificacao | 52 unidades, 186 vendedores, console limpo |
