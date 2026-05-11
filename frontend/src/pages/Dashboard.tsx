import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Edit3, Mail, MessageSquare } from 'lucide-react';

interface Question {
  id: number;
  type: string;
  title: string;
  content: string;
}

const Dashboard = () => {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    axios.get('http://localhost:3005/api/questions')
      .then(res => setQuestions(res.data))
      .catch(err => console.error(err));
  }, []);

  const emailQuestions = questions.filter(q => q.type === 'Email');
  const academicQuestions = questions.filter(q => q.type === 'Academic');

  const renderSection = (title: string, icon: React.ReactNode, data: Question[]) => (
    <section className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(8, 145, 178, 0.1)', color: '#0891b2' }}>
          {icon}
        </div>
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <div className="grid gap-6">
        {data.map(q => (
          <div key={q.id} className="card flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer">
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 text-primary">{q.title}</h3>
              <p className="text-sm opacity-80 line-clamp-2">{q.content}</p>
            </div>
            <Link to={`/practice/${q.id}`} className="w-full md:w-auto">
              <button className="btn-primary w-full">
                <Edit3 size={18} />
                Practice Now
              </button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="animate-in fade-in duration-700">
      <header className="mb-12 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">TOEFL Writing Pro</h1>
        <p className="text-lg opacity-80">Master the writing section with AI-powered feedback and iteration.</p>
      </header>
      
      {renderSection('Email Tasks (7 minutes)', <Mail size={24} />, emailQuestions)}
      {renderSection('Academic Discussion', <MessageSquare size={24} />, academicQuestions)}
    </div>
  );
};

export default Dashboard;
