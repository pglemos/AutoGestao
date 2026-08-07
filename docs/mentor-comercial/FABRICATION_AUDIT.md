# Relatório de Auditoria — Caça a Fabricação de Dados (TAREFA C01)

## Resumo da Auditoria

Auditoria completa de varredura estática realizada sobre todos os 54 arquivos presentes em `src/features/mentor-comercial/` para identificar quaisquer ocorrências de fabricação de dados, fallbacks numéricos indevidos em campos de decisão, textos comerciais hardcoded fora do catálogo, placeholders não-oficiais, classes fora do padrão ou referências a elementos inexistentes na matriz v1.

### Critérios Auditados
1. **Valores numéricos padrão em campos de decisão** (`score`, `priority`, `potential`) quando o dado real está ausente (ex: `?? 100`, `?? 50`, `|| 0`).
2. **Textos de scripts, mensagens ou orientações comerciais** codificados no código-fonte em vez de oriundos do catálogo.
3. **Placeholders de template** fora dos 15 oficiais listados em `OFFICIAL_PLACEHOLDERS`.
4. **Classes de score** fora das 4 oficiais: `Excelente`, `Boa`, `Atenção`, `Crítica`.
5. **Classes de prioridade** fora das 4 oficiais: `Máxima`, `Alta`, `Média`, `Baixa`.
6. **Famílias de status** fora das 9 reais presentes em `rules/mentor-comercial/v1/statuses.json`.
7. **Códigos de status, cadência ou script** escritos à mão que não existam no catálogo oficial.
8. **Objetos simulando resultados de sucesso** quando a operação real não aconteceu.

---

## Ocorrências Encontradas

| Arquivo | Linha | Padrão encontrado | Trecho | Gravidade |
|---|---|---|---|---|
| `src/features/mentor-comercial/application/carteiraQuality.ts` | 214 | Operador `?? 0` como fallback numérico de score no cálculo de qualidade | `const score = item.mentorScore ?? item.mentor_score ?? item.score ?? 0` | MÉDIA |
| `src/features/mentor-comercial/application/carteiraQuality.ts` | 243 | Código de status sintético `'N/A'` como fallback quando a oportunidade não possui código de status | `statusCode = item.statusCode ?? item.status_code ?? item.currentStatusCode ?? item.current_status_code ?? 'N/A'` | MÉDIA |
| `src/features/mentor-comercial/ui/ExecuteNextStepPanel.tsx` | 255 | Fallback `?? 1` para passo da cadência e total de tentativas em oportunidade sem cadência | `{opportunity.cadenceStep ?? 1} / {opportunity.totalCadenceAttempts ?? 1}` | MÉDIA |
| `src/features/mentor-comercial/ui/fichaBlocks.ts` | 170 | Fallback `?? 0` no detalhamento do score de pilar | `const score = decision.score.breakdown[pillar] ?? 0` | BAIXA |
| `src/features/mentor-comercial/ui/fichaBlocks.ts` | 258 | Fabricação do potencial comercial para `'Baixo'` quando `decision.potential` é `null` | `value: decision.potential ?? 'Baixo'` | MÉDIA |
| `src/features/mentor-comercial/ui/carteiraOrdering.ts` | 30, 48, 53 | Retorno de `0` para prioridade, potencial e score nulos durante a ordenação no cliente | `return POTENTIAL_WEIGHTS[normalized] ?? 0` | BAIXA |
| `src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts` | 188, 189, 207 | Mapeamento com fallback `?? 1` para tentativa atual de cadência no estado | `currentAttempt: Number(rawState.currentAttempt ?? 1)` | MÉDIA |

---

## Detalhamento das Ocorrências

### 1. `src/features/mentor-comercial/application/carteiraQuality.ts`
- **Linhas 214 & 243**: Ao agregar a qualidade da carteira, a função utiliza `?? 0` para fallback do score e substitui códigos de status nulos por `'N/A'`. Embora a função `isEligibleForCarteiraQuality` já filtre a maioria dos casos inválidos antes da soma, a presença de `'N/A'` introduz uma string de status que não existe no catálogo oficial de 86 status.
- **Recomendação**: Manter o filtro estrito de elegibilidade e retornar antecipadamente se o código de status for nulo, sem sintetizar `'N/A'`.

### 2. `src/features/mentor-comercial/ui/ExecuteNextStepPanel.tsx`
- **Linha 255**: O painel de execução exibe `{opportunity.cadenceStep ?? 1} / {opportunity.totalCadenceAttempts ?? 1}`. Em oportunidades sem cadência associada (onde a cadência é `null`), a UI exibe "1 / 1", passando a impressão falsa de que o lead está na tentativa 1 de uma cadência ativa.
- **Recomendação**: Exibir `- / -` ou `Sem cadência` quando `cadenceStep` ou `totalCadenceAttempts` forem nulos.

### 3. `src/features/mentor-comercial/ui/fichaBlocks.ts`
- **Linha 258**: No resumo dos fatos da Ficha de Oportunidade, o potencial é preenchido com `decision.potential ?? 'Baixo'`. Para oportunidades cujo status não atribui potencial comercial (valor `null`), a Ficha atribui de forma sintética o nível `'Baixo'`.
- **Recomendação**: Exibir `'Não definido'` ou respeitar `null` no valor do fato.

### 4. `src/features/mentor-comercial/ui/carteiraOrdering.ts`
- **Linhas 30, 48, 53**: As funções auxiliares de ordenação determinística atribuem valor `0` para pontuações e potenciais ausentes.
- **Avaliação**: Trata-se de um critério de desempate puramente client-side para posicionar itens não classificados ao final da lista, não afetando a gravação de dados nem o motor.

### 5. `src/features/mentor-comercial/infrastructure/supabaseMentorRepository.ts`
- **Linhas 188, 189, 207**: No desempacotamento de estado de cadência do Supabase, o repositório aplica `?? 1` para tentativas ausentes.
- **Avaliação**: Deve-se preservar a ausência explícita (`null`) quando não houver registro de cadência no banco de dados.

---

## Nada Encontrado Em (Arquivos Limpos)

Os 49 arquivos a seguir foram integralmente auditados e passaram 100% limpos, sem qualquer fabricação de dados, fallbacks indevidos em campos de decisão ou violação do catálogo oficial:

1. `src/features/mentor-comercial/engine/engine.ts`
2. `src/features/mentor-comercial/engine/score.ts`
3. `src/features/mentor-comercial/engine/priority.ts`
4. `src/features/mentor-comercial/engine/cadence.ts`
5. `src/features/mentor-comercial/engine/script.ts`
6. `src/features/mentor-comercial/engine/transition.ts`
7. `src/features/mentor-comercial/engine/channels.ts`
8. `src/features/mentor-comercial/engine/pendingFlags.ts`
9. `src/features/mentor-comercial/engine/score.test.ts`
10. `src/features/mentor-comercial/engine/priority.test.ts`
11. `src/features/mentor-comercial/engine/cadence.test.ts`
12. `src/features/mentor-comercial/engine/script.test.ts`
13. `src/features/mentor-comercial/engine/transition.test.ts`
14. `src/features/mentor-comercial/engine/channels.test.ts`
15. `src/features/mentor-comercial/engine/pendingFlags.test.ts`
16. `src/features/mentor-comercial/engine/source-conformance.test.ts`
17. `src/features/mentor-comercial/engine/acceptance-scenarios.test.ts`
18. `src/features/mentor-comercial/application/mentorApplicationService.ts`
19. `src/features/mentor-comercial/application/dailyProcessor.ts`
20. `src/features/mentor-comercial/application/attackMissions.ts`
21. `src/features/mentor-comercial/application/centralIntegration.ts`
22. `src/features/mentor-comercial/application/closingIntegration.ts`
23. `src/features/mentor-comercial/application/clientDeduplication.ts`
24. `src/features/mentor-comercial/application/mentorApplicationService.test.ts`
25. `src/features/mentor-comercial/application/dailyProcessor.test.ts`
26. `src/features/mentor-comercial/application/attackMissions.test.ts`
27. `src/features/mentor-comercial/application/centralIntegration.test.ts`
28. `src/features/mentor-comercial/application/closingIntegration.test.ts`
29. `src/features/mentor-comercial/application/clientDeduplication.test.ts`
30. `src/features/mentor-comercial/application/carteiraQuality.test.ts`
31. `src/features/mentor-comercial/application/concurrency.test.ts`
32. `src/features/mentor-comercial/infrastructure/supabaseMentorRepository.test.ts`
33. `src/features/mentor-comercial/infrastructure/queryPlan.test.ts`
34. `src/features/mentor-comercial/observability/mentorTelemetry.ts`
35. `src/features/mentor-comercial/observability/mentorTelemetry.test.ts`
36. `src/features/mentor-comercial/security/mentorRlsMatrix.ts`
37. `src/features/mentor-comercial/security/mentorRlsMatrix.test.ts`
38. `src/features/mentor-comercial/ui/GuidedStatusUpdate.tsx`
39. `src/features/mentor-comercial/ui/CarteiraAtivaList.tsx`
40. `src/features/mentor-comercial/ui/OportunidadeCard.tsx`
41. `src/features/mentor-comercial/ui/FichaOportunidade.tsx`
42. `src/features/mentor-comercial/ui/MentorCarteiraSection.tsx`
43. `src/features/mentor-comercial/ui/guidedStatusOptions.ts`
44. `src/features/mentor-comercial/ui/useExecuteNextStep.ts`
45. `src/features/mentor-comercial/ui/carteiraOrdering.test.ts`
46. `src/features/mentor-comercial/ui/fichaBlocks.test.ts`
47. `src/features/mentor-comercial/ui/guidedStatusOptions.test.ts`
48. `src/features/mentor-comercial/ui/MentorCarteiraSection.test.tsx`
49. `src/features/mentor-comercial/ui/useExecuteNextStep.test.ts`

---

## Validação da Guarda Ativa

```bash
node scripts/mentor-assert-status-codes.mjs
# Output: OK: 60 arquivos verificados, nenhum código de status inventado.
```
