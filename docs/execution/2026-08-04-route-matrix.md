# Matriz de rotas, perfis, viewports e estados — 2026-08-04

Estado desta consolidação: `NOT_PROVEN`

## Regra desta task

Sem browser live autenticado nesta task, nenhuma linha abaixo pode ser promovida para cobertura integral apenas por herança documental.

## Perfis

| Perfil | Sessão/credencial nesta task | Estado | Observação |
|---|---|---|---|
| Vendedor | não exercitado nesta task | `NOT_PROVEN` | evidência antiga não foi relabelada |
| Gerente | não exercitado nesta task | `NOT_PROVEN` | warning fix segue sem prova publicada do SHA atual |
| Dono | não exercitado nesta task | `NOT_PROVEN` | auditorias anteriores continuam apenas históricas |
| Administrador MX | não exercitado nesta task | `NOT_PROVEN` | sem rodada live atual |
| Administrador Geral | não fornecida | `BLOCKED_EXTERNAL` | ausência de acesso autorizado explícita |
| Consultor MX | não fornecida | `BLOCKED_EXTERNAL` | ausência de acesso autorizado explícita |

## Viewports obrigatórios

`390×844`, `600×900`, `768×1024`, `840×1024`, `1024×768`, `1280×800`, `1440×900`, `1600×1000`, `1920×1080`

Estado nesta task: `NOT_PROVEN`

## Gaps que precisam permanecer explícitos

- sem verificação live de overflow, console e rede na combinação rota/perfil/viewport do checkout atual;
- sem reexecução atual dos estados loading, vazio, erro, acesso negado, sessão expirada, salvamento, modal/drawer, CRUD, upload/download/exportação;
- sem cobertura autorizada de Consultor MX e Administrador Geral.
