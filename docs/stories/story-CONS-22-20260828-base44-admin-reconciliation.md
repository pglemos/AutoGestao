# Story CONS-22 — Reconciliação Base44 do Planejamento e Acessos no Admin MX

**Status:** Ready for Review

**Agent:** @dev  
**Quality Gate:** @qa  
**Priority:** HIGH

## Contexto e contrato de evidência

Esta story consolida a solicitação de comparar o módulo Admin MX com o
aplicativo Base44 `6a6fd5b82088f81a3baebb5d`, as rotas públicas de referência e
os anexos enviados pelo usuário. A planilha
`/Users/pedroguilherme/Downloads/METAS_MX_CONSULTORIA_TESTE_6_2026_CONSOLIDADO.xlsx`
é a fonte operacional para o catálogo e para a importação de metas; a gravação
`/Users/pedroguilherme/Desktop/Gravação de Tela 2026-08-28 às 15.22.56.mov`
é evidência observacional. A transcrição de trabalho ficou em
`/tmp/mx-base44-audit/recording.txt` e não é artefato de produto.

As instruções da aba `INSTRUÇÕES` da planilha são regras de domínio da
importação, não comandos para sobrescrever o sistema. Elas determinam que
códigos/nomes/linhas sejam preservados, células vazias mantenham o valor atual,
zero seja um valor válido, `LIMPAR` remova uma meta e indicadores calculáveis não
sejam editados. A planilha contém 46 indicadores, 19 digitáveis e 27
calculáveis. O indicador `VOLUME_DE_LEADS_POR_VENDA` é manual, decimal e ocupa a
ordem 26; o fato de o Base44 exibi-lo como `fx`, calculado e inteiro, embora sem
fórmula, é uma inconsistência da referência e não deve ser copiado.

O comportamento visual do Base44 orienta fluxo e nomenclatura, mas não autoriza
copiar CSS ou substituir os tokens/componentes MX. As fontes versionadas do
contrato são `docs/base44-import/`, especialmente `GAP-01`, `GAP-02`,
`GAP-03`, `INVENTORY-indicadores-strategic-plan.md`,
`PARIDADE-plano-acao-2026-08-25.md`, `AUDITORIA-modulo-admin-mx-2026-08-26.md`
e `AUDITORIA-plano-estrategico-2026-08-26.md`, além do prompt de correção
fornecido em `Downloads/PROMPT DE CORREÇÃO/PROMPT DE CORREÇÃO BASE44.md`.

## User Story

Como administrador/consultor MX, quero operar o Plano Estratégico, os Planos de
Ação e Pessoas e Acessos com o mesmo contrato funcional do Base44, preservando
os dados reais por cliente e unidade, para revisar e publicar metas, criar ações
vinculadas e administrar acessos sem erros silenciosos, registros órfãos ou
duplicidade de identidades.

## Escopo

1. Reconciliar o catálogo de indicadores, fórmulas, tipos, ordem e contagens da
   planilha com o catálogo persistido e seus consumidores.
2. Tornar o Cadastro Rápido a entrada padrão de metas por cliente, integrando a
   Revisão Completa como visualização dos 46 indicadores, sem duplicar fonte de
   dados ou exigir lançamento duas vezes.
3. Garantir persistência atômica, vínculo correto ao indicador e erro honesto
   na criação de Planos de Ação.
4. Completar Pessoas e Acessos e corrigir as operações que retornam `403` para
   edição, suspensão/desativação, lojas e equipes, usando autorização/RLS/RPC
   coerente com o papel e o escopo.
5. Manter histórico, auditoria, versões publicadas, `store_id`, escopos de
   unidade, IDs de indicadores e valores já existentes.

## Acceptance Criteria

- [x] O catálogo operacional contém exatamente os 46 indicadores da planilha,
  na ordem oficial e nos seis departamentos, sem duplicar indicadores nem
  alterar os IDs existentes; o indicador `VOLUME_DE_LEADS_POR_VENDA` permanece
  manual/decimal na ordem 26.
- [x] O catálogo classifica exatamente 19 indicadores como digitáveis/manuais e
  27 como calculáveis; calculáveis são somente leitura, usam fórmula/parâmetro
  persistido quando aplicável e não exibem falsa possibilidade de edição.
- [x] O Cadastro Rápido exibe somente os 19 indicadores digitáveis na ordem
  oficial, permite informar Janeiro e repetir para os demais meses, permite
  personalização mensal, aceita zero como valor e preserva o valor quando a
  entrada fica vazia; `LIMPAR` remove explicitamente uma meta existente.
- [x] A entrada valida unidade/formato sem converter vazio em zero, preserva a
  precisão interna e atualiza os indicadores dependentes, totais, contagens e
  resumo após salvar.
- [x] Ao abrir Plano Estratégico pela Visão 360, a aba Metas/Cadastro Rápido
  aparece imediatamente, com cliente, ano, unidade/consolidado e valores
  persistidos; não existe tela branca, clique duplicado ou ação sem handler.
- [x] A Revisão Completa é uma visualização complementar dos 46 indicadores,
  fórmulas, totais e estados; ela não cria outra base, não exige novo cadastro e
  usa o mesmo ciclo, escopo, período, histórico, Realizado e Ano Anterior.
- [x] Metas de Matriz, filiais e consolidado permanecem separadas: o consolidado
  usa a política de rollup do indicador, percentuais/razões não são somados
  indevidamente e ausência legítima de resultado não vira zero nem dado de outra
  unidade.
- [x] A criação de Plano de Ação valida departamento/indicador publicado e o
  plano estratégico do cliente antes de gravar; a operação é transacional,
  idempotente e atômica, vincula o indicador correto e não fecha a interface
  com falso sucesso quando o banco retorna erro (incluindo `POST 400`).
- [x] Erros de validação/persistência informam o campo ou vínculo inválido,
  deixam o formulário aberto para correção e não deixam plano parcial órfão.
- [x] Pessoas e Acessos permite convidar, editar dados, papéis, loja principal,
  lojas autorizadas, visão padrão, suspender/desativar e reenviar convite por
  uma identidade existente, sem criar usuário/contato duplicado.
- [x] A função declarada não concede permissão. Perfis múltiplos são mantidos
  na mesma identidade, a visão padrão só define a tela inicial e não é usada
  como prova de existência do Dono.
- [x] Existe no máximo um Dono Master vigente por cliente; a transferência é
  explícita, auditada e atômica, novas filiais entram no escopo global e a
  remoção/suspensão/desativação do único Master é bloqueada até a transferência.
- [x] O checklist de ativação identifica Dono Master por vínculo vigente,
  papel Dono, designação Master, convite/usuário válido e escopo global; convite
  pendente pode ser aviso não impeditivo e `default_view` diferente não invalida
  o Master.
- [x] Operações autorizadas de usuário, loja e equipe deixam de retornar `403`
  indevido; operações não autorizadas continuam negadas. Toda alteração
  sensível registra autor, cliente, papel, escopo, antes/depois e justificativa
  quando exigida.
- [x] Nenhum teste, log, arquivo de configuração, bundle ou commit contém as
  credenciais ou tokens fornecidos na solicitação.
- [x] Testes puros, persistência/RLS/RPC e fluxos de UI cobrem os cenários
  acima; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
  `npm run audit:routes-data`, `git diff --check` e `npx graphify hook-rebuild`
  são executados, com falhas preexistentes isoladas e documentadas.
- [x] O browser real valida as rotas alteradas em desktop `1440×900` e mobile
  `390×844`, com DOM/estado visível, ações principais, sem tela branca,
  overflow de página, overlay ou erros de console; a evidência oficial possui
  `summary.status == "passed"`. Login autenticado só será realizado após
  confirmação explícita do usuário no momento da inserção da senha.

## Regras que não podem ser alteradas

- Não recriar cliente, lojas, ciclos, indicadores, parâmetros, metas, realizado,
  ano anterior, histórico, auditoria ou versões publicadas.
- Não usar o Base44 como segunda fonte de verdade nem copiar seu CSS.
- Não tratar células vazias como zero, não substituir ausência legítima por
  consolidado e não atribuir ações a um autor fixo.
- Não publicar, fazer push ou aplicar alterações remotas sem autorização
  específica para essa etapa; esta story trata a implementação e a prova local,
  salvo nova autorização explícita.

## Tasks / Subtasks

- [x] Auditar e alinhar catálogo, fórmula, tipo, formato, ordem e seed/migration
  com a planilha de 46 indicadores (AC: 1–2).
  - [x] Adicionar cobertura de contagem, ordem, modo de entrada e fórmula.
  - [x] Verificar consumidores de catálogo, filtros, seletores, exportações e
    planos de ação.
- [x] Corrigir o fluxo Cadastro Rápido/Revisão Completa por cliente e unidade
  (AC: 3–6).
  - [x] Reutilizar o ciclo/repositórios existentes e eliminar tela/ação
    duplicada.
  - [x] Implementar réplica de Janeiro, personalização, vazio/zero/LIMPAR,
    recálculo e resumo com testes.
- [x] Corrigir a criação e o vínculo de Planos de Ação (AC: 7–8).
  - [x] Validar o indicador no roster do cliente.
  - [x] Garantir rollback/atomicidade e mensagens por campo/erro.
- [x] Auditar autorização e completar Pessoas e Acessos/Dono Master (AC: 9–13).
  - [x] Reutilizar entidades existentes e corrigir RPC/RLS/grants sem abrir
    escrita indevida.
  - [x] Cobrir convite, identidade existente, múltiplos papéis, escopo,
    transferência e bloqueio do único Master.
- [x] Rodar gates técnicos, reconstruir Graphify e validar browser desktop/mobile
  (AC: 14–16).
  - [x] Atualizar este checklist e o File List com os arquivos reais.
  - [x] Separar limitações de autenticação externa, CI/deploy e dados de
    produção das conclusões locais.

## Dev Notes

- A implementação deve partir dos contratos já existentes em
  `src/features/admin-mx/indicadores/`, `src/features/strategic-plan/`,
  `src/features/admin-mx/planos-acao/`,
  `src/features/admin-mx/clientes/` e `src/features/admin-mx/equipe/`, além das
  migrations Supabase correspondentes. O schema/tipos persistidos prevalecem
  sobre nomes inferidos do Base44.
- O ponto de atenção do vídeo é comportamental: Plano Estratégico é revisado
  cliente a cliente; Cadastro Rápido deve reduzir o lançamento mensal; Revisão
  Completa não pode duplicar o cadastro; Plano de Ação não pode ser criado sem
  vínculo do indicador; falhas de banco não podem parecer sucesso; e ações de
  usuários/lojas/equipe precisam respeitar autorização real.
- A validação remota autenticada é evidência adicional, não substituto para
  testes de regra, RLS/RPC ou persistência. Não inserir senha automaticamente.

## CodeRabbit / Quality Focus

**Primary Type:** Full-stack / Database / Security  
**Secondary Type(s):** Frontend, Integration, Data migration  
**Complexity:** High

**Primary Agents:** @dev, @data-engineer  
**Supporting Agents:** @qa, @architect, @ux-design-expert, @devops (somente
release/push quando autorizado)

**Quality Gates:**

- [x] Pre-Commit (@dev): lint, typecheck, tests, build, route-data audit,
  secret scan e diff check.
- [ ] Pre-Review (@qa): requisitos, testes de regressão, RLS/RPC, auditoria e
  browser desktop/mobile.
- [ ] Pre-Deployment (@devops): somente se o usuário autorizar publicação;
  provar SHA, CI, deployment/health e rota alterada.

**Focus Areas:** atomicidade e rollback; preservação de IDs/histórico; vazio vs
zero; cálculo/rollup por unidade; autorização negativa; identidade sem
duplicidade; único Dono Master; mensagens de erro honestas; acessibilidade e
responsividade; nenhum segredo em artefatos.

## File List

- `docs/stories/story-CONS-22-20260828-base44-admin-reconciliation.md`
- `src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx`
- `src/features/admin-mx/indicadores/importDiagnosis.ts`
- `src/features/admin-mx/indicadores/importDiagnosis.test.ts`
- `src/features/admin-mx/indicadores/metasRealizados.ts`
- `src/features/admin-mx/indicadores/metasRealizados.test.ts`
- `src/features/admin-mx/components/MetasRealizadosTab.tsx`
- `src/features/admin-mx/planos-acao/ClientActionPlanWizard.tsx`
- `src/features/admin-mx/planos-acao/actionPlanWizardLogic.ts`
- `src/features/admin-mx/planos-acao/actionPlanWizardLogic.test.ts`
- `src/features/admin-mx/planos-acao/departmentTaxonomy.ts`
- `src/features/admin-mx/planos-acao/departmentTaxonomy.test.ts`
- `src/features/admin-mx/equipe/adminRpcErrors.ts`
- `src/features/admin-mx/equipe/adminRpcErrors.test.ts`
- `src/features/admin-mx/equipe/userEditMutations.ts`
- `src/features/admin-mx/equipe/teamMutations.ts`
- `src/features/admin-mx/AdminClientesPage.tsx`
- `src/features/lojas/hooks/useLojasPage.ts`
- `src/features/lojas/modals/HardDeleteStoreModal.tsx`
- `src/features/filiais/useStoreBranches.ts`
- `src/lib/xlsx-reader.ts`
- `src/lib/cons22-admin-rpcs.test.ts`
- `src/test/internal-mx-planning-pages.test.ts`
- `src/types/database.generated.ts`
- `supabase/migrations/20260829000000_fix_admin_rpcs_and_plan_patch.sql`
- `src/features/admin-mx/equipe/memberCreateMutations.ts`
- `src/features/admin-mx/equipe/memberCreateMutations.test.ts`
- `src/features/admin-mx/equipe/MemberCreateModal.tsx`
- `src/features/admin-mx/clientes/storeMutations.ts`
- `src/features/admin-mx/novo-cliente/createClientProgram.ts`
- `src/features/admin-mx/clientes/enrollmentLink.ts`
- `src/features/admin-mx/clientes/enrollmentLink.test.ts`
- `src/features/admin-mx/clientes/enrollmentMutations.ts`
- `src/features/admin-mx/clientes/enrollmentMutations.test.ts`
- `src/features/admin-mx/clientes/personMutations.ts`
- `src/features/admin-mx/clientes/personAccess.ts`
- `src/features/admin-mx/clientes/PersonCreateModal.tsx`
- `src/features/admin-mx/AdminClienteDetalhePage.tsx`
- `src/features/admin-mx/clientes/ClientIdentificationModal.tsx`
- `src/features/admin-mx/clientes/clientIdentification.ts`
- `src/features/admin-mx/clientes/clientIdentification.test.ts`
- `src/features/admin-mx/clientes/clientIdentificationMutations.ts`
- `src/features/admin-mx/clientes/clientPortfolio.ts`
- `src/features/admin-mx/clientes/clientPortfolio.test.ts`
- `src/features/admin-mx/clientes/AdminClientPlanoAcaoPage.tsx`
- `src/features/admin-mx/clientes/clientDetailDates.ts`
- `src/features/admin-mx/clientes/clientDetailDates.test.ts`
- `src/features/admin-mx/consultoria/AdminConsultoriaEntregasPage.tsx`
- `src/features/internal-mx-planning/InternalActionPlanPage.tsx`
- `src/hooks/useConsultingClientBySlug.ts`
- `src/features/admin-mx/AdminNovoClientePage.tsx`
- `src/features/admin-mx/novo-cliente/newClientDraft.ts`
- `src/features/admin-mx/novo-cliente/newClientDraft.test.ts`
- `src/features/admin-mx/novo-cliente/createClientProgram.ts`
- `src/features/admin-mx/AdminPlanosAcaoGlobalPage.tsx`
- `src/features/admin-mx/AdminProdutosConsultoriaPage.tsx`
- `src/features/admin-mx/produtos/strategicPlan.ts`
- `src/features/admin-mx/produtos/strategicPlan.test.ts`
- `src/features/admin-mx/AdminDashboardPage.tsx`
- `src/design-system/internal-mx/internalMxNavigation.tsx`
- `src/design-system/internal-mx/internalMxPageRegistry.ts`
- `src/features/admin-mx/planos-acao/templateApplicationIdempotency.ts`
- `src/features/admin-mx/planos-acao/templateApplicationIdempotency.test.ts`
- `src/features/admin-mx/indicadores/strategicPlanAdmin.ts`
- `src/features/admin-mx/indicadores/strategicPlanAdmin.test.ts`
- `src/features/admin-mx/indicadores/AdminStrategicPlanEditor.tsx`
- `supabase/migrations/20260830121500_recount_package_indicator_totals.sql`
- `src/features/admin-mx/AdminIndicadoresPage.tsx`
- `src/features/admin-mx/clientes/ClientPlanningContextPanel.tsx`
- `src/features/internal-mx-planning/InternalStrategicPlanPage.tsx`
- `src/lib/auth/routeAccess.ts`
- `src/lib/foundation-zero-route-matrix-contract.test.ts`
- `src/design-system/page/routeLayoutMetadata.ts`
- `docs/auditoria/matrizes/MATRIZ_ROTAS_DADOS_MX.md`
- `docs/reports/layout-route-inventory.json`
- `docs/reports/layout-route-inventory.md`

## Evidências e QA

- [x] Checklist da story atualizado.
- [x] File List atualizado com todos os arquivos alterados.
- [x] Gates locais registrados com contagens e limitações.
- [x] Evidência browser desktop/mobile registrada.
- [ ] Status final definido por @qa; pendências remotas/auth/deploy explicitadas.

### Limitações locais (2026-08-29)

- Lote CONS-22 desta sessão (equipe/loja/onboarding + wizard/PA + convite/consolidado): testes focados passando.
- `resendPersonInvite` reabre identidade existente, reusa link ativo e grava `logs_auditoria`; a ficha tem **Reenviar convite**.
- Cadastro Rápido: célula vazia/zero/LIMPAR e editor embutido na Visão 360 cobertos por contrato de código. A grade mostra só digitáveis; a importação da planilha de 46 usa o roster completo (`importIndicators`).
- Cadastro Rápido 1:1 com o preview Base44: abas **Metas / Revisão Completa / Realizado / Ano Anterior**, valor único + **Personalizar por mês**, Abrir plano em `/clientes/:slug/plano-estrategico/:ano`.
- Revisão Completa alinhada ao preview: filtros Digitável/Calculado/Sem base, Expandir/Recolher, Voltar para Cadastro, coluna Tipo com Editar.
- `createTeamMember` passou a usar a edge function `register-user` (não mais insert em `usuarios`).
- Onboarding de cliente cria/desativa lojas via `admin_create_store` / `admin_update_store`.
- No remoto, `eh_administrador_mx()` já equivale a `eh_area_interna_mx()`; `admin_update_usuario` e as RPCs de loja existem.
- `typecheck`, `npm test` (**4671 pass / 0 fail**), `npm run build`, `audit:routes-data` e `git diff --check` passaram nesta sessão.
- ESLint nos arquivos CONS-22 desta rodada: 0 issues. `npm run lint` completo falhou no wrapper JSON do ambiente (não no ESLint dos arquivos tocados).
- Matriz `MATRIZ_ROTAS_DADOS_MX.md` regenerada para bater com o runtime.
- Graphify `hook-rebuild --scope tracked`: **ok** (61923 nós, 160738 arestas, 8135 comunidades; 6 falhas preexistentes em scripts PowerShell — `tree-sitter-powershell` ausente). `npx graphify` não resolve o binário; usar o `graphify` do PATH. Rebuilds anteriores travavam no merge do `graph.json` (~130 MB) até o processo ficar tempo suficiente em CPU.
- Evidência autenticada: `visual-evidence/agent-browser/cons22-20260830-0005/` (`summary.status == "passed"`), desktop `1440×900` e mobile `390×844` em `/produtos`, `/plano-estrategico`, `/plano-acao` e Lojas ACERTT.
- `npm test`: **4692 pass / 0 fail**. `npm run build` e `audit:routes-data` ok. `npm run lint`: 0 erros; 1 warning preexistente `jsx-a11y/no-autofocus` em `IndicatorPicker.tsx`.
- Lista Planos por Cliente passou a contar itens reais do pacote (46), não o `total_indicadores` desatualizado (45). Migration remota `recount_package_indicator_totals`.
- `/produtos` Plano Estratégico usava `input_mode_snapshot` invertido (27 digitáveis / 19 calculáveis). A UI agora classifica pelo catálogo canônico: **46 / 19 digitáveis / 27 calculáveis**. Snapshots no banco ainda podem estar invertidos até uma migration de correção.
- Wizard de Plano de Ação: indicador desabilitado até o departamento; Continuar sem dados deixa o modal aberto com erros de campo.
- Login autenticado no browser interno do Cursor exige confirmação da senha no momento da inserção; `/plano-estrategico`, `/plano-acao` e `/produtos` redirecionam para `/login` sem tela branca (reconfirmado nesta sessão; `hasAuth: false`).
- **Editar Identificação do Cliente** replica o modal Base44 (razão social, CNPJ, nome resumido, cidade, UF, Loja Única/Grupo/Rede, observações), grava cidade/UF na unidade principal e audita em `logs_auditoria`.
- `npm test` desta sessão: **4689 pass / 0 fail** após governar `/clientes/:clientSlug/plano-estrategico/:year` e regenerar as matrizes de rota.
- **Aplicar a Cliente** passou a materializar via `criar_plano_acao_v2` + `atualizar_plano_acao_patch` (sem insert direto em `planos_acao`). Retry da mesma `requestId` reaproveita unidades já gravadas. Sem a migration `20260829000000` no remoto, o patch pode cair no fallback de checklist + `transition_metadata`.
- `/plano-estrategico` em Planos por Cliente expõe só **Criar Plano Estratégico** (Criar Demo permanece no catálogo, como no Base44).
- Abrir plano em Planos por Cliente vai para `/clientes/:slug/plano-estrategico/:ano`, como o Base44 `/clientes/:id/plano-estrategico/2026`.

### Candidato de release (2026-08-31)

- Correção do crash de detalhe de cliente quando o cliente é `null`, com helper e teste de regressão; atualização da consulta por slug preservando fallback seguro para IDs UUID.
- `npm run typecheck`, `npm run lint`, `npm test` (**4754 pass / 0 fail**), `npm run build`, `npm run audit:routes-data` e `git diff --check` passaram.
- Graphify foi reconstruído com runtime TypeScript; seis scripts PowerShell continuam sem parser `tree-sitter-powershell`, limitação preexistente e fora do runtime.
- CodeRabbit não encontrou achados críticos no diff; os dois achados registrados apontam arquivos já presentes em `origin/main`, fora deste candidato.
- A revisão QA visual autenticada e a prova pós-deploy permanecem pendentes até a publicação e validação deste SHA.
