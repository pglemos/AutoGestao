# Relatório dos Testes de Aceitação do Motor Comercial (Mentor Comercial v1)

Este relatório apresenta o resultado da validação dos 15 cenários de aceitação definidos no catálogo de regras (`rules/mentor-comercial/v1/acceptance-scenarios.json`) em relação à implementação do motor determinístico (`src/features/mentor-comercial/engine/`) e à sua suíte de testes de aceitação (`src/features/mentor-comercial/engine/acceptance-scenarios.test.ts`).

## Matriz de Cobertura dos Cenários de Aceitação

| # | Cenário | Status esperado | Status obtido | Central | Score/Prioridade | Teste que cobre | PASS/FAIL |
|---|---|---|---|---|---|---|---|
| 1 | 1. Lead sem resposta | INT-C02 Sem resposta — cadência ativa | INT-C02 (Sem resposta — cadência ativa) | Quando tentativa vence hoje | Score permanece alto se executado no prazo | INT-C01 + Mensagem enviada → INT-C02, cadência CAD-01 ativa | PASS |
| 2 | 2. Lead responde | INT-C03 Resposta recebida — atendimento pendente | INT-C03 (Resposta recebida — atendimento pendente) | Sim, retorno pendente | Prioridade alta/máxima se aguardando vendedor | INT-C02 + Cliente respondeu → INT-C03 e responsável Vendedor | PASS |
| 3 | 3. Visita D+5 | Visita agendada | INT-V02 (Visita agendada) | Não | Score alto se próxima data definida | ação futura não gera ação central | PASS |
| 4 | 4. Visita D-1 | INT-V03 Visita a confirmar | INT-V03 (Visita a confirmar) | Sim | Prioridade alta | ação de amanhã com status de confirmação sobe prioridade | PASS |
| 5 | 5. Visita hoje | INT-V05 Visita hoje | INT-V05 (Visita hoje) | Sim | Potencial muito alto | entra na Central e garante prioridade mínima Alta | PASS |
| 6 | 6. Não compareceu | INT-V07 Cliente não compareceu | INT-V07 (Cliente não compareceu) | Sim | Prioridade alta | INT-V05 + Não compareceu → INT-V07 | PASS |
| 7 | 7. Dados da troca pendentes | TR-01 | TR-01 | Quando ação vence | Prioridade alta se negociação quente | TR-01 mantém o próximo passo declarado na fonte | PASS |
| 8 | 8. Avaliação presencial | TR-03 | TR-03 | Quando ação vence | Alto | TR-03 tem próximo passo de agendar avaliação | PASS |
| 9 | 9. Financiamento aprovado | FIN-06 | FIN-06 | Sim | Potencial muito alto; prioridade alta/máxima | FIN-06 tem potencial muito alto e prioridade mínima Alta | PASS |
| 10 | 10. Cliente Porta não comprou | POR-A03 | POR-A03 | Sim | Alto | POR-A03 é do canal Porta e permanece ativo | PASS |
| 11 | 11. Lead antigo >90 dias | PER-06 / CAR-C04 | CAR-C04 | Quando ação vence | Médio | CAR-C04 pertence ao canal Carteira e preserva a origem | PASS |
| 12 | 12. Cadência completa sem resposta | PER-03 Cadência encerrada sem resposta | PER-03 (Cadência encerrada sem resposta) | Não | Score pode continuar bom se tudo feito no prazo | não é perda, e o score continua bom se tudo foi executado no prazo | PASS |
| 13 | 13. Cliente respondeu e vendedor não tratou | Status atual permanece, mas alerta sobe | INT-C03 (mantém status atual) | Sim | Score crítico; prioridade máxima | score crítico e prioridade máxima quando o SLA está configurado e estourado | PASS |
| 14 | 14. Compra futura | INT-Q05 / PER-05 | INT-Q05 | Não até data | Não deve poluir Carteira Ativa | INT-Q05 com data futura não gera ação na Central | PASS |
| 15 | 15. Garantia aberta | Garantia aberta | REL-07 (Garantia aberta) | Quando acompanhamento vence | Médio | REL-07 existe e entra na Central quando o acompanhamento vence | PASS |

## Resumo da Execução dos Testes (bun test)

```text
bun test v1.3.5 (1e86cebd)

 23 pass
 0 fail
 50 expect() calls
Ran 23 tests across 1 file. [293.00ms]
```

## Observações
- **Determinismo**: Todos os 15 cenários são resolvidos pelo motor 100% determinístico.
- **Conformidade de Status**: Todos os códigos de status foram validados com o guardião `scripts/mentor-assert-status-codes.mjs`.
