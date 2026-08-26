# Auditoria do módulo Gerente — 2026-08-26

Verificado em produção (release `0fe346aa`), com a Simulação de Gerente ativa.
23 rotas são acessíveis ao papel; 41 estão bloqueadas por `RoleSwitch`.

## Regra de criação — implementada e conferida

O Gerente **não cria** plano de ação nem plano estratégico:

- As 4 rotas de planejamento recusam o papel com a mensagem canônica:
  `/plano-acao`, `/plano-estrategico`, `/decisoes` e `/mercado` respondem
  "O perfil gerente não tem permissão para acessar…".
- Nenhuma tela do Gerente toca `planos_acao`: a busca por
  `criar_plano_acao` / `from('planos_acao')` em `src/features/manager`,
  `src/features/gerente` e `src/pages/gerente` não retorna nada.
- No banco, `can_create_mx_action_scope` exige `eh_area_interna_mx`, que é
  `papel_usuario(uid) IN ('administrador_geral','administrador_mx','consultor_mx')`
  — `gerente` não está na lista.
- `canCreateActions` é `false` para MANAGER desde a correção anterior.

O que o Gerente **faz** e continua funcionando: rotina do dia (4 tarefas reais,
com "Ver fechamento" e "Regularizar"), devolutivas semanais ("NOVO FEEDBACK",
com o escopo explicado na própria tela), fechamento diário, funil, carteira,
PDI e desenvolvimento.

O campo "Plano de Ação" da devolutiva é **texto livre** (`action` em
`useAdminFeedback`), não cria registro em `planos_acao` — não conflita com a
regra.

## 19 rotas percorridas, todas sem erro

`/home` · `/rotina` · `/rotina-equipe` · `/minha-equipe` · `/meta-loja` ·
`/vendas` · `/fechamento-diario` · `/funil-vendas` · `/carteira-clientes` ·
`/devolutivas` · `/pdi` · `/feedbacks-pdis` · `/mentor` · `/universidade-mx` ·
`/produtos` · `/falar-consultor` · `/notificacoes` · `/perfil` ·
`/configuracoes`. Console sem erro de aplicação.

## Dois falsos positivos investigados e descartados

- **`/vendas` com pouco conteúdo.** Está correto: a loja de teste tem
  exatamente 1 venda no período, exibida com dados reais e ação de cancelar.
- **`/minha-equipe` mostrando "1 vendedor elegível" com 4 na loja.** Os outros 3
  aparecem na seção **"Não aplicáveis no período — 3"**, no fim da tela. O corte
  é regra de produto: sem Consistência calculável (Rotina + Disciplina), o card
  sai das três colunas e vai para essa seção, que explica o motivo.

## Achado real — 7 lojas sem meta mensal cadastrada

Sem `regras_metas_loja.monthly_goal`, o Resultado do vendedor não tem
denominador: o acompanhamento por Resultado fica indisponível para a equipe
inteira dessas lojas.

| Loja | Vendedores ativos |
|---|---:|
| INVESTCAR MG | 7 |
| PROMAC JPA | 6 |
| IDEAL AUTOMOTIVE | 5 |
| VITRINE - SHOPPING DO AVIÃO | 5 |
| IDEAL MOTORS | 4 |
| AUTO UP | 4 |
| GOTO MOTORS | 2 |

São **33 vendedores** sem meta de loja, de 186 ativos na rede (34 das 40 lojas
com vendedor têm meta).

Não cadastrei meta por conta própria: meta é compromisso comercial da loja, não
default técnico — inventar um número faria o gerente cobrar a equipe por uma
referência que ninguém combinou.

Contexto que ajuda a priorizar: os 186 vendedores ativos têm rotina registrada
no mês, mas só **83 (45%)** têm lançamento diário no período.
