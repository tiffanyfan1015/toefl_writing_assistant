import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import ErrorLogs from './pages/ErrorLogs';
import { BookOpen, Edit3, AlertTriangle } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav>
          <Link to="/" className="flex items-center gap-2">
            <BookOpen size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/errors" className="flex items-center gap-2">
            <AlertTriangle size={20} />
            <span>Error Logs</span>
          </Link>
        </nav>
        
        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/practice/:id" element={<Practice />} />
            <Route path="/errors" element={<ErrorLogs />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
