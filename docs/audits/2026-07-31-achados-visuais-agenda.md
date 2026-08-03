# Achado visual: /agenda não tem título de página

> Medido em 2026-07-31, sessão real de `administrador_geral`, viewport 1280×720.

## Evidência

```json
{"h1":["julho de 2026"],
 "eyebrow":["Filtros","Atualizar","Painel Lateral","julho 2026","Agendadas","Em Andamento"]}
```

O único `h1` do documento é **o mês corrente do calendário**. A tela não declara
seu próprio nome em lugar nenhum do conteúdo principal.

## Por que é defeito, e não preferência

O §28 exige que o título comece na mesma linha estrutural das páginas equivalentes,
e §21 exige ordem lógica de headings. Todas as outras rotas internas abrem com
`MxModuleHeader` (eyebrow + título + descrição): "CRM de Consultoria",
"Desenvolvimento", "Ranking Global". A Agenda quebra esse padrão duas vezes:

1. quem chega pela navegação não vê confirmação textual de onde está;
2. um leitor de tela que navega por headings ouve "julho de 2026" como título da
   página — o mês é o conteúdo, não a identidade da tela.

## Correção aplicada

`AgendaHeader` agora expõe o título `Agenda MX` como `h1`, mantém o período visível
como `h2` e informa o contexto `Consultoria`. A alteração preserva a densidade
do calendário sem criar um segundo shell visual.

## Impacto no teste

`agenda-filters.playwright.ts` voltou a afirmar explicitamente o heading `Agenda MX`
e mantém as asserções de conteúdo e filtro.
