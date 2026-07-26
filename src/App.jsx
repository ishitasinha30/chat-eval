import { useState } from 'react';
import { MessageSquare, Upload, BarChart2, TrendingUp, Settings as SettingsIcon } from 'lucide-react';
import SingleEval from './components/SingleEval';
import BatchMode from './components/BatchMode';
import Dashboard from './components/Dashboard';
import Analysis from './components/Analysis';
import Settings from './components/Settings';

const NAV = [
  { id: 'single', label: 'Single Eval', icon: MessageSquare },
  { id: 'batch', label: 'Batch Mode', icon: Upload },
  { id: 'history', label: 'Eval Dashboard', icon: BarChart2 },
  { id: 'analysis', label: 'Analysis', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const TITLES = {
  single: 'Single Eval',
  batch: 'Batch Mode',
  history: 'Eval Dashboard',
  analysis: 'Bulk Analysis',
  settings: 'Settings',
};

export default function App() {
  const [view, setView] = useState('single');

  return (
    <div className="app">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div>
              <div className="sidebar-brand-name">ChatEval</div>
              <div className="sidebar-brand-tag">Chatbot evaluator</div>
            </div>
          </div>
          <nav className="sidebar-nav">
            {NAV.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${view === item.id ? 'active' : ''}`}
                  onClick={() => setView(item.id)}
                >
                  <Icon />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main */}
      <div className="main">
        <div className="view-head">
          <span className="view-title">{TITLES[view]}</span>
        </div>
        <div className="view-body">
          {view === 'single' && <SingleEval />}
          {view === 'batch' && <BatchMode />}
          {view === 'history' && <Dashboard />}
          {view === 'analysis' && <Analysis />}
          {view === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
}
