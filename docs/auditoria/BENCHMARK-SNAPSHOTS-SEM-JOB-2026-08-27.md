# `benchmark_snapshots` existe, ninguém a preenche — 2026-08-27

## O que é

Tabela criada em `20260527160000_benchmarking_schema.sql`, com RLS, índices,
trigger de imutabilidade (`trg_prevent_benchmark_mutation`) e uma função de
leitura (`get_benchmark`). Infraestrutura completa.

Está vazia em produção. **Nenhum job, RPC, edge function ou script no
repositório insere linha nela.** A política de escrita é `bench_write_service`
— só service role — e não existe serviço que escreva.

## Quem lê

Um consumidor só:

`src/features/manager/team-routine/ManagerTeamRoutineCanonical.container.tsx:149`
— busca `peer_avg` / `peer_top` de `metric_code = 'routine_execution'`,
`peer_group = 'mercado'`, para o card "Comparativo de Execução Média".

## O que NÃO está errado

A degradação é honesta ponta a ponta, e isso foi verificado:

- Sem linha, o container grava `{ average: null, top: null }` — não inventa
  número nem cai em zero.
- `RoutineComparisonBar` com `value === null` não desenha barra: renderiza `—`.

Não há número fabricado aqui. Vale registrar porque é o oposto do padrão que
esta auditoria vinha encontrando.

## O que foi corrigido

A legenda do card dizia "Comparação agregada e anônima com a rede" e abaixo
mostrava dois traços — permanentemente, não por um período ruim. Traço mudo
se lê como "carregando" ou "quebrado".

Quando as duas séries da rede vêm nulas, a legenda passa a dizer que a
comparação ainda não está disponível.

Isso não preenche a tabela. Só para de sugerir ao gerente que o dado existe
e falhou.

## O que continua em aberto

Escrever o job que calcula os agregados da rede é decisão de produto: envolve
definir a janela, o `peer_group`, o corte do top 25% e quem executa. Não
inventei nenhuma dessas regras.

Enquanto o job não existir, o card fica com as duas barras da rede vazias —
agora dizendo por quê.
