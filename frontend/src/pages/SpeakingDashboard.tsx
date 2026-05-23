import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Loader2, Mic, Plus, Sparkles, Trash2, X } from "lucide-react";
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

const emptyQuestion = {
  title: "",
  introduction: "",
  question1: "",
  question2: "",
  question3: "",
  question4: "",
};

const SpeakingDashboard = () => {
  const [questions, setQuestions] = useState<SpeakingQuestion[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState(emptyQuestion);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = () => {
    setIsLoading(true);
    api
      .get("/speaking/questions")
      .then((res) => setQuestions(res.data))
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      window.confirm("Are you sure you want to delete this speaking question?")
    ) {
      try {
        await api.delete(`/speaking/questions/${id}`);
        fetchQuestions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAdd = async (autoGenerate = false) => {
    if (autoGenerate) setIsGenerating(true);

    try {
      await api.post("/speaking/questions", {
        ...newQuestion,
        autoGenerate,
      });
      setShowAddModal(false);
      setNewQuestion(emptyQuestion);
      fetchQuestions();
    } catch (err) {
      console.error(err);
      const message = axios.isAxiosError(err)
        ? err.response?.data?.details || err.response?.data?.error || err.message
        : "Failed to add speaking question";
      alert(`Failed to add speaking question: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-fade">
      <header className="hero-panel hero-panel-speaking mb-12">
        <div>
          <p className="hero-eyebrow">TOEFL Speaking</p>
          <h1 className="text-3xl font-black mb-2">Speaking Dashboard</h1>
          <p className="hero-copy">Master TOEFL Speaking - Interview</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-cta shadow-lg"
        >
          <Plus size={20} />
          Create Topic
        </button>
      </header>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <div className="task-grid">
          {questions.map((question) => (
            <div key={question.id} className="card task-card speaking-task-card">
              <Link
                to={`/speaking/${question.id}`}
                className="flex-1 speaking-task-link"
              >
                <div className="task-card-meta">
                  <span className="task-pill speaking-pill">
                    <Mic size={14} /> Speaking
                  </span>
                </div>
                <h3 className="task-card-title">{question.title}</h3>
                <p className="task-card-copy speaking-copy">
                  {question.introduction}
                </p>
                <div className="speaking-snippet">
                  <span>Q1</span>
                  <p>{question.question1}</p>
                </div>
              </Link>
              <div className="task-card-actions">
                <Link to={`/speaking/${question.id}`} className="flex-1">
                  <button className="btn-primary w-full p-2 text-sm">
                    View Topic
                  </button>
                </Link>
                <button
                  onClick={(e) => handleDelete(question.id, e)}
                  style={{
                    background: "transparent",
                    color: "var(--color-muted)",
                    padding: "6px",
                  }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          <div
            onClick={() => setShowAddModal(true)}
            className="new-task-card speaking-new-card"
          >
            <div className="new-task-icon">
              <Plus size={26} />
            </div>
            <span className="new-task-title">New Speaking Topic</span>
            <span className="new-task-copy">
              Add a TOEFL interview topic with four prompts
            </span>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content speaking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Speaking Library</p>
                <h2 className="modal-title">New Speaking Topic</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body speaking-modal-body">
              <div className="form-group">
                <button
                  onClick={() => handleAdd(true)}
                  disabled={isGenerating}
                  className="generate-button"
                >
                  {isGenerating ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  <span className="font-bold">
                    {isGenerating ? "AI Generating..." : "Auto-generate Topic"}
                  </span>
                </button>
              </div>

              <div className="modal-divider">
                <span>OR ENTER MANUALLY</span>
              </div>

              <div className="manual-entry speaking-manual-entry">
                <input
                  type="text"
                  className="form-field"
                  placeholder="Topic Title"
                  value={newQuestion.title}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, title: e.target.value })
                  }
                />
                <textarea
                  className="form-field form-textarea"
                  placeholder="Introduction"
                  value={newQuestion.introduction}
                  onChange={(e) =>
                    setNewQuestion({
                      ...newQuestion,
                      introduction: e.target.value,
                    })
                  }
                />
                <textarea
                  className="form-field form-textarea speaking-question-field"
                  placeholder="Question 1"
                  value={newQuestion.question1}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question1: e.target.value })
                  }
                />
                <textarea
                  className="form-field form-textarea speaking-question-field"
                  placeholder="Question 2"
                  value={newQuestion.question2}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question2: e.target.value })
                  }
                />
                <textarea
                  className="form-field form-textarea speaking-question-field"
                  placeholder="Question 3"
                  value={newQuestion.question3}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question3: e.target.value })
                  }
                />
                <textarea
                  className="form-field form-textarea speaking-question-field"
                  placeholder="Question 4"
                  value={newQuestion.question4}
                  onChange={(e) =>
                    setNewQuestion({ ...newQuestion, question4: e.target.value })
                  }
                />
                <button
                  onClick={() => handleAdd(false)}
                  disabled={
                    !newQuestion.title ||
                    !newQuestion.introduction ||
                    !newQuestion.question1 ||
                    !newQuestion.question2 ||
                    !newQuestion.question3 ||
                    !newQuestion.question4
                  }
                  className="btn-cta w-full create-task-button"
                >
                  Create Topic
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpeakingDashboard;
