import { describe, expect, it } from "vitest";
import { highlightSnippet } from "./writingSearchSnippet";

describe("highlightSnippet", () => {
  it("wraps the matched substring", () => {
    const segments = highlightSnippet("The climate is changing.", "climate");
    expect(segments).toEqual([
      { text: "The ", highlighted: false },
      { text: "climate", highlighted: true },
      { text: " is changing.", highlighted: false },
    ]);
  });
});
