import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Edit3, Mail, MessageSquare, Plus, Trash2, Sparkles, X, Loader2 } from 'lucide-react';
import { api } from '../api';

interface Question {
  id: number;
  type: string;
  title: string;
  content: string;
}

const Dashboard = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ type: 'Email', title: '', content: '' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQuestions = () => {
    setIsLoading(true);
    api.get('/questions')
      .then(res => setQuestions(res.data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this question?')) {
      try {
        await api.delete(`/questions/${id}`);
        fetchQuestions();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleAdd = async (autoGenerate = false) => {
    if (autoGenerate) setIsGenerating(true);
    try {
      await api.post('/questions', {
        ...newQuestion,
        autoGenerate
      });
      setShowAddModal(false);
      setNewQuestion({ type: 'Email', title: '', content: '' });
      fetchQuestions();
    } catch (err) {
      console.error(err);
      const message = axios.isAxiosError(err)
        ? err.response?.data?.details || err.response?.data?.error || err.message
        : 'Failed to add question';
      alert(`Failed to add question: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderSection = (title: string, icon: React.ReactNode, data: Question[]) => (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="text-primary">{icon}</div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight">{title}</h2>
      </div>
      <div className="task-grid">
        {data.map(q => (
          <div key={q.id} className="card task-card">
            <Link to={`/practice/${q.id}`} className="flex-1">
              <h3 className="task-card-title">{q.title}</h3>
              <p className="task-card-copy">
                {q.content}
              </p>
            </Link>
            <div className="task-card-actions">
              <Link to={`/practice/${q.id}`} className="flex-1">
                <button className="btn-primary w-full p-2 text-sm">
                  <Edit3 size={16} />
                  Practice
                </button>
              </Link>
              <button 
                onClick={(e) => handleDelete(q.id, e)}
                style={{ background: 'transparent', color: 'var(--color-muted)', padding: '6px' }}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        <div 
          onClick={() => setShowAddModal(true)}
          className="new-task-card"
        >
          <div className="new-task-icon">
            <Plus size={26} />
          </div>
          <span className="new-task-title">New Task</span>
          <span className="new-task-copy">Add a TOEFL email or academic prompt</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade">
      <header className="mb-12 flex justify-between items-center bg-slate-900 text-white p-8 rounded-2xl shadow-xl">
        <div>
          <h1 className="text-3xl font-black mb-1">Practice Dashboard</h1>
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Master TOEFL Writing</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-cta shadow-lg"
        >
          <Plus size={20} />
          Create Task
        </button>
      </header>
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-primary" size={40} />
        </div>
      ) : (
        <>
          {renderSection('Email Response', <Mail size={22} />, questions.filter(q => q.type === 'Email'))}
          {renderSection('Academic Discussion', <MessageSquare size={22} />, questions.filter(q => q.type === 'Academic'))}
        </>
      )}

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">Practice Library</p>
                <h2 className="modal-title">New Writing Task</h2>
              </div>
              <button className="icon-button" onClick={() => setShowAddModal(false)} aria-label="Close modal">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Task Type</label>
                <div className="segmented-control">
                  {['Email', 'Academic'].map(type => (
                    <button
                      key={type}
                      onClick={() => setNewQuestion({...newQuestion, type})}
                      className={`segment-button ${newQuestion.type === type ? 'is-active' : ''}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <button
                  onClick={() => handleAdd(true)}
                  disabled={isGenerating}
                  className="generate-button"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  <span className="font-bold">{isGenerating ? 'AI Generating...' : 'Auto-generate Topic'}</span>
                </button>
              </div>

              <div className="modal-divider">
                <span>OR ENTER MANUALLY</span>
              </div>

              <div className="manual-entry">
                <input
                  type="text"
                  className="form-field"
                  placeholder="Topic Title"
                  value={newQuestion.title}
                  onChange={e => setNewQuestion({...newQuestion, title: e.target.value})}
                />
                <textarea
                  className="form-field form-textarea"
                  placeholder="Paste prompt content here..."
                  value={newQuestion.content}
                  onChange={e => setNewQuestion({...newQuestion, content: e.target.value})}
                />
                <button
                  onClick={() => handleAdd(false)}
                  disabled={!newQuestion.title || !newQuestion.content}
                  className="btn-cta w-full create-task-button"
                >
                  Create Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
