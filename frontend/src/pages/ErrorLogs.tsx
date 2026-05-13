import { useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronRight, Book } from 'lucide-react';
import { API_BASE_URL } from '../api';

interface ErrorLog {
  id: number;
  errorType: string;
  incorrect: string;
  suggestion: string;
  explanation: string;
  createdAt: string;
  revision: {
    submission: {
      question: {
        title: string;
      }
    }
  }
}

const ErrorLogs = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    axios.get(`${API_BASE_URL}/error-logs`)
      .then(res => setLogs(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="animate-fade">
      <h1 className="text-3xl font-bold mb-4">Personal Error Log</h1>
      <p className="text-muted mb-8">
        Review your past grammar and spelling mistakes to avoid repeating them.
      </p>

      {isLoading ? (
        <div className="text-center py-12 text-muted">Loading logs...</div>
      ) : (
        <div className="flex flex-col gap-6">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted border-2 border-dashed rounded-2xl">
              No errors logged yet. Keep practicing!
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="card" style={{ borderLeft: '4px solid #eab308' }}>
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold text-yellow-600 uppercase tracking-widest bg-yellow-50 px-2 py-1 rounded">
                    {log.errorType}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-lg mb-4">
                  <span className="text-red-500 line-through opacity-60">{log.incorrect}</span>
                  <ChevronRight size={20} className="text-slate-300" />
                  <span className="text-emerald-600 font-bold">{log.suggestion}</span>
                </div>

                {log.explanation && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-4 text-sm italic border border-slate-100 dark:border-slate-800">
                    {log.explanation}
                  </div>
                )}

                <div className="flex items-center gap-2 text-xs text-muted pt-4 border-t border-slate-50 dark:border-slate-800">
                  <Book size={14} />
                  <span>From: {log.revision.submission.question.title}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorLogs;
