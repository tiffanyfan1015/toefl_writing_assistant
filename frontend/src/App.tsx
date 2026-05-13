import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import ErrorLogs from './pages/ErrorLogs';
import { BookOpen, AlertTriangle, Sparkles } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="app-wrapper">
        <nav className="main-nav">
          <div className="nav-content">
            <Link to="/" className="flex items-center gap-2">
              <Sparkles size={24} className="text-primary" />
              <span className="text-xl font-bold">TOEFL Pro</span>
            </Link>
            
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2 text-sm font-bold">
                <BookOpen size={18} />
                <span>Dashboard</span>
              </Link>
              <Link to="/errors" className="flex items-center gap-2 text-sm font-bold">
                <AlertTriangle size={18} />
                <span>Error Log</span>
              </Link>
            </div>
          </div>
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
