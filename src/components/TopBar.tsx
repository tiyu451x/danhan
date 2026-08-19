import { useState } from 'react'

type Props = {
  view: 'game' | 'history'
  onChangeView: (view: 'game' | 'history') => void
}

export function TopBar({ view, onChangeView }: Props) {
  const [open, setOpen] = useState(false)

  const fullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => undefined)
    else await document.exitFullscreen().catch(() => undefined)
  }

  return (
    <header className="topbar">
      <div className="brand">MADIUN MEMORY</div>
      <div className="topbar-actions">
        <button className="topbar-button" onClick={fullscreen} title="Fullscreen">⛶</button>
        <div className="options-wrap">
          <button className="topbar-button options-toggle" onClick={() => setOpen((v) => !v)}>
            OPTIONS <span>{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <div className="options-menu">
              <button className={view === 'game' ? 'active' : ''} onClick={() => { onChangeView('game'); setOpen(false) }}>Play Game</button>
              <button className={view === 'history' ? 'active' : ''} onClick={() => { onChangeView('history'); setOpen(false) }}>History / Material</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
