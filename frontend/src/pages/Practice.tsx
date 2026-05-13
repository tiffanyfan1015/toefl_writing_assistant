import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Timer, ChevronRight, AlertTriangle, History, CheckCircle2, Loader2, Sparkles, BookOpen } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { API_BASE_URL } from '../api';

interface Question {
  id: number;
  type: string;
  title: string;
  content: string;
}

interface ErrorLog {
  type: string;
  incorrect: string;
  suggestion: string;
  explanation: string;
}

interface Revision {
  id: number;
  text: string;
  score: number | null;
  feedback: string | null;
  errorLogs?: ErrorLog[];
  createdAt: string;
}

const Practice = () => {
  const { id } = useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [text, setText] = useState('');
  const [comparisonBase, setComparisonBase] = useState('');
  const [selectedRevision, setSelectedRevision] = useState<Revision | null>(null);
  const [timeLeft, setTimeLeft] = useState(420);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const timerRef = useRef<number | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentReport = selectedRevision || revisions[0];

  useEffect(() => {
    axios.get(`${API_BASE_URL}/questions/${id}`)
      .then(res => {
        setQuestion(res.data);
        if (res.data.type === 'Email') setTimeLeft(420);
        else setTimeLeft(600);
      });

    axios.get(`${API_BASE_URL}/questions/${id}/latest-submission`)
      .then(res => {
        if (res.data) {
          setText(res.data.currentText);
          const mappedRevisions = res.data.revisions.map((rev: any) => ({
            ...rev,
            errorLogs: rev.errorLogs.map((err: any) => ({
              type: err.errorType,
              incorrect: err.incorrect,
              suggestion: err.suggestion,
              explanation: err.explanation
            }))
          }));
          setRevisions(mappedRevisions);
          if (mappedRevisions.length > 0) {
            setComparisonBase(mappedRevisions[mappedRevisions.length - 1].text);
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
    if (isEvaluating) return;
    setIsEvaluating(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/submissions`, {
        questionId: parseInt(id!),
        text,
      });
      const mappedRevisions = res.data.submission.revisions.map((rev: any) => ({
        ...rev,
        errorLogs: rev.errorLogs.map((err: any) => ({
          type: err.errorType,
          incorrect: err.incorrect,
          suggestion: err.suggestion,
          explanation: err.explanation
        }))
      }));
      setRevisions(mappedRevisions);
      setSelectedRevision(mappedRevisions[0]);
      
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      if (!comparisonBase && mappedRevisions.length > 1) {
        setComparisonBase(mappedRevisions[1].text);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!question) return (
    <div className="flex justify-center p-12">
      <Loader2 className="animate-spin text-primary" size={48} />
    </div>
  );

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
        <div className="card flex items-center gap-4 py-3 px-6 shadow-sm border border-primary/10">
          <Timer size={20} className={timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-primary'} />
          <span className={`text-2xl font-bold font-mono ${timeLeft < 60 ? 'text-red-500' : ''}`}>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <div className="grid lg-grid-cols-12 gap-8 items-start">
        <div className="lg-span-4 flex flex-col gap-6">
          <div className={`prompt-panel ${question.type === 'Academic' ? 'prompt-panel-academic' : 'prompt-panel-email'}`}>
            {question.type === 'Academic' ? (
              <>
                <div className="instructor-block">
                  <div className="instructor-avatar">D</div>
                  <div className="instructor-name">Dr. Diaz</div>
                </div>
                <div className="prompt-text prompt-text-academic">
                  {question.content}
                </div>
              </>
            ) : (
              <>
                <div className="prompt-heading">
                  <CheckCircle2 size={20} className="text-cta" />
                  <span>Writing Prompt</span>
                </div>
                <div className="prompt-text prompt-text-email">
                  {question.content}
                </div>
              </>
            )}
          </div>

          {revisions.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <History size={20} className="text-primary" />
                HISTORY
              </h2>
              <div className="flex flex-col gap-2" style={{ maxHeight: '300px', overflowY: 'auto', paddingRight: '8px' }}>
                {revisions.map((rev, i) => (
                  <button 
                    key={rev.id} 
                    className={`w-full p-4 flex justify-between items-center transition-all ${currentReport?.id === rev.id ? 'bg-primary text-white border-primary' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-primary/50'}`}
                    style={{ border: '1px solid', borderRadius: '12px' }}
                    onClick={() => {
                      setSelectedRevision(rev);
                      setComparisonBase(rev.text);
                      setTimeout(() => {
                        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }}
                  >
                    <div className="text-left">
                      <div className={`text-xs font-bold ${currentReport?.id === rev.id ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                        {i === 0 ? 'LATEST' : `VERSION ${revisions.length - i}`}
                      </div>
                      <div className={`text-[10px] ${currentReport?.id === rev.id ? 'text-white/70' : 'text-muted'}`}>
                        {new Date(rev.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {rev.score && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-white`}>
                        {rev.score}/5
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg-span-8 flex flex-col gap-6">
          <div className="relative group">
            <textarea
              style={{ minHeight: '500px', width: '100%', padding: '24px', borderRadius: '16px', border: '1px solid var(--color-border)', background: 'var(--color-card-bg)', color: 'inherit', outline: 'none', fontSize: '1rem', lineHeight: '1.6', transition: 'all 0.3s' }}
              className="focus:border-primary focus:shadow-sm"
              placeholder="Start your TOEFL essay here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-muted bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-800">
              {text.trim() ? text.trim().split(/\s+/).length : 0} WORDS
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isEvaluating || !text.trim()}
            className="btn-cta w-full py-4 text-lg font-bold"
          >
            {isEvaluating ? <Loader2 className="animate-spin" size={24} /> : <Sparkles size={24} />}
            {isEvaluating ? 'AI EVALUATING...' : 'SAVE & GRADE'}
          </button>

          <div ref={reportRef} className="pt-4">
            {currentReport?.feedback && (
              <div className="animate-fade">
                <div className="card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                  <div className="flex items-center gap-6 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="bg-primary text-white flex items-center justify-center text-3xl font-bold" style={{ width: '80px', height: '80px', borderRadius: '16px' }}>
                      {currentReport.score}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase">Grading Report</h2>
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
                        "{currentReport.feedback}"
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      LINGUISTIC CORRECTIONS
                    </h3>
                    <div className="grid gap-4">
                      {!currentReport.errorLogs || currentReport.errorLogs.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-emerald-100 dark:border-emerald-900/10 rounded-2xl">
                          <p className="text-emerald-600 font-bold">No errors detected!</p>
                        </div>
                      ) : (
                        currentReport.errorLogs.map((err, i) => (
                          <div key={i} className="p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                              <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-500 text-[10px] font-bold uppercase rounded border border-red-100 dark:border-red-900/20">{err.type}</span>
                              <span style={{ color: '#ef4444', textDecoration: 'line-through' }} className="font-medium opacity-50">{err.incorrect}</span>
                              <ChevronRight size={14} className="text-muted" />
                              <span className="text-emerald-500 font-bold text-lg">{err.suggestion}</span>
                            </div>
                            <p className="text-xs text-muted italic">
                              {err.explanation}
                            </p>
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
                 <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-4 text-center">REVISION TRACKING</h3>
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
                        }
                      },
                      contentText: {
                        fontFamily: 'inherit',
                        fontSize: '1rem',
                        lineHeight: '1.8',
                        color: '#1e293b'
                      },
                      line: {
                        padding: '8px 16px',
                      }
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
