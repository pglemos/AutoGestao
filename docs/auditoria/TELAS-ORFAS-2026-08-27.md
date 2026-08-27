# Telas construídas e desligadas — 2026-08-27

Levantado ao auditar o módulo Vendedor, depois de encontrar um botão sem ação
numa tela que, verificada em produção, não era alcançável.

Método: cruzar os 93 candidatos a tela (`src/**/pages/*.tsx` e `*Page.tsx`) com
todo o código que os importa, ignorando testes. Quem não é montado por nenhuma
rota nem por outro componente está aqui.

## As cinco telas

| Tela | Linhas | Situação |
|---|---|---|
| `src/features/admin-mx/AdminClientPortfolioPage.tsx` | 324 | Nenhuma referência, nem em teste |
| `src/pages/ConsultorNotificacoes.tsx` | 219 | Nenhuma referência, nem em teste |
| `src/pages/OAuthHome.tsx` | 113 | Só um teste de tipografia a varre |
| `src/pages/ConsultoriaClientes.tsx` | 9 | Só testes de contrato de design a varrem |
| `src/pages/MinhaRemuneracao.tsx` → `MinhaRemuneracaoPage.tsx` | 6 + 119 | `/minha-remuneracao` redireciona para `/home` |

## A cadeia da consultoria está inteira desligada

`ConsultoriaClientes.tsx` decide entre duas telas por papel:

- `ConsultingClientsPage` (37 linhas) — carteira completa, para o admin;
- `ConsultantAssignedClientsPage` (134) — carteira atribuída, para o consultor;
- `ConsultingClientScopeGuard` (76) — guarda de escopo das duas.

**Nenhum componente fora dessa pasta as importa.** A rota `/consultoria-mx`
monta `AdminConsultoriaMxPage`, que é outra tela. Ou seja: existe uma visão de
carteira por consultor construída, com guarda de escopo, que ninguém alcança.

## Por que isso passa despercebido

Três das cinco aparecem em testes de contrato de design (tipografia, canvas de
rota, paridade do design system). Esses testes varrem arquivos pelo padrão do
nome, não pelo que está montado — então uma tela desligada continua sendo
verificada e "passando", o que dá a impressão de estar viva.

**Total: 14 arquivos, 1.152 linhas** que o build compila, os testes varrem e
nenhum usuário alcança.

## O que fazer com isso

Não removi nada: apagar 1.152 linhas de tela pronta é decisão de produto, não de
manutenção. Cada uma cai em um de dois casos, e só quem conhece o roadmap sabe
qual:

- **Foi substituída** — por exemplo, `AdminConsultoriaMxPage` no lugar da cadeia
  de `consulting-clients`. Aí o certo é remover, junto dos testes que a varrem.
- **Ainda vai ser ligada** — aí vale registrar a rota pretendida no próprio
  arquivo, para a próxima auditoria não gastar o mesmo tempo redescobrindo.
