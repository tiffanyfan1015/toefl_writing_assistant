import { describe, expect, it, vi } from "vitest";
import { syncEditorFindHighlight } from "./editorFindSync";
import type { WritingSearchMatch } from "../types/writingSearch";

const sampleMatch: WritingSearchMatch = {
  questionId: 5,
  questionTitle: "Housing email",
  questionType: "Email",
  revisionId: 42,
  revisionIndex: 0,
  revisionLabel: "LATEST",
  startOffset: 120,
  endOffset: 124,
  snippet: "room",
};

describe("syncEditorFindHighlight", () => {
  it("highlights the active API match in the current editor", () => {
    const setHighlight = vi.fn();
    const text =
      "Dear Accommodation Office,\n\nI would like to request a new room next term.";

    syncEditorFindHighlight({
      open: true,
      query: "room",
      matches: [sampleMatch],
      activeMatchIndex: 0,
      registration: {
        questionId: 5,
        getText: () => text,
        getLatestRevisionId: () => 42,
        canHighlight: () => true,
        setHighlight,
      },
    });

    expect(setHighlight).toHaveBeenCalledWith({
      query: "room",
      activeStart: 58,
      activeEnd: 62,
    });
  });

  it("clears highlights when find is closed", () => {
    const setHighlight = vi.fn();

    syncEditorFindHighlight({
      open: false,
      query: "room",
      matches: [sampleMatch],
      activeMatchIndex: 0,
      registration: {
        questionId: 5,
        getText: () => "room",
        getLatestRevisionId: () => 42,
        canHighlight: () => true,
        setHighlight,
      },
    });

    expect(setHighlight).toHaveBeenCalledWith(null);
  });
});
