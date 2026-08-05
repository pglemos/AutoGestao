# Story MX-MGR-20260713-07 - Mentor Gerencial Base44 1:1

## Status

Em auditoria

## Escopo e fontes

Reproduzir Base44 `/mentor-gerencial` em `/mentor` com `src/pages/MentorGerencial.jsx`, `ManagerMentor.tsx` e biblioteca MX. Tela PRELIMINAR: somente regras determinísticas, biblioteca e navegação filtrada.

## Regras e limites

Recomendações permitidas: fechamento pendente, rotina crítica, vendedor sem venda, loja abaixo da meta e carteira atrasada. Não ativar chat livre, LLM sem explicação, cobrança autônoma ou feedback autônomo. Conteúdo futuro deve permanecer identificado como futuro.

## Estados, fluxos e testes

Validar ponto de atenção, recomendações, prioridade, motivo, dados relacionados, biblioteca, modal, vazio, operação normalizada, erro, loading, foco/Escape, navegação contextual e viewports desktop/tablet/mobile. Cobrir regras puras e ausência de recomendações.

## Evidências e file list

Baseline em `output/playwright/manager-parity/master-20260713/`; homologação preliminar não pode ser declarada definitiva.

## Dev Agent Record

- O Mentor permanece restrito a recomendações determinísticas derivadas dos indicadores oficiais e à biblioteca de orientações; nenhum chat livre, LLM sem explicação ou cobrança autônoma foi ativado.
- O modal de orientação passou a usar `useFocusTrap`, fechar por `Escape` e restaurar o foco ao gatilho.
- E2E real em Chromium do fluxo completo gerencial após as correções: `4 passed (1.1m)`; o fluxo Mentor isolado também passou antes da rodada completa (`1 passed`).
- Pendências reais: comparar cada recomendação contra a massa equivalente do Base44 e capturar os estados loading/erro/vazio em viewport estável. A tela permanece preliminar e `Em auditoria`.

### File List

- `src/pages/ManagerMentor.tsx`
- `src/test/manager-module.playwright.ts`
- `docs/stories/story-MX-MGR-20260713-07-mentor-gerencial-base44-1x1.md`
