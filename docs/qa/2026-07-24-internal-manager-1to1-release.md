# Release QA — Internal MX Manager 1:1

Data: 24/07/2026

## Escopo

Migração estrutural das seguintes rotas internas para a composição visual do módulo Gerente:

- `/configuracoes?aba=perfil`
- `/configuracoes`
- `/configuracoes/consultoria-pmr`
- `/configuracoes/operacional`
- `/relatorio-matinal`
- `/relatorios/performance-vendas`
- `/classificacao`
- `/devolutivas`
- `/treinamentos`
- `/produtos`
- `/notificacoes`

## Arquitetura aplicada

- registro explícito `managerLayout` por rota;
- frame visual exclusivo dos perfis internos MX;
- cabeçalho compartilhado com anatomia do Gerente;
- navegação de Configurações convertida para abas segmentadas horizontais;
- cards, KPIs, tabelas, filtros, formulários e estados com densidade do Gerente;
- responsividade validada em desktop, tablet e mobile;
- nenhum impacto visual em Vendedor, Gerente ou Dono.

## Integridade funcional

- consultas e mutations existentes preservadas;
- permissões e modo somente leitura preservados;
- exports, filtros, modais, refresh e ações preservados;
- nenhuma migration, RPC, trigger, RLS ou Edge Function criada;
- Supabase permanece sem alteração nesta entrega.

## Gates exigidos

- contrato de código `internal-manager-page-contract.test.ts`;
- typecheck;
- testes unitários;
- lint de acessibilidade;
- Atomic Design Enforcement;
- matriz autenticada das rotas em 1440×900, 1024×768 e 390×844;
- ausência de cards escuros, barra vertical antiga, overflow horizontal e erros de console;
- um único preview/produção após aprovação dos gates.
