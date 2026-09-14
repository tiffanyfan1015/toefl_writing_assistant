import type { RefObject } from "react";
import type { TextHighlightSegment } from "../lib/writingTextHighlight";

type FindHighlightedTextProps = {
  segments: TextHighlightSegment[];
  className?: string;
  activeMarkRef?: RefObject<HTMLElement | null>;
};

export function FindHighlightedText({
  segments,
  className,
  activeMarkRef,
}: FindHighlightedTextProps) {
  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.variant === "plain") {
          return <span key={index}>{segment.text}</span>;
        }

        return (
          <mark
            key={index}
            ref={segment.variant === "active-match" ? activeMarkRef : undefined}
            className={
              segment.variant === "active-match" ? "is-active-match" : undefined
            }
          >
            {segment.text}
          </mark>
        );
      })}
    </span>
  );
}
