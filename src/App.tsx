import { useState } from 'react'
import TopBar from './components/TopBar'
import MainMenu, { type Phase as MainMenuPhase } from './components/MainMenu'
import LorePage from './components/LorePage'

export type AppView = 'game' | 'lore'

function App() {
  const [view, setView] = useState<AppView>('game')
  // mirrors MainMenu's internal phase so the top bar knows when to roll away
  const [gameplayActive, setGameplayActive] = useState(false)

  return (
    <div className="app-shell">
      <TopBar view={view} onNavigate={setView} autoHide={view === 'game' && gameplayActive} />
      <div className="app-stage">
        {view === 'game' ? (
          <MainMenu onPhaseChange={(phase: MainMenuPhase) => setGameplayActive(phase !== 'hero')} />
        ) : (
          <LorePage onBack={() => setView('game')} />
        )}
      </div>
    </div>
  )
}

export default App
