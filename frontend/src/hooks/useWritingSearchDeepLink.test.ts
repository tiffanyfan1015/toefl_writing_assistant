import { describe, expect, it } from "vitest";
import { parseWritingSearchDeepLink } from "./useWritingSearchDeepLink";

describe("parseWritingSearchDeepLink", () => {
  it("parses valid params", () => {
    expect(
      parseWritingSearchDeepLink("?revisionId=5&start=10&end=17&q=climate"),
    ).toEqual({
      revisionId: 5,
      start: 10,
      end: 17,
      q: "climate",
    });
  });

  it("returns null when params are missing", () => {
    expect(parseWritingSearchDeepLink("")).toBeNull();
    expect(parseWritingSearchDeepLink("?revisionId=1")).toBeNull();
  });
});
