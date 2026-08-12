import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Modal } from "./Modal";

globalThis.getComputedStyle ||= (() => ({ animationName: "none" })) as typeof getComputedStyle;
globalThis.MutationObserver ||= class {
  observe() {}
  disconnect() {}
  takeRecords() { return []; }
} as unknown as typeof MutationObserver;

describe("Modal referenceStyle", () => {
  beforeEach(() => cleanup());
  afterEach(() => cleanup());

  test("expõe o shell visual Base44 sem blur", () => {
    render(
      <Modal
        open
        onClose={() => undefined}
        title="Agenda D+1"
        description="Clientes agendados para amanhã"
        referenceStyle
      >
        <p>Conteúdo</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Agenda D+1" });
    const overlay = document.querySelector('[data-reference-overlay="true"]');

    expect(dialog.getAttribute("data-reference-modal")).toBe("true");
    expect(dialog.className).toContain("rounded-2xl");
    expect(dialog.className).toContain("shadow-xl");
    expect(overlay).toBeTruthy();
    expect(overlay?.className).toContain("bg-surface-overlay/30");
    expect(overlay?.className).not.toContain("backdrop-blur");

    const title = screen.getByRole("heading", { name: "Agenda D+1" });
    expect(title.className).toContain("text-lg");
    expect(title.className).toContain("font-semibold");
    expect(title.className).toContain("text-foreground");

    const description = screen.getByText("Clientes agendados para amanhã");
    expect(description.className).toContain("text-sm");
    expect(description.className).toContain("text-muted-foreground");
  });
});
