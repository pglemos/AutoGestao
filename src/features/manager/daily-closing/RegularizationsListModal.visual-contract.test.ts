import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(import.meta.dir, "RegularizationsListModal.tsx"), "utf8");

describe("RegularizationsListModal visual contract", () => {
  test("replica o ModalShell Base44 compacto e seus cards de decisão", () => {
    expect(source).toContain('className="sm:!max-w-2xl"');
    expect(source).toContain('className="rounded-xl bg-surface-alt p-4"');
    expect(source).toContain('className="mb-3 grid grid-cols-4 gap-2 text-xs"');
    expect(source).toContain('className="flex gap-2"');
    expect(source).toContain('className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-xl bg-brand-primary');
    expect(source).toContain('className="h-9 rounded-mx-xl border border-status-error/30 bg-white px-4 text-sm font-medium text-status-error-text hover:bg-status-error-surface disabled:opacity-40"');
    expect(source).toContain('rows={2}');
    expect(source).not.toContain('min-h-[80px]');
  });
});
