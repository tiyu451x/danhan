import Phaser from 'phaser'
import { gameEventBus } from '../GameEventBus'

export class OpeningScene extends Phaser.Scene {
  constructor() {
    super('OpeningScene')
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#05070c')

    this.add.rectangle(width / 2, height / 2, width, height, 0x05070c)
    this.add.text(width / 2, height * 0.22, 'OPENING MEMORY', {
      fontFamily: 'monospace',
      fontSize: Math.max(22, Math.floor(width * 0.028)),
      color: '#e9f2ff',
      align: 'center',
    }).setOrigin(0.5)

    this.add.text(width / 2, height * 0.36, 'The street is familiar.\nThe memory is not.', {
      fontFamily: 'sans-serif',
      fontSize: Math.max(18, Math.floor(width * 0.023)),
      color: '#94a3b8',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5)

    const panel = this.add.rectangle(width / 2, height * 0.62, width * 0.72, height * 0.2, 0x0d1526, 0.9)
      .setStrokeStyle(2, 0x274060)

    this.add.text(panel.x, panel.y, 'CUTSCENE PLACEHOLDER\n\nLater: Google Street View → friends → glitch → digital Madiun', {
      fontFamily: 'monospace',
      fontSize: Math.max(14, Math.floor(width * 0.016)),
      color: '#dbeafe',
      align: 'center',
      wordWrap: { width: width * 0.62 },
      lineSpacing: 6,
    }).setOrigin(0.5)

    const hint = this.add.text(width / 2, height * 0.88, 'CLICK / SPACE TO CONTINUE', {
      fontFamily: 'monospace',
      fontSize: Math.max(12, Math.floor(width * 0.014)),
      color: '#64748b',
    }).setOrigin(0.5)

    const advance = () => {
      this.input.off('pointerdown', advance)
      this.input.keyboard?.off('keydown-SPACE', advance)
      this.cameras.main.fadeOut(450, 0, 0, 0)
      this.time.delayedCall(500, () => {
        this.scene.start('CityMapScene')
        gameEventBus.emit('phaseChanged', 'map')
      })
    }

    this.input.once('pointerdown', advance)
    this.input.keyboard?.once('keydown-SPACE', advance)
    this.tweens.add({ targets: hint, alpha: 0.3, duration: 650, yoyo: true, repeat: -1 })
  }
}
