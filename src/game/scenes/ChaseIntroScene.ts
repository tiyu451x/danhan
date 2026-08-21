import Phaser from 'phaser'
import { eventBus } from '../eventBus'

/**
 * The sequence that plays right after the cutscene's zoom transition.
 *
 * Phase 1 — "scripted": a short, letterboxed, non-interactive beat. The
 * player sprite auto-runs right along the top road with the horde in
 * tow. Input is ignored entirely during this phase.
 *
 * Phase 2 — "free": letterbox bars fade out, the player gets control,
 * and the horde switches to a simple line-of-sight chase/wander AI.
 *
 * This is ONE scene / ONE big map for the whole sequence — no scene
 * swaps, so the camera and background never cut.
 */

// Map is one big continuous space — no room-to-room swapping.
const MAP_W = 2880
const MAP_H = 1440

const PLAYER_SPEED = 210
const SCRIPTED_SPEED = 230
const SCRIPTED_DURATION_MS = 2600

const ENEMY_CHASE_SPEED = PLAYER_SPEED * 0.85 // a little slower than the player
const ENEMY_WANDER_SPEED = PLAYER_SPEED * 0.35
const CHASE_RANGE = 420
const LOSE_RANGE = 560 // hysteresis so state doesn't flicker at the edge
const WANDER_RADIUS = 220

const GRAZE_SPEED_MULT = 0.55
const TREE_SLOW_MULT = 0.55
const TREE_RADIUS = 14
const PLAYER_RADIUS = 12

const HORDE_COLORS = [0xff3b5c, 0xdb8a3d, 0x8a5cff, 0x34d1c4]

interface Obstacle {
  rect: Phaser.Geom.Rectangle
}

interface Tree {
  x: number
  y: number
}

interface HordeUnit {
  sprite: Phaser.Physics.Arcade.Sprite
  state: 'scripted' | 'chase' | 'wander'
  wanderTarget: Phaser.Math.Vector2
  wanderTimer: number
}

export default class ChaseIntroScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private horde: HordeUnit[] = []
  private lotsGroup!: Phaser.Physics.Arcade.StaticGroup
  private obstacles: Obstacle[] = []
  private trees: Tree[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private phase: 'scripted' | 'free' = 'scripted'
  private letterboxTop!: Phaser.GameObjects.Rectangle
  private letterboxBottom!: Phaser.GameObjects.Rectangle
  private hint!: Phaser.GameObjects.Text
  private caughtOnce = false

  constructor() {
    super('ChaseIntro')
  }

  create() {
    this.phase = 'scripted'
    this.caughtOnce = false
    this.cameras.main.fadeIn(200, 10, 13, 18)
    eventBus.emit('scene-change', { stage: 'chase-intro' })

    this.physics.world.setBounds(0, 0, MAP_W, MAP_H)
    this.drawWorld()

    this.player = this.createPlaceholderActor(150, 150, 0xc79a45)
    this.player.setDepth(10)

    this.horde = HORDE_COLORS.map((color, i) => ({
      sprite: this.createPlaceholderActor(110 - i * 26, 140 + (i % 2 === 0 ? -10 : 12), color),
      state: 'scripted' as const,
      wanderTarget: new Phaser.Math.Vector2(110 - i * 26, 140),
      wanderTimer: 0,
    }))
    this.horde.forEach((unit) => unit.sprite.setDepth(9))

    this.physics.add.collider(this.player, this.lotsGroup)
    this.horde.forEach((unit) => this.physics.add.collider(unit.sprite, this.lotsGroup))

    this.physics.add.overlap(
      this.player,
      this.horde.map((u) => u.sprite),
      () => this.handleCaught(),
    )

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(1.15)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    this.buildLetterbox()
    this.buildHud()

    this.time.delayedCall(SCRIPTED_DURATION_MS, () => this.endScriptedIntro())

    this.scale.on('resize', this.handleResize, this)
  }

  update(_time: number, delta: number) {
    if (this.phase === 'scripted') {
      this.runScriptedStep()
    } else {
      this.runPlayerMovement()
      this.runHordeAi(delta)
    }
  }

  // ---------------------------------------------------------------------
  // world building
  // ---------------------------------------------------------------------

  private drawWorld() {
    const ROAD = 0x6b4a3d
    const ROAD_LINE = 0x8a6a52
    const GRASS = 0x4f8a42
    const LOT = 0x5fb8b0
    const ACCENT = 0xdb8a3d
    const TREE = 0x3f7a34

    this.add.rectangle(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, GRASS).setDepth(-30)

    const hRoadYs = [150, 700]
    const vRoadXs = [300, 900, 1500, 2100, 2700]

    hRoadYs.forEach((y) => {
      this.add.rectangle(MAP_W / 2, y, MAP_W, 110, ROAD).setDepth(-20)
      this.add.rectangle(MAP_W / 2, y, MAP_W, 3, ROAD_LINE).setDepth(-19)
    })
    vRoadXs.forEach((x) => {
      this.add.rectangle(x, MAP_H / 2, 110, MAP_H, ROAD).setDepth(-20)
      this.add.rectangle(x, MAP_H / 2, 3, MAP_H, ROAD_LINE).setDepth(-19)
    })

    this.lotsGroup = this.physics.add.staticGroup()
    this.obstacles = []

    // solid "lot" blocks between the roads — these are the walls you can graze
    const lotSpots: [number, number, number, number][] = [
      [550, 350, 200, 160],
      [1150, 350, 220, 160],
      [1750, 350, 200, 160],
      [2350, 350, 220, 160],
      [550, 950, 200, 180],
      [1150, 950, 200, 180],
      [1750, 950, 220, 180],
      [2350, 950, 200, 180],
      [90, 950, 140, 200],
    ]
    lotSpots.forEach(([x, y, w, h]) => {
      const block = this.add.rectangle(x, y, w, h, LOT)
      block.setStrokeStyle(2, 0xede3cf, 0.4)
      this.physics.add.existing(block, true)
      this.lotsGroup.add(block)
      this.obstacles.push({ rect: new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h) })
    })

    // small decorative orange accents — not solid, purely visual
    ;[
      [700, 500],
      [1900, 620],
      [2500, 500],
    ].forEach(([x, y]) => {
      this.add.rectangle(x, y, 50, 36, ACCENT).setDepth(-15)
    })

    // trees — small, soft slow-zones, scattered along/near the roads
    this.trees = []
    const treeSpots: [number, number][] = [
      [420, 150], [760, 150], [1080, 150], [1380, 700], [1660, 150],
      [1980, 150], [2260, 700], [2580, 150], [300, 500], [900, 620],
      [1500, 500], [2100, 620], [2700, 500], [150, 700], [1200, 700],
    ]
    treeSpots.forEach(([x, y]) => {
      this.trees.push({ x, y })
      const trunk = this.add.circle(x, y, TREE_RADIUS, TREE)
      trunk.setStrokeStyle(2, 0x2a4f24, 0.6)
      trunk.setDepth(-5)
    })
  }

  private createPlaceholderActor(x: number, y: number, color: number) {
    const key = `actor-${color.toString(16)}`
    if (!this.textures.exists(key)) {
      const g = this.add.graphics()
      g.fillStyle(color, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0xede3cf, 0.9)
      g.strokeRect(1, 1, 22, 30)
      g.generateTexture(key, 24, 32)
      g.destroy()
    }
    const actor = this.physics.add.sprite(x, y, key)
    actor.setCollideWorldBounds(true)
    const body = actor.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 14).setOffset(2, 16)
    return actor
  }

  // ---------------------------------------------------------------------
  // phase 1 — scripted, non-interactive
  // ---------------------------------------------------------------------

  private runScriptedStep() {
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(SCRIPTED_SPEED, 0)
    this.horde.forEach((unit, i) => {
      const body = unit.sprite.body as Phaser.Physics.Arcade.Body
      body.setVelocity(SCRIPTED_SPEED * (0.9 - i * 0.02), 0)
    })
  }

  private endScriptedIntro() {
    this.phase = 'free'
    this.horde.forEach((unit) => {
      unit.state = 'wander'
      unit.wanderTarget = this.pickWanderTarget(unit.sprite.x, unit.sprite.y)
      unit.wanderTimer = Phaser.Math.Between(600, 1400)
    })

    this.tweens.add({
      targets: [this.letterboxTop, this.letterboxBottom],
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.letterboxTop.setVisible(false)
        this.letterboxBottom.setVisible(false)
      },
    })

    this.tweens.add({ targets: this.hint, alpha: 1, duration: 300 })
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 3400, duration: 900, ease: 'Sine.easeIn' })
  }

  // ---------------------------------------------------------------------
  // phase 2 — free movement + horde AI
  // ---------------------------------------------------------------------

  private runPlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    const left = this.cursors.left?.isDown || this.wasd.left.isDown
    const right = this.cursors.right?.isDown || this.wasd.right.isDown
    const up = this.cursors.up?.isDown || this.wasd.up.isDown
    const down = this.cursors.down?.isDown || this.wasd.down.isDown

    const dir = new Phaser.Math.Vector2(0, 0)
    if (left) dir.x -= 1
    if (right) dir.x += 1
    if (up) dir.y -= 1
    if (down) dir.y += 1
    dir.normalize()

    // grazing a wall this frame slows you down
    const grazing = body.touching.left || body.touching.right || body.touching.up || body.touching.down
    // standing in a tree's soft radius slows you down too
    const inTree = this.trees.some(
      (t) => Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) < TREE_RADIUS + PLAYER_RADIUS,
    )

    let mult = 1
    if (grazing) mult = Math.min(mult, GRAZE_SPEED_MULT)
    if (inTree) mult = Math.min(mult, TREE_SLOW_MULT)

    body.setVelocity(dir.x * PLAYER_SPEED * mult, dir.y * PLAYER_SPEED * mult)
  }

  private runHordeAi(delta: number) {
    this.horde.forEach((unit) => {
      const dist = Phaser.Math.Distance.Between(unit.sprite.x, unit.sprite.y, this.player.x, this.player.y)
      const los = dist < LOSE_RANGE && this.hasLineOfSight(unit.sprite.x, unit.sprite.y, this.player.x, this.player.y)

      if (unit.state !== 'chase' && dist < CHASE_RANGE && los) {
        unit.state = 'chase'
      } else if (unit.state === 'chase' && (dist > LOSE_RANGE || !los)) {
        unit.state = 'wander'
        unit.wanderTarget = this.pickWanderTarget(unit.sprite.x, unit.sprite.y)
        unit.wanderTimer = Phaser.Math.Between(1000, 1800)
      }

      const body = unit.sprite.body as Phaser.Physics.Arcade.Body

      if (unit.state === 'chase') {
        const dir = new Phaser.Math.Vector2(this.player.x - unit.sprite.x, this.player.y - unit.sprite.y).normalize()
        body.setVelocity(dir.x * ENEMY_CHASE_SPEED, dir.y * ENEMY_CHASE_SPEED)
      } else {
        unit.wanderTimer -= delta
        const distToTarget = Phaser.Math.Distance.Between(
          unit.sprite.x,
          unit.sprite.y,
          unit.wanderTarget.x,
          unit.wanderTarget.y,
        )
        if (unit.wanderTimer <= 0 || distToTarget < 24) {
          unit.wanderTarget = this.pickWanderTarget(unit.sprite.x, unit.sprite.y)
          unit.wanderTimer = Phaser.Math.Between(1400, 2400)
        }
        const dir = new Phaser.Math.Vector2(
          unit.wanderTarget.x - unit.sprite.x,
          unit.wanderTarget.y - unit.sprite.y,
        ).normalize()
        body.setVelocity(dir.x * ENEMY_WANDER_SPEED, dir.y * ENEMY_WANDER_SPEED)
      }
    })
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const line = new Phaser.Geom.Line(x1, y1, x2, y2)
    return !this.obstacles.some((o) => Phaser.Geom.Intersects.LineToRectangle(line, o.rect))
  }

  private pickWanderTarget(fromX: number, fromY: number) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
    const radius = Phaser.Math.FloatBetween(60, WANDER_RADIUS)
    const x = Phaser.Math.Clamp(fromX + Math.cos(angle) * radius, 40, MAP_W - 40)
    const y = Phaser.Math.Clamp(fromY + Math.sin(angle) * radius, 40, MAP_H - 40)
    return new Phaser.Math.Vector2(x, y)
  }

  /**
   * Placeholder hook for whatever "caught" should mean later (battle,
   * game over, a card check, etc). For now it just pulses the screen and
   * emits an event once per approach so it doesn't spam.
   */
  private handleCaught() {
    if (this.caughtOnce || this.phase !== 'free') return
    this.caughtOnce = true
    eventBus.emit('player-caught', {})
    this.cameras.main.flash(150, 255, 59, 92)
    this.time.delayedCall(700, () => {
      this.caughtOnce = false
    })
  }

  // ---------------------------------------------------------------------
  // HUD / letterbox
  // ---------------------------------------------------------------------

  private buildLetterbox() {
    const { width, height } = this.scale
    const barHeight = Math.max(44, Math.round(height * 0.12))

    this.letterboxTop = this.add
      .rectangle(width / 2, barHeight / 2, width, barHeight, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(1000)
    this.letterboxBottom = this.add
      .rectangle(width / 2, height - barHeight / 2, width, barHeight, 0x000000, 1)
      .setScrollFactor(0)
      .setDepth(1000)
  }

  private buildHud() {
    const { width, height } = this.scale
    this.hint = this.add
      .text(width / 2, height - 30, 'WASD / ARROWS — run', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        color: '#ede3cf',
        backgroundColor: '#0a0d12cc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(1001)
      .setAlpha(0)
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize
    this.cameras.main.setSize(width, height)
    if (this.letterboxTop) {
      const barHeight = Math.max(44, Math.round(height * 0.12))
      this.letterboxTop.setPosition(width / 2, barHeight / 2).setSize(width, barHeight)
      this.letterboxBottom.setPosition(width / 2, height - barHeight / 2).setSize(width, barHeight)
    }
    if (this.hint) this.hint.setPosition(width / 2, height - 30)
  }
}
