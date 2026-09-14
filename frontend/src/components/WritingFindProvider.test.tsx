import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import {
  useWritingFind,
  WritingFindProvider,
} from "./WritingFindProvider";

vi.mock("../api/writingSearch", () => ({
  fetchWritingSearch: vi.fn(),
}));

function OpenFindButton() {
  const { openFind } = useWritingFind();
  return <button onClick={openFind}>Open find</button>;
}

describe("WritingFindProvider", () => {
  afterEach(() => {
    cleanup();
  });

  it("closes the find bar when Escape is pressed outside the input", () => {
    render(
      <MemoryRouter initialEntries={["/practice/1"]}>
        <WritingFindProvider>
          <OpenFindButton />
        </WritingFindProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open find" }));
    expect(
      screen.getByRole("textbox", { name: "Find in your writing" }),
    ).toBeTruthy();

    fireEvent.keyDown(window, { key: "Escape" });

    expect(
      screen.queryByRole("textbox", { name: "Find in your writing" }),
    ).toBeNull();
  });
});
