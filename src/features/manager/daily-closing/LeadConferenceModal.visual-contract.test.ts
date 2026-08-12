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
    expect(source).toContain('`rounded-[16px] border p-4 ${colors}`');
    expect(source).toContain('"h-10 rounded-[12px] border border-border bg-white px-3 text-sm"');
    expect(source).not.toContain("rounded-mx-");
    expect(source).not.toContain("text-text-secondary");
    expect(source).not.toContain("text-text-primary");
    expect(source).not.toContain("bg-surface-alt");
  });
});
