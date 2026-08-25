# Paridade /plano-acao (MX) × /planos-acao (Base44) — 2026-08-25

Comparação com as duas telas abertas e autenticadas (MX local sobre o Supabase de
produção + preview `preview--mx-admin-flow.base44.app`).

## Estrutura — paridade completa

| | Base44 | MX |
|---|---|---|
| Botões do topo | Aplicar a Cliente · Abrir Histórico · Criar Plano Padrão | os mesmos três |
| Abas | Planos Padrão · Sugestões ao Dono · Aplicações nos Clientes · Histórico | as mesmas quatro |
| Cards por departamento | 7 (Todos + 6) | 7 |
| Filtros da biblioteca | departamento, indicador (dependente), status, disponibilidade, prioridade, responsável | os mesmos + busca por nome |
| Colunas da tabela | Plano Padrão · Departamento · Indicador · Ações · Prioridade · Resp. · Sug. · Apl. · Status · Versão · Ações | idênticas |
| Wizard Criar Plano Padrão | 4 passos: Indicador · Ações · Prazo e Meta · Revisão e Publicação | idêntico, campo a campo |
| Aplicar a Cliente | wizard | 7 passos: Cliente · Ano · Depto · Indicador · Plano · Escopo · Revisar |

Nas outras três abas o MX é superset: Sugestões ganha 4 KPIs, tabela e "Criar
sugestão" (no Base44 a aba só tem o filtro de status); Aplicações ganha filtros de
prioridade e responsável, coluna de ação e o diagnóstico de integridade.

## Defeitos encontrados e corrigidos

### 1. Criar Plano Padrão estava 100% quebrado (P0)

Dois defeitos encadeados, os dois de vocabulário de código, ambos falhando só no
console — a suíte passava porque o teste fixava o formato errado.

- `template_key` era gerada em maiúsculo (`PA_COMERCIAL_..._189`) e a tabela tem
  `CHECK ^[a-z0-9_]+$`: todo insert voltava `23514`;
- `primary_indicator_code` / `effectiveness_indicator_code` iam com o código
  canônico do wizard (`VISIT_TO_SALE_CONVERSION`) e têm FK para
  `catalogo_indicadores_planejamento`, que usa outro vocabulário, minúsculo
  (`visit_to_sale_rate`): FK violada.

Dos 45 indicadores do wizard, só 24 casavam por minúsculo direto; os 21 restantes
têm nome diferente no catálogo persistido. A tradução usa o canônico em comum via
`matchCanonicalIndicator`, sem mapa manual paralelo.

Verificado ponta a ponta: plano criado pela tela gravou
`pa_comercial_visittosaleconversion_084` com `primary_indicator_code`
`visit_to_sale_rate`, 1 versão e 1 item (registro de teste removido em seguida).

### 2. Filtro de indicador com rótulo errado

Continuava dizendo "Selecione primeiro um departamento" depois de escolher o
departamento, já habilitado. Agora mostra "Todos os indicadores".

### 3. Coluna Prioridade repetida

`'media'` e `'atencao'` caem no mesmo rótulo e a coluna mostrava
"Atenção, Atenção". Deduplicação passou a ser feita depois do mapeamento.

## Aberto (dado, não código)

- `departamento` convive em dois vocabulários na mesma tabela: `comercial`
  (minúsculo, criados pela tela) e `COMERCIAL` / `PESSOAS_RH` (maiúsculo, seeds da
  metodologia). O filtro casa os dois, mas a contagem dos cards é sensível a isso.
- 6 dos 8 planos padrão têm `primary_indicator_code` nulo e guardam o código
  canônico em `indicador`. Continuam alcançáveis pelo wizard, mas sem o vínculo
  de FK que mede eficácia.
- `owner_suggestion_enabled` está falso em todos os 8: nenhum plano aparece como
  "Disponível para sugestão".

---

## Matriz de paridade medida — Base44 × MX em produção (2026-08-25)

Levantamento programático dos dois lados, no mesmo dia: Base44 em
`preview--mx-admin-flow.base44.app/planos-acao` e MX em
`www.mxperformance.com.br/plano-acao` (release `51eebdca`, autenticado).

| Item medido | Base44 | MX produção | Veredito |
|---|---|---|---|
| Botões do topo | Aplicar a Cliente · Abrir Histórico · Criar Plano Padrão | os mesmos três | igual |
| Abas | 4 | 4, mesmos rótulos | igual |
| **Planos Padrão** — colunas | `Plano Padrão\|Departamento\|Indicador\|Ações\|Prioridade\|Resp.\|Sug.\|Apl.\|Status\|Versão\|Ações` | as mesmas 11 | igual |
| **Planos Padrão** — selects de filtro | 5 | 5 | igual |
| **Planos Padrão** — cards por departamento | 7 | 7 | igual |
| Filtros nomeados | departamento · indicador · status · disponibilidade · prioridade · responsável | os mesmos 6 + busca por nome | MX superset |
| Ações por linha | menu de ações | Abrir · Editar · Aplicar a cliente · Sugerir ao Dono · Mais ações | MX superset |
| **Sugestões ao Dono** — colunas | nenhuma (aba só com filtro de status) | `Problema\|Recomendação\|Regra\|Prioridade\|Status\|Data\|Ações` + 4 KPIs | MX superset |
| **Aplicações nos Clientes** — colunas | 9 | as mesmas 9 + `Ação` | MX superset |
| **Aplicações** — KPIs | 6 | 6 | igual |
| **Aplicações** — filtros | 1 | 3 (status, prioridade, responsável) | MX superset |
| **Histórico** | timeline de eventos | timeline de eventos | igual |
| Wizard Criar Plano Padrão | Indicador · Ações · Prazo e Meta · Revisão e Publicação | os mesmos 4 passos | igual |
| Wizard Aplicar a Cliente | wizard | Cliente · Ano · Depto · Indicador · Plano · Escopo · Revisar | MX superset |

Nenhuma funcionalidade, botão, lista ou tabela do Base44 ficou de fora.

## Design em tokens MX (não é CSS do Base44)

Medido no DOM de produção: o botão primário usa
`rounded-[var(--mx-button-radius)]` e `gap-mx-xs`, com fundo `rgb(25, 134, 83)`
(o verde MX `#198653`); o campo de busca resolve `--mx-input-height` em 40px e
raio de 12px. São os tokens do design system MX, não estilos importados do
Base44.

## Fluxo de escrita exercitado em produção

Criar Plano Padrão percorrido pela tela até "Salvar rascunho": gravou
`pa_comercial_visittosaleconversion_060`, departamento `comercial`,
`primary_indicator_code` `visit_to_sale_rate` (FK resolvida) e 1 item. Registro
de teste removido em seguida.
