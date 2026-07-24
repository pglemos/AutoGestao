# Visão da Unidade MX — correção funcional e alinhamento gerencial

## Objetivo

Entregar ao Administrador Master, Admin MX e Consultor MX uma leitura diária confiável por vendedor, com o mesmo sistema visual do módulo Gerente e sem expor nomes de fornecedores de infraestrutura na interface.

## Causa raiz corrigida

A chamada de `supabase.rpc` era destacada do cliente e executada sem o contexto interno do objeto. A falha acontecia antes de qualquer requisição HTTP, por isso a API não registrava uma chamada para `admin_store_live_overview`.

A chamada passa a ser executada como método do cliente por `loadAdminStoreLiveOverview(client, storeId, referenceDate)`. Um teste de regressão valida que o contexto do cliente é preservado.

## Hierarquia visual

1. Cabeçalho compacto da unidade com seletor, abas e atualização.
2. Controle de período em cartão separado.
3. Administração da loja com ações secundárias e parâmetros recolhíveis.
4. Acompanhamento diário da equipe.
5. Indicadores resumidos.
6. Tabela operacional por vendedor.
7. Demais indicadores, alertas, funil e ranking existentes.

## Sistema visual

- fundo geral cinza claro;
- largura máxima `max-w-7xl`;
- cartões brancos com `rounded-2xl`, borda cinza leve e sombra discreta;
- verde esmeralda como ação primária;
- tipografia e densidade equivalentes às telas canônicas do Gerente;
- estados sem dados, carregamento e erro tratados separadamente.

## Dados por vendedor

- status do fechamento: não iniciado, rascunho, enviado no prazo ou enviado com atraso;
- leads, agendamentos, atendimentos e vendas registrados no sistema;
- valores declarados exibidos como informação secundária;
- destaque apenas quando existe fechamento concluído e os valores divergem;
- última atividade registrada.

## Atualização

A atualização automática permanece como comportamento interno. A interface mostra apenas o horário da última atualização e um aviso operacional neutro se a sincronização automática for interrompida.

## Segurança

A RPC mantém autorização por perfil no banco, execução restrita a usuários autenticados e filtragem dos vendedores por vínculos ativos nas estruturas oficiais da loja.
