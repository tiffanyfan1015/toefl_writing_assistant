import { describe, expect, it } from "vitest";
import {
  findQueryMatchRanges,
  highlightInactiveTextMatches,
  highlightTextMatches,
  resolveEditorFindRange,
} from "./writingTextHighlight";

describe("findQueryMatchRanges", () => {
  it("finds all case-insensitive matches", () => {
    expect(
      findQueryMatchRanges("The climate and Climate shift.", "climate"),
    ).toEqual([
      { start: 4, end: 11 },
      { start: 16, end: 23 },
    ]);
  });

  it("returns an empty list for blank queries", () => {
    expect(findQueryMatchRanges("hello", "  ")).toEqual([]);
  });
});

describe("highlightTextMatches", () => {
  it("marks inactive matches lightly and the active match normally", () => {
    const segments = highlightTextMatches(
      "The climate and climate shift.",
      "climate",
      16,
      23,
    );

    expect(segments).toEqual([
      { text: "The ", variant: "plain" },
      { text: "climate", variant: "match" },
      { text: " and ", variant: "plain" },
      { text: "climate", variant: "active-match" },
      { text: " shift.", variant: "plain" },
    ]);
  });
});

describe("resolveEditorFindRange", () => {
  it("keeps preferred offsets when they still match the query", () => {
    expect(
      resolveEditorFindRange(
        "The climate and climate shift.",
        "climate",
        16,
        23,
      ),
    ).toEqual({ start: 16, end: 23 });
  });

  it("falls back to the nearest match when offsets drift", () => {
    expect(
      resolveEditorFindRange(
        "The climate and climate shift.",
        "climate",
        99,
        106,
      ),
    ).toEqual({ start: 4, end: 11 });
  });
});

describe("highlightInactiveTextMatches", () => {
  it("omits the active match from inactive-only highlights", () => {
    const segments = highlightInactiveTextMatches(
      "The climate and climate shift.",
      "climate",
      16,
      23,
    );

    expect(segments).toEqual([
      { text: "The ", variant: "plain" },
      { text: "climate", variant: "match" },
      { text: " and ", variant: "plain" },
      { text: "climate", variant: "plain" },
      { text: " shift.", variant: "plain" },
    ]);
  });
});
