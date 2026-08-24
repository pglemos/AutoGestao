# Checklist 1:1 — Plano Estratégico + Planos de Ação (Admin MX × Base44)

Cliente: **AG AUTOMÓVEIS** (`79130186-90ad-4ff9-b3f7-432ebcbf8c62`)  
Evidência: browser Cursor + logs `debug-bb88b1` (pós-fix) — 2026-08-24; instrumentação removida após verificação

Legenda: **PASS** | **FAIL** | **DATA** (limitação de dataset, não bug de UI)

## Plano Estratégico (Admin)

| # | Fluxo / campo | Esperado Base44 | Resultado AG | Status |
|---|---------------|-----------------|--------------|--------|
| PE01 | Abrir PE pela ficha | Abre ciclo do cliente | `cycleId=bd5f482d` via `/clientes/ag-automoveis/plano-estrategico?...` | PASS |
| PE02 | Status do ciclo | Exibe status | `rascunho` (log H-B) | PASS |
| PE03 | Unidades ativas | Matriz + filiais | 3 unidades ativas (log) | PASS |
| PE04 | Roster | 45 oficiais | 45 enabled (log) + UI “45 indicador” | PASS |
| PE05 | Abas | Cadastro rápido / Revisão / Unidades / Consolidado / Histórico | Todas presentes | PASS |
| PE06 | Campos Meta / Realizado / AA | Seletor de campo | `Campo da matriz` com 3 opções; Realizado troca inputs | PASS |
| PE07 | Cadastro rápido digitáveis | Metas manuais | Fluxo Porta Meta Jan–Dez = 8; hints 18/27/45 | PASS |
| PE08 | Vendas Total calculado (Matriz) | Soma canais | `8 8 … 8 96` na Revisão | PASS |
| PE09 | Filial sem meta | Sem herança | 3 PISO `Vendas Total — … —` | PASS |
| PE10 | Estoque Total Matriz | Calculado/manual | `14 13…13 159` | PASS |
| PE11 | Consolidado | Banner parcial se incompleto | Aba Consolidado + texto Parcial | PASS |
| PE12 | Validar / Publicar / Salvar / Ver Dono | Ações no header | Presentes; publicação bloqueada por prontidão 27/45 | PASS |
| PE13 | Visualizar como Dono | Shell Dono + mesmos números | Meta 8/13; Resultado Sem resultado; Julho; Diagnóstico | PASS |
| PE14 | Card ficha metas publicadas | Distinct da versão | **45 publicadas · 0 pendentes** (ciclo publicado) | PASS |
| PE15 | Labels Visão geral | Sem colisão chrome Dono × aba PE | Aba PE renomeada para **Visão do Plano**; chrome Dono mantém Departamentos → Visão Geral | PASS (fix UX) |

## Planos de Ação (Admin)

| # | Fluxo / campo | Esperado Base44 | Resultado AG | Status |
|---|---------------|-----------------|--------------|--------|
| PA01 | Biblioteca `/plano-acao` | Planos Padrão | 8 templates; abas Padrão/Sugestões/Aplicações/Histórico | PASS |
| PA02 | Sugestões ao Dono | Lista | 1 pendente | PASS |
| PA03 | Aplicações nos Clientes | Planos de template | **1 aplicação AG** (3 unidades agrupadas) — `QA Apply AG` | PASS |
| PA04 | Board rede (`?tab=planos`) | Planos | 2+ planos rede; AG materializado nas lojas | PASS |
| PA05 | Histórico templates | Eventos | Eventos QA/paridade listados | PASS |
| PA06 | Wizard Aplicar a Cliente — seletor Cliente | Só contas-cliente (matriz) | Só **AG AUTOMÓVEIS** (sem 3 PISO/TITO) — `excludeBranchClients` | PASS |
| PA07 | Escopo de aplicação | 1 aplicação lógica / cliente | Persistência `scope_type=store` + UI/métricas agrupadas por `template_application_request_id` | PASS (adaptação schema) |
| PA08 | Ações template | Abrir/Editar/Aplicar/Sugerir/Publicar | Presentes na biblioteca | PASS |

## Veredito

**PE/PA Admin no AG: caminho crítico PASS** (publicar PE + aplicar PA com agrupamento).  
Detalhe: `docs/auditoria/VEREDITO-PE-PA-ADMIN-BASE44-AG-2026-08-24.md`.

Schema PA ainda materializa por loja (adaptação Base44), UI mostra 1 aplicação lógica.

## Correções nesta sessão

1. `fetchWizardClients` — `excludeBranchClients` + skip arquivados (PA06).
2. `groupApplicationsByRequest` em `actionPlanApplications` + UI Aplicações (PA07).
3. Aba PE **Visão do Plano** vs chrome Dono **Visão Geral** (PE15).
4. `fillOfficialDemoForCycle` preenche **todas** unidades ativas (desbloqueou publish AG).
5. PE AG publicado (45/45) + PA aplicado (3 lojas → 1 linha em Aplicações).
6. Lista Admin PE exclui filiais-como-cliente (`excludeBranchClients`).
7. Instrumentação de debug removida após prova.
