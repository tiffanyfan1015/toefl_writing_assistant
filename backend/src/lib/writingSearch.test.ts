import { describe, expect, it } from "vitest";
import {
  findWritingMatches,
  groupRevisionsByQuestion,
  revisionLabelForIndex,
  validateWritingSearchQuery,
  type RevisionSearchRow,
} from "./writingSearch.js";

function row(
  overrides: Partial<RevisionSearchRow> &
    Pick<RevisionSearchRow, "revisionId" | "questionId" | "revisionText">,
): RevisionSearchRow {
  return {
    revisionCreatedAt: new Date("2026-01-01"),
    submissionId: 1,
    questionTitle: "Q",
    questionType: "Email",
    revisionIndex: 0,
    revisionCount: 1,
    ...overrides,
  };
}

describe("revisionLabelForIndex", () => {
  it("labels latest and historical revisions like Practice", () => {
    expect(revisionLabelForIndex(0, 3)).toBe("LATEST");
    expect(revisionLabelForIndex(1, 3)).toBe("VERSION 2");
    expect(revisionLabelForIndex(2, 3)).toBe("VERSION 1");
  });
});

describe("groupRevisionsByQuestion", () => {
  it("assigns revisionIndex newest-first within each question", () => {
    const grouped = groupRevisionsByQuestion([
      {
        revisionId: 10,
        revisionText: "old",
        revisionCreatedAt: new Date("2026-01-01"),
        submissionId: 1,
        questionId: 1,
        questionTitle: "A",
        questionType: "Email",
      },
      {
        revisionId: 11,
        revisionText: "new",
        revisionCreatedAt: new Date("2026-02-01"),
        submissionId: 1,
        questionId: 1,
        questionTitle: "A",
        questionType: "Email",
      },
    ]);

    expect(grouped).toHaveLength(2);
    const latest = grouped.find((r) => r.revisionId === 11);
    const older = grouped.find((r) => r.revisionId === 10);
    expect(latest?.revisionIndex).toBe(0);
    expect(older?.revisionIndex).toBe(1);
    expect(latest?.revisionCount).toBe(2);
  });
});

describe("findWritingMatches", () => {
  it("returns case-insensitive matches across revisions", () => {
    const result = findWritingMatches("climate", [
      row({
        revisionId: 1,
        questionId: 1,
        revisionText: "The climate is changing.",
      }),
      row({ revisionId: 2, questionId: 2, revisionText: "No match here." }),
      row({
        revisionId: 3,
        questionId: 3,
        revisionText: "CLIMATE policy matters.",
      }),
    ]);

    expect(result.total).toBe(2);
    expect(result.matches).toHaveLength(2);
    expect(result.matches.map((m) => m.questionId).sort()).toEqual([1, 3]);
    expect(result.matches[0]?.snippet.toLowerCase()).toContain("climate");
  });

  it("truncates matches at the limit", () => {
    const text = "aa ".repeat(300);
    const result = findWritingMatches(
      "aa",
      [row({ revisionId: 1, questionId: 1, revisionText: text })],
      {
        limit: 5,
      },
    );

    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(result.matches).toHaveLength(5);
    expect(result.truncated).toBe(true);
  });

  it("orders capped matches deterministically by question id", () => {
    const grouped = groupRevisionsByQuestion([
      {
        revisionId: 1,
        revisionText: "hit here",
        revisionCreatedAt: new Date("2026-01-01"),
        submissionId: 1,
        questionId: 2,
        questionTitle: "B",
        questionType: "Email",
      },
      {
        revisionId: 2,
        revisionText: "hit here",
        revisionCreatedAt: new Date("2026-01-01"),
        submissionId: 2,
        questionId: 1,
        questionTitle: "A",
        questionType: "Email",
      },
    ]);
    const result = findWritingMatches("hit", grouped, { limit: 1 });

    expect(result.matches[0]?.questionId).toBe(1);
  });
});

describe("validateWritingSearchQuery", () => {
  it("accepts trimmed queries between 2 and 200 chars", () => {
    expect(validateWritingSearchQuery("  ab  ")).toBe("ab");
    expect(validateWritingSearchQuery("a")).toBeNull();
    expect(validateWritingSearchQuery(" ")).toBeNull();
    expect(validateWritingSearchQuery("x".repeat(201))).toBeNull();
  });
});
