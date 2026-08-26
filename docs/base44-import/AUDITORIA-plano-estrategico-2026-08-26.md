# Auditoria — /plano-estrategico vs Base44 /indicadores (2026-08-26)

Verificação em produção (`https://www.mxperformance.com.br`) logada como
Administrador Geral, comparando contra
[INVENTORY-indicadores-strategic-plan.md](./INVENTORY-indicadores-strategic-plan.md).

## Resultado

**Nenhum defeito novo encontrado nesta rodada.** A paridade funcional com o
Base44 está atendida e os fluxos exercitados funcionam de ponta a ponta.

## Cobertura verificada ao vivo

### Tela principal — 4 abas, todas com dado real

| Aba | Estado |
|---|---|
| Catálogo de Indicadores | 45 ativos, 18 digitáveis, 27 calculáveis, 12 com parâmetro, 17 arquivados |
| Parâmetros e Fórmulas | 13 parâmetros, colunas Valor/Unidade/Ajuste cliente/Dependentes/Status/Ações |
| Planos por Cliente | 6 ciclos reais (1 publicado, 1 em validação, 4 rascunhos) |
| Histórico | 261 registros |

### Editor do plano — 6 abas

Cadastro rápido, Revisão completa, Indicadores, Unidades, Consolidado, Histórico.
Ações presentes: Validar plano, Abrir revisão, Visualizar como Dono, seletor de
loja (matriz + filiais) e de ano (2025/2026/2027).

### Fluxos de Excel — os quatro do `StoreActionsMenu` do Base44

| Ação | Resultado |
|---|---|
| Exportar metas preenchidas | Gera o arquivo (`Metas preenchidas exportadas`) |
| Baixar modelo em branco | Gera o arquivo (`Modelo em branco baixado`) |
| Copiar entre lojas | Abre o modal com destino, política de conflito e prévia |
| Importar tabela | Abre o seletor de arquivo |

### Motor de cálculo — testado com escrita real e revertido

Digitado `7` em *Vendas - Fluxo de Porta · Meta · Jan* no rascunho de TREND AUTO.
Persistiu `sales_door_flow = 7` e **recalculou 14 indicadores derivados** em
cascata (`sales_total`, `stock_total`, `stock_turnover`,
`approved_credit_applications`, `trade_in_to_sales_rate`, …) — equivalente ao
`recalculateMonthlyValues` de 3 passes do Base44.

Os valores anteriores eram todos `NULL` (confirmado em
`historico_valores_indicadores_planejamento.previous_values`) e o estado foi
revertido ao final: 0 metas e 0 registros de histórico restantes no ciclo.

## Suspeitas levantadas e descartadas

Registradas porque cada uma quase virou "defeito" num relatório:

| Suspeita | Por que era falsa |
|---|---|
| Plano publicado com 0 metas | Olhei `metas_metricas_cliente`; as metas do plano vivem em `valores_indicadores_planejamento` (1548 linhas no ciclo da AG AUTOMÓVEIS) |
| 62 códigos usados vs 45 no catálogo | O catálogo tem 62: 45 ativos + 17 arquivados. Zero órfãos |
| "Sem base anual" em todos os indicadores | Estado de carregamento; após carregar mostra Vendas 576/48, Leads 9.600/800 etc. |
| Export não baixa arquivo | Esperei 5–7s para ler o toast, que dura ~4s. Com leitura em 900ms os dois toasts de sucesso aparecem |
| 3 botões sem `onClick` | Dois são `DropdownMenuTrigger asChild` (handler do Radix) e um tinha `onClick` cortado pelo meu regex |
| Grid não aceita digitação | `page.keyboard.type` não entrega teclas nesta ponte de browser — o mesmo falhou num campo de controle sabidamente funcional. Com `fill`/`insertText` o valor entra normalmente |

## Nota de método

A digitação por `keyboard.type` falha silenciosamente neste ambiente de
automação. Qualquer teste futuro que dependa de digitação precisa de um campo
de controle conhecido na mesma execução, senão um problema da ponte é lido como
defeito do produto.
