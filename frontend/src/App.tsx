import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, NavLink } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import ErrorLogs from './pages/ErrorLogs';
import SpeakingDashboard from './pages/SpeakingDashboard';
import SpeakingQuestion from './pages/SpeakingQuestion';
import SpeakingPractice from './pages/SpeakingPractice';
import SpeakingHistory from './pages/SpeakingHistory';
import SpeakingErrorLogs from './pages/SpeakingErrorLogs';
import { BookOpen, AlertTriangle, Sparkles, Mic, PanelTopOpen } from 'lucide-react';
import { API_BASE_URL, getGeminiModel, setGeminiModel, type GeminiModelConfig } from './api';

function App() {
  const [geminiConfig, setGeminiConfig] = useState<GeminiModelConfig | null>(null);
  const [activeGeminiModel, setActiveGeminiModel] = useState(getGeminiModel());

  useEffect(() => {
    axios.get(`${API_BASE_URL}/gemini-models`)
      .then((res) => {
        const config = res.data as GeminiModelConfig;
        setGeminiConfig(config);

        const storedModel = getGeminiModel();
        const initialModel = storedModel && config.options.includes(storedModel)
          ? storedModel
          : config.defaultModel;

        setActiveGeminiModel(initialModel);
        setGeminiModel(initialModel);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const handleGeminiModelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextModel = event.target.value;
    setActiveGeminiModel(nextModel);
    setGeminiModel(nextModel);
  };

  return (
    <Router>
      <div className="app-wrapper">
        <nav className="main-nav">
          <div className="nav-content nav-content-row">
            <Link to="/" className="flex items-center gap-2 brand-link">
              <Sparkles size={24} className="text-primary" />
              <span className="text-xl font-bold">TOEFL Pro</span>
            </Link>

            <div className="nav-pills">
              <NavLink to="/" end className={({ isActive }) => `nav-pill ${isActive ? 'is-active' : ''}`}>
                <BookOpen size={16} />
                <span>Writing</span>
              </NavLink>
              <NavLink to="/speaking" end className={({ isActive }) => `nav-pill ${isActive ? 'is-active' : ''}`}>
                <Mic size={16} />
                <span>Speaking</span>
              </NavLink>
              <NavLink to="/errors" className={({ isActive }) => `nav-pill ${isActive ? 'is-active' : ''}`}>
                <AlertTriangle size={16} />
                <span>Writing Errors</span>
              </NavLink>
              <NavLink to="/speaking/errors" className={({ isActive }) => `nav-pill ${isActive ? 'is-active' : ''}`}>
                <PanelTopOpen size={16} />
                <span>Speaking Errors</span>
              </NavLink>
            </div>

            <div className="gemini-model-switcher">
              <label htmlFor="gemini-model-select">Gemini Model</label>
              <select
                id="gemini-model-select"
                className="gemini-model-select"
                value={activeGeminiModel || geminiConfig?.defaultModel || ''}
                onChange={handleGeminiModelChange}
                disabled={!geminiConfig}
              >
                {!geminiConfig ? (
                  <option value="">Loading model options...</option>
                ) : geminiConfig.options.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </nav>

        <main className="container">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/practice/:id" element={<Practice />} />
            <Route path="/errors" element={<ErrorLogs />} />
            <Route path="/speaking" element={<SpeakingDashboard />} />
            <Route path="/speaking/:id" element={<SpeakingQuestion />} />
            <Route path="/speaking/:id/practice" element={<SpeakingPractice />} />
            <Route path="/speaking/:id/history/:partIndex" element={<SpeakingHistory />} />
            <Route path="/speaking/errors" element={<SpeakingErrorLogs />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
