import React, { useState } from 'react';
import HomePage from './components/HomePage.jsx';
import ArenaPage from './components/ArenaPage.jsx';
import AgentPage from './components/AgentPage.jsx';

export default function App() {
  const [page, setPage] = useState('home');
  const [mode, setMode] = useState(null);

  const goArena = (m) => { setMode(m); setPage(m === 'agent' ? 'agent' : 'arena'); };
  const goHome = () => { setMode(null); setPage('home'); };

  if (page === 'agent') return <AgentPage onBack={goHome} />;
  if (page === 'arena') return <ArenaPage mode={mode} onBack={goHome} />;
  return (
    <HomePage
      onWatch={() => goArena('watch')}
      onPlay={() => goArena('play')}
      onAgent={() => goArena('agent')}
    />
  );
}
