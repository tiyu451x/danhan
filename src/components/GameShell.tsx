import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import { createGame } from '../game/Game'
import { gameEventBus } from '../game/GameEventBus'

export function GameShell() {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)
  const [started, setStarted] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'credits' | 'opening' | 'map'>('idle')

  useEffect(() => gameEventBus.on('phaseChanged', (nextPhase) => {
    if (nextPhase === 'map') setPhase('map')
  }), [])

  useEffect(() => () => {
    gameRef.current?.destroy(true)
    gameRef.current = null
  }, [])

  const start = () => {
    if (!hostRef.current || started) return
    setStarted(true)
    setPhase('credits')
    gameRef.current = createGame(hostRef.current)
    window.setTimeout(() => setPhase((current) => current === 'credits' ? 'opening' : current), 3200)
  }

  const skipCredits = () => {
    if (phase === 'credits') setPhase('opening')
  }

  return (
    <main className="game-page">
      <div className="game-shell">
        {!started && (
          <section className="start-screen">
            <div className="start-copy">
              <p className="eyebrow">WEBSITE RPG PROTOTYPE</p>
              <h1>What happens when Madiun’s memories become a game?</h1>
              <p>Explore a distorted digital version of the city, recover memory cards, and use them to unlock historical moments.</p>
              <button className="primary-button" onClick={start}>PLAY</button>
            </div>
            <div className="start-image image-placeholder">MAIN KEY ART / CHARACTER PNG</div>
          </section>
        )}

        <div ref={hostRef} className={`phaser-host ${started ? 'visible' : ''}`} />

        {phase === 'credits' && (
          <div className="overlay-screen credits-screen" onClick={skipCredits}>
            <div className="credits-grid">
              <div>
                <p className="eyebrow">CREDITS</p>
                <h2>Lorem Ipsum</h2>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur a neque vitae libero ultrices tincidunt.</p>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin eget augue id arcu luctus convallis.</p>
                <p className="dim">Click anywhere to skip</p>
              </div>
              <div className="credits-image image-placeholder">CREDIT ART / LOGO PNG</div>
            </div>
          </div>
        )}

        {phase === 'opening' && (
          <div className="overlay-screen opening-overlay">
            <div className="opening-panel">
              <p className="eyebrow">SCENE 01</p>
              <h2>The city was already here.</h2>
              <p>Next step: build the Street View-inspired montage, friend dialogue, glitch event, and first short chase.</p>
              <div className="cutscene-frame image-placeholder">OPENING CUTSCENE PNG / VIDEO AREA</div>
              <button className="secondary-button" onClick={() => { gameRef.current?.scene.start('CityMapScene'); setPhase('map') }}>CONTINUE TO MAP PROTOTYPE</button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
