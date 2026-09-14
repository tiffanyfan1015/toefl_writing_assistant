export type HighlightSegment = {
  text: string;
  highlighted: boolean;
};

export function highlightSnippet(
  snippet: string,
  query: string,
): HighlightSegment[] {
  if (!query.trim()) {
    return [{ text: snippet, highlighted: false }];
  }

  const lowerSnippet = snippet.toLowerCase();
  const lowerQuery = query.trim().toLowerCase();
  const segments: HighlightSegment[] = [];
  let cursor = 0;

  while (cursor < snippet.length) {
    const foundAt = lowerSnippet.indexOf(lowerQuery, cursor);
    if (foundAt === -1) {
      segments.push({ text: snippet.slice(cursor), highlighted: false });
      break;
    }

    if (foundAt > cursor) {
      segments.push({
        text: snippet.slice(cursor, foundAt),
        highlighted: false,
      });
    }

    segments.push({
      text: snippet.slice(foundAt, foundAt + lowerQuery.length),
      highlighted: true,
    });
    cursor = foundAt + lowerQuery.length;
  }

  return segments;
}
