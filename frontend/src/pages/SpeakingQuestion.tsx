import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Mic,
  Play,
  Sparkles,
} from "lucide-react";
import { api } from "../api";

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

interface SpeakingHistoryGroup {
  partIndex: number;
  label: string;
  attempts: number;
  latestScore: number | null;
}

const SpeakingQuestionPage = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
  const [sessions, setSessions] = useState<SpeakingSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPrompt, setShowPrompt] = useState(false);
  const [playingPartIndex, setPlayingPartIndex] = useState<number | null>(null);

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

  const historyGroups = useMemo<SpeakingHistoryGroup[]>(() => {
    if (!sessions.length) return [];

    return [1, 2, 3, 4].map((partIndex) => {
      const attempts = sessions.filter((session) =>
        session.parts.some((part) => part.partIndex === partIndex),
      ).length;
      const latestScore = sessions
        .flatMap((session) =>
          session.parts.filter((part) => part.partIndex === partIndex),
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )[0]?.score ?? null;

      return {
        partIndex,
        label: `Question ${partIndex}`,
        attempts,
        latestScore,
      };
    });
  }, [sessions]);

  const speakText = (text: string, partIndex: number) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setPlayingPartIndex(partIndex);
    utterance.onend = () =>
      setPlayingPartIndex((current) => (current === partIndex ? null : current));
    utterance.onerror = () =>
      setPlayingPartIndex((current) => (current === partIndex ? null : current));
    window.speechSynthesis.speak(utterance);
  };

  const handleReplayPrompt = (partIndex: number) => {
    if (!question) return;
    speakText(getPromptText(question, partIndex), partIndex);
  };

  if (isLoading || !question) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="animate-fade speaking-detail-page">
      <div className="detail-hero">
        <div>
          <p className="hero-eyebrow">Speaking Topic</p>
          <h1 className="text-2xl font-bold mb-2">{question.title}</h1>
        </div>
        <div className="detail-actions">
          <Link to={`/speaking/${question.id}/practice`}>
            <button className="btn-cta">
              <Mic size={18} />
              Practice All
            </button>
          </Link>
        </div>
      </div>

      <div className="speaking-detail-grid">
        <section className="card speaking-prompt-card">
          <div className="section-heading">
            <h2>Prompt</h2>
            <button
              className="toggle-button"
              onClick={() => setShowPrompt((prev) => !prev)}
            >
              {showPrompt ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
              {showPrompt ? "Hide text" : "Show text"}
            </button>
          </div>

          <div className="speaking-prompt-summary">
            <button
              className="speech-play-button"
              onClick={() => handleReplayPrompt(0)}
            >
              {playingPartIndex === 0 ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Play size={16} />
              )}
              Play Introduction
            </button>
            <p>{question.introduction}</p>
          </div>

          {showPrompt && (
            <div className="speaking-prompt-list">
              {[1, 2, 3, 4].map((partIndex) => {
                const prompt = getPromptText(question, partIndex);
                return (
                  <div key={partIndex} className="speaking-prompt-item">
                    <div className="speaking-prompt-item-header">
                      <span className="task-pill speaking-pill">
                        <Mic size={14} /> Q{partIndex}
                      </span>
                      <button
                        className="speech-play-button small"
                        onClick={() => handleReplayPrompt(partIndex)}
                      >
                        {playingPartIndex === partIndex ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Play size={14} />
                        )}
                        Replay
                      </button>
                    </div>
                    <p>{prompt}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <aside className="card speaking-history-card">
          <div className="section-heading">
            <h2>History</h2>
            <span className="history-count">{sessions.length} sessions</span>
          </div>
          {historyGroups.length === 0 ? (
            <div className="empty-state">No speaking attempts yet.</div>
          ) : (
            <div className="speaking-history-summary-grid">
              {historyGroups.map((group) => (
                <Link
                  key={group.partIndex}
                  to={`/speaking/${question.id}/history/${group.partIndex}`}
                  className="speaking-history-summary-card"
                >
                  <div className="speaking-history-summary-card-top">
                    <div>
                      <span className="task-pill speaking-pill">
                        {group.label}
                      </span>
                      <h3>View attempt history</h3>
                    </div>
                    <ChevronRight size={18} />
                  </div>
                  <div className="speaking-history-summary-metrics">
                    <div>
                      <span>Practiced</span>
                      <strong>{group.attempts}</strong>
                    </div>
                    <div>
                      <span>Latest score</span>
                      <strong>{group.latestScore ?? "-"}</strong>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>

      <div className="speaking-part-quickstart">
        <h2>Practice shortcuts</h2>
        <div className="speaking-quick-grid">
          <Link
            to={`/speaking/${question.id}/practice`}
            className="speaking-quick-card"
          >
            <Sparkles size={18} />
            <span>Practice All</span>
          </Link>
          {[1, 2, 3, 4].map((partIndex) => (
            <Link
              key={partIndex}
              to={`/speaking/${question.id}/practice?part=${partIndex}`}
              className="speaking-quick-card"
            >
              <Mic size={18} />
              <span>Practice Question {partIndex}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpeakingQuestionPage;
