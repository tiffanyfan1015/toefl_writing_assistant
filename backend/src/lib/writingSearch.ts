export type RevisionSearchRow = {
  revisionId: number;
  revisionText: string;
  revisionCreatedAt: Date;
  submissionId: number;
  questionId: number;
  questionTitle: string;
  questionType: string;
  revisionIndex: number;
  revisionCount: number;
};

export type WritingSearchMatch = {
  questionId: number;
  questionTitle: string;
  questionType: string;
  revisionId: number;
  revisionIndex: number;
  revisionLabel: string;
  startOffset: number;
  endOffset: number;
  snippet: string;
};

export type WritingSearchResult = {
  matches: WritingSearchMatch[];
  total: number;
  truncated: boolean;
};

const SNIPPET_RADIUS = 40;
const DEFAULT_LIMIT = 200;

export function revisionLabelForIndex(
  revisionIndex: number,
  revisionCount: number,
): string {
  if (revisionIndex === 0) return "LATEST";
  return `VERSION ${revisionCount - revisionIndex}`;
}

export function groupRevisionsByQuestion(
  rows: Omit<RevisionSearchRow, "revisionIndex" | "revisionCount">[],
): RevisionSearchRow[] {
  const byQuestion = new Map<
    number,
    Omit<RevisionSearchRow, "revisionIndex" | "revisionCount">[]
  >();

  for (const row of rows) {
    const list = byQuestion.get(row.questionId) ?? [];
    list.push(row);
    byQuestion.set(row.questionId, list);
  }

  const grouped: RevisionSearchRow[] = [];

  const questionIds = [...byQuestion.keys()].sort((a, b) => a - b);
  for (const questionId of questionIds) {
    const questionRows = byQuestion.get(questionId)!;
    const sorted = [...questionRows].sort(
      (a, b) => b.revisionCreatedAt.getTime() - a.revisionCreatedAt.getTime(),
    );
    const revisionCount = sorted.length;
    sorted.forEach((row, revisionIndex) => {
      grouped.push({ ...row, revisionIndex, revisionCount });
    });
  }

  return grouped;
}

function buildSnippet(text: string, start: number, end: number): string {
  const before = text.slice(Math.max(0, start - SNIPPET_RADIUS), start);
  const match = text.slice(start, end);
  const after = text.slice(end, Math.min(text.length, end + SNIPPET_RADIUS));
  const prefix = start > SNIPPET_RADIUS ? "…" : "";
  const suffix = end + SNIPPET_RADIUS < text.length ? "…" : "";
  return `${prefix}${before}${match}${after}${suffix}`;
}

export function findWritingMatches(
  query: string,
  revisions: RevisionSearchRow[],
  options?: { limit?: number },
): WritingSearchResult {
  const normalizedQuery = query.trim().toLowerCase();
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const matches: WritingSearchMatch[] = [];
  let total = 0;

  for (const revision of revisions) {
    const haystack = revision.revisionText;
    const lowerHaystack = haystack.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < lowerHaystack.length) {
      const foundAt = lowerHaystack.indexOf(normalizedQuery, searchFrom);
      if (foundAt === -1) break;

      const startOffset = foundAt;
      const endOffset = foundAt + normalizedQuery.length;
      total += 1;

      if (matches.length < limit) {
        matches.push({
          questionId: revision.questionId,
          questionTitle: revision.questionTitle,
          questionType: revision.questionType,
          revisionId: revision.revisionId,
          revisionIndex: revision.revisionIndex,
          revisionLabel: revisionLabelForIndex(
            revision.revisionIndex,
            revision.revisionCount,
          ),
          startOffset,
          endOffset,
          snippet: buildSnippet(haystack, startOffset, endOffset),
        });
      }

      if (matches.length >= limit) {
        return {
          matches,
          total: Math.max(total, limit),
          truncated: true,
        };
      }

      searchFrom = foundAt + 1;
    }
  }

  return {
    matches,
    total,
    truncated: total > limit,
  };
}

export function validateWritingSearchQuery(
  raw: string | undefined,
): string | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length < 2 || trimmed.length > 200) return null;
  return trimmed;
}
