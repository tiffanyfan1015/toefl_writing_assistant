import type { WritingSearchMatch } from "../types/writingSearch";

export function navigateToWritingMatch(
  match: WritingSearchMatch,
  q: string,
): string {
  const params = new URLSearchParams({
    revisionId: String(match.revisionId),
    start: String(match.startOffset),
    end: String(match.endOffset),
    q,
  });
  return `/practice/${match.questionId}?${params.toString()}`;
}

export function isWritingRoute(pathname: string): boolean {
  return !pathname.startsWith("/speaking");
}
