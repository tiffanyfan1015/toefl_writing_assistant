import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Edit3 } from 'lucide-react';

interface Question {
  id: number;
  type: string;
  title: string;
  content: string;
}

const Dashboard = () => {
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    axios.get('http://localhost:3001/api/questions')
      .then(res => setQuestions(res.data))
      .catch(err => console.error(err));
  }, []);

  const emailQuestions = questions.filter(q => q.type === 'Email');
  const academicQuestions = questions.filter(q => q.type === 'Academic');

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">TOEFL Writing Assistant</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Email Tasks (7 minutes)</h2>
        <div className="grid gap-4">
          {emailQuestions.map(q => (
            <div key={q.id} className="card flex justify-between items-center">
              <div>
                <h3 className="text-xl font-medium">{q.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{q.content.substring(0, 100)}...</p>
              </div>
              <Link to={`/practice/${q.id}`}>
                <button className="flex items-center gap-2">
                  <Edit3 size={18} />
                  Practice
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-4">Academic Discussion</h2>
        <div className="grid gap-4">
          {academicQuestions.map(q => (
            <div key={q.id} className="card flex justify-between items-center">
              <div>
                <h3 className="text-xl font-medium">{q.title}</h3>
                <p className="text-gray-600 dark:text-gray-400">{q.content.substring(0, 100)}...</p>
              </div>
              <Link to={`/practice/${q.id}`}>
                <button className="flex items-center gap-2">
                  <Edit3 size={18} />
                  Practice
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
