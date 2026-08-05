# Contexto Gerencial do Dono — Design

## Objetivo

Permitir que o perfil `dono` mantenha sua visão executiva e, ao mesmo tempo, assuma automaticamente a gestão comercial quando a loja não possuir vínculo ativo de gerente. O dono nunca troca de perfil nem é duplicado como gerente.

## Fonte canônica

A existência de gerente é determinada exclusivamente por `public.vinculos_loja`:

- `store_id = loja atual`;
- `role = 'gerente'`;
- `is_active = true`;
- `ended_at is null`.

O campo `lojas.manager_email` não concede permissão. Ele representa somente o contato informado ou um gerente ainda pendente de cadastro.

## Estados da gestão

O frontend resolve três estados:

1. `active_manager`: existe ao menos um vínculo ativo de gerente.
2. `manager_pending`: não existe vínculo ativo, mas `manager_email` foi informado.
3. `owner_managed`: não existe vínculo ativo nem e-mail de gerente.

Nos estados `manager_pending` e `owner_managed`, `ownerAssumesManagement = true`.

## Experiência do dono

O menu do dono mantém o módulo executivo e recebe a seção adicional `GESTÃO COMERCIAL`, contendo:

- Visão Comercial;
- Rotina da Equipe;
- Fechamento Diário;
- Meta da Loja;
- Vendas;
- Mentor Gerencial;
- Desenvolvimento;
- Ranking;
- Universidade MX.

Quando o dono assume a gestão, a seção mostra o badge `RESPONSÁVEL`. Quando existe gerente ativo, mostra `ACOMPANHAR`.

A rota `/rotina` deve entregar a rotina gerencial funcional quando `ownerAssumesManagement = true`. Com gerente ativo, mantém a rotina executiva do dono.

A rota `/gerente/rotina-equipe` deve aceitar o dono e renderizar `ManagerTeamRoutine`.

## Cadastro e edição da loja

O cadastro apresenta duas escolhas operacionais:

- `Dono acumula a gestão`: limpa `manager_email`.
- `Gerente será cadastrado`: exige `manager_email`.

Na edição, quando houver gerente ativo, o sistema mostra esse estado como detectado automaticamente. Remover ou alterar o e-mail não remove vínculos ativos; a gestão real continua sendo determinada pelos vínculos.

## Segurança

- Nenhuma permissão deriva de `manager_email`.
- O dono só acessa dados das lojas às quais possui vínculo ativo, conforme RLS e resolução de loja existentes.
- A consulta de contexto lê apenas a contagem de vínculos gerenciais ativos.
- Não são criados novos perfis, usuários ou vínculos automaticamente.

## Falhas e fallback

Se a consulta do contexto falhar, o frontend assume o modo conservador `active_manager` para não ampliar privilégios por falha de rede. A interface informa que o contexto não pôde ser confirmado.

## Testes obrigatórios

- resolver os três estados do contexto;
- proprietário assume gestão sem vínculo ativo;
- proprietário não assume gestão com gerente ativo;
- `manager_email` sozinho resulta em gerente pendente, não gerente ativo;
- dono acessa `/gerente/rotina-equipe`;
- vendedor continua bloqueado;
- navegação comercial do dono contém todas as rotas previstas;
- validação exige e-mail quando a opção é gerente pendente.
