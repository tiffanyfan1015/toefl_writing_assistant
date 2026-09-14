import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { highlightSnippet } from "../lib/writingSearchSnippet";
import { navigateToWritingMatch } from "../lib/navigateToWritingMatch";
import type { WritingSearchMatch } from "../types/writingSearch";

type WritingFindBarProps = {
  open: boolean;
  compact: boolean;
  query: string;
  matches: WritingSearchMatch[];
  activeMatchIndex: number;
  total: number;
  truncated: boolean;
  loading: boolean;
  error: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onActiveMatchChange: (index: number) => void;
  onNavigateToMatch: () => void;
  onExpandResults: () => void;
};

export function WritingFindBar({
  open,
  compact,
  query,
  matches,
  activeMatchIndex,
  total,
  truncated,
  loading,
  error,
  onQueryChange,
  onClose,
  onActiveMatchChange,
  onNavigateToMatch,
  onExpandResults,
}: WritingFindBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const activeRowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [open]);

  useEffect(() => {
    if (!compact) {
      activeRowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [activeMatchIndex, matches.length, compact]);

  if (!open) return null;

  const totalLabel = truncated ? `${total}+` : String(total);
  const matchCountLabel =
    total > 0 ? `${activeMatchIndex + 1} of ${totalLabel}` : "0 of 0";

  const goToMatch = (match: WritingSearchMatch) => {
    navigate(navigateToWritingMatch(match, query));
    onNavigateToMatch();
  };

  const selectMatchAt = (index: number) => {
    onActiveMatchChange(index);
    const match = matches[index];
    if (match) {
      goToMatch(match);
    }
  };

  const handlePrev = () => {
    if (matches.length === 0) return;
    const next =
      activeMatchIndex <= 0 ? matches.length - 1 : activeMatchIndex - 1;
    selectMatchAt(next);
  };

  const handleNext = () => {
    if (matches.length === 0) return;
    const next =
      activeMatchIndex >= matches.length - 1 ? 0 : activeMatchIndex + 1;
    selectMatchAt(next);
  };

  return (
    <div
      className={`writing-find-bar${compact ? " is-compact" : ""}`}
      role="search"
    >
      <div className="writing-find-controls">
        <Search size={16} className="writing-find-icon" aria-hidden />
        <input
          ref={inputRef}
          className="writing-find-input"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={onExpandResults}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onClose();
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              handleNext();
            }
          }}
          placeholder="Find in your writing..."
          aria-label="Find in your writing"
        />
        <span className="writing-find-count" aria-live="polite">
          {matchCountLabel}
        </span>
        <div className="writing-find-actions">
          <button
            type="button"
            className="icon-button"
            onClick={handlePrev}
            disabled={matches.length === 0}
            aria-label="Previous match"
          >
            <ChevronUp size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={handleNext}
            disabled={matches.length === 0}
            aria-label="Next match"
          >
            <ChevronDown size={16} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close find"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!compact && (
        <div className="writing-find-results" aria-live="polite">
          {loading && <p className="writing-find-status">Searching...</p>}
          {error && <p className="writing-find-error">{error}</p>}
          {!loading && !error && query.trim().length < 2 && (
            <p className="writing-find-status">Type at least 2 characters.</p>
          )}
          {!loading &&
            !error &&
            query.trim().length >= 2 &&
            matches.length === 0 && (
              <p className="writing-find-status">No matches found.</p>
            )}
          {truncated && (
            <p className="writing-find-status">
              Showing first {matches.length} of {total} matches.
            </p>
          )}
          {matches.map((match, index) => {
            const segments = highlightSnippet(match.snippet, query);
            return (
              <button
                key={`${match.revisionId}-${match.startOffset}-${index}`}
                ref={index === activeMatchIndex ? activeRowRef : undefined}
                type="button"
                className={`writing-find-result ${index === activeMatchIndex ? "is-active" : ""}`}
                onClick={() => {
                  onActiveMatchChange(index);
                  goToMatch(match);
                }}
              >
                <div className="writing-find-result-meta">
                  <strong>{match.questionTitle}</strong>
                  <span>{match.questionType}</span>
                  <span>{match.revisionLabel}</span>
                </div>
                <p className="writing-find-result-snippet">
                  {segments.map((segment, segmentIndex) =>
                    segment.highlighted ? (
                      <mark key={segmentIndex}>{segment.text}</mark>
                    ) : (
                      <span key={segmentIndex}>{segment.text}</span>
                    ),
                  )}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
