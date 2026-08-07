# Relatório de Migração de Clientes Reais — Mentor Comercial

## Visão Geral e Estratégia (TASK 21)

Este documento registra a estratégia, regras de integridade e os resultados do processo de migração da base de clientes reais para o modelo determinístico do **Mentor Comercial**.

### Princípios e Regras Duras de Integridade
1. **Preservação Absoluta dos Dados Legados**: `clientId`, telefone, `canal` (coluna legada), veículo, agendamento (`appointment_at`), observações, histórico (`eventos_comerciais`), venda (`sale_date`/`closed_at`) e próxima ação (`next_action_at`) são **preservados sem alteração ou eliminação**. É estritamente proibido apagar ou recriar registros.
2. **Reutilização de Oportunidades Ativas**: Para cada cliente, se houver uma oportunidade ativa (`closed_at IS NULL AND cancelada_em IS NULL`), ela é reutilizada e enriquecida com os novos campos do Mentor.
3. **Criação de Oportunidade Ativa quando Inexistente**: Caso o cliente não possua oportunidade ativa (por ter apenas oportunidades encerradas ou nenhuma oportunidade cadastrada), uma nova oportunidade ativa na etapa `prospeccao` é criada para garantir que 100% dos clientes possuam ciclo ativo no Mentor.
4. **Mapeamento Metodológico do Canal**: O canal legado `showroom` é mapeado exclusivamente no novo campo metodológico `channel_entry` como `'Porta'`. A coluna legada `canal` permanece **intocada** (mantendo `'showroom'`).
5. **Classificação e Score Determinístico**: Na migração inicial, por ausência de evidência humana suficiente, todas as oportunidades mantêm `needs_mentor_classification = true`. O score comercial (`mentor_score`) **não é preenchido artificialmente** e a oportunidade só entra na Qualidade da Carteira após ser devidamente classificada.

---

## Resultados da Simulação (Dry-Run)

A simulação executada via `node scripts/mentor-migrate-clients.mjs` capturou as seguintes métricas da base real:

| Métrica | Estado Inicial (ANTES) | Estado Simulado (DEPOIS) | Variação (Delta) |
|---|:---:|:---:|:---:|
| **Total de Clientes** | 554 | 554 | 0 (Nenhum apagado) |
| **Total de Oportunidades** | 562 | 784 | +222 novas ativas |
| **Oportunidades Ativas** | 355 | 554 | +199 |
| **Oportunidades Encerradas** | 207 | 207 | 0 (Todas preservadas) |
| **Clientes com Ativa Reutilizada** | 332 | 332 | 0 |
| **Clientes sem Ativa (Novas Criadas)** | 222 | 222 | +222 |
| **Oportunidades em `needs_mentor_classification`** | 562 | 784 | +222 |

---

## Execução em Produção (`--apply`)

> [!NOTE]
> Os dados abaixo devem ser atualizados imediatamente após a execução do script com a flag `--apply`.

- **Data/Hora de Execução**: `[preencher após execução com --apply]`
- **Responsável**: `[preencher após execução com --apply]`
- **Status da Execução**: `[preencher após execução com --apply]`

### Tabela de Verificação Antes/Depois (Produção)

| Entidade | Contagem ANTES | Contagem DEPOIS | IDs Verificados? | Status |
|---|:---:|:---:|:---:|:---:|
| **Clientes** | 554 | `[preencher após execução com --apply]` | `[preencher após execução com --apply]` | `[preencher após execução com --apply]` |
| **Oportunidades** | 562 | `[preencher após execução com --apply]` | `[preencher após execução com --apply]` | `[preencher após execução com --apply]` |

---

## Validação de Invariantes e Segurança

O script `scripts/mentor-migrate-clients.mjs` executa verificações automatizadas ao final do processo:
- Captura o conjunto de IDs de clientes e oportunidades **antes** da execução.
- Captura o conjunto **depois** da execução.
- Cancela a operação e lança exceção crítica caso a contagem de qualquer tabela diminua ou se qualquer ID original não for localizado na base após a execução.
