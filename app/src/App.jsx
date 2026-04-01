import React, { useState } from 'react';
import HomePage from './components/HomePage.jsx';
import ArenaPage from './components/ArenaPage.jsx';
import AgentPage from './components/AgentPage.jsx';
import TournamentPage from './components/TournamentPage.jsx';
import ReplayPage from './components/ReplayPage.jsx';
import LLMArenaPage from './components/LLMArenaPage.jsx';
import AgentLobby from './components/AgentLobby.jsx';
import TournamentLobby from './components/TournamentLobby.jsx';

export default function App() {
  const [page, setPage] = useState('home');
  const [mode, setMode] = useState(null);

  const goArena = (m) => {
    setMode(m);
    const p = { agent:'agent', tournament:'tournament', replay:'replay', llm:'llm', agentlobby:'agentlobby', tournamentlobby:'tournamentlobby' }[m] || 'arena';
    setPage(p);
  };
  const goHome = () => { setMode(null); setPage('home'); };

  if (page === 'agent') return <AgentPage onBack={goHome} />;
  if (page === 'tournament') return <TournamentPage onBack={goHome} />;
  if (page === 'replay') return <ReplayPage onBack={goHome} />;
  if (page === 'llm') return <LLMArenaPage onBack={goHome} />;
  if (page === 'agentlobby') return <AgentLobby onBack={goHome} />;
  if (page === 'tournamentlobby') return <TournamentLobby onBack={goHome} />;
  if (page === 'arena') return <ArenaPage mode={mode} onBack={goHome} />;
  return (
    <HomePage
      onWatch={() => goArena('watch')}
      onPlay={() => goArena('play')}
      onAgent={() => goArena('agentlobby')}
      onTournament={() => goArena('tournamentlobby')}
      onReplay={() => goArena('replay')}
      onLLM={() => goArena('llm')}
    />
  );
}
