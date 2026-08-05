# Story MX-MGR-20260713-10 - Universidade MX Base44 1:1

## Status

Em auditoria

## Escopo e fontes

Reproduzir Base44 `/universidade-mx` em `/universidade-mx` com `src/pages/UniversidadeMX.jsx`, `ManagerUniversityReference.tsx`, `GerenteTreinamentos.tsx`, `useUniversidadeMx` e `universidade-service.ts`.

## Regras e limites

Tela PRELIMINAR. Abas: Desenvolvimento do Gerente e Acompanhamento da Equipe. Trilhas: Liderança, Gestão, Pessoas e Comercial. IA aplicada à liderança permanece futura. Progresso, conclusão, último acesso, certificados e status vêm dos contratos canônicos `treinamentos` + `progresso_treinamentos`; catálogo estático pode ser referência, mas não inventar atraso, recomendação ou conteúdo final.

## Estados, fluxos e testes

Validar iniciar/continuar/concluído/em breve, matriz da equipe, detalhes, histórico, recomendar, cobrança autorizada, sem vendedores, sem histórico, loading, erro, tabs, foco/Escape e desktop/tablet/mobile. Cobrir serviço canônico, RLS e distinção entre placeholder autorizado e dado real.

## Evidências e file list

Baseline em `output/playwright/manager-parity/master-20260713/`; homologação definitiva fica bloqueada enquanto decisões preliminares permanecerem abertas.

Evidências reais desta iteração: Base44 e MX local abriram a trilha `Liderança Comercial`; a interação foi capturada em `universidade-iniciar-live.png`. O bloco de aulas ao vivo foi removido da aba gerencial MX porque não existe na composição Base44; a integração permanece disponível fora deste recorte.

Implementado nesta iteração:

- Acompanhamento da equipe ganhou a ação `Ver detalhes` e modal com vendedor, unidade, progresso, status, conteúdos concluídos, última pendência e gargalo oficial.
- O modal usa o `Modal` canônico, com Escape, focus trap e restauração de foco.
- A aba da Universidade é preservada por `?tab=manager`/`?tab=team` na rota canônica.
- Conteúdo oficial, progresso e conclusão continuam derivados dos hooks/contratos reais; o catálogo estático permanece identificado no modal como referência sem registrar progresso fictício.
- Testes de componente do modal e dos fluxos de conteúdo passaram: `10 pass`.
- Capturas atuais em Chrome real para a rota Base44 e MX em produção: `output/playwright/manager-parity/current-20260714/chrome/{base44,mx-production}/10-universidade-mx-1440x900-full.png`.
- A comparação visível identificou controles extras de busca/atualização no cabeçalho MX; eles foram removidos, publicados e confirmados no Chrome autenticado pós-deploy.

File list desta iteração:

- `src/features/manager/development/ManagerUniversityReference.tsx`
- `src/features/manager/development/ManagerUniversityReference.test.tsx`
- `src/pages/GerenteTreinamentos.tsx`

Pendências reais: validar acompanhamento da equipe com vendedor elegível, detalhe completo e progresso real; executar estados vazios/loading/erro e diff por pixel completo. A story permanece `Em auditoria`.
