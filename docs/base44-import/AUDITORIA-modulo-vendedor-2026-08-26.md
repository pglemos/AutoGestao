# Auditoria do módulo Vendedor — 2026-08-26

Verificado em produção com a Simulação de Vendedor ativa. 22 rotas são
acessíveis ao papel; 42 estão bloqueadas por `RoleSwitch`.

## Limite do método, declarado antes dos resultados

A Simulação troca o **papel e o menu**, mas mantém `auth.uid()` do admin
(conferido no JWT da sessão: `synvollt@gmail.com`). Ela não personifica outro
usuário — o que é correto do ponto de vista de segurança, mas significa que as
telas de dado pessoal (Feedback, PDI, Meu Perfil) mostram os dados do admin, e
não de um vendedor real.

Por isso o "0 Feedbacks Recebidos" em `/desenvolvimento` **não é defeito**: a
devolutiva existente pertence ao "Vendedor MX" e a consulta filtra
`seller_id = profile.id` com `visible_to_seller` — o admin simplesmente não tem
devolutivas. Auditoria com dados reais de vendedor exigiria login próprio.

## 14 rotas percorridas, todas sem erro

`/home` · `/terminal-mx` · `/fechamento-diario` · `/meu-funil` ·
`/carteira-clientes` · `/central-execucao` · `/relatorios-vendedor` ·
`/desenvolvimento` · `/universidade-mx` · `/produtos` · `/ajuda` ·
`/notificacoes` · `/perfil` · `/configuracoes`. Console sem erro de aplicação.

Os dois fluxos que sustentam o dia do vendedor estão íntegros:

- **Fechamento Diário** (`/terminal-mx`): onboarding de 3 passos, data
  operacional em M-1 ("Ontem · terça-feira, 25 de agosto"), "Começar
  fechamento", histórico e "Salvar rascunho".
- **Central de Execução**: 9 pendências de dias anteriores, agenda do dia com
  cliente real, "Confirmar agendamento", "Resolver", WhatsApp e "Nova
  atividade" — que cria atividade de rotina (`execution_actions`), não plano de
  ação, então não conflita com a regra.

## Regra de criação — cumprida

Nenhuma tela do Vendedor toca `planos_acao` (busca por `criar_plano_acao` /
`from('planos_acao')` em `central-execucao`, `vendedor-home`,
`vendedor-treinamentos` e nas páginas `Vendedor*` não retorna nada).
`canCreateActions` já era `false` para SELLER, e `can_create_mx_action_scope`
exige área interna.

## Escopo de dados — RLS correta

| Tabela | Política para o vendedor |
|---|---|
| `clientes` | `seller_user_id = auth.uid()` |
| `oportunidades` | próprias **e** cliente da mesma loja **e** vínculo ativo em `vendedores_loja` |
| `lancamentos_diarios` | `seller_user_id = auth.uid()` |
| `devolutivas` | própria **e** `visible_to_seller` |

Sem risco de truncamento de 1000 linhas aqui: a maior carteira é de 71 clientes,
80 oportunidades e 30 agendamentos.

## Achado real — 8 vendedores ativos fora da operação

Vendedores com usuário ativo e **sem vínculo em `vendedores_loja`**. Como a RLS
de `oportunidades` exige esse vínculo, o CRM não funciona para eles, e eles não
entram em ranking nem em "Minha Equipe".

| Vendedor | Criado | `vinculos_loja` | Clientes |
|---|---|---|---:|
| DANIELLE RESENDE GOMES | 30/07/2026 | **sim** | 0 |
| BRENDA SENA SIQUEIRA | 20/05/2026 | não | 0 |
| DANIELE DE SOUZA MARCIANO | 20/05/2026 | não | 0 |
| INGRIDY VITÓRIA MAGALHÃES PINHEIRO | 20/05/2026 | não | 0 |
| KEISY KETLEN | 20/05/2026 | não | 0 |
| NATHALIA RODRIGUES | 20/05/2026 | não | 0 |
| RAPHAEL SANTANA | 20/05/2026 | não | 0 |
| ROMILSON LUIZ DA SILVA | 20/05/2026 | não | 0 |

Sete são de um mesmo lote de 20/05 que nunca foi alocado — provavelmente
cadastro que ficou pela metade. O caso de **DANIELLE RESENDE GOMES** é o mais
claro: ela tem vínculo de acesso à loja (`vinculos_loja`) mas não o vínculo
comercial (`vendedores_loja`), então entra no sistema e não consegue operar.

Não vinculei ninguém: alocar vendedor em loja é decisão de operação, e para os
sete de maio nem existe loja indicada em lugar nenhum. Se forem cadastros
mortos, o certo é inativar; se forem gente em atividade, precisam de vínculo.

Contexto: **49 dos 194 vendedores ativos** ainda estão com senha provisória
(`must_change_password`).
