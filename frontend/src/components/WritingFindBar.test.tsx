import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { WritingFindBar } from "./WritingFindBar";
import type { WritingSearchMatch } from "../types/writingSearch";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const sampleMatch: WritingSearchMatch = {
  questionId: 1,
  questionTitle: "Essay A",
  questionType: "Email",
  revisionId: 10,
  revisionIndex: 0,
  revisionLabel: "LATEST",
  startOffset: 4,
  endOffset: 11,
  snippet: "The climate is warming.",
};

function renderBar(
  overrides: Partial<React.ComponentProps<typeof WritingFindBar>> = {},
) {
  const props = {
    open: true,
    compact: false,
    query: "climate",
    matches: [sampleMatch],
    activeMatchIndex: 0,
    total: 1,
    truncated: false,
    loading: false,
    error: "",
    onQueryChange: vi.fn(),
    onClose: vi.fn(),
    onActiveMatchChange: vi.fn(),
    onNavigateToMatch: vi.fn(),
    onExpandResults: vi.fn(),
    ...overrides,
  };

  render(
    <MemoryRouter>
      <WritingFindBar {...props} />
    </MemoryRouter>,
  );

  return props;
}

describe("WritingFindBar", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    navigateMock.mockClear();
  });

  it("navigates and collapses when Next is clicked", async () => {
    const user = userEvent.setup();
    const props = renderBar();

    await user.click(screen.getByLabelText("Next match"));

    expect(props.onActiveMatchChange).toHaveBeenCalled();
    expect(navigateMock).toHaveBeenCalledWith(
      "/practice/1?revisionId=10&start=4&end=11&q=climate",
    );
    expect(props.onNavigateToMatch).toHaveBeenCalled();
  });

  it("expands results when the input is focused in compact mode", () => {
    const props = renderBar({ compact: true });
    const input = screen.getByRole("textbox", { name: "Find in your writing" });

    fireEvent.focus(input);

    expect(props.onExpandResults).toHaveBeenCalled();
  });

  it("hides the results list in compact mode", () => {
    renderBar({ compact: true });
    expect(screen.queryByText("Essay A")).toBeNull();
  });

  it("shows the results list when not compact", () => {
    renderBar({ compact: false });
    expect(screen.getByText("Essay A")).toBeTruthy();
  });

  it("closes on Escape", () => {
    const props = renderBar();
    const input = screen.getByRole("textbox", { name: "Find in your writing" });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(props.onClose).toHaveBeenCalled();
  });
});
