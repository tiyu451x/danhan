import { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import PlaceholderCutsceneScene from './scenes/PlaceholderCutsceneScene'
import ChaseIntroScene from './scenes/ChaseIntroScene'
import MadiunOverworldScene from './scenes/MadiunOverworldScene'
import { eventBus, type StageChangeEvent, type StageKey } from './eventBus'
import '../styles/GameStage.css'

interface GameStageProps {
  onExit: () => void
}

const STAGE_COPY: Record<StageKey, string> = {
  cutscene: 'Phaser canvas — cutscene (placeholder)',
  'chase-intro': 'Phaser canvas — chase sequence',
  overworld: 'Phaser canvas — overworld · Kota Madiun',
}

function GameStage({ onExit }: GameStageProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game>()
  const [stage, setStage] = useState<StageKey>('cutscene')

  useEffect(() => {
    if (!containerRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      backgroundColor: '#0a0d12',
      physics: {
        default: 'arcade',
        arcade: { debug: false },
      },
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      },
      scene: [PlaceholderCutsceneScene, ChaseIntroScene, MadiunOverworldScene],
    })

    const handleStageChange = ({ stage: next }: StageChangeEvent) => setStage(next)
    eventBus.on('scene-change', handleStageChange)

    return () => {
      eventBus.off('scene-change', handleStageChange)
      gameRef.current?.destroy(true)
      gameRef.current = undefined
    }
  }, [])

  const handleSkip = () => {
    const scene = gameRef.current?.scene.getScene('PlaceholderCutscene') as unknown as
      | PlaceholderCutsceneScene
      | undefined
    scene?.triggerSkip()
  }

  return (
    <div className="game-stage">
      <div className="game-stage__canvas" ref={containerRef} />
      <div className="game-stage__overlay">
        <span className="game-stage__tag">{STAGE_COPY[stage]}</span>
        <div className="game-stage__actions">
          {stage === 'cutscene' && (
            <button className="game-stage__skip" onClick={handleSkip}>
              Skip Cutscene →
            </button>
          )}
          <button className="game-stage__back" onClick={onExit}>
            ← Back to menu
          </button>
        </div>
      </div>
    </div>
  )
}

export default GameStage
