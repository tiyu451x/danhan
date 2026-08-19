import { useState } from 'react'
import { TopBar } from './components/TopBar'
import { GameShell } from './components/GameShell'
import { HistoryPage } from './components/HistoryPage'

function App() {
  const [view, setView] = useState<'game' | 'history'>('game')
  return (
    <div className="app">
      <TopBar view={view} onChangeView={setView} />
      {view === 'game' ? <GameShell /> : <HistoryPage />}
    </div>
  )
}

export default App
