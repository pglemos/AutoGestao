# Story MX-MGR-20260713-08 - Desenvolvimento Base44 1:1

## Status

Em auditoria

## Escopo e fontes

Reproduzir Base44 `/desenvolvimento` em `/feedbacks-pdis` com menu principal único e abas Feedback, PDI, Meu PDI e PDI da Equipe. Referências: `src/pages/Desenvolvimento.jsx`, `src/components/desenvolvimento/*`, `ManagerDevelopment.tsx`, `ManagerFeedbackReference.tsx` e `ManagerPDIReference.tsx`.

## Regras e dados

- Feedback: Positivo/Desenvolvimento; status Rascunho, Enviado, Visualizado, Ciência registrada, Em acompanhamento, Concluído e Cancelado.
- Salvar vendedor, data, tipo, competência, origem, situação, impacto, orientação, compromisso e prazo; preservar snapshot.
- Tipo não vem selecionado automaticamente.
- PDI da equipe suporta ciclo, prioridades 1-3, avaliação, plano, acompanhamento 30/60/customizado, evidência e versionamento.
- Progresso = ações concluídas / ações previstas * 100; não permitir digitação manual.
- Gerente consulta o próprio PDI, mas não aprova nem altera nota oficial.

## Estados, fluxos e testes

Validar tabs/query string, listas, criação/edição/consulta, modal, ações, evidências, avaliações, reuniões, vazio, loading, erro, sem permissão, foco/Escape, responsividade e RLS. Cobrir persistência Supabase, auditoria e vendedor sem alteração do conteúdo original.

## Evidências e file list

Baseline em `output/playwright/manager-parity/master-20260713/`.

Evidências reais desta iteração:

- Base44: `base44/desenvolvimento-feedback-modal-live.png`.
- MX local após correção: `local/desenvolvimento-feedback-modal-after-fix.png`.
- Validação Playwright: vendedor/tipo obrigatórios exibem alerta; Escape fecha o diálogo e devolve o estado sem modal.

Implementado nesta iteração:

- Modal gerencial `Novo Feedback` com identificação, tipo sem seleção automática, competência, origem, situação, impacto, orientação, compromisso, prazo, próxima conversa e evidência de PDI.
- Adaptador `buildManagerFeedbackFormData` para persistir no contrato canônico `devolutivas`, preservando metadados no `diagnostic_json`.
- `useStoreFeedback.handleSubmit` aceita payload explícito sem quebrar o fluxo legado.
- `FeedbackDetail` e `TeamCompetencyMap` agora têm focus trap, Escape e restauração do foco ao gatilho.
- Validação real em Chromium cobriu Feedback, PDI, tabs, wizard desktop/mobile e estados vazios: `4 passed (1.1m)` no fluxo gerencial completo.
- Capturas atuais em Chrome real para as dez rotas: `output/playwright/manager-parity/current-20260714/chrome/{base44,mx-production}/8-desenvolvimento-1440x900-full.png`.

File list:

- `src/features/manager/development/ManagerFeedbackModal.tsx`
- `src/features/manager/development/manager-feedback-draft.ts`
- `src/features/manager/development/manager-feedback-draft.test.ts`
- `src/features/manager/development/ManagerFeedbackReference.tsx`
- `src/features/manager/development/ManagerDevelopmentDialogs.test.tsx`
- `src/features/manager/development/ManagerPDIReference.tsx`
- `src/features/gerente-feedback/hooks/useStoreFeedback.ts`
- `src/hooks/useFeedbacks.ts`
- `src/hooks/usePDI_MX.ts`
- `src/hooks/useStores.ts`
- `src/features/manager/development/ManagerDevelopmentErrorStates.test.tsx`
- `src/lib/feedback-visibility-migration.test.ts`
- `src/lib/feedback-visibility-action-cleanup-migration.test.ts`
- `supabase/migrations/20260714193000_feedback_visibility_to_seller.sql`
- `supabase/migrations/20260714192019_feedback_visibility_action_cleanup.sql`

Implementado nesta correção:

- Validação condicional por tipo: feedback positivo exige pontos fortes; desenvolvimento exige pontos de atenção.
- Checkbox `Enviar este feedback ao vendedor`, ligado por padrão, com marcação de liderança quando desativado.
- Feedback privado fica protegido no RLS, não aparece ao vendedor e não gera ação na Central; ações antigas vinculadas são removidas ao tornar o feedback privado.
- Teste real em produção cobriu login de gerente, gravação privada e login do vendedor; o conteúdo privado e sua pendência não apareceram, sem erros/warnings de console.

Pendências reais: alinhar edição/detalhe com registros equivalentes e concluir diff por pixel dos estados/modal. Hooks e telas agora propagam erros de consulta de feedback, PDI e vendedores; regressão dedicada `3/3`. A story permanece `Em auditoria`.
