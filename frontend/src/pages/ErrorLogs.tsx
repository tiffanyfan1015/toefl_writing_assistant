import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, ChevronRight, Book } from 'lucide-react';

interface ErrorLog {
  id: number;
  errorType: string;
  incorrect: string;
  suggestion: string;
  explanation: string;
  createdAt: string;
  submission: {
    question: {
      title: string;
    }
  }
}

const ErrorLogs = () => {
  const [logs, setLogs] = useState<ErrorLog[]>([]);

  useEffect(() => {
    axios.get('http://localhost:3005/api/error-logs')
      .then(res => setLogs(res.data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Personal Error Log</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Review your past grammar and spelling mistakes to avoid repeating them.
      </p>

      <div className="space-y-6">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No errors logged yet. Keep practicing!
          </div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="card bg-white dark:bg-gray-800 border-l-4 border-l-yellow-500">
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-semibold text-yellow-600 uppercase tracking-wider">
                  {log.errorType}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-lg mb-2">
                <span className="text-red-500 line-through">{log.incorrect}</span>
                <ChevronRight size={20} className="text-gray-400" />
                <span className="text-green-600 font-bold">{log.suggestion}</span>
              </div>

              {log.explanation && (
                <p className="text-gray-700 dark:text-gray-300 mb-3">{log.explanation}</p>
              )}

              <div className="flex items-center gap-2 text-sm text-gray-500 border-t pt-2">
                <Book size={14} />
                <span>From task: {log.submission.question.title}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ErrorLogs;
