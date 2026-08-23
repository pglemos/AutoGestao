# Action plan — UI parity indicadores (Base44)

Fonte: prompt Visão do Dono / competência / realizado / cards (heads ~38849–40190). Graphify: stale=false.

## Fechado nesta rodada

- [x] Competência padrão = último mês encerrado (M-1), não o mês calendário
- [x] Seletor de Competência no workspace do Dono
- [x] Mesmo `monthIndex` em resumo, tabela, gráfico, leitura e Visão Geral
- [x] Cards da Visão Geral seguem Meta / Resultado Atual / Ano Anterior
- [x] Agosto aberto: Resultado = “Competência ainda não encerrada”; % = Indisponível
- [x] Overlay oficial + fórmula de Vendas Total (canais) no adapter do Dono
- [x] `calculateIndicatorAttainment` na raiz compartilhada
- [x] Admin Metas/Realizados: `buildOfficialMonthlyGrid` / `readOfficialMonthValue` (já no repo)
- [x] Consolidado “Parcial — N de M unidades” (denominador = unidades ativas; derivado herda PARCIAL)
- [x] Fallback de consolidado → unidade é visível (banner). STORE não lê consolidado
- [x] Prompt 2: card conta DISTINCT indicadores da versão exibida (não células mês×unidade)
- [x] Prompt 3: Dono Master é impeditivo; Corrigir abre Pessoas; convite pendente vale; sem escolha silenciosa
- [x] Roster da Visão Geral dinâmico (`pickExecutiveCards`) — sem cards fixos SP-001
- [x] Query keys `ownerStrategicPlan` (cliente + versão + mês + visão + escopo + loja)
- [x] `repairOwnerStrategicPlanData` + `planSalesOtherRepairs` (idempotente, raiz)
- [x] Promover Dono existente a Master (`setClientDonoMaster`) — 1 dono promove; N donos não escolhe sozinho
- [x] Edição in-place de pessoa / Dono Master (`updateClientPerson`)
- [x] UI de escolha quando N Donos (`DonoMasterPickerModal`)

- [x] QA visual Lote 4 — PASS parcial (shots em visual-evidence/agent-browser/qa-lote4-2026-08-22/)
- [x] "Todas as lojas" persiste (não zera loja de identidade; "all" não vira storeId)
- [x] Período default do Dono = competência M-1 (rótulo Julho/2026, não "Mês atual")
- [x] Panorama Admin: Ativos = status comercial; Em Implantação = jornada incompleta (bucket); jornada não zera Ativos
- [x] Banner de fallback quando consolidado não cabe; Parcial só no escopo CONSOLIDATED

- [x] Pessoas AG via `vinculos_loja` (22 distintas na matriz + filiais)
- [x] Filiais (3 Piso, Tito) não aparecem como clientes na carteira — só como lojas da matriz
- [x] Equipe agrupada por loja (gerente e vendedores de cada filial)
- [x] Filiais sem jornada própria são arquivadas; URL da filial redireciona para a matriz

- [x] Unidade lixo `TESTE QA REMOVER` removida do cadastro (sem `store_id`, nome de QA)
- [x] Filiais operacionais (3 Piso, Tito) gravadas em `unidades_cliente_consultoria`

## Resta (P0/P1)

- Parcial N/M + banner: só em tenant multiunidade com Realizado incompleto no escopo CONSOLIDATED (ex.: AG). Tenant 1 loja → banner “consolidado indisponível”, esperado.
- Admin↔Dono mesma célula (prompt ~40249): diagnóstico de origem ainda aberto (fora deste lote AG).

## Lote 4 — QA visual (atualizado 2026-08-23)

**Corrigido depois do PASS parcial**
- Pill período Dono: `OwnerFilterButton` + `ownerClosedMonthLabel()` = M-1 (ex. Julho/2026), não “Mês atual”.
- Cards Ativos/Implantação: `ativo` com PMR incompleto volta aos Ativos; Em Implantação usa bucket de jornada.
- “Todas as lojas”: persiste `unitId=all`; escopo CONSOLIDATED só se `supportsConsolidated`.

**Ainda depende de tenant**
- Clique “Todas as lojas” em cliente 1 loja: pill muda, mas dados = loja única + aviso de consolidado indisponível.
- Parcial N/M: precisa AG (ou outro multiunidade) com Realizado parcial.

Shots antigos: `visual-evidence/agent-browser/qa-lote4-2026-08-22/`.

## Pessoas da AG via `vinculos_loja` (correção)

O Admin lia pessoas só de `acessos_cliente_consultoria`, que está vazia para a AG AUTOMÓVEIS — daí "0 pessoas" numa conta que já opera. A equipe real vive em `vinculos_loja` + `usuarios` nas lojas do cliente (matriz, 3 PISO e TITO FULGÊNCIO): 23 vínculos ativos, 22 pessoas distintas, 1 delas com vínculo em duas lojas, 1 dono de loja. `fetchClientPersons` e o card Pessoas da carteira agora fazem o merge das duas origens, deduplicando por e-mail e unindo as lojas autorizadas; `clientStoreIds` passou a considerar também `unidades_cliente_consultoria.store_id`. `is_dono_master` continua vindo só de acessos. A unidade `TESTE QA REMOVER` foi apagada. Filiais operacionais sem linha no cadastro passam a ser gravadas em `unidades_cliente_consultoria` (com horário padrão MX) para deixar de ser só "Filial operacional".

## 45 oficiais (catálogo)

COMERCIAL 22 · MARKETING 6 · PRODUTO_ESTOQUE 7 · FINANCEIRO 5 · OPERACOES 4 · PESSOAS_RH 1
