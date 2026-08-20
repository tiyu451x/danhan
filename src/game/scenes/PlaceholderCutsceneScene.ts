import Phaser from 'phaser'
import { eventBus } from '../eventBus'

/**
 * Stand-in for the real opening cutscene (street-view scroll -> friends
 * brush off the history talk -> the pull into the digital Madiun).
 *
 * Swap this scene's contents once that sequence is built — the React
 * wrapper (GameStage.tsx), the fade transition into it, and the skip
 * transition below all already work.
 */
export default class PlaceholderCutsceneScene extends Phaser.Scene {
  private glitchBars: Phaser.GameObjects.Rectangle[] = []
  private isTransitioning = false

  constructor() {
    super('PlaceholderCutscene')
  }

  create() {
    const { width, height } = this.scale

    this.isTransitioning = false
    this.cameras.main.setBackgroundColor('#0a0d12')
    this.cameras.main.fadeIn(200, 10, 13, 18)

    eventBus.emit('scene-change', { stage: 'cutscene' })

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
    this.glitchBars = []
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
    if (this.isTransitioning) return
    if (Phaser.Math.Between(0, 100) > 96) {
      const bar = Phaser.Utils.Array.GetRandom(this.glitchBars)
      bar.setPosition(Phaser.Math.Between(0, this.scale.width), Phaser.Math.Between(0, this.scale.height))
      bar.setAlpha(Phaser.Math.FloatBetween(0.2, 0.6))
    }
  }

  /**
   * Called from the React "Skip Cutscene" button (see GameStage.tsx).
   * Cuts the placeholder dialogue short and plays a zoom-in on a stand-in
   * sprite before handing off to the top-down overworld.
   */
  triggerSkip() {
    if (this.isTransitioning) return
    this.isTransitioning = true
    this.playZoomTransition()
  }

  private playZoomTransition() {
    const { width, height } = this.scale

    // stop the ambient flicker so it doesn't fight the transition
    this.glitchBars.forEach((bar) => bar.setVisible(false))

    // Placeholder "sprite" — swap for the real character art later.
    // Anchored at the requested (430, 650) point, then scaled up until it
    // swallows the frame. A classic iris/wipe: by the time it fully covers
    // the canvas the scene swap underneath it is invisible.
    const anchorX = 430
    const anchorY = 650
    const sprite = this.add.rectangle(anchorX, anchorY, 48, 64, 0xc79a45, 1)
    sprite.setStrokeStyle(2, 0xede3cf, 0.9)
    sprite.setDepth(100)

    // distance to the farthest corner from the anchor, so the rect is
    // guaranteed to cover the whole canvas at any aspect ratio
    const maxDist = Math.max(
      Phaser.Math.Distance.Between(anchorX, anchorY, 0, 0),
      Phaser.Math.Distance.Between(anchorX, anchorY, width, 0),
      Phaser.Math.Distance.Between(anchorX, anchorY, 0, height),
      Phaser.Math.Distance.Between(anchorX, anchorY, width, height),
    )
    const targetScale = (maxDist * 2.4) / Math.max(sprite.width, sprite.height)

    this.tweens.add({
      targets: sprite,
      scale: targetScale,
      duration: 1300,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.cameras.main.fadeOut(180, 10, 13, 18)
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.scene.start('MadiunOverworld')
        })
      },
    })
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
  }
}
