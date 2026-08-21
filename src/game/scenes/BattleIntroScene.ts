import Phaser from 'phaser'
import { eventBus } from '../eventBus'

const CHASER_NAMES: Record<number, string> = {
  0xff3b5c: 'Crimson glitch',
  0xdb8a3d: 'Amber glitch',
  0x8a5cff: 'Violet glitch',
  0x34d1c4: 'Teal glitch',
}

interface BattleIntroData {
  chaserColor?: number
}

/**
 * Placeholder for the real battle/confrontation system. Reached once the
 * chase's hit counter maxes out. Pokémon-style staging — two platforms,
 * the player on one, the chaser that caught you on the other — with no
 * actual battle logic yet. "Retry" just restarts the chase from scratch.
 */
export default class BattleIntroScene extends Phaser.Scene {
  private chaserColor = 0xff3b5c

  constructor() {
    super('BattleIntro')
  }

  init(data: BattleIntroData) {
    this.chaserColor = data.chaserColor ?? 0xff3b5c
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0a0d12')
    this.cameras.main.fadeIn(260, 10, 13, 18)
    eventBus.emit('scene-change', { stage: 'battle' })

    // faint ground horizon, Pokémon-battle style
    this.add.rectangle(width / 2, height * 0.68, width * 1.4, height * 0.7, 0x12161d).setDepth(-10)
    this.add.rectangle(width / 2, height * 0.35, width * 1.4, height * 0.32, 0x0a0d12).setDepth(-11)

    // platforms
    const playerPlatform = this.add.ellipse(width * 0.28, height * 0.78, 190, 46, 0x1a2029)
    playerPlatform.setStrokeStyle(2, 0xc79a45, 0.5)
    const chaserPlatform = this.add.ellipse(width * 0.74, height * 0.38, 170, 40, 0x1a2029)
    chaserPlatform.setStrokeStyle(2, 0xff3d6e, 0.5)

    // combatant placeholders
    const player = this.add.rectangle(width * 0.28, height * 0.78 - 46, 40, 56, 0xe3b75e)
    player.setStrokeStyle(2, 0xede3cf, 0.9)
    const chaser = this.add.rectangle(width * 0.74, height * 0.38 - 42, 44, 60, this.chaserColor)
    chaser.setStrokeStyle(2, 0xede3cf, 0.9)

    this.tweens.add({ targets: player, y: player.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: chaser, y: chaser.y - 6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    const name = CHASER_NAMES[this.chaserColor] ?? 'Glitch'

    this.add
      .text(width / 2, height * 0.12, 'CAUGHT', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ede3cf',
        letterSpacing: 8,
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height * 0.12 + 34, `${name} closes in — battle system placeholder`, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        color: '#8d8877',
      })
      .setOrigin(0.5)

    const retry = this.add
      .text(width / 2, height * 0.9, 'Retry the chase →', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '14px',
        color: '#34e2c4',
        backgroundColor: '#12161dcc',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })

    retry.on('pointerover', () => retry.setColor('#8dfff0'))
    retry.on('pointerout', () => retry.setColor('#34e2c4'))
    retry.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 10, 13, 18)
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start('ChaseIntro')
      })
    })

    this.scale.on('resize', this.handleResize, this)
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
  }
}
