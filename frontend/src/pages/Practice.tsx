import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Timer, Save, ChevronRight, AlertTriangle, History, CheckCircle2 } from 'lucide-react';
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

interface Revision {
  id: number;
  text: string;
  score: number | null;
  createdAt: string;
}

const Practice = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [text, setText] = useState('');
  const [comparisonBase, setComparisonBase] = useState('');
  const [timeLeft, setTimeLeft] = useState(420);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    axios.get(`http://localhost:3005/api/questions/${id}`)
      .then(res => {
        setQuestion(res.data);
        if (res.data.type === 'Email') setTimeLeft(420);
        else setTimeLeft(600);
      });

    axios.get(`http://localhost:3005/api/questions/${id}/latest-submission`)
      .then(res => {
        if (res.data) {
          setText(res.data.currentText);
          setRevisions(res.data.revisions);
          if (res.data.revisions.length > 0) {
            setComparisonBase(res.data.revisions[0].text);
          }
        }
      });

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
      const res = await axios.post('http://localhost:3005/api/submissions', {
        questionId: parseInt(id!),
        text,
      });
      setEvaluation(res.data.evaluation);
      setComparisonBase(revisions[0]?.text || '');
      setRevisions(res.data.submission.revisions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!question) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{question.title}</h1>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider" style={{ backgroundColor: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}>
            {question.type}
          </span>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white dark:bg-cyan-900 rounded-2xl border border-cyan-100 dark:border-cyan-800 shadow-sm">
          <Timer size={22} className="text-primary" />
          <span className="text-2xl font-bold font-mono text-primary">{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="card">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-cta" />
              Task Instructions
            </h2>
            <p className="text-sm leading-relaxed opacity-90">{question.content}</p>
          </div>

          {revisions.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History size={18} className="text-primary" />
                Compare Versions
              </h2>
              <p className="text-xs opacity-60 mb-4">Select a version below to compare with your current draft.</p>
              <div className="max-h-80 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                {revisions.map((rev, i) => (
                  <div 
                    key={rev.id} 
                    className={`p-3 border rounded-xl flex justify-between items-center cursor-pointer transition-all ${comparisonBase === rev.text ? 'border-primary bg-cyan-50 dark:bg-cyan-800' : 'border-gray-100 hover:border-secondary'}`}
                    onClick={() => {
                      setComparisonBase(rev.text);
                      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">
                        {i === 0 ? 'Last Saved' : `Version ${revisions.length - i}`}
                      </span>
                      <span className="text-[10px] opacity-50 uppercase tracking-tighter">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {rev.score && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-cta text-white">
                        {rev.score}/5
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4 h-full">
          <textarea
            style={{ height: '600px' }}
            className="w-full p-6 text-lg border-2 rounded-2xl dark:bg-gray-900 dark:border-cyan-800 focus:border-primary focus:ring-4 focus:ring-cyan-100 outline-none resize-none shadow-inner leading-relaxed transition-all"
            placeholder="Start writing your essay here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            onClick={handleSave}
            disabled={isEvaluating || !text}
            className="btn-cta w-full py-4 text-lg shadow-lg hover:shadow-green-200"
          >
            {isEvaluating ? 'AI is evaluating your essay...' : (
              <>
                <Save size={22} />
                Save & Get AI Feedback
              </>
            )}
          </button>
        </div>
      </div>

      {evaluation && (
        <div className="mt-16 animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="card border-2 border-primary overflow-hidden p-0">
            <div className="bg-primary p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-bold border border-white/30">
                  {evaluation.score}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Grading Report</h2>
                  <p className="text-cyan-100 text-sm">Target Score: 5.0 / 5.0</p>
                </div>
              </div>
            </div>
            
            <div className="p-8">
              <div className="mb-10">
                <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-3">Overall Feedback</h3>
                <p className="text-lg italic leading-relaxed opacity-90">{evaluation.feedback}</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-6 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-yellow-500" />
                    Grammar & Spelling Fixes
                  </h3>
                  <div className="space-y-4">
                    {evaluation.errors.length === 0 ? (
                      <p className="p-4 text-center border-2 border-dashed rounded-xl text-cta font-bold">Excellent! No errors detected.</p>
                    ) : (
                      evaluation.errors.map((err, i) => (
                        <div key={i} className="p-4 rounded-xl border border-red-100 bg-red-50 dark:bg-red-900/20 dark:border-red-900/40">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="text-red-500 line-through decoration-2 font-medium">{err.incorrect}</span>
                            <ChevronRight size={16} className="text-gray-400" />
                            <span className="text-cta font-bold text-lg">{err.suggestion}</span>
                          </div>
                          <p className="text-xs opacity-70 italic">{err.explanation}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-6">Visual Diff Analysis</h3>
                  <div className="border-2 border-cyan-50 rounded-2xl overflow-hidden shadow-inner bg-gray-50 dark:bg-gray-800">
                    <ReactDiffViewer
                      oldValue={comparisonBase}
                      newValue={text}
                      splitView={false}
                      useDarkTheme={window.matchMedia('(prefers-color-scheme: dark)').matches}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Practice;
