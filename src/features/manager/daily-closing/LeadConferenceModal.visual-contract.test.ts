import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "LeadConferenceModal.tsx"),
  "utf8",
);

describe("LeadConferenceModal visual contract", () => {
  test("usa o tom verde Base44 para diferença zerada ou ainda indisponível", () => {
    expect(source).toContain('tone={summary.totalDifference === null || summary.totalDifference === 0 ? "green" : "orange"}');
  });

  test("não deixa primitives do design system MX vazar no modal Base44", () => {
    expect(source).toContain('`rounded-mx-2xl border p-4 ${colors}`');
    expect(source).toContain('"h-10 rounded-mx-xl border border-border bg-white px-3 text-sm"');
    // FASE G 07.009: a geometria Base44 (12px/16px) passou a ser expressa pelos
    // tokens equivalentes rounded-mx-xl/rounded-mx-2xl. O que continua proibido é
    // raio arbitrário em pixel dentro do runtime.
    expect(source).not.toMatch(/rounded(-[a-z]+)?-\[\d+px\]/);
    expect(source).not.toContain("text-text-secondary");
    expect(source).not.toContain("text-text-primary");
    expect(source).not.toContain("bg-surface-alt");
  });
});
