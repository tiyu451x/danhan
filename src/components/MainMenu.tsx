import { useEffect, useRef, useState } from 'react'
import CutsceneGame from '../game/CutsceneGame'
import '../styles/MainMenu.css'

type Phase = 'hero' | 'credits' | 'cutscene'

const TRANSITION_MS = 700
const CREDITS_AUTOPLAY_MS = 9000

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent nec magna at ' +
  'sapien tincidunt cursus. Integer euismod, velit sed cursus fermentum, arcu ' +
  'lorem malesuada dui, vitae congue leo justo ac massa. Suspendisse potenti. ' +
  'Nulla facilisi. Curabitur non nisi at lacus dictum bibendum.'

function MainMenu() {
  const [phase, setPhase] = useState<Phase>('hero')
  const [veilOpacity, setVeilOpacity] = useState(0)
  const [autoplayProgress, setAutoplayProgress] = useState(0)
  const transitionTimer = useRef<number | undefined>(undefined)
  const autoplayRaf = useRef<number | undefined>(undefined)

  const goTo = (next: Phase) => {
    window.clearTimeout(transitionTimer.current)
    setVeilOpacity(1)
    transitionTimer.current = window.setTimeout(() => {
      setPhase(next)
      requestAnimationFrame(() => requestAnimationFrame(() => setVeilOpacity(0)))
    }, TRANSITION_MS)
  }

  // credits screen auto-advances, but can be skipped any time
  useEffect(() => {
    if (phase !== 'credits') {
      setAutoplayProgress(0)
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const pct = Math.min(1, (now - start) / CREDITS_AUTOPLAY_MS)
      setAutoplayProgress(pct)
      if (pct >= 1) {
        goTo('cutscene')
      } else {
        autoplayRaf.current = requestAnimationFrame(tick)
      }
    }
    autoplayRaf.current = requestAnimationFrame(tick)
    return () => {
      if (autoplayRaf.current) cancelAnimationFrame(autoplayRaf.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  useEffect(() => () => window.clearTimeout(transitionTimer.current), [])

  return (
    <div className="main-menu">
      {phase === 'hero' && (
        <section className="hero">
          <div className="hero__glitch-rule" aria-hidden="true" />
          <p className="hero__eyebrow">Kota Madiun · Fragmen Ingatan</p>
          <h1 className="hero__title">
            The city forgets.
            <br />
            <span className="hero__title-accent">You go looking for what's left.</span>
          </h1>
          <p className="hero__subtitle">
            A short story about a night in Madiun, the history underneath it, and the noise
            trying to bury both.
          </p>

          <button className="play-slot" onClick={() => goTo('credits')}>
            <span className="play-slot__frame">
              <span className="play-slot__card" aria-hidden="true" />
              <span className="play-slot__label">Play</span>
            </span>
            <span className="play-slot__hint">insert to begin</span>
          </button>
        </section>
      )}

      {phase === 'credits' && (
        <section className="credits">
          <div className="credits__text">
            <p className="credits__kicker">Fragmen — Kota Madiun</p>
            <h2 className="credits__heading">Lorem Ipsum Studio Presents</h2>
            <p className="credits__body">{LOREM}</p>
            <p className="credits__body">{LOREM}</p>
            <div className="credits__actions">
              <button className="credits__continue" onClick={() => goTo('cutscene')}>
                Continue →
              </button>
              <button className="credits__skip" onClick={() => goTo('cutscene')}>
                Skip
              </button>
            </div>
            <div className="credits__progress" aria-hidden="true">
              <div className="credits__progress-fill" style={{ transform: `scaleX(${autoplayProgress})` }} />
            </div>
          </div>

          <div className="credits__art-slot">
            <div className="credits__art-box">
              <span>1080 × 1350</span>
              <span>drop key art png here</span>
            </div>
          </div>
        </section>
      )}

      {phase === 'cutscene' && <CutsceneGame onExit={() => goTo('hero')} />}

      <div className="main-menu__veil" style={{ opacity: veilOpacity }} />
    </div>
  )
}

export default MainMenu
