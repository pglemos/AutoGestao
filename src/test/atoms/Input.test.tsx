import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { Input } from "@/components/atoms/Input";
import * as React from "react";

afterEach(() => {
  cleanup();
});

describe("Input", () => {
  test("uses a mobile-safe touch target and focus-visible ring", () => {
    render(<Input aria-label="Campo" />);

    const input = screen.getByRole("textbox", { name: "Campo" });
    expect(input.className).toContain("--mx-input-height");
    expect(input.className).not.toContain("h-mx-14");
    expect(input.className).toContain("focus-visible:ring-");
    expect(input.className).not.toContain("shadow-inner");
  });
});
