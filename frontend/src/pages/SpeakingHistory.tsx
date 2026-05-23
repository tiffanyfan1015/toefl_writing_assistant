import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Mic,
  Play,
  Sparkles,
  Trash2,
} from "lucide-react";
import { api, toPublicUrl } from "../api";

interface SpeakingQuestion {
  id: number;
  title: string;
  introduction: string;
  question1: string;
  question2: string;
  question3: string;
  question4: string;
}

interface SpeakingErrorLog {
  id: number;
  errorType: string;
  incorrect: string;
  suggestion: string;
  explanation: string | null;
  important: boolean;
  createdAt: string;
}

interface SpeakingPart {
  id: number;
  partIndex: number;
  audioPath: string;
  transcript: string;
  score: number | null;
  feedback: string | null;
  createdAt: string;
  errorLogs: SpeakingErrorLog[];
}

interface SpeakingSession {
  id: number;
  createdAt: string;
  updatedAt: string;
  parts: SpeakingPart[];
}

const getPromptText = (question: SpeakingQuestion, partIndex: number) => {
  switch (partIndex) {
    case 0:
      return question.introduction;
    case 1:
      return question.question1;
    case 2:
      return question.question2;
    case 3:
      return question.question3;
    case 4:
      return question.question4;
    default:
      return "";
  }
};

const SpeakingHistoryPage = () => {
  const { id, partIndex } = useParams();
  const targetPartIndex = Number.parseInt(partIndex ?? "", 10);

  const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
  const [sessions, setSessions] = useState<SpeakingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [playingPartIndex, setPlayingPartIndex] = useState<number | null>(null);
  const [saveError, setSaveError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [questionRes, sessionsRes] = await Promise.all([
        api.get(`/speaking/questions/${id}`),
        api.get(`/speaking/questions/${id}/sessions`),
      ]);
      setQuestion(questionRes.data);
      setSessions(sessionsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const attempts = useMemo(() => {
    if (!Number.isFinite(targetPartIndex) || !sessions.length) return [];
    return sessions
      .flatMap((session) =>
        session.parts
          .filter((part) => part.partIndex === targetPartIndex)
          .map((part) => ({
            sessionId: session.id,
            sessionCreatedAt: session.createdAt,
            part,
          })),
      )
      .sort(
        (a, b) =>
          new Date(b.sessionCreatedAt).getTime() -
          new Date(a.sessionCreatedAt).getTime(),
      );
  }, [sessions, targetPartIndex]);

  const stats = useMemo(() => {
    const scores = attempts
      .map((attempt) => attempt.part.score)
      .filter((score): score is number => score !== null);
    const latestScore = attempts[0]?.part.score ?? null;
    const bestScore = scores.length ? Math.max(...scores) : null;

    return {
      count: attempts.length,
      latestScore,
      bestScore,
    };
  }, [attempts]);

  const speakText = (text: string, index: number) => {
    if (!question) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setPlayingPartIndex(index);
    utterance.onend = () =>
      setPlayingPartIndex((current) => (current === index ? null : current));
    utterance.onerror = () =>
      setPlayingPartIndex((current) => (current === index ? null : current));
    window.speechSynthesis.speak(utterance);
  };

  const handleReplayPrompt = () => {
    if (!question || !Number.isFinite(targetPartIndex)) return;
    speakText(getPromptText(question, targetPartIndex), targetPartIndex);
  };

  const handleDeleteHistoryItem = async (partId: number) => {
    if (!window.confirm("Delete this history item? This cannot be undone."))
      return;

    setSaveError("");
    try {
      await api.delete(`/speaking/parts/${partId}`);
      await loadData();
    } catch (err) {
      console.error(err);
      setSaveError(
        "Could not delete this history item. Please check the backend connection and try again.",
      );
    }
  };

  if (isLoading || !question) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const promptTitle = Number.isFinite(targetPartIndex)
    ? `Question ${targetPartIndex}`
    : "History";

  return (
    <div className="animate-fade speaking-history-page">
      <section className="history-hero card">
        <div className="history-hero-main">
          <div className="history-hero-topline">
            <span className="history-badge">
              <Mic size={14} /> Speaking History
            </span>
            <span className="history-subtle">{promptTitle}</span>
          </div>
          <h1>{question.title}</h1>
        </div>
        <div className="history-hero-actions">
          <Link to={`/speaking/${question.id}`} className="history-back-link">
            <button className="speech-secondary-button">
              <ArrowLeft size={16} />
              Back to topic
            </button>
          </Link>
          <Link
            to={`/speaking/${question.id}/practice?part=${targetPartIndex}`}
            className="history-practice-link"
          >
            <button className="btn-cta">
              <Sparkles size={18} />
              Practice again
            </button>
          </Link>
        </div>
      </section>

      <section className="history-summary-grid">
        <article className="history-stat-card card">
          <span className="history-stat-label">Attempts</span>
          <strong>{stats.count}</strong>
          <span className="history-stat-copy">
            Recorded tries for this question
          </span>
        </article>
        <article className="history-stat-card card">
          <span className="history-stat-label">Latest</span>
          <strong>{stats.latestScore ?? "-"}</strong>
          <span className="history-stat-copy">Most recent score</span>
        </article>
        <article className="history-stat-card card">
          <span className="history-stat-label">Best</span>
          <strong>{stats.bestScore ?? "-"}</strong>
          <span className="history-stat-copy">Highest recorded score</span>
        </article>
      </section>

      {saveError && <div className="save-error">{saveError}</div>}

      <section className="card history-content-card">
        <div className="section-heading history-section-heading">
          <div>
            <h2>Attempt Timeline</h2>
          </div>
          <button
            className="speech-play-button"
            onClick={handleReplayPrompt}
            disabled={!Number.isFinite(targetPartIndex)}
          >
            {playingPartIndex === targetPartIndex ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Play size={16} />
            )}
            Replay prompt
          </button>
        </div>

        <div className="history-prompt-card">
          <div className="history-prompt-label">Prompt</div>
          <p className="history-prompt-intro">{question.introduction}</p>
          <div className="history-prompt-question">
            <span className="task-pill speaking-pill">{promptTitle}</span>
            <p>{getPromptText(question, targetPartIndex)}</p>
          </div>
        </div>

        {attempts.length === 0 ? (
          <div className="empty-state">No attempts for this question yet.</div>
        ) : (
          <div className="history-timeline">
            {attempts.map(({ part, sessionId, sessionCreatedAt }, index) => (
              <article key={part.id} className="history-attempt-card">
                <div className="history-attempt-topline">
                  <div>
                    <span className="history-attempt-index">
                      Attempt {attempts.length - index}
                    </span>
                    <h3>Session #{sessionId}</h3>
                    <p>{new Date(sessionCreatedAt).toLocaleString()}</p>
                  </div>
                  <div className="history-attempt-score">
                    <span>Score</span>
                    <strong>{part.score ?? "-"}</strong>
                  </div>
                </div>

                <div className="history-attempt-actions">
                  <button
                    className="speech-play-button small"
                    onClick={() =>
                      speakText(
                        getPromptText(question, targetPartIndex),
                        targetPartIndex,
                      )
                    }
                  >
                    <Play size={14} />
                    Replay prompt
                  </button>
                  <Link
                    to={`/speaking/${question.id}/practice?part=${targetPartIndex}`}
                  >
                    <button className="speech-secondary-button small">
                      Re-answer
                    </button>
                  </Link>
                  <button
                    className="speech-secondary-button small history-delete-button"
                    onClick={() => handleDeleteHistoryItem(part.id)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>

                <audio
                  className="speaking-audio"
                  controls
                  src={toPublicUrl(part.audioPath)}
                />

                <div className="history-detail-stack">
                  <div className="history-detail-block">
                    <p className="speaking-transcript-label">Transcript</p>
                    <p className="history-detail-text">
                      {part.transcript || "No transcript available."}
                    </p>
                  </div>

                  {part.feedback && (
                    <div className="history-detail-block history-feedback-block">
                      <p className="speaking-transcript-label">Feedback</p>
                      <p className="history-detail-text">{part.feedback}</p>
                    </div>
                  )}

                  <div className="history-detail-block">
                    <p className="speaking-transcript-label">Error Log</p>
                    {part.errorLogs.length === 0 ? (
                      <div className="empty-state compact">
                        No errors detected.
                      </div>
                    ) : (
                      <div className="speaking-errors">
                        {part.errorLogs.map((error) => (
                          <div key={error.id} className="speaking-error-card">
                            <div className="edit-card-topline">
                              <span className="error-type-badge">
                                {error.errorType}
                              </span>
                              {error.important && (
                                <span className="important-chip">
                                  Important
                                </span>
                              )}
                            </div>
                            <div className="edit-comparison">
                              <span className="edit-incorrect">
                                {error.incorrect}
                              </span>
                              <ChevronRight size={17} className="edit-arrow" />
                              <span className="edit-suggestion">
                                {error.suggestion}
                              </span>
                            </div>
                            {error.explanation && (
                              <p className="edit-explanation">
                                {error.explanation}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default SpeakingHistoryPage;
