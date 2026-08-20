import Phaser from 'phaser'

/**
 * Stand-in for the real opening cutscene (street-view scroll -> friends
 * brush off the history talk -> the pull into the digital Madiun).
 *
 * Swap this scene's contents once that sequence is built — the React
 * wrapper (CutsceneGame.tsx) and the fade transition into it already work.
 */
export default class PlaceholderCutsceneScene extends Phaser.Scene {
  private glitchBars: Phaser.GameObjects.Rectangle[] = []

  constructor() {
    super('PlaceholderCutscene')
  }

  create() {
    const { width, height } = this.scale

    this.cameras.main.setBackgroundColor('#0a0d12')

    // faint drifting grid to suggest "digital Madiun" without needing assets yet
    const grid = this.add.grid(
      width / 2,
      height / 2,
      width * 2,
      height * 2,
      64,
      64,
      0x000000,
      0,
      0x1a2029,
      0.6,
    )
    this.tweens.add({
      targets: grid,
      angle: 2,
      duration: 12000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.add
      .text(width / 2, height / 2 - 26, 'CUTSCENE', {
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '40px',
        fontStyle: 'bold',
        color: '#ede3cf',
        letterSpacing: 6,
      })
      .setOrigin(0.5)

    this.add
      .text(width / 2, height / 2 + 22, 'placeholder scene — replace with the opening sequence', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        color: '#8d8877',
      })
      .setOrigin(0.5)

    // a few glitch bars that randomly flicker, echoing the top bar / card motif
    for (let i = 0; i < 5; i++) {
      const bar = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(40, 160),
        2,
        i % 2 === 0 ? 0xff3d6e : 0x34e2c4,
        0.5,
      )
      this.glitchBars.push(bar)
    }

    this.scale.on('resize', this.handleResize, this)
  }

  update() {
    if (Phaser.Math.Between(0, 100) > 96) {
      const bar = Phaser.Utils.Array.GetRandom(this.glitchBars)
      bar.setPosition(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(0, this.scale.height))
      bar.setAlpha(Phaser.Math.FloatBetween(0.2, 0.6))
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
  }
}
