import Phaser from 'phaser'
import { gameEventBus } from '../GameEventBus'

export class CityMapScene extends Phaser.Scene {
  constructor() {
    super('CityMapScene')
  }

  create() {
    const { width, height } = this.scale
    this.cameras.main.setBackgroundColor('#0b1320')

    // Placeholder map tiles: replace these rectangles with a real tilemap / sprites later.
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 10; col += 1) {
        const x = (width / 10) * col + width / 20
        const y = (height / 8) * row + height / 16
        const even = (row + col) % 2 === 0
        this.add.rectangle(x, y, width / 10 - 3, height / 8 - 3, even ? 0x122034 : 0x102033)
      }
    }

    const player = this.add.circle(width * 0.5, height * 0.56, 18, 0xdbeafe)
    this.add.circle(player.x, player.y, 7, 0x38bdf8)

    this.add.text(28, 24, 'MADIUN MEMORY — MAP PROTOTYPE', {
      fontFamily: 'monospace',
      fontSize: 18,
      color: '#e2e8f0',
    })

    this.add.text(28, 54, 'WASD / ARROW KEYS: future movement • E: interact • C: card holder', {
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#64748b',
    })

    this.add.text(width - 28, 24, 'CARD SLOTS  00 / 12', {
      fontFamily: 'monospace',
      fontSize: 14,
      color: '#93c5fd',
    }).setOrigin(1, 0)

    this.add.text(width / 2, height - 32, 'PLACEHOLDER MAP — BUILD THE REAL CITY LAYER HERE', {
      fontFamily: 'monospace',
      fontSize: 12,
      color: '#64748b',
    }).setOrigin(0.5)

    gameEventBus.emit('phaseChanged', 'map')
  }
}
