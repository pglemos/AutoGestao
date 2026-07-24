# Evidência de migração visual do módulo interno MX

Data: 24/07/2026

## Escopo

Perfis `administrador_geral`, `administrador_mx` e `consultor_mx` recebem o sistema visual canônico do módulo Gerente. Vendedor, Gerente e Dono permanecem fora do novo provider de superfícies.

## Alterações consolidadas

- provider visual exclusivo para perfis internos;
- cards, tipografia, campos, badges, skeletons e tabelas sensíveis ao contexto visual;
- reconstrução das primitivas `MxModuleVisualPrimitives`;
- reconstrução de Reprocessamento e Performance por Vendedor;
- composição interna dedicada do Diagnóstico Operacional, preservando a composição existente do Gerente;
- nenhum texto de infraestrutura exposto na interface;
- nenhuma migration, RPC, trigger ou política RLS alterada.

## Verificações locais anteriores ao único push

- 16 arquivos TypeScript/TSX transpilados com TypeScript 5.8.3;
- zero erro sintático;
- ausência de `!important`, `mxds-` e `mx-internal-workspace` nos arquivos alterados;
- ausência de `SUPABASE REALTIME`, `REFERÊNCIA REAL-TIME` e `REGISTROS SINCRONIZADOS`;
- presença dos contratos `max-w-7xl`, `space-y-5`, `rounded-2xl`, `border-gray-100`, controles de 40 px e foco emerald.

## Gates remotos obrigatórios após o commit consolidado

- typecheck;
- testes unitários e de contrato;
- ESLint de acessibilidade;
- atomic design enforcement;
- paridade de design system;
- auditoria visual autenticada das rotas internas;
- build Vite;
- único preview Vercel;
- smoke autenticado antes do merge.
