# Gap de paridade com o Base44 — módulo Administrador

Levantamento honesto do que existe no export `mx-admin-flow` e do que o MX tem hoje, por rota. Base: inventário de telas, ações e entidades extraído do próprio código do Base44.

## Tamanho do gap

| Rota | Base44 (arquivos / linhas) | MX hoje | Cobertura estimada |
|---|---|---|---|
| `/clientes` | 23 / 5.571 | lista + wizard + **Visão 360 + ativação** | ~50% |
| `/equipe` | 8 / 1.311 | lista + editar + carteira + **perfil do consultor** | ~65% |
| `/produtos` | 4 / 691 | **ciclo de vida + módulos + tempos** | ~85% |
| `/indicadores` | 34 / 6.630 | catálogo com ciclo, ordem, drawer e **parâmetros** | ~35% |
| `/planos-acao` | 21 / 3.941 | rede + templates + sugestões + **kanban e detalhe** | ~55% |
| `/consultoria-mx` | 19 / 2.742 | lista de encontros | ~10% |
| **Total** | **109 / 20.886** | ~2.400 linhas | **~20%** |

## O que falta, por rota

### `/clientes`
- ~~Visão 360 com abas (lojas, pessoas, jornada, progresso, informações gerais)~~ — **feito**.
- ~~Ativação com checklist separando impeditivo de informativo~~ — **feito** (falta o reparo de matriz).
- **Gestão de lojas do cliente**: criar/editar loja, horário de funcionamento com padrão MX.
- **Pessoas e acessos**: criar usuário com papéis, lojas autorizadas, Dono Master; link de autocadastro com validade e limite de usos.
- **Configuração por cliente**: tolerância de fechamento, limite de vendedores, retenção, canais de notificação.
- **Programa contratado**: produto, versão, modalidade, jornada vinculada, consultor responsável.
- **Onboarding por etapas** com continuidade ("Continuar onboarding").

### `/equipe`
- ~~Perfil do consultor: programas habilitados, especialidades por encontro, clientes ativos, capacidade, situação~~ — **feito** (migration 20260815190000).
- **Edição de usuário em abas**: dados pessoais, papéis e visões, lojas e equipes, acesso e situação.
- **Delegações gerenciais** com motivo e vigência.
- **Papel principal** e visão padrão ao entrar.

### `/produtos`
- ~~Ciclo de vida, aba Módulos, aba Tempos e Capacidade, métricas~~ — **feito** (migration 20260815180000).
- Falta: **aba Plano Estratégico** (pacote de indicadores vinculado, digitáveis vs calculáveis, competências meta) — depende das tabelas de pacote de indicadores.

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
- **Wizard de plano por cliente** com ações ponderadas, participantes, indicador de eficácia.
- **Templates**: wizard completo, filtros, detalhe com versões, promover plano existente a padrão, desabilitar/reativar/arquivar.
- **Sugestões ao dono**: validar, publicar, descartar, visualizar como dono.
- **Aplicações nos clientes**: acompanhamento por cliente com progresso e eficácia.

### `/consultoria-mx`
- **Metodologia por produto**: versão estrutural vs metodológica, publicar, comparar versões, completude.
- **Editor de encontro** com abas: objetivo, conteúdo (vídeo/aula), entrega, evidências, arquivos, relatório, planos de ação, guia do consultor.
- **Biblioteca de materiais**: upload, tipos, visibilidade, utilizações, arquivar.
- **Modelos de relatório**: seções, publicar, duplicar, arquivar.
- **Prévia do Módulo Dono** e histórico de alterações.

## Tabelas que faltam no Supabase

Sem elas, parte do gap não fecha: qualificação de consultor por produto e por encontro, reserva de capacidade, referência de capacidade por produto, versões de metodologia, conteúdo/entrega/evidência/relatório por encontro, pacotes de indicadores versionados, parâmetros estratégicos e overrides por cliente, lotes de importação de metas, sugestões ao dono.

## Ordem de execução

1. ~~`/produtos` — ciclo de vida + abas Módulos e Tempos~~ — feito.
2. ~~`/equipe` — perfil do consultor com programas, encontros e capacidade~~ — feito.
3. ~~`/clientes` — Visão 360 e ativação com checklist~~ — feito.
4. ~~`/planos-acao` — kanban e detalhe em abas~~ — feito (falta o wizard por cliente).
5. ~~`/indicadores` — ordem, drawer, parâmetros~~ — feito (faltam wizard completo, fórmulas e importação de metas).
6. `/consultoria-mx` — metodologia por produto e editor de encontro.
