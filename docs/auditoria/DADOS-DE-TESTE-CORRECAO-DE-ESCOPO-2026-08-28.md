# Correção de escopo: os dados de teste estão contidos na loja-demo da MX — 2026-08-28

## O que eu havia escrito

Em `909fdfe9` reportei que 8 ações de teste penalizavam a nota de rotina e que
"DANIEL SANTOS e JOSÉ carregam uma pendência fabricada cada um", com o
enquadramento de que o problema "penaliza pessoas reais".

Isso **superestima o impacto**.

## O que a verificação mostra

Varrendo `clientes` por vendedor na rede (amostra de 1.000 registros), apenas
quatro contas têm cliente de teste na carteira — e todas são da própria MX:

| Conta | Clientes de teste | E-mail |
|---|---|---|
| Vendedor MX | 8 de 19 | `vendedor@mxgestaopreditiva.com.br` |
| JOSÉ | 2 de 19 | `jose.vendedor@mxgestaopreditiva.com.br` |
| DANIEL SANTOS | 1 de 14 | `daniel.vendedor@mxgestaopreditiva.com.br` |
| José | 1 de 6 | `joseroberto20161@gmail.com` (administrador) |

Todas no domínio `@mxgestaopreditiva.com.br` (ou do admin), todas na loja
**MX CONSULTORIA** — a loja de demonstração da própria MX.

**Nenhuma concessionária cliente tem dado de teste na carteira dos seus
vendedores.** O resíduo está confinado ao ambiente de demonstração que vive
dentro de produção.

## O que isso muda

A limpeza continua valendo — a loja-demo é o que a MX mostra em apresentação, e
"Cliente Teste Codex 1781853141743" aparecendo em "Prioridade Hoje" ao lado de
clientes reais não é boa vitrine. O Mentor Comercial inclusive gera recomendação
de ação para esses registros ("Aguardar janela de confirmação", score
"43 · Crítica").

Mas a urgência é outra: não há vendedor de cliente pagante sendo cobrado por
pendência inventada. O que existe é sujeira no ambiente da casa.

## O que continua valendo do relatório anterior

- O inventário de 39 registros de teste (`909fdfe9`) está correto.
- As 2 vendas ganhas de clientes de teste, somando R$ 112.333,33
  (`dfd682ae`), também são da loja-demo — mesmo escopo.
- A recomendação estrutural segue de pé: fixture precisa de marca própria
  (coluna ou prefixo reservado), não de convenção no nome. Foi só lendo nomes
  que dei com tudo isso.

## Nota de método

Este foi o quinto caso da noite em que a primeira leitura de um número
exagerava o problema. "42% da carteira é teste" é verdade e soa alarmante até
se perguntar *de quem é essa carteira*.
