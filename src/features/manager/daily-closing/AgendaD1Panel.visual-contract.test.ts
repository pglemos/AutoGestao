import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "AgendaD1Panel.tsx"),
  "utf8",
);

describe("AgendaD1Panel visual contract", () => {
  test("mantém os primitives visuais observados no AgendaD1Modal do Base44", () => {
    expect(source).toContain('"rounded-2xl bg-surface-alt p-4 space-y-3"');
    expect(source).toContain('"flex items-center gap-2 text-xs font-semibold text-muted-foreground"');
    expect(source).toContain('"overflow-x-auto rounded-2xl border border-border-subtle"');
    expect(source).toContain('"w-full rounded-xl border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-status-success"');
    expect(source).toContain('"rounded-lg bg-muted px-2 py-1 text-xs font-medium text-foreground"');
    expect(source).toContain('confirmationStatusClass(managerConfirmationStatus)');
    expect(source).toContain('"Últ. contato"');
    expect(source).toContain('"text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground"');
    expect(source).toContain('"absolute right-0 top-full z-[var(--mx-z-popover)] mt-1 min-w-[208px] rounded-mx-xl border border-border bg-white py-1 shadow-lg"');
    expect(source).toContain('role="menu" aria-label="Resultado da confirmação"');
    expect(source).toContain('role="menuitem"');
    expect(source).toContain('<CheckCircle size={13} /> Confirmar <ChevronDown size={12} />');
    expect(source).not.toContain('aria-label="Copiar telefone"');
    expect(source).not.toContain('aria-label="Resultado do contato"');
  });
});
