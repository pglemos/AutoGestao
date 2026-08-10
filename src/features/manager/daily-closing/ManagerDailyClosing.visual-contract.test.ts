import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "ManagerDailyClosing.container.tsx"),
  "utf8",
);

describe("ManagerDailyClosing visual contract", () => {
  test("reproduz os primitives literais da página FechamentoEquipe do Base44", () => {
    expect(source).toContain(
      '"bg-white rounded-[16px] border border-gray-100 shadow-sm p-5"',
    );
    expect(source).toContain('"bg-white rounded-[16px] border border-gray-100 shadow-sm overflow-hidden"');
    expect(source).toContain('"bg-gray-50"');
    expect(source).toContain('"divide-y divide-gray-100"');
    expect(source).toContain('"inline-flex h-[36px] items-center gap-1 rounded-[12px] bg-emerald-600');
    expect(source).toContain('className="px-2.5 py-1 rounded-full text-xs font-semibold opacity-0"');
    expect(source).not.toContain("border-slate-100");
    expect(source).not.toContain("text-slate-");
    expect(source).not.toContain("bg-slate-");
    expect(source).not.toContain("rounded-2xl");
  });

  test("mantém os atalhos por linha do Base44 (cobrar, leads) e as ajudas dos cards", () => {
    // Cobrança individual e correção de leads saem da linha, como na
    // TabelaMovimento do Base44 — antes só existia "Somente consulta".
    expect(source).toContain("Cobrar fechamento de ${name}");
    expect(source).toContain("Corrigir leads de ${name}");
    expect(source).toContain('status === "Pendente" ?');

    // HelpTooltip nos quatro cards do topo e no Resumo do Fechamento.
    const helpCount = source.match(/<HelpTooltip/g)?.length ?? 0;
    expect(helpCount).toBeGreaterThanOrEqual(3);
    expect(source).toContain("agendamentos confirmados gerados pela equipe hoje");
    expect(source).toContain("ainda não enviaram o fechamento do dia");
    expect(source).toContain("aguardam sua aprovação");
    expect(source).toContain("combina acesso à rotina");

    // A Disciplina Média deixa de ser azul fixa e segue a faixa classificada.
    expect(source).toContain('label === "Excelente"');
    expect(source).toContain('label === "Baixa"');
  });

  test("inicializa o gráfico de disciplina com dimensões positivas", () => {
    const start = source.indexOf("function DisciplineTrendCard");
    const end = source.indexOf("function ComparisonRow", start);
    const trendCard = source.slice(start, end);
    const normalizedTrendCard = trendCard.replace(/\s+/g, " ");

    expect(trendCard).toContain(
      'className="mt-4 h-[280px] w-full min-w-0"',
    );
    expect(normalizedTrendCard).toContain(
      '<ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={280}',
    );
    expect(normalizedTrendCard).toContain(
      'initialDimension={{ width: 320, height: 280 }}',
    );
  });

  test("usa o PageCanvas canônico sem recuo local na rota gerencial", () => {
    expect(source).toContain('from "@/design-system/page"');
    expect(source).toContain(
      '<PageCanvas as="div" width="dashboard" bottomClearance="navigation"',
    );
    expect(source).toMatch(
      /function ManagerClosingSkeleton[\s\S]*?<PageCanvas as="div" width="dashboard" bottomClearance="navigation"/,
    );
    expect(source).not.toContain(
      'className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 pb-20"',
    );
  });
});
