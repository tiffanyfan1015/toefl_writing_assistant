import { useEffect, useState } from 'react';
import { Book, Check, ChevronRight, ClipboardList, MessageCircle, PenLine, Quote, ShieldCheck, Star, Users } from 'lucide-react';
import { api } from '../api';

const ERROR_CATEGORIES = [
  {
    id: 'Grammar and Spelling',
    label: 'Grammar and Spelling',
    description: 'Grammar, spelling, punctuation, word form, and sentence mechanics.',
    icon: PenLine,
  },
  {
    id: 'Elaboration',
    label: 'Elaboration',
    description: 'Support, examples, detail, and clarity of development.',
    icon: MessageCircle,
  },
  {
    id: 'Tone and Social Conventions',
    label: 'Tone and Social Conventions',
    description: 'Politeness, register, email conventions, and discussion etiquette.',
    icon: ShieldCheck,
  },
  {
    id: 'Idiomatic Word Choice',
    label: 'Idiomatic Word Choice',
    description: 'Natural phrasing, precise wording, collocations, and idiomatic expression.',
    icon: Quote,
  },
  {
    id: 'Relevance to Discussion',
    label: 'Relevance to Discussion',
    description: 'Connection to the professor question, classmates, and discussion purpose.',
    icon: Users,
  },
  {
    id: 'Adherence to Task',
    label: 'Adherence to Task',
    description: 'Required points, relevance, completeness, and prompt alignment.',
    icon: ClipboardList,
  },
] as const;

type ErrorCategory = typeof ERROR_CATEGORIES[number]['id'];

interface ErrorLog {
  id: number;
  errorType: string;
  incorrect: string;
  suggestion: string;
  explanation: string;
  important: boolean;
  createdAt: string;
  revision: {
    text: string;
    submission: {
      question: {
        type: string;
        title: string;
      }
    }
  }
}

const normalizeCategory = (type: string): ErrorCategory => {
  const normalized = type.trim().toLowerCase();
  if (normalized === 'grammar' || normalized === 'spelling' || normalized === 'grammar and spelling') {
    return 'Grammar and Spelling';
  }
  if (normalized === 'tone' || normalized === 'social conventions' || normalized === 'tone and social conventions') {
    return 'Tone and Social Conventions';
  }
  if (normalized === 'adherence' || normalized === 'task' || normalized === 'adherence to task') {
    return 'Adherence to Task';
  }
  if (normalized === 'idiomatic word choice' || normalized === 'word choice' || normalized === 'idiomatic') {
    return 'Idiomatic Word Choice';
  }
  if (normalized === 'relevance to discussion' || normalized === 'relevance' || normalized === 'discussion relevance') {
    return 'Relevance to Discussion';
  }
  return ERROR_CATEGORIES.some(category => category.id === type) ? type as ErrorCategory : 'Elaboration';
};

const ErrorLogs = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ErrorCategory[]>(
    ERROR_CATEGORIES.map(category => category.id)
  );
  const [showImportantOnly, setShowImportantOnly] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    api.get('/error-logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const toggleCategory = (category: ErrorCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.length === 1 ? prev : prev.filter(item => item !== category);
      }
      return [...prev, category];
    });
  };

  const categoryCounts = ERROR_CATEGORIES.reduce<Record<ErrorCategory, number>>((acc, category) => {
    acc[category.id] = logs.filter(log => normalizeCategory(log.errorType) === category.id).length;
    return acc;
  }, {
    'Grammar and Spelling': 0,
    'Elaboration': 0,
    'Tone and Social Conventions': 0,
    'Idiomatic Word Choice': 0,
    'Relevance to Discussion': 0,
    'Adherence to Task': 0,
  });

  const toggleImportant = async (log: ErrorLog) => {
    const nextImportant = !log.important;
    setSaveError('');
    setLogs(prev => prev.map(item => item.id === log.id ? { ...item, important: nextImportant } : item));

    try {
      const res = await api.patch(`/error-logs/${log.id}/important`, {
        important: nextImportant,
      });
      setLogs(prev => prev.map(item => item.id === log.id ? { ...item, important: res.data.important } : item));
    } catch (err) {
      console.error(err);
      setLogs(prev => prev.map(item => item.id === log.id ? { ...item, important: log.important } : item));
      setSaveError('Could not save the star. Please restart the backend if the Prisma schema was just updated.');
    }
  };

  const visibleLogs = logs.filter(log => {
    const matchesCategory = selectedCategories.includes(normalizeCategory(log.errorType));
    const matchesImportance = !showImportantOnly || log.important;
    return matchesCategory && matchesImportance;
  });
  const importantCount = logs.filter(log => log.important).length;

  return (
    <div className="animate-fade">
      <div className="error-log-header">
        <div>
          <h1 className="text-3xl font-bold mb-4">Personal Error Log</h1>
          <p className="text-muted">
            Review your edits by TOEFL scoring theme and focus on the patterns that cost the most points.
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
        <div className="error-review-layout">
          <aside className="error-filter-panel">
            <h2>Filters</h2>
            <p className="filter-title">Themes</p>
            <p className="filter-copy">View edits and their explanations by theme.</p>
            {saveError && <div className="save-error">{saveError}</div>}

            <button
              className={`important-filter ${showImportantOnly ? 'is-selected' : ''}`}
              onClick={() => setShowImportantOnly(prev => !prev)}
            >
              <Star size={18} className={showImportantOnly ? 'star-filled' : ''} />
              <span>Important only</span>
              <span className="filter-count">{importantCount}</span>
            </button>

            <div className="filter-options">
              {ERROR_CATEGORIES.map(category => {
                const Icon = category.icon;
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    className={`filter-option ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => toggleCategory(category.id)}
                  >
                    <span className="filter-checkbox" aria-hidden="true">
                      {isSelected && <Check size={13} />}
                    </span>
                    <Icon size={18} />
                    <span className="filter-label">{category.label}</span>
                    <span className="filter-count">{categoryCounts[category.id]}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="error-results-panel">
            {logs.length === 0 ? (
              <div className="empty-state">
              No errors logged yet. Keep practicing!
              </div>
            ) : visibleLogs.length === 0 ? (
              <div className="empty-state">No edits match the selected filters.</div>
            ) : (
              ERROR_CATEGORIES.filter(category => selectedCategories.includes(category.id)).map(category => {
                const categoryLogs = visibleLogs.filter(log => normalizeCategory(log.errorType) === category.id);
                if (categoryLogs.length === 0) return null;
                const Icon = category.icon;

                return (
                  <div key={category.id} className="error-category-section">
                    <div className="error-category-heading">
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
                        <article key={log.id} className={`error-edit-card category-${category.id.replaceAll(' ', '-').toLowerCase()}`}>
                          <div className="edit-card-topline">
                            <span className="edit-number">{index + 1}</span>
                            <span className="task-pill">{log.revision.submission.question.type}</span>
                            <span className="edit-date">{new Date(log.createdAt).toLocaleDateString()}</span>
                            <button
                              className={`star-button ${log.important ? 'is-important' : ''}`}
                              onClick={() => toggleImportant(log)}
                              aria-label={log.important ? 'Remove important mark' : 'Mark as important'}
                            >
                              <Star size={17} />
                            </button>
                          </div>

                          <div className="edit-comparison">
                            <span className="edit-incorrect">{log.incorrect}</span>
                            <ChevronRight size={17} className="edit-arrow" />
                            <span className="edit-suggestion">{log.suggestion}</span>
                          </div>

                          {log.explanation && (
                            <p className="edit-explanation">{log.explanation}</p>
                          )}

                          <div className="edit-source">
                            <Book size={14} />
                            <span>{log.revision.submission.question.title}</span>
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

export default ErrorLogs;
