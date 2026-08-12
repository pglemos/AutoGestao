import { expect, test, describe, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Button } from "@/components/atoms/Button";
import * as React from "react";

afterEach(() => {
  cleanup();
});

describe("Button Atom", () => {
  test("renders correctly with children", () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole("button", { name: /click me/i });
    expect(button).toBeDefined();
  });

  test("applies variant classes correctly", () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole("button");
    // Aparência aprovada (Base44/Dono), agora a única do produto.
    expect(button.className).toContain("bg-brand-primary");

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole("button");
    expect(button.className).toContain("bg-status-error");
  });

  test("applies adaptive sizing classes", () => {
    render(<Button>Sizing</Button>);
    const button = screen.getByRole("button");
    expect(button.className).toContain("h-mx-11");
    expect(button.className).toContain("sm:h-10");
  });

  test("uses semibold weight by default instead of heavy black text", () => {
    render(<Button>Weight</Button>);
    const button = screen.getByRole("button", { name: /weight/i });
    expect(button.className).toContain("font-semibold");
    expect(button.className).not.toContain("font-black");
  });

  test("hides SVG icons from screen readers by default", () => {
    render(
      <Button>
        <svg data-testid="icon" height="10" width="10">
          <circle cx="5" cy="5" r="5" />
        </svg>
        Icon Button
      </Button>
    );
    const icon = screen.getByTestId("icon");
    expect(icon.getAttribute("aria-hidden")).toBe("true");
  });

  test("supports asChild prop with Slot", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByRole("link", { name: /link button/i });
    expect(link).toBeDefined();
    expect(link.className).toContain("inline-flex");
  });

  test("is disabled when disabled prop is passed", () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole("button");
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(button.className).toContain("disabled:opacity-50");
  });
});
