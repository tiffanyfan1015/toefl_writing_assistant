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

export type WritingSearchResponse = {
  matches: WritingSearchMatch[];
  total: number;
  truncated: boolean;
};

export type WritingSearchDeepLinkParams = {
  revisionId: number;
  start: number;
  end: number;
  q: string;
};
