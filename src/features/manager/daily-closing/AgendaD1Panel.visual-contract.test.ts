import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "AgendaD1Panel.tsx"),
  "utf8",
);

describe("AgendaD1Panel visual contract", () => {
  test("mantém os primitives visuais observados no AgendaD1Modal do Base44", () => {
    expect(source).toContain('"rounded-2xl bg-gray-50 p-4 space-y-3"');
    expect(source).toContain('"flex items-center gap-2 text-xs font-semibold text-gray-600"');
    expect(source).toContain('"overflow-x-auto rounded-2xl border border-gray-100"');
    expect(source).toContain('"w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"');
    expect(source).toContain('"rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"');
    expect(source).toContain('confirmationStatusClass(managerConfirmationStatus)');
    expect(source).toContain('"Últ. contato"');
    expect(source).toContain('"text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"');
    expect(source).toContain('"absolute right-0 top-full z-50 mt-1 min-w-[208px] rounded-[12px] border border-gray-200 bg-white py-1 shadow-lg"');
    expect(source).toContain('<CheckCircle size={13} /> Confirmar <ChevronDown size={12} />');
    expect(source).not.toContain('aria-label="Copiar telefone"');
    expect(source).not.toContain('aria-label="Resultado do contato"');
  });
});
