# Story CONS-22 — Reconciliação Base44 do Planejamento e Acessos no Admin MX

**Status:** InProgress  
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

- [ ] O catálogo operacional contém exatamente os 46 indicadores da planilha,
  na ordem oficial e nos seis departamentos, sem duplicar indicadores nem
  alterar os IDs existentes; o indicador `VOLUME_DE_LEADS_POR_VENDA` permanece
  manual/decimal na ordem 26.
- [ ] O catálogo classifica exatamente 19 indicadores como digitáveis/manuais e
  27 como calculáveis; calculáveis são somente leitura, usam fórmula/parâmetro
  persistido quando aplicável e não exibem falsa possibilidade de edição.
- [ ] O Cadastro Rápido exibe somente os 19 indicadores digitáveis na ordem
  oficial, permite informar Janeiro e repetir para os demais meses, permite
  personalização mensal, aceita zero como valor e preserva o valor quando a
  entrada fica vazia; `LIMPAR` remove explicitamente uma meta existente.
- [ ] A entrada valida unidade/formato sem converter vazio em zero, preserva a
  precisão interna e atualiza os indicadores dependentes, totais, contagens e
  resumo após salvar.
- [ ] Ao abrir Plano Estratégico pela Visão 360, a aba Metas/Cadastro Rápido
  aparece imediatamente, com cliente, ano, unidade/consolidado e valores
  persistidos; não existe tela branca, clique duplicado ou ação sem handler.
- [ ] A Revisão Completa é uma visualização complementar dos 46 indicadores,
  fórmulas, totais e estados; ela não cria outra base, não exige novo cadastro e
  usa o mesmo ciclo, escopo, período, histórico, Realizado e Ano Anterior.
- [ ] Metas de Matriz, filiais e consolidado permanecem separadas: o consolidado
  usa a política de rollup do indicador, percentuais/razões não são somados
  indevidamente e ausência legítima de resultado não vira zero nem dado de outra
  unidade.
- [ ] A criação de Plano de Ação valida departamento/indicador publicado e o
  plano estratégico do cliente antes de gravar; a operação é transacional,
  idempotente e atômica, vincula o indicador correto e não fecha a interface
  com falso sucesso quando o banco retorna erro (incluindo `POST 400`).
- [ ] Erros de validação/persistência informam o campo ou vínculo inválido,
  deixam o formulário aberto para correção e não deixam plano parcial órfão.
- [ ] Pessoas e Acessos permite convidar, editar dados, papéis, loja principal,
  lojas autorizadas, visão padrão, suspender/desativar e reenviar convite por
  uma identidade existente, sem criar usuário/contato duplicado.
- [ ] A função declarada não concede permissão. Perfis múltiplos são mantidos
  na mesma identidade, a visão padrão só define a tela inicial e não é usada
  como prova de existência do Dono.
- [ ] Existe no máximo um Dono Master vigente por cliente; a transferência é
  explícita, auditada e atômica, novas filiais entram no escopo global e a
  remoção/suspensão/desativação do único Master é bloqueada até a transferência.
- [ ] O checklist de ativação identifica Dono Master por vínculo vigente,
  papel Dono, designação Master, convite/usuário válido e escopo global; convite
  pendente pode ser aviso não impeditivo e `default_view` diferente não invalida
  o Master.
- [ ] Operações autorizadas de usuário, loja e equipe deixam de retornar `403`
  indevido; operações não autorizadas continuam negadas. Toda alteração
  sensível registra autor, cliente, papel, escopo, antes/depois e justificativa
  quando exigida.
- [ ] Nenhum teste, log, arquivo de configuração, bundle ou commit contém as
  credenciais ou tokens fornecidos na solicitação.
- [ ] Testes puros, persistência/RLS/RPC e fluxos de UI cobrem os cenários
  acima; `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`,
  `npm run audit:routes-data`, `git diff --check` e `npx graphify hook-rebuild`
  são executados, com falhas preexistentes isoladas e documentadas.
- [ ] O browser real valida as rotas alteradas em desktop `1440×900` e mobile
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

- [ ] Auditar e alinhar catálogo, fórmula, tipo, formato, ordem e seed/migration
  com a planilha de 46 indicadores (AC: 1–2).
  - [ ] Adicionar cobertura de contagem, ordem, modo de entrada e fórmula.
  - [ ] Verificar consumidores de catálogo, filtros, seletores, exportações e
    planos de ação.
- [ ] Corrigir o fluxo Cadastro Rápido/Revisão Completa por cliente e unidade
  (AC: 3–6).
  - [ ] Reutilizar o ciclo/repositórios existentes e eliminar tela/ação
    duplicada.
  - [ ] Implementar réplica de Janeiro, personalização, vazio/zero/LIMPAR,
    recálculo e resumo com testes.
- [ ] Corrigir a criação e o vínculo de Planos de Ação (AC: 7–8).
  - [ ] Validar o indicador no roster do cliente.
  - [ ] Garantir rollback/atomicidade e mensagens por campo/erro.
- [ ] Auditar autorização e completar Pessoas e Acessos/Dono Master (AC: 9–13).
  - [ ] Reutilizar entidades existentes e corrigir RPC/RLS/grants sem abrir
    escrita indevida.
  - [ ] Cobrir convite, identidade existente, múltiplos papéis, escopo,
    transferência e bloqueio do único Master.
- [ ] Rodar gates técnicos, reconstruir Graphify e validar browser desktop/mobile
  (AC: 14–16).
  - [ ] Atualizar este checklist e o File List com os arquivos reais.
  - [ ] Separar limitações de autenticação externa, CI/deploy e dados de
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

- [ ] Pre-Commit (@dev): lint, typecheck, tests, build, route-data audit,
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

## Evidências e QA

- [ ] Checklist da story atualizado.
- [ ] File List atualizado com todos os arquivos alterados.
- [ ] Gates locais registrados com contagens e limitações.
- [ ] Evidência browser desktop/mobile registrada.
- [ ] Status final definido por @qa; pendências remotas/auth/deploy explicitadas.
