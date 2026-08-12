# Validacao E2E Admin Master MX - 20260812151557

- Run ID: `E2E_ADMIN_MASTER_20260812151557`
- Usuario validado: `synvollt@gmail.com`
- Ambiente: `https://mxperformance.vercel.app`
- Status geral: `FAIL`
- Senha: nao registrada neste artefato.

## Resumo

| Status | Total |
| --- | ---: |
| PASS | 6 |
| WARN | 0 |
| FAIL | 3 |
| BLOCKED | 0 |

## Resultados

| Secao | Validacao | Status | Detalhes |
| --- | --- | --- | --- |
| Preflight | account, role and password login | PASS | `{"duration_ms":2381,"profile":{"id":"9b9ee2fb-d002-492f-b274-06846972a014","email":"synvollt@gmail.com","name":"SynVolt","role":"administrador_geral","active":true,"must_change_password":false}}` |
| Preflight | permission matrix | PASS | `{"duration_ms":580,"modules":7,"permission_codes":["comparar","criar","editar","excluir","exportar","visualizar"],"matrix_rows":24,"delete_permissions":5,"export_permissions":1}` |
| CLI/API | store CRUD and operational rules | PASS | `{"duration_ms":3647,"store_id":"76eb26b5-4193-45fd-b446-67f4c809a8ff","store_name":"E2E ADMIN MASTER 20260812151557 EDITADA","manager_email":"synvollt@gmail.com"}` |
| CLI/API | team/user CRUD, seller tenure and checkins | FAIL | `{"duration_ms":3262,"message":"update user profile: permission denied for table usuarios"}` |
| CLI/API | digital product CRUD | PASS | `{"duration_ms":1292,"product_id":"18e900b3-4ad6-4113-bfb5-a5317e7057c8","status":"ativo"}` |
| CLI/API | consulting client, visit and agenda CRUD | FAIL | `{"duration_ms":215,"message":"insert consulting client: new row for relation \"clientes_consultoria\" violates check constraint \"clientes_consultoria_active_requires_store_check\""}` |
| Downloads | CLI workbook exports | FAIL | `{"duration_ms":1937,"message":"clients: invalid input syntax for type uuid: \"null\""}` |
| Limpeza | cleanup registry | PASS | `{"cleanupWarnings":[],"checks":[{"table":"lojas","count":0,"error":null},{"table":"usuarios","count":0,"error":null},{"table":"produtos_digitais","count":0,"error":null}]}` |
| Limpeza | leftover verification | PASS | `{"leftovers":[],"checks":[{"table":"lojas","count":0,"error":null},{"table":"usuarios","count":0,"error":null},{"table":"produtos_digitais","count":0,"error":null}]}` |

## Artefatos

- `output/e2e-admin-master-full-20260812151557/cleanup-registry.json`

## Limpeza

- Todos os registros E2E conhecidos foram removidos ou verificados no bloco de limpeza.
- A conta real validada foi preservada: papel, usuario e senha nao foram alterados pelo runner.
