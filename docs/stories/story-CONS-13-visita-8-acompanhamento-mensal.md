# Story CONS-13 - Visita 8 de Acompanhamento Mensal PMR

**Status:** Ready for Review
**Epic:** EPIC-MX-CONS-DEV-20260515  
**Onda:** 1 - Consultoria PMR pronta para uso  
**Owner:** @pm  
**Story:** @sm  
**Implementacao sugerida:** @data-engineer + @dev  
**Quality Gate:** @qa  
**Prioridade:** Critical

## Contexto

A metodologia atual esta modelada como PMR 1 a 7 em `scripts/seed_pmr_methodology.ts` e em tabelas de modelo de visita. Na reuniao, ficou decidido adicionar uma visita extra de acompanhamento mensal, usada apos o ciclo PMR principal.

Essa visita nao deve quebrar clientes existentes, conclusao legada de visitas 1 a 7, agenda importada ou relatorios atuais.

## User Story

Como admin/admin master MX,  
quero ter uma visita 8 de acompanhamento mensal no fluxo PMR,  
para continuar acompanhando o lojista/dono depois das visitas principais sem usar controles externos.

## Acceptance Criteria

- [x] Programa PMR suporta etapa `visit_number = 8` para acompanhamento mensal.
- [x] A visita 8 possui objetivo, publico-alvo, duracao, evidencia esperada e checklist template.
- [x] Clientes existentes com `program_template_key = pmr_7` continuam funcionando sem perda de historico.
- [x] Fluxo de conclusao legada continua limitado a visitas 1 a 7, salvo decisao explicita futura.
- [x] Agenda/detalhe do cliente exibe visita 8 quando criada/agendada.
- [x] Relatorio de visita aceita `visit_number = 8` sem erro visual ou textual.
- [x] Testes de schema/regressao cobrem o novo limite de visita.
- [x] Agenda respeita `total_visits` do programa contratado (7, 9 ou 12) antes de oferecer acompanhamento mensal.
- [x] Rótulos e validação deixam de fixar `/7` para clientes PMR 9, Plus ou Híbrido.

## Regras de Negocio

- Visita 8 e recorrente/mensal em conceito, mas o MVP pode registrar uma ocorrencia por vez.
- Visita 8 nao substitui plano de acao; ela revisa execucao, indicadores, pendencias e proximos passos.
- Somente admin/admin master MX pode criar/editar/concluir visita 8.

## Possivel Checklist da Visita 8

- Revisar indicadores do periodo selecionado.
- Revisar pendencias do plano de acao.
- Registrar pontos positivos do mes.
- Registrar pontos a melhorar.
- Definir proximas acoes e responsaveis.
- Confirmar proxima data de acompanhamento.

## Arquivos Provaveis

- `scripts/seed_pmr_methodology.ts`
- `supabase/migrations/*_pmr_visit_8_monthly_followup.sql`
- `src/features/consultoria/types.ts`
- `src/hooks/useConsultingClientBySlug.ts`
- `src/pages/ConsultoriaClienteDetalhe.tsx`
- `src/features/consultoria/components/VisitReportTemplate.tsx`
- `src/test/schemas/schemas.test.ts`

## Plano AIOX

1. [x] @data-engineer audita schema e constraints de visitas/modelos.
2. [x] @architect confirma se `pmr_7` vira `pmr_8` ou se visita 8 entra como extensao do mesmo programa.
3. [x] @dev implementa migration/script e UI minima.
4. [x] @qa valida regressao de PMR 1-7, conclusao legada e relatorio.

## Decisoes Assumidas em Yolo Mode

- Visita 8 entra como `Acompanhamento Mensal` dentro do programa `pmr_7`.
- `total_visits` permanece 7 para preservar o ciclo principal PMR.
- Conclusao legada continua restrita a visitas 1 a 7.
- A tela e o relatorio nao exibem `8/7`; exibem `Acompanhamento Mensal`.

## Gates

- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] Schema/RLS validado quando houver migration.
- [x] Formulário autenticado validado em Chrome desktop e mobile sem mutação de dados.

## File List

- `docs/stories/story-CONS-13-visita-8-acompanhamento-mensal.md`
- `src/lib/consultoria/pmr-visit-rules.ts`
- `src/lib/consultoria/pmr-visit-rules.test.ts`
- `src/hooks/useConsultingClientBySlug.ts`
- `src/hooks/useAgendaAdmin.ts`
- `src/hooks/agenda/types.ts`
- `src/hooks/agenda/useAgendaCRUD.ts`
- `src/hooks/agenda/useAgendaEvents.ts`
- `src/features/agenda-admin/AgendaAdmin.container.tsx`
- `src/features/agenda-admin/hooks/useAgendaAdminForms.ts`
- `src/features/agenda-admin/hooks/useAgendaAdminPage.ts`
- `src/features/agenda-admin/modals/VisitaModal.tsx`
- `src/test/agenda.playwright.ts`
- `src/hooks/useConsultingClients.ts`
- `src/pages/AgendaAdmin.tsx`
- `src/pages/ConsultoriaClienteDetalhe.tsx`
- `src/pages/ConsultoriaVisitaExecucao.tsx`
- `src/components/organisms/VisitCard.tsx`
- `src/features/consultoria/components/VisitReportTemplate.tsx`
- `src/test/organisms/VisitCard.test.tsx`
- `scripts/seed_pmr_methodology.ts`
- `supabase/migrations/20260515120000_pmr_followup_visit_8.sql`
