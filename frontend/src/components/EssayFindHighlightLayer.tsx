import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { FindHighlightedText } from "./FindHighlightedText";
import { highlightTextMatches } from "../lib/writingTextHighlight";
import { scrollTextareaToRange } from "../lib/scrollTextareaToRange";

type EssayFindHighlightLayerProps = {
  text: string;
  query: string;
  activeStart: number;
  activeEnd: number;
  revealActiveMatch?: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
};

export function EssayFindHighlightLayer({
  text,
  query,
  activeStart,
  activeEnd,
  revealActiveMatch = false,
  textareaRef,
}: EssayFindHighlightLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const segments = useMemo(
    () => highlightTextMatches(text, query, activeStart, activeEnd),
    [text, query, activeStart, activeEnd],
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const syncScroll = () => {
      setScrollTop(textarea.scrollTop);
    };

    syncScroll();
    textarea.addEventListener("scroll", syncScroll);
    const resizeObserver = new ResizeObserver(syncScroll);
    resizeObserver.observe(textarea);

    return () => {
      textarea.removeEventListener("scroll", syncScroll);
      resizeObserver.disconnect();
    };
  }, [textareaRef, text, query, activeStart, activeEnd]);

  useEffect(() => {
    if (!revealActiveMatch) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    requestAnimationFrame(() => {
      scrollTextareaToRange(textarea, activeStart, activeEnd);
      textarea.focus({ preventScroll: true });
      setScrollTop(textarea.scrollTop);
    });
  }, [
    textareaRef,
    revealActiveMatch,
    activeStart,
    activeEnd,
  ]);

  return (
    <div
      ref={layerRef}
      className="essay-find-highlight-layer"
      aria-hidden="true"
      data-testid="essay-find-highlight-layer"
    >
      <div
        className="essay-find-highlight-layer-inner"
        style={{ transform: `translateY(-${scrollTop}px)` }}
      >
        <FindHighlightedText segments={segments} />
      </div>
    </div>
  );
}
