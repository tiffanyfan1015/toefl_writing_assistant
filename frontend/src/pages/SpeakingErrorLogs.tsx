import { useEffect, useState } from "react";
import {
  Check,
  ChevronRight,
  Headphones,
  MessageSquare,
  Mic,
  Repeat2,
  ShieldAlert,
  Star,
  Quote,
} from "lucide-react";
import { api } from "../api";

const ERROR_CATEGORIES = [
  {
    id: "Pronunciation and Intelligibility",
    label: "Pronunciation and Intelligibility",
    description:
      "Sound accuracy, clarity, and whether the response is easy to understand.",
    icon: Mic,
  },
  {
    id: "Fluency and Pausing",
    label: "Fluency and Pausing",
    description: "Flow, pause frequency, hesitations, and broken delivery.",
    icon: Repeat2,
  },
  {
    id: "Rhythm and Intonation",
    label: "Rhythm and Intonation",
    description: "Natural stress, pacing, and intonation patterns.",
    icon: Headphones,
  },
  {
    id: "Grammar and Word Choice",
    label: "Grammar and Word Choice",
    description:
      "Grammar accuracy, tense, sentence shape, and vocabulary choice.",
    icon: MessageSquare,
  },
  {
    id: "Elaboration",
    label: "Elaboration",
    description: "Depth of explanation, support, and development of ideas.",
    icon: ShieldAlert,
  },
  {
    id: "Idiomatic Word Choice",
    label: "Idiomatic Word Choice",
    description: "Natural phrasing, collocations, and precise word choice.",
    icon: Quote,
  },
  {
    id: "Task Relevance and Content Development",
    label: "Task Relevance and Content Development",
    description: "Whether the answer stays on task and develops ideas clearly.",
    icon: ShieldAlert,
  },
] as const;

type ErrorCategory = (typeof ERROR_CATEGORIES)[number]["id"];

interface SpeakingErrorLog {
  id: number;
  errorType: string;
  incorrect: string;
  suggestion: string;
  explanation: string;
  important: boolean;
  createdAt: string;
  part: {
    transcript: string;
    partIndex: number;
    session: {
      question: {
        title: string;
      };
    };
  };
}

const normalizeCategory = (type: string): ErrorCategory => {
  const normalized = type.trim().toLowerCase();
  if (normalized.includes("pronunciation"))
    return "Pronunciation and Intelligibility";
  if (normalized.includes("fluency")) return "Fluency and Pausing";
  if (normalized.includes("intonation") || normalized.includes("rhythm"))
    return "Rhythm and Intonation";
  if (normalized.includes("elaboration")) return "Elaboration";
  if (normalized.includes("idiomatic")) return "Idiomatic Word Choice";
  if (normalized.includes("grammar") || normalized.includes("word choice"))
    return "Grammar and Word Choice";
  return "Task Relevance and Content Development";
};

const SpeakingErrorLogs = () => {
  const [logs, setLogs] = useState<SpeakingErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<ErrorCategory[]>(
    ERROR_CATEGORIES.map((category) => category.id),
  );
  const [showImportantOnly, setShowImportantOnly] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api
      .get("/speaking/error-logs")
      .then((res) => setLogs(res.data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleCategory = (category: ErrorCategory) => {
    setSelectedCategories((prev) => {
      if (prev.includes(category)) {
        return prev.length === 1
          ? prev
          : prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  const categoryCounts = ERROR_CATEGORIES.reduce<
    Record<ErrorCategory, number>
  >(
    (acc, category) => {
      acc[category.id] = logs.filter(
        (log) => normalizeCategory(log.errorType) === category.id,
      ).length;
      return acc;
    },
    {
      "Pronunciation and Intelligibility": 0,
      "Fluency and Pausing": 0,
      "Rhythm and Intonation": 0,
      "Grammar and Word Choice": 0,
      Elaboration: 0,
      "Idiomatic Word Choice": 0,
      "Task Relevance and Content Development": 0,
    },
  );

  const toggleImportant = async (log: SpeakingErrorLog) => {
    const nextImportant = !log.important;
    setSaveError("");
    setLogs((prev) =>
      prev.map((item) =>
        item.id === log.id ? { ...item, important: nextImportant } : item,
      ),
    );

    try {
      const res = await api.patch(`/speaking/error-logs/${log.id}/important`, {
        important: nextImportant,
      });
      setLogs((prev) =>
        prev.map((item) =>
          item.id === log.id ? { ...item, important: res.data.important } : item,
        ),
      );
    } catch (err) {
      console.error(err);
      setLogs((prev) =>
        prev.map((item) =>
          item.id === log.id ? { ...item, important: log.important } : item,
        ),
      );
      setSaveError("Could not save the star. Please try again.");
    }
  };

  const visibleLogs = logs.filter((log) => {
    const matchesCategory = selectedCategories.includes(
      normalizeCategory(log.errorType),
    );
    const matchesImportance = !showImportantOnly || log.important;
    return matchesCategory && matchesImportance;
  });

  const importantCount = logs.filter((log) => log.important).length;

  return (
    <div className="animate-fade">
      <div className="error-log-header speaking-error-header">
        <div>
          <h1 className="text-3xl font-bold mb-4">Speaking Error Log</h1>
          <p className="text-muted">
            Track pronunciation, fluency, intonation, elaboration, idiomatic
            word choice, and task development issues from speaking attempts.
          </p>
        </div>
        <div className="error-log-total">
          <span>{logs.length}</span>
          tracked edits
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state">Loading logs...</div>
      ) : (
        <div className="error-review-layout speaking-error-layout">
          <aside className="error-filter-panel">
            <h2>Filters</h2>
            <p className="filter-title">Themes</p>
            <p className="filter-copy">
              View speaking errors by delivery and content theme.
            </p>
            {saveError && <div className="save-error">{saveError}</div>}

            <button
              className={`important-filter ${showImportantOnly ? "is-selected" : ""}`}
              onClick={() => setShowImportantOnly((prev) => !prev)}
            >
              <Star
                size={18}
                className={showImportantOnly ? "star-filled" : ""}
              />
              <span>Important only</span>
              <span className="filter-count">{importantCount}</span>
            </button>

            <div className="filter-options">
              {ERROR_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    className={`filter-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span className="filter-checkbox" aria-hidden="true">
                      {isSelected && <Check size={13} />}
                    </span>
                    <Icon size={18} />
                    <span className="filter-label">{category.label}</span>
                    <span className="filter-count">
                      {categoryCounts[category.id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="error-results-panel">
            {logs.length === 0 ? (
              <div className="empty-state">
                No speaking errors logged yet. Keep practicing!
              </div>
            ) : visibleLogs.length === 0 ? (
              <div className="empty-state">
                No edits match the selected filters.
              </div>
            ) : (
              ERROR_CATEGORIES.filter((category) =>
                selectedCategories.includes(category.id),
              ).map((category) => {
                const categoryLogs = visibleLogs.filter(
                  (log) => normalizeCategory(log.errorType) === category.id,
                );
                if (categoryLogs.length === 0) return null;
                const Icon = category.icon;

                return (
                  <div key={category.id} className="error-category-section">
                    <div className="error-category-heading speaking-category-heading">
                      <div className="category-icon">
                        <Icon size={19} />
                      </div>
                      <div>
                        <h2>{category.label}</h2>
                        <p>{category.description}</p>
                      </div>
                    </div>

                    <div className="error-card-list">
                      {categoryLogs.map((log, index) => (
                        <article
                          key={log.id}
                          className={`error-edit-card speaking-error-card category-${category.id.replaceAll(" ", "-").toLowerCase()}`}
                        >
                          <div className="edit-card-topline">
                            <span className="edit-number">{index + 1}</span>
                            <span className="task-pill">
                              Q{log.part.partIndex}
                            </span>
                            <span className="edit-date">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              className={`star-button ${log.important ? "is-important" : ""}`}
                              onClick={() => toggleImportant(log)}
                              aria-label={
                                log.important
                                  ? "Remove important mark"
                                  : "Mark as important"
                              }
                            >
                              <Star size={17} />
                            </button>
                          </div>

                          <div className="edit-comparison">
                            <span className="edit-incorrect">
                              {log.incorrect}
                            </span>
                            <ChevronRight size={17} className="edit-arrow" />
                            <span className="edit-suggestion">
                              {log.suggestion}
                            </span>
                          </div>

                          {log.explanation && (
                            <p className="edit-explanation">{log.explanation}</p>
                          )}

                          <div className="edit-source">
                            <span>{log.part.session.question.title}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default SpeakingErrorLogs;
