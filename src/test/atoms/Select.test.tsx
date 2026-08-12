import { expect, test, describe, afterEach } from "bun:test";
import { render, screen, cleanup } from "@testing-library/react";
import { Select } from "@/components/atoms/Select";
import * as React from "react";

afterEach(() => {
  cleanup();
});

describe("Select", () => {
  const options = (
    <>
      <option value="a">Option A</option>
      <option value="b">Option B</option>
      <option value="c">Option C</option>
    </>
  );

  test("renders with options", () => {
    render(<Select>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select).toBeDefined();
    expect(select.querySelectorAll("option").length).toBe(3);
  });

  test("applies default variant", () => {
    render(<Select>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("border-border");
  });

  test("applies error variant", () => {
    render(<Select variant="error">{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("border-red-300");
  });

  test("applies ghost variant", () => {
    render(<Select variant="ghost">{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select.className).toContain("border-transparent");
    expect(select.className).toContain("bg-transparent");
  });

  test("renders label", () => {
    render(<Select label="Choose one">{options}</Select>);
    expect(screen.getByText("Choose one")).toBeDefined();
  });

  test("supports disabled", () => {
    render(<Select disabled>{options}</Select>);
    const select = screen.getByRole("combobox");
    expect(select.hasAttribute("disabled")).toBe(true);
  });

  test("forwards ref", () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(<Select ref={ref}>{options}</Select>);
    expect(ref.current).not.toBeNull();
    expect(ref.current!.tagName).toBe("SELECT");
  });
});
