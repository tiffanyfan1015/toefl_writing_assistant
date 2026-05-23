import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Mic,
  Play,
  Sparkles,
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

interface SpeakingPartResult {
  id: number;
  partIndex: number;
  audioPath: string;
  transcript: string;
  score: number | null;
  feedback: string | null;
  createdAt: string;
  errorLogs: SpeakingErrorLog[];
}

interface SpeakingPartResponse {
  part: SpeakingPartResult;
  transcript: string;
  evaluation: {
    score: number;
    feedback: string;
  };
  audioUrl: string;
  partLabel: string;
}

interface FlowStep {
  partIndex: number;
  label: string;
  text: string;
  record: boolean;
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Failed to convert audio to a data URL"));
      }
    };
    reader.onerror = () =>
      reject(new Error("Failed to convert audio to a data URL"));
    reader.readAsDataURL(blob);
  });

const wait = (ms: number) =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

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

const SpeakingPractice = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [question, setQuestion] = useState<SpeakingQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [practiceStatus, setPracticeStatus] = useState<
    "idle" | "running" | "review" | "error"
  >("idle");
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [countdown, setCountdown] = useState(0);
  const [currentMessage, setCurrentMessage] = useState("");
  const [results, setResults] = useState<SpeakingPartResult[]>([]);
  const [playingPromptIndex, setPlayingPromptIndex] = useState<number | null>(
    null,
  );
  const [saveError, setSaveError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkRef = useRef<BlobPart[]>([]);
  const countdownTimerRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);

  const selectedPart = Number.parseInt(searchParams.get("part") ?? "", 10);
  const isSinglePart =
    Number.isFinite(selectedPart) && selectedPart >= 1 && selectedPart <= 4;

  useEffect(() => {
    const loadQuestion = async () => {
      setIsLoading(true);
      try {
        const res = await api.get(`/speaking/questions/${id}`);
        setQuestion(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestion();
  }, [id]);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      window.speechSynthesis.cancel();
      if (countdownTimerRef.current)
        window.clearInterval(countdownTimerRef.current);
      if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const flowSteps = useMemo<FlowStep[]>(() => {
    if (!question) return [];

    const selectedSteps = isSinglePart ? [selectedPart] : [0, 1, 2, 3, 4];
    return selectedSteps.map((partIndex) => ({
      partIndex,
      label: partIndex === 0 ? "Introduction" : `Question ${partIndex}`,
      text: getPromptText(question, partIndex),
      record: partIndex !== 0,
    }));
  }, [question, isSinglePart, selectedPart]);

  const speakText = (text: string, partIndex: number) =>
    new Promise<void>((resolve, reject) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setPlayingPromptIndex(partIndex);
      utterance.onend = () => {
        setPlayingPromptIndex((current) =>
          current === partIndex ? null : current,
        );
        resolve();
      };
      utterance.onerror = () => {
        setPlayingPromptIndex((current) =>
          current === partIndex ? null : current,
        );
        reject(new Error("Speech synthesis failed"));
      };
      window.speechSynthesis.speak(utterance);
    });

  const getSupportedAudioMimeType = () => {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg",
    ];
    return (
      candidates.find(
        (candidate) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(candidate),
      ) || ""
    );
  };

  const stopRecording = async (session: number, partIndex: number) => {
    const recorder = recorderRef.current;
    if (!recorder) {
      throw new Error("Recorder not initialized");
    }

    const finishedPart = await new Promise<SpeakingPartResponse>(
      (resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunkRef.current.push(event.data);
          }
        };

        recorder.onerror = () => reject(new Error("Recording failed"));
        recorder.onstop = async () => {
          if (countdownTimerRef.current)
            window.clearInterval(countdownTimerRef.current);
          if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);

          try {
            const blob = new Blob(chunkRef.current, {
              type: recorder.mimeType || "audio/webm",
            });
            const audioDataUrl = await blobToDataUrl(blob);
            const res = await api.post(`/speaking/sessions/${session}/parts`, {
              partIndex,
              audioDataUrl,
            });
            resolve(res.data);
          } catch (error) {
            reject(error);
          } finally {
            chunkRef.current = [];
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
            recorderRef.current = null;
            setCountdown(0);
          }
        };

        recorder.start();
        setCountdown(45);
        let remaining = 45;
        countdownTimerRef.current = window.setInterval(() => {
          remaining -= 1;
          setCountdown(remaining > 0 ? remaining : 0);
        }, 1000);
        stopTimerRef.current = window.setTimeout(() => {
          if (recorder.state !== "inactive") {
            recorder.stop();
          }
        }, 45000);
      },
    );

    return finishedPart;
  };

  const startPractice = async () => {
    if (!question || flowSteps.length === 0 || isStarting) return;

    cancelledRef.current = false;
    setIsStarting(true);
    setPracticeStatus("running");
    setSaveError("");
    setResults([]);
    setCurrentStepIndex(-1);
    setCurrentMessage("Starting practice...");

    try {
      const sessionRes = await api.post(
        `/speaking/questions/${question.id}/sessions`,
        {},
      );
      const sessionId = sessionRes.data.id as number;

      for (let index = 0; index < flowSteps.length; index += 1) {
        if (cancelledRef.current) return;

        const step = flowSteps[index];
        setCurrentStepIndex(index);
        setCurrentMessage(step.label);

        await speakText(step.text, step.partIndex);

        if (step.record) {
          setCurrentMessage(`Recording ${step.label}...`);
          const mimeType = getSupportedAudioMimeType();
          if (
            !navigator.mediaDevices?.getUserMedia ||
            typeof MediaRecorder === "undefined"
          ) {
            throw new Error("This browser does not support audio recording");
          }

          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          streamRef.current = stream;
          const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream);
          recorderRef.current = recorder;
          chunkRef.current = [];

          const partPromise = stopRecording(sessionId, step.partIndex);
          await wait(45000);
          const finishedPart = await partPromise;
          setResults((prev) => [...prev, finishedPart.part]);
          setCurrentMessage(`${step.label} saved`);
          await wait(1000);
        } else {
          await wait(300);
        }
      }

      setPracticeStatus("review");
      setCurrentMessage("Practice complete");
    } catch (error) {
      console.error(error);
      setPracticeStatus("error");
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to run speaking practice",
      );
    } finally {
      setIsStarting(false);
    }
  };

  const replayPrompt = async (partIndex: number) => {
    if (!question) return;
    const text = getPromptText(question, partIndex);
    if (!text) return;

    try {
      await speakText(text, partIndex);
    } catch (error) {
      console.error(error);
    }
  };

  const currentStep = flowSteps[currentStepIndex] ?? null;

  if (isLoading || !question) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  const completedCount = results.length;

  return (
    <div className="animate-fade speaking-practice-page">
      <header className="detail-hero practice-hero">
        <div>
          <p className="hero-eyebrow">Speaking Practice</p>
          <h1 className="text-2xl font-bold mb-2">{question.title}</h1>
          <p className="hero-copy">
            {isSinglePart
              ? `Single-part practice for Question ${selectedPart}.`
              : "Full Practice All flow with automatic prompt playback and timed recording."}
          </p>
        </div>
        <div className="practice-status-panel">
          <span className="practice-status-label">Status</span>
          <strong>{practiceStatus.toUpperCase()}</strong>
          <span className="practice-status-copy">{currentMessage}</span>
        </div>
      </header>

      {practiceStatus === "review" ? (
        <section className="card speaking-review-card">
          <div className="section-heading">
            <h2>Answer Review</h2>
            <span className="history-count">
              {completedCount} recorded answers
            </span>
          </div>
          <div className="review-grid">
            {results.map((part) => (
              <article key={part.id} className="review-part-card">
                <div className="review-part-header">
                  <div>
                    <p className="session-label">
                      {part.partIndex === 0
                        ? "Introduction"
                        : `Question ${part.partIndex}`}
                    </p>
                    <p className="session-date">
                      Saved {new Date(part.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    className="speech-play-button small"
                    onClick={() => replayPrompt(part.partIndex)}
                  >
                    <Play size={14} />
                    Replay prompt
                  </button>
                </div>
                <audio
                  className="speaking-audio"
                  controls
                  src={toPublicUrl(part.audioPath)}
                />
                <p className="review-transcript-label">Transcript</p>
                <p className="review-transcript">
                  {part.transcript || "No transcript available."}
                </p>
                {part.feedback && (
                  <div className="speaking-feedback">{part.feedback}</div>
                )}
                {part.errorLogs.length > 0 ? (
                  <div className="speaking-errors">
                    {part.errorLogs.map((error) => (
                      <div key={error.id} className="speaking-error-card">
                        <div className="edit-card-topline">
                          <span className="error-type-badge">
                            {error.errorType}
                          </span>
                        </div>
                        <div className="edit-comparison">
                          <span className="edit-incorrect">
                            {error.incorrect}
                          </span>
                          <ArrowRight size={17} className="edit-arrow" />
                          <span className="edit-suggestion">
                            {error.suggestion}
                          </span>
                        </div>
                        {error.explanation && (
                          <p className="edit-explanation">{error.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state compact">No errors detected.</div>
                )}
              </article>
            ))}
          </div>
          <div className="review-actions">
            <Link to={`/speaking/${question.id}`}>
              <button className="btn-primary">Back to Topic</button>
            </Link>
            <button
              className="btn-cta"
              onClick={startPractice}
              disabled={isStarting}
            >
              <Sparkles size={18} />
              Practice Again
            </button>
          </div>
        </section>
      ) : (
        <div className="practice-layout">
          <section className="card practice-prompt-card">
            <div className="section-heading">
              <h2>{currentStep ? currentStep.label : "Ready to start"}</h2>
              <span className="history-count">
                {countdown > 0 ? `${countdown}s` : "Idle"}
              </span>
            </div>
            <p className="practice-copy">
              When you start, the topic will be read aloud automatically.
              Questions 1 to 4 will begin a 45-second recording immediately
              after playback ends.
            </p>

            <div className="practice-prompt-body">
              <button
                className="speech-play-button"
                onClick={() => replayPrompt(currentStep?.partIndex ?? 0)}
                disabled={isStarting || !currentStep}
              >
                {playingPromptIndex === currentStep?.partIndex ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Play size={16} />
                )}
                Replay current prompt
              </button>
              <p>
                {currentStep
                  ? "Prompt hidden during practice. Use replay to hear it again."
                  : "Press start to hear the introduction and prompts."}
              </p>
            </div>

            <div className="practice-progress">
              {flowSteps.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isDone = results.some(
                  (part) => part.partIndex === step.partIndex,
                );
                return (
                  <div
                    key={step.partIndex}
                    className={`practice-progress-step ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""}`}
                  >
                    <span>{step.label}</span>
                    {step.record ? <Mic size={14} /> : <Sparkles size={14} />}
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="card practice-sidebar">
            <div className="practice-timer-box">
              <span className="practice-status-label">Recording timer</span>
              <strong>{countdown > 0 ? `${countdown}s` : "--"}</strong>
            </div>
            <div className="practice-actions-stack">
              <button
                className="btn-cta w-full"
                onClick={startPractice}
                disabled={isStarting || practiceStatus === "running"}
              >
                {isStarting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Mic size={18} />
                )}
                Start Practice
              </button>
              <Link to={`/speaking/${question.id}`}>
                <button className="btn-primary w-full">Back to Topic</button>
              </Link>
            </div>
            <div className="practice-note-box">
              <AlertTriangle size={16} />
              <p>
                {isSinglePart
                  ? "This run records only one question."
                  : "This run will auto-advance after each prompt and save every answer."}
              </p>
            </div>
            {saveError && <div className="save-error">{saveError}</div>}
          </aside>
        </div>
      )}
    </div>
  );
};

export default SpeakingPractice;
