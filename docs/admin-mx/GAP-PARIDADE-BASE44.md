# Gap de paridade com o Base44 — módulo Administrador

Levantamento honesto do que existe no export `mx-admin-flow` e do que o MX tem hoje, por rota. Base: inventário de telas, ações e entidades extraído do próprio código do Base44.

⚠️ **Aviso sobre este documento (2026-08-21):** as % de cobertura abaixo e os itens marcados "feito" foram levantados por presença de arquivo/tela (paridade estrutural), não por teste de ponta a ponta. Uma auditoria ao vivo em 2026-08-21 achou 5 gaps reais e severos escondidos atrás de itens já marcados "feito" — três deles em rotas com cobertura estimada em 85–95%. Ver **[Auditoria ao vivo (2026-08-21)](#auditoria-ao-vivo-2026-08-21--o-que-a--de-cobertura-escondia)** antes de confiar em qualquer "feito" deste arquivo. Método: grep por tabela/coluna sem escritor ou sem leitor + clicar de verdade em produção, não só ler o código.

## Tamanho do gap

| Rota | Base44 (arquivos / linhas) | MX hoje | Cobertura estimada |
|---|---|---|---|
| `/clientes` | 23 / 5.571 | lista + wizard + Visão 360 + ativação + **lojas/horários + pessoas/Dono Master/autocadastro + configurações + programa + onboarding** | ~95% |
| `/equipe` | 8 / 1.311 | lista + editar + carteira + perfil do consultor + **edição em abas + delegações + papel principal** | ~95% |
| `/produtos` | 4 / 691 | ciclo de vida + módulos + tempos + **Plano Estratégico (pacote de indicadores)** | ~100% |
| `/indicadores` | 34 / 6.630 | catálogo com ciclo + ordem + drawer + parâmetros + **wizard completo + fórmulas + overrides + metas/realizados** | ~85% |
| `/planos-acao` | 21 / 3.941 | rede + templates + sugestões + kanban + detalhe + **wizard por cliente + promoção a template + filtros + aplicações** | ~90% |
| `/consultoria-mx` | 19 / 2.742 | **5 abas completas (metodologia, editor 8 abas, biblioteca, relatórios, histórico)** | ~85% |
| **Total** | **109 / 20.886** | port completo das 6 rotas | **~90%** |

## O que falta, por rota

### `/clientes`
- ~~Visão 360 com abas (lojas, pessoas, jornada, progresso, informações gerais)~~ — **feito**.
- ~~Ativação com checklist separando impeditivo de informativo~~ — **feito** (falta o reparo de matriz).
- ~~**Gestão de lojas do cliente**: criar/editar loja, horário de funcionamento com padrão MX.~~ — **feito** (migration 20260815210000; StoreFormModal, StoreOperatingHoursEditor).
- ~~**Pessoas e acessos**: criar usuário com papéis, lojas autorizadas, Dono Master; link de autocadastro com validade e limite de usos.~~ — **feito** (DonoMasterCard, PersonCreateModal, EnrollmentLinkModal; tabelas `acessos_cliente_consultoria` e `links_autocadastro_cliente`).
- ~~**Configuração por cliente**: tolerância de fechamento, limite de vendedores, retenção, canais de notificação.~~ — **feito** (aba Configurações; tabela `configuracoes_cliente_consultoria`).
- ~~**Programa contratado**: produto, versão, modalidade, jornada vinculada, consultor responsável.~~ — **feito** (ProgramCard na aba Programa e jornada).
- ~~**Onboarding por etapas** com continuidade ("Continuar onboarding").~~ — **feito** (`onboarding_step`/`onboarding_completed`; wizard carrega `?continue=<id>`).

### `/equipe`
- ~~Perfil do consultor: programas habilitados, especialidades por encontro, clientes ativos, capacidade, situação~~ — **feito** (migration 20260815190000).
- ~~Edição de usuário em abas: dados pessoais, papéis e visões, lojas e equipes, acesso e situação~~ — **feito** (UserEditModal, 4 abas; migration 20260815220000).
- ~~Delegações gerenciais com motivo e vigência~~ — **feito** (`delegacoes_gerenciais`, aba Acesso e Situação; autorizador, status e "Acessar Visão Gerencial" quando ativa).
- ~~Papel principal e visão padrão ao entrar~~ — **feito** (`user_roles.is_primary` + `usuarios.default_view`).
- ~~Adicionar Membro (criar MxConsultant/UserProfile)~~ — **feito** (MemberCreateModal grava `usuarios` + `perfil_consultor_mx` + loja principal).

### `/produtos`
- ~~Ciclo de vida, aba Módulos, aba Tempos e Capacidade, métricas~~ — **feito** (migration 20260815180000).
- ~~Aba Plano Estratégico (pacote de indicadores vinculado, digitáveis vs calculáveis, competências meta)~~ — **feito** (migration 20260815210000 `pacotes_indicadores_estrategicos` + `_versoes` + `_itens`; aba no drawer de produto).

### `/indicadores`
- ~~Ordem oficial editável e filtros por área/status~~ — **feito** (restaurar padrão MX incluso).
- ~~Drawer de detalhe com ciclo de status e visibilidade no Módulo Dono~~ — **feito**.
- ~~Leitura de parâmetros com faixas vermelho/amarelo/verde~~ — **feito** (só leitura + checagem de consistência).
- ~~**Wizard de criação** com casas decimais, frequência e vigência editáveis na tela (as colunas já existem no banco)~~ — **feito** (CreateIndicatorWizard de 7 passos: identificação, formato, meta, fórmula, fonte do realizado, visualização, revisão; chave gerada do nome e congelada após a primeira gravação).
- ~~**Fórmulas**: criar parâmetro, testar cálculo, dependentes, override por cliente com justificativa~~ — **feito** (FormulaTesterModal, edição/criação de parâmetro no conjunto ativo, mapa de dependentes IND/PAR, override por cliente com justificativa via `overrides_parametros_cliente` — migration 20260815220000).
- ~~**Metas e realizados**: cadastro rápido, importação/exportação de planilha, histórico com reversão, valor oficial, cópia de metas entre lojas~~ — **feito** (aba Metas e Realizados: grade mensal por loja via RPC oficial, exportação/importação .xlsx, histórico com restauração, cópia entre lojas com prévia e política de conflito).

### `/planos-acao`
- ~~Kanban por status~~ — **feito** (sem arrastar: transição por botão no detalhe).
- ~~Drawer de detalhe com abas resumo/execução/evidências/histórico, alterar prazo com motivo, concluir com data efetiva~~ — **feito**.
- ~~Wizard de plano por cliente com ações ponderadas, participantes, indicador de eficácia~~ — **feito** (ClientActionPlanWizard, 4 passos; opção de criar também template em rascunho).
- ~~Templates: wizard completo, filtros, detalhe com versões, promover plano existente a padrão, desabilitar/reativar/arquivar~~ — **feito** (filtros avançados + PromoteToTemplateModal; publish/apply já existiam).
- ~~Sugestões ao dono: validar, publicar, descartar, visualizar como dono~~ — **feito** (SuggestionsTab com ciclo de vida + preview como Dono; NewActionChoiceModal, StrategicIndicatorActionSelector e SuggestToClientModal).
- ~~Aplicações nos clientes: acompanhamento por cliente com progresso e eficácia~~ — **feito** (ApplicationsTab com progresso ponderado pelo checklist e eficácia por score).

### `/consultoria-mx`
- ~~**Metodologia por produto**: versão estrutural vs metodológica, publicar, comparar versões, completude~~ — **feito**.
- ~~**Editor de encontro** com abas: objetivo, conteúdo (vídeo/aula), entrega, evidências, arquivos, relatório, planos de ação, guia do consultor~~ — **feito**.
- ~~**Biblioteca de materiais**: upload, tipos, visibilidade, utilizações, arquivar~~ — **feito**.
- ~~**Modelos de relatório**: seções, publicar, duplicar, arquivar~~ — **feito**.
- ~~**Prévia do Módulo Dono** e histórico de alterações~~ — **feito**.

## Tabelas que faltam no Supabase

Sem elas, parte do gap não fecha: qualificação de consultor por produto e por encontro, reserva de capacidade, referência de capacidade por produto, versões de metodologia, conteúdo/entrega/evidência/relatório por encontro, pacotes de indicadores versionados, parâmetros estratégicos e overrides por cliente, lotes de importação de metas, sugestões ao dono.

## Ordem de execução

1. ~~`/produtos` — ciclo de vida + abas Módulos e Tempos~~ — feito.
2. ~~`/equipe` — perfil do consultor com programas, encontros e capacidade~~ — feito.
3. ~~`/clientes` — Visão 360 e ativação com checklist~~ — feito.
4. ~~`/planos-acao` — kanban e detalhe em abas~~ — feito.
5. ~~`/planos-acao` — wizard por cliente, templates, sugestões ao dono e aplicações~~ — feito (branch route/admin-planos-acao).
6. ~~`/indicadores` — ordem, drawer, parâmetros~~ — feito.
7. ~~`/indicadores` — wizard completo, fórmulas e importação de metas~~ — feito (branch route/admin-indicadores).
8. ~~`/consultoria-mx` — metodologia por produto e editor de encontro~~ — feito (branch route/admin-consultoria-mx).

## Auditoria ao vivo (2026-08-21) — o que a % de cobertura escondia

Depois do hardening de concorrência em `/planos-acao`, auditamos as 6 rotas de novo — desta vez sem confiar em "o arquivo existe": para cada tabela nova, grep pra achar quem escreve e quem lê; pra cada tela, clicar de verdade em produção com uma conta real. O padrão que se repetiu 4 vezes: uma feature com tela, tipo e teste unitário, mas com um elo faltando no meio — uma coluna que nada grava, uma tabela que nada lê, ou uma coluna que nunca existiu.

| Rota | Cobertura estimada (arquivo) | Gap real achado | Severidade |
|---|---|---|---|
| `/planos-acao` | ~90% | Concorrência/idempotência em RPCs críticas (retry/clique duplo corrompia estado) | Alta — dado incorreto silencioso |
| `/indicadores` | ~85% | `realizado` nunca foi gravável em lugar nenhum do sistema — só dava pra definir meta | Crítica — metade da feature "Metas e Realizados" nunca funcionou |
| `/consultoria-mx` | ~85% | "Vincular Aula da Universidade MX" sempre vazio — consultava tabela morta (`universidade_aulas`, 0 linhas) em vez de `treinamentos` (14 ativas) | Alta — feature 100% não funcional |
| `/clientes` | ~95% | 60 de 63 clientes sem loja cadastrada na Ficha 360 (trigger de backfill nunca rodou pros existentes) + botão "Adicionar loja" quebrado pra **todo mundo** (coluna `created_by` nunca existiu) | Crítica — feature de cadastro travada desde que foi escrita |
| `/equipe` | ~95% | Nenhum — auditado ao vivo (UserEditModal 4 abas, ConsultantProfileModal, capacidade h/mês), tudo funcional | — |
| `/produtos` | ~100% | Nenhum — auditado ao vivo (Resumo, Módulos, Tempos e Capacidade, Plano Estratégico), tudo funcional | — |

**Os 4 fixes, em produção:**

1. [`26535302`](https://github.com/pglemos/MXGESTAOPREDITIVA/commit/26535302) — `fix(admin-mx,strategic-plan): harden action plan and strategic plan cycle atomicity`. 8 migrations movendo mutações multi-tabela pra RPCs `SECURITY DEFINER` atômicas (conversão sugestão→plano, reconciliação, guard de conclusão, ciclo do plano, template lifecycle, checklist toggle).
2. [`20777320`](https://github.com/pglemos/MXGESTAOPREDITIVA/commit/20777320) — `feat(indicadores): registrar realizado do plano estratégico`. RPC nova `salvar_realizado_indicador_planejamento` (espelha a de meta, sem o bloqueio de "publicado é imutável" — realizado precisa entrar contra meta já fechada); corrige `restaurar_metas_indicador_planejamento` pra restaurar pelo campo certo (senão restauraria realizado na meta).
3. [`78529a94`](https://github.com/pglemos/MXGESTAOPREDITIVA/commit/78529a94) — `fix(consultoria-mx): vincular aula da Universidade MX à tabela certa`. Troca a fonte de `universidade_aulas` pra `treinamentos` + migra a FK de `conteudo_referencia_encontro.learning_content_id`. Mesmo defeito já corrigido uma vez do lado do vendedor (`a9ba19ee`), nunca replicado aqui.
4. [`39be7fe0`](https://github.com/pglemos/MXGESTAOPREDITIVA/commit/39be7fe0) — `fix(clientes): destravar cadastro de lojas e fechar o backfill que faltou`. Adiciona `created_by` em `unidades_cliente_consultoria` (existia no código desde que foi escrito, nunca no banco) + backfill único pros 49 clientes que tinham `primary_store_id` mas nenhuma unidade.

Todos: typecheck limpo, testes verdes, build ok, CI completo, verificado clicando em produção antes de fechar (dado de teste sempre limpo depois).

**Lição pra próxima auditoria:** "tem tela + tem tipo + tem teste unitário" não prova que a feature funciona — os testes unitários testavam a lógica pura (formatação, validação, cálculo), nunca o caminho de I/O real contra o schema do banco. Rodar `grep` por tabela sem `.insert(`/`.update(`/`.upsert(` e clicar em cada botão real em produção pega o que typecheck e suíte verde não pegam.

## Fatia — `/produtos` aba Plano Estratégico (2026-08-15)

**Migration `20260815210000_strategic_indicator_packages.sql`** (aplicada e registrada em `supabase_migrations`): três tabelas novas com RLS restrita à área interna MX (`eh_area_interna_mx()`), `REVOKE ALL FROM PUBLIC` e grants só para `authenticated`:

| Tabela | Papel |
|---|---|
| `pacotes_indicadores_estrategicos` | identidade estável do pacote (chave, nome, status, versão publicada atual) |
| `pacotes_indicadores_versoes` | versão rascunho/publicada/substituída/arquivada; índice único parcial garante **uma** publicada por pacote |
| `pacotes_indicadores_itens` | indicadores da versão com snapshot de ordem, área, modo de entrada (manual/calculado), formato e origem |

Além disso, `programas_visita_consultoria` ganhou `indicator_package_version_id` (FK para a versão publicada, ON DELETE SET NULL) — o produto vincula o pacote que define os indicadores padrão do Plano Estratégico dos clientes.

**Fluxo na aba** (`ProductStrategicPlanTab` no drawer do produto):
1. **Toggle "utiliza Plano Estratégico"** — liga/desliga `usa_plano_estrategico` (bloqueado quando o produto está publicado).
2. **Vincular pacote** — se não há pacote, seletor de versões publicadas + "Vincular"; se não existe nenhum, "Criar pacote padrão" gera o pacote a partir do catálogo publicado, publica e vincula.
3. **Resumo** — indicadores, digitáveis vs calculáveis (via `formula_key`), departamentos e competências meta (indicadores × 12).
4. **Tabela por área** — busca, filtro por área, agrupamento colapsável com ordem, meta, formato e origem (direto / por dependência).
5. Produto publicado trava edição ("o pacote é imutável, crie nova versão do produto").

Lógica pura testada em `produtos/strategicPlan.test.ts` (10 testes: modo de entrada, resumo, itens congelados, validação, vínculo, filtro e agrupamento).

## Fatia — `/consultoria-mx` (2026-08-15)

**Migration `20260815220000_consultoria_mx_metodologia.sql`** (aplicada e registrada): 11 tabelas novas — `versoes_metodologia_produto`, `conteudo_encontro`, `guia_consultor_encontro`, `entregas_encontro`, `evidencias_encontro`, `biblioteca_materiais`, `conteudo_referencia_encontro`, `modelos_relatorio`, `vinculo_modelo_relatorio_encontro`, `vinculo_plano_acao_encontro`, `logs_auditoria_consultoria_mx` — todas com RLS interna MX, `REVOKE ALL FROM PUBLIC` e grants só `authenticated`, mais bucket `biblioteca-consultoria-mx`.

A página `AdminConsultoriaMxPage` agora tem 5 abas (Visão Geral, Metodologia por Produto, Biblioteca, Modelos de Relatório, Histórico) e editor de encontro com 8 abas (Objetivo, Orientação do Consultor, Aula e Vídeo, Entrega, Evidências, Arquivos, Relatório, Planos de Ação). Lógica pura em `consultoria-mx/methodology.ts` (21 testes).
