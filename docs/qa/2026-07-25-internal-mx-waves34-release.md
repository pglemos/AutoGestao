# Evidências de entrega das Ondas 3 e 4 internas MX

## Escopo

- Rede: Painel Geral, auditoria de Lojas e preservação do detalhe existente.
- Consultoria: clientes, compatibilidade do detalhe e execução PMR.
- Comunicação: Notificações e Perfil interno.
- Relatórios: fundação compartilhada, Relatório Matinal, Performance de Vendas e Performance por Vendedor.
- Controle: Diagnóstico Operacional, Simulação e políticas de Reprocessamento.

## Restrições cumpridas

- Nenhuma migration, tabela, coluna, RPC, trigger, RLS ou Edge Function alterada.
- Nenhuma credencial versionada.
- Perfis Vendedor, Gerente e Dono preservados por componentes legados isolados quando a rota era compartilhada.
- Um único commit previsto para a integração final.
- Um único deploy de produção previsto após os gates.

## Gates

- Verificação sintática de todos os arquivos TypeScript/TSX alterados.
- Verificação semântica do recorte com TypeScript estrito e contratos locais.
- Testes puros de políticas, cálculos, filtros, simulação, relatórios e idempotência.
- Testes de contrato arquitetural.
- Matriz Playwright configurada por variáveis de ambiente, sem segredos no repositório.
- Build, lint, testes do pipeline, smoke HTTP e runtime Vercel devem ser anexados após a publicação.

## Limitação operacional

A execução autenticada integral do Playwright depende de navegador com rede externa e da credencial do perfil `consultor_mx`. O arquivo E2E pula explicitamente perfis sem variável de ambiente, em vez de produzir falso positivo.
