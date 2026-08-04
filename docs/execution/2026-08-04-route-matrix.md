# Matriz de rotas, perfis, viewports e estados — 2026-08-04

## Perfis

| Perfil | Credencial/sessão disponível nesta execução | Estado inicial | Evidência necessária |
|---|---|---|---|
| Vendedor | Sim | `NOT_STARTED` | login, rotas autorizadas/proibidas, ações e 9 viewports |
| Gerente | Sim | `IN_PROGRESS` | warning do gráfico, rotas, ações e 9 viewports |
| Dono | Sim | `TESTED_PRODUCTION` herdado, revalidação final pendente | matriz completa e screenshots |
| Administrador Geral | Não fornecida | `BLOCKED_EXTERNAL` se nenhuma sessão autorizada existir | tentativa de acesso e alternativa documentada |
| Administrador MX | Sim | `NOT_STARTED` | painel, lojas, simulação e permissões |
| Consultor MX | Não fornecida | `BLOCKED_EXTERNAL` se nenhuma sessão autorizada existir | tentativa de acesso e alternativa documentada |

## Viewports obrigatórios

`390×844`, `600×900`, `768×1024`, `840×1024`, `1024×768`, `1280×800`, `1440×900`, `1600×1000`, `1920×1080`.

## Estados e ações

Loading, dados reais, vazio, erro de rede/API, acesso negado, sessão expirada, formulário válido/inválido, salvamento, sucesso/erro, modal, drawer, dropdown, tooltip, conteúdo longo/nulo/extremo, navegação, login/logout, troca de loja, simulação, CRUD, busca/filtro/ordenação/paginação, upload/download/exportação, calendário, notificações, feedback/PDI, fechamento, permissões e equipe.

## Registro de execução

| Perfil | Rota | Viewport | Estado | Ação | Console/rede | Screenshot | Estado |
|---|---|---|---|---|---|---|---|
| Gerente | superfície inicial | 9 obrigatórios | carregamento + gráfico | abrir dashboard | 2 warnings conhecidos a revalidar | `output/playwright/` existente | `IN_PROGRESS` |
| Dono | rotas Dono já auditadas | 9 obrigatórios | carregado | navegação/overflow | sem overflow na auditoria anterior | `output/playwright/` | `TESTED_PRODUCTION` |

Nenhuma linha será marcada como `DONE_WITH_EVIDENCE` sem a evidência correspondente nesta execução.
