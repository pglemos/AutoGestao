# Cancelamento de venda — reprodução e causas raiz

Fonte de verdade: produção (`fbhcmzzgwjdgkctlfvbo`, commit `6a117e27`).
Estado do enum em produção: `crm_etapa_funil` = prospeccao, qualificacao,
apresentacao, negociacao, fechamento, ganho, perdido, **cancelada**.
Distribuição em `public.oportunidades` no momento da auditoria:
ganho 93, negociacao 38, prospeccao 25, apresentacao 12, qualificacao 11,
fechamento 3, **cancelada 2**, perdido 2.

O backend do cancelamento (`public.cancelar_venda`) já estava correto em
produção: exige motivo com 10+ caracteres, faz `SELECT ... FOR UPDATE`,
bloqueia recancelamento (`etapa <> 'ganho' OR cancelada_em IS NOT NULL`),
aplica regra por perfil, grava `eventos_comerciais` e `d1_audit_log`, e tem
`REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO authenticated`.

**O defeito estava inteiramente a jusante:** nada além da própria RPC sabia
que `cancelada` existe.

---

### CAN-01 — Cliente com uma única venda cancelada
**Preparação:** `oportunidades` com uma linha `etapa='cancelada'`, com
`veiculo_interesse`, `valor_negociado` e `financiamento` da venda revertida.
**Ação:** abrir a ficha do cliente na carteira.
**Resultado esperado:** situação `Venda cancelada`, status `Cancelada`,
sem oportunidade ativa, sem dados da venda revertida como fatos ativos.
**Resultado real (antes):** situação `Veículo definido` / `Em negociação ativa`,
status `Em negociação`, veículo, valor e financiamento da venda cancelada
apresentados como negociação em andamento.
**Evidência:** `src/features/carteira-clientes/lib/carteira-mappers.ts:49` —
`const CLOSED_STAGES = new Set(['ganho', 'perdido'])`.
**Causa:** `cancelada` não estava no conjunto terminal, então
`selectActiveOpportunity` ordenava a oportunidade cancelada como ativa e
`deriveSituation` não tinha ramo para ela, caindo no heurístico de etapa.
**Camadas afetadas:** domínio (mapper), ficha, carteira, funil, dashboards.

### CAN-03 — `selectActiveOpportunity` nunca devolvia `null`
**Evidência:** `carteira-mappers.ts:72-81` — ordenava e devolvia `sorted[0] ?? null`.
Com todas as oportunidades encerradas, a encerrada era devolvida como ativa.
**Causa:** o contrato misturava "oportunidade ativa" com "oportunidade mais
relevante".

### CAN-05 — View de compatibilidade classificava cancelada como ativa
**Evidência:** `pg_get_viewdef('public.clientes_oportunidades')` em produção:
`CASE WHEN etapa='ganho' THEN 'vendido' WHEN etapa='perdido' THEN 'perdido' ELSE 'ativa' END`.
**Resultado real:** as 2 oportunidades canceladas de produção apareciam como
`ativa` (verificado: `ativa` 91 → após a correção `ativa` 89 + `cancelada` 2).
**Consumidores:** `src/pages/FunilVendedor.tsx:152`,
`src/features/vendedor-treinamentos/hooks/useVendedorTreinamentos.ts:82`,
`src/features/crm/lib/funil-vendas-diagnostico.ts`.

### CAN-13/CAN-23 — Venda cancelada continuava contando como realizada
**Evidência:** `funil-vendas-diagnostico.ts:253` — `countSales` conta eventos
`venda_realizada`. O cancelamento **preserva** o evento original (histórico
imutável, correto) e acrescenta um `venda_cancelada`; sem descontar o par, o
realizado e o progresso da meta seguiam inflados.
**Causa:** ausência de conciliação entre os dois eventos.

### CAN-10 — Estado terminal era rebaixado no salvamento
**Evidência:** `carteira-mappers.ts:situationToStage` e
`src/api/base44Client.js:542` derivavam a etapa do rótulo de apresentação e
caíam em `'prospeccao'` para qualquer rótulo desconhecido.
**Impacto:** com `Cancelada` como status de apresentação, salvar a ficha
reabriria a venda cancelada em produção, apagando `cancelada_em`,
`cancelada_por` e `motivo_cancelamento`.
**Camadas afetadas:** escrita — risco de perda de fato histórico.

### CAN-06/CAN-07 — Próxima ação e agendamento antigos sobreviviam
**Evidência:** `carteira-mappers.ts` usava `client.proxima_acao` e o
agendamento aberto independentemente do estado terminal.
**Resultado real:** venda cancelada com agendamento futuro derivava
`Visita agendada`; próxima ação vencida da venda revertida gerava pendência.

### Pipeline aberto do vendedor
**Evidência:** `useVendedorTreinamentos.ts:86` —
`.not('etapa','in','("ganho","perdido")')` — a venda cancelada voltava a
contar como pipeline aberto.
