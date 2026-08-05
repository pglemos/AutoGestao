# Módulo Gerencial — arquitetura de reconstrução Base44 1:1 no MX

> Decisão revisada em 2026-07-14. A precedência funcional pertence à especificação
> textual; Base44 é a referência visual e comportamental quando não houver conflito.

## Decisão

O texto da especificação funcional consolidada e do Prompt Mestre V2 forma o contrato normativo para fórmulas, regras, permissões, estados e critérios de aceite. O snapshot externo do ZIP de referência, extraído somente para auditoria conforme o procedimento registrado em `docs/qa/browser-capability-check.md`, e o comportamento autenticado de `https://mx-gerente.base44.app` formam a referência de composição, conteúdo não conflitante, estados visuais, formulários, modais, gráficos, ações e fluxos.

O MX permanece fonte de verdade apenas para a plataforma de execução: React 19, TypeScript, shell, autenticação, capabilities, Supabase, RLS, auditoria e design tokens, todos sujeitos à validação dos gates de segurança. As entidades Base44 são implementadas por adaptadores sobre os contratos Supabase existentes; não há segundo router, sidebar, AuthProvider, SDK Base44 nem armazenamento empresarial no navegador.

Quando houver conflito, registrar na matriz, aplicar a especificação textual e criar teste de regressão. Para conflitos visuais/comportamentais sem impacto normativo, Base44 vence. A única exceção visual autorizada é o sidebar escuro atual, preservado integralmente salvo pelos ícones de Rotina do Dia (`CalendarClock`) e Mentor Gerencial (`BrainCircuit`). Requisitos de segurança, autorização, isolamento por loja e auditoria permanecem inegociáveis.

## Rotas canônicas

`/home`, `/rotina`, `/fechamento-diario`, `/rotina-equipe`, `/minha-equipe`, `/meta-loja`, `/mentor`, `/feedbacks-pdis`, `/ranking` e `/universidade-mx`.

Aliases legados podem continuar existindo, mas navegação, links internos, restauração de contexto e E2E devem usar as rotas canônicas acima.

## Boundaries

- Início reproduz o cockpit de previsibilidade do Base44 e alimenta suas fórmulas com dados canônicos MX; ausência de dados usa exatamente o estado vazio correspondente, nunca fallback numérico inventado.
- Rotina do Dia porta o gerador Base44 de tarefas automáticas e manuais, com seus horários, urgência, filtros, conclusão e restauração de contexto; cada entidade de entrada é resolvida por adaptador Supabase.
- Fechamento reproduz composição e fluxos Base44 reutilizando check-in, regularização e auditoria existentes; o gerente não pode adulterar a operação do vendedor fora das ações autorizadas.
- Rotina da Equipe reproduz cálculos e estados Base44 sobre `central_execucao_*`, plano de ataque, `execution_actions` e CRM.
- Minha Equipe, Meta da Loja, Mentor, Desenvolvimento, Ranking e Universidade reproduzem o contrato Base44 completo usando os serviços canônicos atuais somente como fonte/persistência.
- Toda query é escopada por membership/RLS; identificadores do cliente não constituem autorização.
- Blocos assíncronos distinguem loading, vazio, erro, sem vínculo e sem permissão.

## Padrão de adaptação

Cada tela é entregue como recorte vertical independente:

1. inventário do ZIP e inspeção do fluxo autenticado no Chrome;
2. contrato de apresentação e domínio isolado do JSX;
3. adaptador Base44 → Supabase com tipos explícitos;
4. testes unitários de fórmulas, testes de componente e E2E de ações;
5. comparação em `1440×900`, `768×1024` e `390×844` contra a referência estabilizada;
6. validação pós-deploy na rota pública antes de iniciar a próxima tela.

O adaptador pode compor múltiplas tabelas/RPCs canônicas, mas não pode alterar fórmulas, limiares, labels, ordenação, habilitação de ações ou transições observáveis definidas pelo Base44. Migração nova só é permitida quando a auditoria comprovar ausência de contrato persistente equivalente.

## Restrições aceitas

Não importar SDK, autenticação, dados demo, `localStorage` empresarial ou CSS global do Base44. Componentes, fórmulas e catálogos de domínio do ZIP devem ser portados para TypeScript e tokens MX sem reinterpretar o comportamento. Credenciais e tokens operacionais nunca são persistidos, impressos ou enviados ao bundle.
