# `carteiraQuality.ts` é análise completa que ninguém chama — 2026-08-28

`src/features/mentor-comercial/application/carteiraQuality.ts` tem 303 linhas,
suíte de testes própria (`carteiraQuality.test.ts`) e **zero consumidores em
produção**. Os dois símbolos exportados —`computeCarteiraQuality` e
`isEligibleForCarteiraQuality`— não são importados por nenhum arquivo fora do
próprio módulo e do seu teste.

## Por que isso importa mais do que código morto comum

O arquivo contém um defeito da mesma família que esta auditoria vem corrigindo:

```ts
const averageScore = eligibleCount > 0 ? Math.round((scoreSum / eligibleCount) * 10) / 10 : 0
const overallClassification = classifyScore(averageScore)
```

`classifyScore(0)` devolve **'Crítica'** (a pior faixa, abaixo de 50). Ou seja:
carteira sem oportunidade elegível seria classificada como carteira crítica —
ausência de dado virando o pior diagnóstico possível.

Está latente porque nada renderiza o resultado. Mas o dia em que alguém ligar
essa análise numa tela, o defeito nasce pronto — e com testes verdes ao lado,
porque a suíte cobre o cálculo, não a semântica do zero.

## O que NÃO fiz

Não removi nem corrigi. Remover 303 linhas de lógica de produto é decisão de
produto, a mesma régua aplicada às telas órfãs em
`TELAS-ORFAS-2026-08-27.md`. E corrigir código que ninguém executa gasta
revisão sem reduzir risco hoje.

## O que decidir

1. A análise de qualidade de carteira vai ser ligada em alguma tela? Se sim,
   corrigir o zero antes de ligar.
2. Se não vai, remover o módulo e o teste.

Enquanto ficar como está, vale saber que existe uma análise pronta, testada e
desconectada — e que ela classifica carteira vazia como crítica.
