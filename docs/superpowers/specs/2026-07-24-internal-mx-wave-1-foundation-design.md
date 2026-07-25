# Onda 1 — Fundação visual, permissões e testes

## Objetivo

Criar uma fundação estrutural real para as 19 áreas internas da MX, corrigir as permissões de Configuração Operacional e Parâmetros PMR e estabelecer uma matriz de regressão equivalente para `administrador_geral`, `administrador_mx` e `consultor_mx`.

## Escopo

A Onda 1 não migra todo o conteúdo das 19 páginas. Ela cria o contrato que as ondas seguintes usarão e migra integralmente as duas páginas em que autorização e composição estavam misturadas: Configuração Operacional e Parâmetros PMR.

## Arquitetura

O `InternalMxCanonicalTemplate` deixa de ser um wrapper semântico vazio e passa a fornecer contexto, shell, body, identidade da página, papel autenticado e versão do template. Slots explícitos representam página, cabeçalho, toolbar, seção, tabela, abas e sidebar. As primitivas `MxModule*` usam esses slots diretamente.

Páginas ainda não migradas permanecem na ponte de compatibilidade visual até as ondas 2, 3 e 4. Nenhum seletor específico por rota será introduzido.

## Permissões

Para Configuração Operacional e Parâmetros PMR:

- `administrador_geral`: gerenciamento;
- `administrador_mx`: gerenciamento;
- `consultor_mx`: consulta sem edição;
- demais perfis: sem acesso à área interna.

A regra é aplicada na interface e nos hooks de mutação.

## Testes

A matriz Playwright declara 19 rotas, três perfis e três viewports, totalizando 171 auditorias quando as três credenciais E2E estão configuradas. Ela registra shell, body, slots, cabeçalho, overflow, console, cards, modo de acesso e ações administrativas habilitadas.

## Restrições de entrega

- uma única alteração consolidada na `main`;
- um único commit;
- um único ciclo de CI e Vercel;
- nenhuma migration ou alteração de dados no Supabase;
- nenhuma nova dependência.
