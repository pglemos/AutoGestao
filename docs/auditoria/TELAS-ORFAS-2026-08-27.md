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
| `src/pages/MinhaRemuneracao.tsx` → `MinhaRemuneracaoPage.tsx` | 6 + 119 | `/minha-remuneracao` redireciona para `/home` |
| ~~`src/pages/ConsultoriaClientes.tsx`~~ | 9 | **Removida em 2026-08-27** (commit `df5b5304`) |

## A cadeia da consultoria — correção do que este documento afirmava

> A versão original desta seção dizia que **nenhum componente fora da pasta**
> importava a cadeia, e concluía que ela estava inteira desligada. **Estava
> errado.** A verificação que sustentava a frase buscava apenas os dois nomes de
> página; o `ConsultingClientScopeGuard` nunca entrou na busca.

O que a verificação completa mostrou:

| Arquivo | Situação real |
|---|---|
| `ConsultingClientsPage` (37) | desligado — removido |
| `ConsultantAssignedClientsPage` (134) | desligado — removido |
| `ConsultingClientScopeGuard` (76) | **em uso** por `/consultoria/clientes/:slug` e pela execução de visita |
| `useScopedConsultingClientDetailBySlug` | **em uso** por `ScopedConsultoriaClienteDetalhe` |
| `consultingClientPolicy` | **em uso** — importado pelo hook acima |

A remoção de 2026-08-27 (commit `df5b5304`) tirou 13 arquivos: as duas páginas,
o seletor por papel e os componentes que só elas usavam, mais os três testes
próprios. Os quatro em uso ficaram.

**Lição do episódio:** a busca que motivou a conclusão errada filtrava arquivos
pelo prefixo do nome. Bastava um arquivo da pasta com outro prefixo — o guard —
para a conclusão inverter. Remover pasta inteira a partir desse tipo de
levantamento teria derrubado duas rotas vivas.

## Por que isso passa despercebido

Três das cinco aparecem em testes de contrato de design (tipografia, canvas de
rota, paridade do design system). Esses testes varrem arquivos pelo padrão do
nome, não pelo que está montado — então uma tela desligada continua sendo
verificada e "passando", o que dá a impressão de estar viva.

**Total levantado: 14 arquivos, 1.152 linhas.** Depois da verificação item a
item, 13 arquivos (548 linhas) eram de fato inalcançáveis e foram removidos; 4
estavam em uso e permanecem.

## O que fazer com isso

Não removi nada: apagar 1.152 linhas de tela pronta é decisão de produto, não de
manutenção. Cada uma cai em um de dois casos, e só quem conhece o roadmap sabe
qual:

- **Foi substituída** — por exemplo, `AdminConsultoriaMxPage` no lugar da cadeia
  de `consulting-clients`. Aí o certo é remover, junto dos testes que a varrem.
- **Ainda vai ser ligada** — aí vale registrar a rota pretendida no próprio
  arquivo, para a próxima auditoria não gastar o mesmo tempo redescobrindo.


## Verificação por símbolo — as quatro restantes (2026-08-27)

Refeita a checagem do jeito certo: procurando **todos os símbolos exportados**
de cada arquivo, não o nome do arquivo. Foi essa diferença que tinha invertido a
conclusão sobre a cadeia da consultoria.

| Tela | Símbolos | Usada por código? |
|---|---|---|
| `AdminClientPortfolioPage.tsx` | `AdminClientPortfolioPage`, **`AdminClientesPage`** | Não — ver abaixo |
| `ConsultorNotificacoes.tsx` | `ConsultorNotificacoes` | Não |
| `OAuthHome.tsx` | `OAuthHome` | Não |
| `MinhaRemuneracao.tsx` → `MinhaRemuneracaoPage.tsx` | idem | Só um pelo outro |

### O sósia da tela de clientes

`AdminClientPortfolioPage.tsx` (324 linhas) exporta **`AdminClientesPage`** — o
mesmo nome que `AdminClientesPage.tsx` (419 linhas) exporta. Quem está no ar é o
segundo: `InternalClientsPage` importa de `@/features/admin-mx/AdminClientesPage`.

Dá para distinguir pelo cabeçalho:

- vivo: `eyebrow="Administração MX & Rede"`, título **"Clientes & Lojas MX"** — é
  o que aparece em produção;
- órfão: `eyebrow="Administração MX"`, título **"Clientes MX"**, e sem as abas
  carteira/onboarding/inscrições/governança que o vivo tem.

O risco aqui não é o código morto ocupar espaço: é alguém abrir o arquivo pelo
nome do símbolo, editar, e não ver efeito nenhum na tela.
