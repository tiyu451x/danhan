import { useState } from 'react'
import TopBar from './components/TopBar'
import MainMenu from './components/MainMenu'
import LorePage from './components/LorePage'

export type AppView = 'game' | 'lore'

function App() {
  const [view, setView] = useState<AppView>('game')

  return (
    <div className="app-shell">
      <TopBar view={view} onNavigate={setView} />
      <div className="app-stage">
        {view === 'game' ? <MainMenu /> : <LorePage onBack={() => setView('game')} />}
      </div>
    </div>
  )
}

export default App
