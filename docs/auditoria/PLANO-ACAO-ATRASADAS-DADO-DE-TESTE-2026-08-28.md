# O contador "Atrasadas" do Dono é 100% dado de teste — 2026-08-28

## Na tela

`/dono/plano-acao`, MX CONSULTORIA · Julho/2026:

```
Ações 2 · Não Iniciadas 1 · Atrasadas 1 · Em Andamento 0 · Concluídas 0
```

As duas ações do ciclo são:

| Código | Ação | Status |
|---|---|---|
| `PA-EE3D3389` | Treinar equipe em técnicas de fechamento | Não iniciada |
| `PA-F1375D83…` | **teste** | Aguardando decisão · **Atrasada há 394d** |

O único item atrasado do Dono é um registro chamado "teste", com responsável
"Vendedor MX". O contador "Atrasadas: 1" não reflete nenhuma pendência real.

Isso é mais uma instância da classe já inventariada em `909fdfe9` — a diferença
é que aqui o efeito é direto: um dos cinco contadores da tela de execução do
Dono existe inteiramente por causa dele.

## A lacuna de validação por trás

A ação "teste" tem **criação em 28/07/2026 e prazo em 30/07/2025** — prazo um
ano antes de existir. Daí o "Atrasada há 394d".

`validateDueDateChange` (em `actionPlanBoard.ts`) só verifica duas coisas:

```ts
if (!newDate) return 'Informe a nova data prevista.'
if (!reason.trim()) return 'Justifique a alteração do prazo.'
```

Não há comparação com a data de início. Nada impede prazo anterior à criação.

## Por que não corrigi

Medido em produção: **1 plano em 9** tem prazo anterior à criação, e é este
registro de teste. Fechar a lacuna exigiria passar a data de início por
`reschedulePlan` → `validateDueDateChange`, mudando assinaturas — para um caso
que, hoje, só um dado falso produziu.

Também não é óbvio que a regra deva ser rígida: reagendar para data passada
pode ser legítimo ao corrigir um registro retroativo.

## O que decidir

1. Remover a ação "teste" limpa o contador "Atrasadas" do Dono imediatamente.
2. Prazo anterior ao início deve ser bloqueado, avisado, ou permitido com
   justificativa? A resposta define se vale mexer na validação.
