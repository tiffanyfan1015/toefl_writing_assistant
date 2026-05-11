import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Timer, Save, ChevronRight, CheckCircle } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface Question {
  id: number;
  type: string;
  title: string;
  content: string;
}

interface Evaluation {
  score: number;
  feedback: string;
  errors: Array<{
    type: string;
    incorrect: string;
    suggestion: string;
    explanation: string;
  }>;
}

const Practice = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [text, setText] = useState('');
  const [prevText, setPrevText] = useState('');
  const [timeLeft, setTimeLeft] = useState(420); // 7 minutes default
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    axios.get(`http://localhost:3001/api/questions/${id}`)
      .then(res => {
        setQuestion(res.data);
        if (res.data.type === 'Email') setTimeLeft(420);
        else setTimeLeft(600); // 10 minutes for Academic Discussion
      })
      .catch(err => console.error(err));

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSave = async () => {
    setIsEvaluating(true);
    try {
      const res = await axios.post('http://localhost:3001/api/submissions', {
        questionId: parseInt(id!),
        text,
      });
      setEvaluation(res.data.evaluation);
      setPrevText(text);
      setShowDiff(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!question) return <div>Loading...</div>;

  return (
    <div className="practice-container">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">{question.title}</h1>
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">{question.type}</span>
        </div>
        <div className="flex items-center gap-2 text-xl font-mono bg-white dark:bg-gray-800 p-2 rounded border">
          <Timer size={24} />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="card bg-gray-50 dark:bg-gray-800">
          <h2 className="text-lg font-semibold mb-2">Instructions</h2>
          <p className="whitespace-pre-wrap">{question.content}</p>
        </div>

        <div className="flex flex-col gap-4">
          <textarea
            className="w-full h-80 p-4 border rounded-lg dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Type your essay here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={handleSave}
            disabled={isEvaluating || !text}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {isEvaluating ? 'Evaluating...' : (
              <>
                <Save size={20} />
                Save & Get Feedback
              </>
            )}
          </button>
        </div>
      </div>

      {evaluation && (
        <div className="mt-12 p-6 border rounded-xl bg-white dark:bg-gray-900">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-2xl font-bold text-green-600">
              {evaluation.score}/5
            </div>
            <h2 className="text-2xl font-bold">Evaluation Result</h2>
          </div>

          <p className="mb-6 italic text-gray-700 dark:text-gray-300">{evaluation.feedback}</p>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle size={20} className="text-yellow-500" />
                Grammar & Spelling Errors
              </h3>
              <div className="space-y-4">
                {evaluation.errors.map((err, i) => (
                  <div key={i} className="p-4 border rounded bg-gray-50 dark:bg-gray-800">
                    <div className="flex gap-2 mb-1">
                      <span className="text-red-500 line-through">{err.incorrect}</span>
                      <ChevronRight size={16} />
                      <span className="text-green-500 font-bold">{err.suggestion}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{err.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-4">Revision Changes</h3>
              <div className="border rounded overflow-hidden">
                <ReactDiffViewer
                  oldValue={prevText}
                  newValue={text}
                  splitView={false}
                  useDarkTheme={window.matchMedia('(prefers-color-scheme: dark)').matches}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Practice;
