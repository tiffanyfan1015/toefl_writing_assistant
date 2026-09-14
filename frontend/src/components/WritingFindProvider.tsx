import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { fetchWritingSearch } from "../api/writingSearch";
import {
  syncEditorFindHighlight,
  type EditorFindRegistration,
} from "../lib/editorFindSync";
import { isWritingRoute } from "../lib/navigateToWritingMatch";
import type { WritingSearchMatch } from "../types/writingSearch";
import { WritingFindBar } from "./WritingFindBar";

type WritingFindContextValue = {
  openFind: () => void;
  registerEditorFind: (registration: EditorFindRegistration | null) => void;
};

const WritingFindContext = createContext<WritingFindContextValue | null>(null);

export function useWritingFind() {
  const context = useContext(WritingFindContext);
  if (!context) {
    throw new Error("useWritingFind must be used within WritingFindProvider");
  }
  return context;
}

type WritingFindProviderProps = {
  children: ReactNode;
};

export function WritingFindProvider({ children }: WritingFindProviderProps) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<WritingSearchMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [compact, setCompact] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<number | null>(null);
  const searchRequestIdRef = useRef(0);
  const editorRegistrationRef = useRef<EditorFindRegistration | null>(null);
  const revealActiveMatchRef = useRef(false);
  const writingRoute = isWritingRoute(location.pathname);

  const syncEditorHighlight = useCallback(() => {
    syncEditorFindHighlight({
      open,
      query,
      matches,
      activeMatchIndex,
      registration: editorRegistrationRef.current,
      revealActiveMatch: revealActiveMatchRef.current,
    });
    revealActiveMatchRef.current = false;
  }, [open, query, matches, activeMatchIndex]);

  const registerEditorFind = useCallback(
    (registration: EditorFindRegistration | null) => {
      editorRegistrationRef.current = registration;
      syncEditorFindHighlight({
        open,
        query,
        matches,
        activeMatchIndex,
        registration,
        revealActiveMatch: revealActiveMatchRef.current,
      });
      revealActiveMatchRef.current = false;
    },
    [open, query, matches, activeMatchIndex],
  );

  const openFind = useCallback(() => {
    setCompact(false);
    setOpen(true);
  }, []);

  const closeFind = useCallback(() => {
    searchRequestIdRef.current += 1;
    setOpen(false);
    setCompact(false);
    setQuery("");
    setMatches([]);
    setTotal(0);
    setTruncated(false);
    setActiveMatchIndex(0);
    setError("");
    editorRegistrationRef.current?.setHighlight(null);
  }, []);

  useEffect(() => {
    if (!writingRoute) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setCompact(false);
        setOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [writingRoute]);

  useEffect(() => {
    if (!open || !writingRoute) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeFind();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, writingRoute, closeFind]);

  useEffect(() => {
    syncEditorHighlight();
  }, [syncEditorHighlight]);

  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setMatches([]);
      setTotal(0);
      setTruncated(false);
      setActiveMatchIndex(0);
      setLoading(false);
      setError("");
      return;
    }

    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => {
      const requestId = ++searchRequestIdRef.current;
      setLoading(true);
      setError("");
      fetchWritingSearch(trimmed)
        .then((result) => {
          if (requestId !== searchRequestIdRef.current) return;
          setMatches(result.matches);
          setTotal(result.total);
          setTruncated(result.truncated);
          setActiveMatchIndex(0);
          setCompact(false);
        })
        .catch((err) => {
          if (requestId !== searchRequestIdRef.current) return;
          console.error(err);
          setError("Search failed. Check that the backend is running.");
          setMatches([]);
          setTotal(0);
          setTruncated(false);
        })
        .finally(() => {
          if (requestId !== searchRequestIdRef.current) return;
          setLoading(false);
        });
    }, 250);

    return () => {
      if (debounceRef.current) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [open, query]);

  const contextValue = useMemo(
    () => ({ openFind, registerEditorFind }),
    [openFind, registerEditorFind],
  );

  return (
    <WritingFindContext.Provider value={contextValue}>
      {children}
      {writingRoute && (
        <WritingFindBar
          open={open}
          compact={compact}
          query={query}
          matches={matches}
          activeMatchIndex={activeMatchIndex}
          total={total}
          truncated={truncated}
          loading={loading}
          error={error}
          onQueryChange={(value) => {
            setQuery(value);
            setCompact(false);
          }}
          onClose={closeFind}
          onActiveMatchChange={(index) => {
            revealActiveMatchRef.current = true;
            setActiveMatchIndex(index);
          }}
          onNavigateToMatch={() => setCompact(true)}
          onExpandResults={() => setCompact(false)}
        />
      )}
    </WritingFindContext.Provider>
  );
}
