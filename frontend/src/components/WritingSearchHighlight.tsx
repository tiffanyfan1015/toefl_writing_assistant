import { useEffect, useMemo, useRef } from "react";
import { FindHighlightedText } from "./FindHighlightedText";
import { highlightTextMatches } from "../lib/writingTextHighlight";

type WritingSearchHighlightProps = {
  text: string;
  query: string;
  activeStart: number;
  activeEnd: number;
};

export function WritingSearchHighlight({
  text,
  query,
  activeStart,
  activeEnd,
}: WritingSearchHighlightProps) {
  const activeMarkRef = useRef<HTMLElement>(null);
  const segments = useMemo(
    () => highlightTextMatches(text, query, activeStart, activeEnd),
    [text, query, activeStart, activeEnd],
  );

  useEffect(() => {
    activeMarkRef.current?.scrollIntoView({
      block: "nearest",
      behavior: "instant",
    });
  }, [text, query, activeStart, activeEnd]);

  return (
    <div className="writing-search-highlight card" data-testid="writing-search-highlight">
      <p className="writing-search-highlight-label">Found in this revision</p>
      <p className="writing-search-highlight-text">
        <FindHighlightedText segments={segments} activeMarkRef={activeMarkRef} />
      </p>
    </div>
  );
}
