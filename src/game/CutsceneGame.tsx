import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import PlaceholderCutsceneScene from './scenes/PlaceholderCutsceneScene'
import '../styles/CutsceneGame.css'

interface CutsceneGameProps {
  onExit: () => void
}

function CutsceneGame({ onExit }: CutsceneGameProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0a0d12',
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      },
      scene: [PlaceholderCutsceneScene],
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return (
    <div className="cutscene">
      <div className="cutscene__canvas" ref={containerRef} />
      <div className="cutscene__overlay">
        <span className="cutscene__tag">Phaser canvas — live</span>
        <button className="cutscene__back" onClick={onExit}>
          ← Back to menu
        </button>
      </div>
    </div>
  )
}

export default CutsceneGame
