import type { WritingSearchDeepLinkParams } from "../types/writingSearch";

export function parseWritingSearchDeepLink(
  search: string,
): WritingSearchDeepLinkParams | null {
  const params = new URLSearchParams(search);
  const revisionId = Number.parseInt(params.get("revisionId") ?? "", 10);
  const start = Number.parseInt(params.get("start") ?? "", 10);
  const end = Number.parseInt(params.get("end") ?? "", 10);
  const q = params.get("q") ?? "";

  if (
    Number.isNaN(revisionId) ||
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end <= start ||
    !q.trim()
  ) {
    return null;
  }

  return { revisionId, start, end, q };
}
