import {
  findQueryMatchRanges,
  resolveEditorFindRange,
} from "./writingTextHighlight";
import type { WritingSearchMatch } from "../types/writingSearch";

export type EditorFindHighlightState = {
  query: string;
  activeStart: number;
  activeEnd: number;
  revealActiveMatch?: boolean;
};

export type EditorFindRegistration = {
  questionId: number;
  getText: () => string;
  getLatestRevisionId: () => number | null;
  canHighlight: () => boolean;
  setHighlight: (highlight: EditorFindHighlightState | null) => void;
};

type SyncEditorFindHighlightArgs = {
  open: boolean;
  query: string;
  matches: WritingSearchMatch[];
  activeMatchIndex: number;
  registration: EditorFindRegistration | null;
  revealActiveMatch?: boolean;
};

export function syncEditorFindHighlight({
  open,
  query,
  matches,
  activeMatchIndex,
  registration,
  revealActiveMatch = false,
}: SyncEditorFindHighlightArgs): void {
  if (!registration) return;

  const clear = () => registration.setHighlight(null);

  if (!open || !registration.canHighlight()) {
    clear();
    return;
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    clear();
    return;
  }

  const editorText = registration.getText();
  const activeMatch = matches[activeMatchIndex];
  if (
    activeMatch &&
    activeMatch.questionId === registration.questionId &&
    activeMatch.revisionId === registration.getLatestRevisionId()
  ) {
    const resolved = resolveEditorFindRange(
      editorText,
      trimmed,
      activeMatch.startOffset,
      activeMatch.endOffset,
    );
    if (resolved) {
      registration.setHighlight({
        query: trimmed,
        activeStart: resolved.start,
        activeEnd: resolved.end,
        ...(revealActiveMatch ? { revealActiveMatch: true } : {}),
      });
      return;
    }
  }

  const localRanges = findQueryMatchRanges(editorText, trimmed);
  if (localRanges.length > 0) {
    const editorMatchIndexes = matches
      .map((match, index) => ({ match, index }))
      .filter(
        ({ match }) =>
          match.questionId === registration.questionId &&
          match.revisionId === registration.getLatestRevisionId(),
      )
      .map(({ index }) => index);

    const positionInEditorMatches =
      editorMatchIndexes.indexOf(activeMatchIndex);
    const localIndex =
      positionInEditorMatches >= 0
        ? positionInEditorMatches % localRanges.length
        : 0;
    const localRange = localRanges[localIndex] ?? localRanges[0];

    registration.setHighlight({
      query: trimmed,
      activeStart: localRange.start,
      activeEnd: localRange.end,
      ...(revealActiveMatch ? { revealActiveMatch: true } : {}),
    });
    return;
  }

  clear();
}
