import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "Modal.tsx"), "utf8");

describe("Modal referenceStyle visual contract", () => {
  test("referenceStyle não mantém um segundo sistema de geometria", () => {
    expect(source).not.toContain("const referenceModalSizes")
    expect(source).not.toContain('referenceStyle\n              ? "fixed left-4 right-4')
    expect(source).not.toContain('referenceStyle\n              ? `w-auto sm:w-full')
  });

  test("mantém o clearance inferior seguro no footer canônico", () => {
    expect(source).toContain('paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)"')
    expect(source).toContain('flex shrink-0 border-t bg-white')
    expect(source).toContain('flex-row justify-end gap-mx-sm border-border-subtle px-mx-5 py-mx-4')
  });
});
