# Checklist 1:1 — Consultoria MX + Equipe MX (Admin × Base44)

Data: 2026-08-24  
Cliente proxy QA: AG AUTOMÓVEIS  
App: `http://127.0.0.1:3010`

## Rotas

| Área | Rota Admin | Status |
|------|------------|--------|
| Metodologia | `/consultoria?mode=metodologia` | OK |
| Operação | `/consultoria?mode=operacao` | OK |
| Equipe | `/equipe` | OK |

## Consultoria — Metodologia

| ID | Item | Resultado | Nota |
|----|------|-----------|------|
| CM01 | 4 produtos listados | OK | |
| CM02 | PMR Híbrido/Online publicados | OK | |
| CM03 | Encontros configurados (~12) | OK | |
| CM04 | Tabs Objetivo…Planos | OK | |
| CM05 | Overview: card Aulas Universidade | OK | contagem = aulas reais |
| CM06 | Biblioteca lista aulas + materiais | FIX | antes: 14 aulas no card → aba “0 materiais” |
| CM07 | Uploads biblioteca = 0 | DATA | vazio real, não bug de UI |
| CM08 | Modelos relatório = 0 | DATA | vazio real |
| CM09 | Histórico sem logs PE (`origin=admin-mx`) | FIX | filtro exclui `admin-mx` |

## Consultoria — Operação

| ID | Item | Resultado | Nota |
|----|------|-----------|------|
| CO01 | Lista encontros (~357) | OK | |
| CO02 | Métricas operação | OK | |

## Equipe MX

| ID | Item | Resultado | Nota |
|----|------|-----------|------|
| EQ01 | 13 pessoas | OK | |
| EQ02 | Perfil / Editar / Adicionar | OK | |
| EQ03 | Capacidade métrica sem horas | FIX | `—` quando online/presencial nulos (antes `0+0=0h`) |
| EQ04 | Capacidade por linha null | OK | `—` por membro |
| EQ05 | Loja principal com filiais AG | DATA | lojas reais em `lojas`, não bug do wizard PA |

## Não-paridade (schema / dados)

- Uploads e modelos de relatório vazios = DATA, não falha de código.
- Capacidade horária não preenchida nos perfis = DATA.
- Histórico compartilha tabela `logs_auditoria_consultoria_mx` com outros módulos Admin.
