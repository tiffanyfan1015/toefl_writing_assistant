export type TextHighlightSegment = {
  text: string;
  variant: "plain" | "match" | "active-match";
};

export type TextMatchRange = {
  start: number;
  end: number;
};

export function findQueryMatchRanges(
  text: string,
  query: string,
): TextMatchRange[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const lowerText = text.toLowerCase();
  const lowerQuery = trimmed.toLowerCase();
  const matches: TextMatchRange[] = [];
  let cursor = 0;

  while (cursor < lowerText.length) {
    const foundAt = lowerText.indexOf(lowerQuery, cursor);
    if (foundAt === -1) break;

    matches.push({
      start: foundAt,
      end: foundAt + lowerQuery.length,
    });
    cursor = foundAt + 1;
  }

  return matches;
}

export function highlightTextMatches(
  text: string,
  query: string,
  activeStart: number,
  activeEnd: number,
): TextHighlightSegment[] {
  const matches = findQueryMatchRanges(text, query);
  if (matches.length === 0) {
    return [{ text, variant: "plain" }];
  }

  const segments: TextHighlightSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start > cursor) {
      segments.push({
        text: text.slice(cursor, match.start),
        variant: "plain",
      });
    }

    const isActive = match.start === activeStart && match.end === activeEnd;
    segments.push({
      text: text.slice(match.start, match.end),
      variant: isActive ? "active-match" : "match",
    });
    cursor = match.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), variant: "plain" });
  }

  return segments;
}

export function resolveEditorFindRange(
  text: string,
  query: string,
  preferredStart: number,
  preferredEnd: number,
): TextMatchRange | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const slice = text.slice(preferredStart, preferredEnd);
  if (slice.toLowerCase() === trimmed.toLowerCase()) {
    return { start: preferredStart, end: preferredEnd };
  }

  const ranges = findQueryMatchRanges(text, trimmed);
  if (ranges.length === 0) return null;

  const preferred = ranges.find(
    (range) => range.start === preferredStart && range.end === preferredEnd,
  );
  if (preferred) return preferred;

  const atOrAfter = ranges.find((range) => range.start >= preferredStart);
  return atOrAfter ?? ranges[0];
}

export function highlightInactiveTextMatches(
  text: string,
  query: string,
  activeStart: number,
  activeEnd: number,
): TextHighlightSegment[] {
  return highlightTextMatches(text, query, activeStart, activeEnd).map(
    (segment) =>
      segment.variant === "active-match"
        ? { ...segment, variant: "plain" }
        : segment,
  );
}
