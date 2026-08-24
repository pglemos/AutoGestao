# Story MX-UI-20260715 - Regularização no Histórico com CRM e D+1 retroativo

## Status

Ready for Review

## Story

**Como** vendedor,
**quero** regularizar um fechamento atrasado usando os registros oficiais do CRM,
**para** não duplicar vendas manualmente e manter a Disciplina coerente com a data regularizada.

## Acceptance Criteria

1. No fluxo `Histórico de Fechamentos > Regularizar`, o bloco de inserção numérica não renderiza o campo `Vendas` nem seus steppers.
2. Vendas exibidas e enviadas na regularização são derivadas dos cadastros CRM; o usuário não consegue informá-las por contagem manual.
3. O fluxo não renderiza `Motivo do Ajuste` nem `Observações Operacionais (Justificativa)` e continua habilitando o envio sem esses campos visuais.
4. Quando o fechamento está pendente, os agendamentos D+1 são derivados a partir de `data_regularizada + 1`, inclusive quando o cadastro do agendamento foi criado no dia seguinte.
5. A solicitação mantém uma razão interna auditável para satisfazer o contrato da RPC, sem expor essa razão como campo editável.

## Tasks / Subtasks

- [x] Cobrir a ausência dos campos e o envio sem motivo em testes renderizados.
- [x] Cobrir a derivação de vendas CRM e D+1 relativo à data regularizada em testes puros.
- [x] Implementar o drawer sem vendas manuais, com métricas CRM e D+1 pendente.
- [x] Ajustar o payload do Histórico para usar métricas CRM e razão interna.
- [x] Rodar gates locais e validar a rota publicada/local, registrando o limite de autenticação local.
- [x] Corrigir regressão observada no vídeo de 20/08: preservar valores recém-salvos, impedir regressão de `draft_revision` por refetch atrasado e manter a etapa confirmada após remontagem.

## Dev Agent Record

### Agent Model Used

Dex (AIOX dev)

### Debug Log References

- Reprodução autenticada em `https://mxperformance.vercel.app/fechamento-diario` em 15/07/2026: o drawer ainda exibia `Vendas` manual, `Motivo do Ajuste` e D+1 `0 de 0` para 14/07.

### Completion Notes List

- O drawer não renderiza mais o card numérico de Vendas nem Motivo do Ajuste; a solicitação usa razão interna auditável.
- Vendas e D+1 são derivados dos registros CRM; em fechamento pendente, a referência de D+1 é `data_regularizada + 1`.
- Testes focados: 14 pass / 0 fail. Suíte completa: 1.045 pass / 0 fail. Typecheck, lint, build e `git diff --check` aprovados.
- Navegador: produção reproduzida autenticada antes da alteração; rota local carregou a tela de login, sem sessão autenticada local disponível para abrir o drawer. Deploy não executado.
- Vídeo de 20/08 reproduzido autenticado em 24/08: a RPC persistia os números, mas a UI voltava ao snapshot antigo; correção validada localmente em desktop/mobile com avanço Carteira → Internet e resumo imediato 1 lead / 2 atendimentos / 1 agendamento D+1. O rascunho de teste foi restaurado a zero.

### File List

- `docs/stories/story-MX-UI-20260715-regularizacao-historico-crm-d1.md`
- `src/features/checkin/lib/clientes-list-from-crm.ts`
- `src/features/checkin/sections/RegularizarFechamentoDrawer.tsx`
- `src/features/checkin/sections/RegularizarFechamentoDrawer.test.tsx`
- `src/features/checkin/sections/CheckinHeader.tsx`
- `src/features/checkin/sections/CheckinHeader.test.ts`
- `src/features/checkin/autosave/checkin-autosave-coordinator.ts`
- `src/features/checkin/autosave/checkin-autosave-coordinator.test.ts`
- `src/features/checkin/hooks/useCheckinPage.ts`
- `src/features/checkin/sections/CheckinForm.responsive-flow.test.ts`

### Change Log

| Data | Versão | Alteração | Autor |
|---|---:|---|---|
| 2026-07-15 | 1.0 | Story criada a partir da reprodução autenticada do Histórico de Fechamentos. | Codex / Dex |
| 2026-08-24 | 1.1 | Corrigida a falsa perda de atendimentos/agendamentos após salvar: hidratação monotônica da revisão, proteção contra snapshot antigo e etapa efêmera preservada durante refetch/remontagem. | Codex / Dex |
