import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WritingSearchHighlight } from "./WritingSearchHighlight";

describe("WritingSearchHighlight", () => {
  it("highlights every match and marks the active one", () => {
    const { container } = render(
      <WritingSearchHighlight
        text="The climate and climate shift."
        query="climate"
        activeStart={16}
        activeEnd={23}
      />,
    );

    const marks = container.querySelectorAll("mark");
    expect(marks).toHaveLength(2);
    expect(marks[0]?.classList.contains("is-active-match")).toBe(false);
    expect(marks[1]?.classList.contains("is-active-match")).toBe(true);
  });
});
