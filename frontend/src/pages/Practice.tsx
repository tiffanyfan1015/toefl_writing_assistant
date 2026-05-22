import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Timer, ChevronRight, AlertTriangle, History, CheckCircle2, Loader2, Sparkles, BookOpen, Star } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { api } from '../api';
import { mapRevisions, type ErrorLog, type Question, type Revision } from '../types';

const Practice = () => {
  const { id } = useParams();
  const questionId = id ? parseInt(id, 10) : Number.NaN;
  const [question, setQuestion] = useState<Question | null>(null);
  const [loadError, setLoadError] = useState('');
  const [text, setText] = useState('');
  const [comparisonBase, setComparisonBase] = useState('');
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [timeLeft, setTimeLeft] = useState(420);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [evalWarning, setEvalWarning] = useState('');
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const timerRef = useRef<number | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const pendingToggles = useRef(new Set<number>());

  const currentReport = selectedRevision ?? revisions[0];
  const invalidLink = !id || Number.isNaN(questionId);

  useEffect(() => {
    if (invalidLink) return;

    const controller = new AbortController();

    api
      .get<Question>(`/questions/${id}`, { signal: controller.signal })
      .then((res) => {
        setQuestion(res.data);
        setTimeLeft(res.data.type === 'Email' ? 420 : 600);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error(err);
          setLoadError('Could not load this question. Check that the backend is running.');
        }
      });

    api
      .get(`/questions/${id}/latest-submission`, { signal: controller.signal })
      .then((res) => {
        if (res.data) {
          setText(res.data.currentText);
          const mappedRevisions = mapRevisions(res.data.revisions);
          setRevisions(mappedRevisions);
          if (mappedRevisions.length > 0) {
            setComparisonBase(mappedRevisions[mappedRevisions.length - 1].text);
          }
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          console.error(err);
          setLoadError('Could not load your saved work. Check that the backend is running.');
        }
      });

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      controller.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, questionId, invalidLink]);

  useEffect(() => {
    if (!currentReport?.id) return;
    reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentReport?.id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatScore = (score: number | null) => {
    if (score === null) return '-';
    return Number.isInteger(score) ? score.toString() : score.toFixed(1);
  };

  const handleSave = async () => {
    if (isEvaluating || Number.isNaN(questionId)) return;
    setIsEvaluating(true);
    setSaveError('');
    setEvalWarning('');

    const selectedIdBeforeSave = selectedRevision?.id;

    try {
      const res = await api.post('/submissions', {
        questionId,
        text,
      });
      const mappedRevisions = mapRevisions(res.data.submission.revisions);
      setRevisions(mappedRevisions);

      if (selectedIdBeforeSave === selectedRevision?.id) {
        setSelectedRevision(mappedRevisions[0] ?? null);
      }

      if (res.data.evaluationFailed) {
        setEvalWarning('Your essay was saved, but AI grading failed. Try saving again.');
      }

      if (mappedRevisions.length > 1) {
        setComparisonBase(mappedRevisions[1].text);
      }
    } catch (err) {
      console.error(err);
      setSaveError('Submission failed. Please try again.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const toggleImportant = async (errorLog: ErrorLog) => {
    if (pendingToggles.current.has(errorLog.id)) return;
    pendingToggles.current.add(errorLog.id);

    const nextImportant = !errorLog.important;
    setSaveError('');

    const updateLogs = (logs: ErrorLog[]) =>
      logs.map((item) =>
        item.id === errorLog.id ? { ...item, important: nextImportant } : item,
      );

    setRevisions((prev) =>
      prev.map((rev) => ({ ...rev, errorLogs: updateLogs(rev.errorLogs) })),
    );
    setSelectedRevision((prev) =>
      prev ? { ...prev, errorLogs: updateLogs(prev.errorLogs) } : prev,
    );

    try {
      const res = await api.patch(`/error-logs/${errorLog.id}/important`, {
        important: nextImportant,
      });
      const savedImportant = res.data.important as boolean;
      const persistLogs = (logs: ErrorLog[]) =>
        logs.map((item) =>
          item.id === errorLog.id ? { ...item, important: savedImportant } : item,
        );
      setRevisions((prev) =>
        prev.map((rev) => ({ ...rev, errorLogs: persistLogs(rev.errorLogs) })),
      );
      setSelectedRevision((prev) =>
        prev ? { ...prev, errorLogs: persistLogs(prev.errorLogs) } : prev,
      );
    } catch (err) {
      console.error(err);
      const rollbackLogs = (logs: ErrorLog[]) =>
        logs.map((item) =>
          item.id === errorLog.id ? { ...item, important: errorLog.important } : item,
        );
      setRevisions((prev) =>
        prev.map((rev) => ({ ...rev, errorLogs: rollbackLogs(rev.errorLogs) })),
      );
      setSelectedRevision((prev) =>
        prev ? { ...prev, errorLogs: rollbackLogs(prev.errorLogs) } : prev,
      );
      setSaveError('Could not save the star. Please try again.');
    } finally {
      pendingToggles.current.delete(errorLog.id);
    }
  };

  if (invalidLink) {
    return <div className="empty-state">Invalid practice link.</div>;
  }

  if (loadError) {
    return <div className="empty-state">{loadError}</div>;
  }

  if (!question) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="animate-fade">
      <div className="flex justify-between items-start mb-8 gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">{question.title}</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
              <BookOpen size={14} />
              {question.type.toUpperCase()} TASK
            </div>
          </div>
        </div>
        <div className="timer-card">
          <Timer size={17} className={timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-primary'} />
          <span className={`timer-text ${timeLeft < 60 ? 'text-red-500' : ''}`}>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="grid lg-grid-cols-12 practice-workspace items-start">
        <div className="lg-span-4 flex flex-col gap-6">
          <div className={`prompt-panel ${question.type === 'Academic' ? 'prompt-panel-academic' : 'prompt-panel-email'}`}>
            {question.type === 'Academic' ? (
              <>
                <div className="instructor-block">
                  <div className="instructor-avatar">D</div>
                  <div className="instructor-name">Dr. Diaz</div>
                </div>
                <div className="prompt-text prompt-text-academic">{question.content}</div>
              </>
            ) : (
              <>
                <div className="prompt-heading">
                  <CheckCircle2 size={20} className="text-cta" />
                  <span>Writing Prompt</span>
                </div>
                <div className="prompt-text prompt-text-email">{question.content}</div>
              </>
            )}
          </div>

          {revisions.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History size={20} className="text-primary" />
                HISTORY
              </h2>
              <div
                className="flex flex-col gap-2"
                style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}
              >
                {revisions.map((rev, i) => (
                  <button
                    key={rev.id}
                    className={`w-full p-4 flex justify-between items-center transition-all ${currentReport?.id === rev.id ? 'bg-primary text-white border-primary' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-primary/50'}`}
                    style={{ border: '1px solid', borderRadius: '12px' }}
                    onClick={() => {
                      setSelectedRevision(rev);
                      setComparisonBase(rev.text);
                    }}
                  >
                    <div className="text-left">
                      <div
                        className={`text-xs font-bold ${currentReport?.id === rev.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}
                      >
                        {i === 0 ? 'LATEST' : `VERSION ${revisions.length - i}`}
                      </div>
                      <div
                        className={`text-[10px] ${currentReport?.id === rev.id ? 'text-white/70' : 'text-muted'}`}
                      >
                        {new Date(rev.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {rev.score !== null && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white">
                        {formatScore(rev.score)}/5
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg-span-8 practice-editor-stack">
          <div className="essay-editor-shell">
            <textarea
              className="essay-textarea"
              placeholder="Start your TOEFL essay here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="word-count-badge">
              {text.trim() ? text.trim().split(/\s+/).length : 0} WORDS
            </div>
          </div>

          {(saveError || evalWarning) && (
            <div className="save-error">{saveError || evalWarning}</div>
          )}

          <button
            onClick={handleSave}
            disabled={isEvaluating || !text.trim()}
            className="btn-cta w-full grade-button"
          >
            {isEvaluating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
            {isEvaluating ? 'AI EVALUATING...' : 'SAVE & GRADE'}
          </button>

          <div ref={reportRef} className="pt-4">
            {currentReport?.feedback && (
              <div className="animate-fade">
                <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                  <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div
                      className="bg-primary text-white flex items-center justify-center text-3xl font-bold"
                      style={{ width: '80px', height: '80px', borderRadius: '16px' }}
                    >
                      {formatScore(currentReport.score)}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase">
                        Grading Report
                      </h2>
                      <span className="text-[10px] font-bold text-muted bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {currentReport === revisions[0] ? 'LATEST VERSION' : 'HISTORICAL VERSION'}
                      </span>
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-2">
                      <Sparkles size={16} />
                      AI FEEDBACK
                    </h3>
                    <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                      <p className="text-lg italic text-slate-700 dark:text-slate-300">
                        &quot;{currentReport.feedback}&quot;
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      LINGUISTIC CORRECTIONS
                    </h3>
                    {saveError && <div className="save-error">{saveError}</div>}
                    <div className="grid gap-4">
                      {currentReport.errorLogs.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-emerald-100 dark:border-emerald-900/10 rounded-2xl">
                          <p className="text-emerald-600 font-bold">No errors detected!</p>
                        </div>
                      ) : (
                        currentReport.errorLogs.map((err) => (
                          <div
                            key={err.id}
                            className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm"
                            style={{ borderColor: 'var(--color-border)' }}
                          >
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 text-[10px] font-bold uppercase rounded border border-red-100 dark:border-red-900/20">
                                {err.errorType}
                              </span>
                              <span
                                style={{ color: '#ef4444', textDecoration: 'line-through' }}
                                className="font-medium opacity-50"
                              >
                                {err.incorrect}
                              </span>
                              <ChevronRight size={14} className="text-muted" />
                              <span className="text-emerald-500 font-bold text-lg">{err.suggestion}</span>
                              <button
                                className={`star-button ${err.important ? 'is-important' : ''}`}
                                onClick={() => toggleImportant(err)}
                                aria-label={err.important ? 'Remove important mark' : 'Mark as important'}
                              >
                                <Star size={16} />
                              </button>
                            </div>
                            {err.explanation && (
                              <p className="text-xs text-muted italic">{err.explanation}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {comparisonBase && (
              <div className="mt-12">
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 text-center">
                  REVISION TRACKING
                </h3>
                <div className="card p-0 overflow-hidden border border-slate-200 dark:border-slate-800">
                  <ReactDiffViewer
                    oldValue={comparisonBase}
                    newValue={text}
                    splitView={false}
                    useDarkTheme={true}
                    styles={{
                      variables: {
                        dark: {
                          diffViewerBackground: '#ffffff',
                          addedBackground: 'rgba(16, 185, 129, 0.05)',
                          removedBackground: 'rgba(239, 68, 68, 0.05)',
                        },
                      },
                      contentText: {
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        lineHeight: '1.8',
                        color: '#1e293b',
                      },
                      line: {
                        padding: '8px 16px',
                      },
                    }}
                    hideLineNumbers={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice;
