import Phaser from 'phaser'
import { eventBus } from '../eventBus'

/**
 * The sequence that plays right after the cutscene's zoom transition.
 *
 * Phase 1 — "scripted": a short, letterboxed, non-interactive beat. The
 * player sprite auto-runs right along the top road with the horde in
 * tow. Input is ignored entirely during this phase.
 *
 * Phase 2 — "free": letterbox bars fade out, the camera eases out to the
 * free-roam zoom, and the player gets control. The horde switches to a
 * simple line-of-sight chase/wander AI, and now physically collides with
 * the player instead of passing through.
 *
 * The map is a procedurally laid out grid of city blocks (loosely modeled
 * on a stylized top-down city-map reference: road grid, walled-off
 * "water" blocks, big house obstacles sitting on walkable grass, and open
 * park/empty blocks for breathing room) so there's no dependency on art
 * assets yet — swap the primitive shapes for real tile/sprite art later
 * without touching the movement, collision, camera, or hit code.
 */

// ---------------------------------------------------------------------
// map layout
// ---------------------------------------------------------------------

const COLS = 9
const ROWS = 5
const BLOCK_W = 620
const BLOCK_H = 520
const ROAD_W = 140

// Much bigger than the old fixed 2880x1440 map — grows automatically if
// COLS/ROWS/BLOCK_W/BLOCK_H change.
const MAP_W = ROAD_W + COLS * (BLOCK_W + ROAD_W)
const MAP_H = ROAD_W + ROWS * (BLOCK_H + ROAD_W)

type BlockType = 'water' | 'house' | 'park' | 'empty'

// ---------------------------------------------------------------------
// movement / AI tuning
// ---------------------------------------------------------------------

const PLAYER_SPEED = 210
const SCRIPTED_SPEED = 230
const SCRIPTED_DURATION_MS = 2600

const ENEMY_CHASE_SPEED = PLAYER_SPEED * 0.85
const ENEMY_WANDER_SPEED = PLAYER_SPEED * 0.35
const CHASE_RANGE = 460
const LOSE_RANGE = 620 // hysteresis so state doesn't flicker at the edge
const WANDER_RADIUS = 240

const GRAZE_SPEED_MULT = 0.55
const TREE_SLOW_MULT = 0.55
const TREE_RADIUS = 14
const PLAYER_RADIUS = 12

// Zoomed in further than before on purpose — the map should read as a
// maze you have to learn, not something you can eyeball from one screen.
const SCRIPTED_ZOOM = 2.6
const FREE_ZOOM = 2.0

const MAX_HITS = 5
const HIT_INVINCIBLE_MS = 900

const HORDE_COLORS = [0xff3b5c, 0xdb8a3d, 0x8a5cff, 0x34d1c4]

const GRASS = 0x4f8a42
const ROAD = 0x6b4a3d
const ROAD_LINE = 0x8a6a52
const WATER = 0x2f7d78
const HOUSE_WALL = 0xb85c3e
const HOUSE_ROOF = 0x7a3a26
const TREE_COLOR = 0x3f7a34
const FOLIAGE_COLOR = 0x4f9a3f

interface Obstacle {
  rect: Phaser.Geom.Rectangle
}

interface Tree {
  x: number
  y: number
}

interface HordeUnit {
  sprite: Phaser.Physics.Arcade.Sprite
  color: number
  state: 'scripted' | 'chase' | 'wander'
  wanderTarget: Phaser.Math.Vector2
  wanderTimer: number
}

type Facing = 'front' | 'back' | 'side'

// small seedable PRNG so the block layout is stable across reloads
function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default class ChaseIntroScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private horde: HordeUnit[] = []
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup
  private obstacles: Obstacle[] = []
  private trees: Tree[] = []
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private phase: 'scripted' | 'free' = 'scripted'
  private letterboxTop!: Phaser.GameObjects.Rectangle
  private letterboxBottom!: Phaser.GameObjects.Rectangle
  private hint!: Phaser.GameObjects.Text
  private hitLabel!: Phaser.GameObjects.Text
  private facing: Facing = 'front'
  private hitCount = 0
  private invincible = false

  constructor() {
    super('ChaseIntro')
  }

  create() {
    this.phase = 'scripted'
    this.hitCount = 0
    this.invincible = false
    this.facing = 'front'
    this.cameras.main.fadeIn(200, 10, 13, 18)
    eventBus.emit('scene-change', { stage: 'chase-intro' })

    this.physics.world.setBounds(0, 0, MAP_W, MAP_H)
    this.ensureActorTextures()
    this.drawWorld()

    // spawn inside the first road intersection — always clear regardless
    // of how the blocks around it were rolled
    const spawnX = 220
    const spawnY = 110

    this.player = this.createPlayer(spawnX, spawnY)

    this.horde = HORDE_COLORS.map((color, i) => ({
      sprite: this.createChaser(spawnX - 70 - i * 30, spawnY + (i % 2 === 0 ? -14 : 14), color),
      color,
      state: 'scripted' as const,
      wanderTarget: new Phaser.Math.Vector2(spawnX - 70 - i * 30, spawnY),
      wanderTimer: 0,
    }))
    this.horde.forEach((unit) => unit.sprite.setDepth(9))

    this.physics.add.collider(this.player, this.obstacleGroup)
    this.horde.forEach((unit) => this.physics.add.collider(unit.sprite, this.obstacleGroup))
    // real solid collision between player and chasers — they bump and
    // separate instead of passing through each other
    this.physics.add.collider(this.player, this.horde.map((u) => u.sprite), this.handlePlayerHordeCollide, undefined, this)

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(SCRIPTED_ZOOM)

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
    this.add.rectangle(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, GRASS).setDepth(-30)

    this.obstacleGroup = this.physics.add.staticGroup()
    this.obstacles = []
    this.trees = []

    const rand = mulberry32(20260821)

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = ROAD_W + col * (BLOCK_W + ROAD_W) + BLOCK_W / 2
        const cy = ROAD_W + row * (BLOCK_H + ROAD_W) + BLOCK_H / 2
        // keep the spawn corner clear no matter what the roll says
        const type: BlockType = col === 0 && row === 0 ? 'park' : this.pickBlockType(rand())
        this.buildBlock(cx, cy, type)
      }
    }

    this.drawRoads()
  }

  private pickBlockType(r: number): BlockType {
    if (r < 0.3) return 'water'
    if (r < 0.7) return 'house'
    if (r < 0.9) return 'park'
    return 'empty'
  }

  private buildBlock(cx: number, cy: number, type: BlockType) {
    if (type === 'water') {
      // a fully walled-off "blue zone" — the whole block is solid, no
      // walking on it at all
      const block = this.add.rectangle(cx, cy, BLOCK_W, BLOCK_H, WATER)
      block.setStrokeStyle(2, 0xede3cf, 0.35)
      this.physics.add.existing(block, true)
      this.obstacleGroup.add(block)
      this.obstacles.push({ rect: new Phaser.Geom.Rectangle(cx - BLOCK_W / 2, cy - BLOCK_H / 2, BLOCK_W, BLOCK_H) })
      this.scatterFoliage(cx, cy, BLOCK_W, BLOCK_H)
      return
    }

    if (type === 'house') {
      // the block itself stays walkable grass — only the house footprint
      // in the middle is solid
      const houseW = BLOCK_W * 0.6
      const houseH = BLOCK_H * 0.55

      const wall = this.add.rectangle(cx, cy, houseW, houseH, HOUSE_WALL)
      wall.setStrokeStyle(2, 0xede3cf, 0.5)
      this.physics.add.existing(wall, true)
      this.obstacleGroup.add(wall)
      this.obstacles.push({ rect: new Phaser.Geom.Rectangle(cx - houseW / 2, cy - houseH / 2, houseW, houseH) })

      const roofH = houseH * 0.28
      const roof = this.add.rectangle(cx, cy - houseH / 2 + roofH / 2, houseW * 1.06, roofH, HOUSE_ROOF)
      roof.setStrokeStyle(2, 0xede3cf, 0.4)

      this.scatterFoliage(cx, cy, houseW, houseH)
      this.scatterTrees(cx, cy, BLOCK_W, BLOCK_H, 2)
      return
    }

    if (type === 'park') {
      // open walkable grass, just decorated with a handful of slow-zone trees
      this.scatterTrees(cx, cy, BLOCK_W, BLOCK_H, 4)
      return
    }

    // 'empty' — open walkable grass, no obstacles at all, pure breathing room
  }

  /** Small tufts of grass lining the base of a wall/house/water block. */
  private scatterFoliage(cx: number, cy: number, w: number, h: number) {
    const count = Math.max(6, Math.round((w + h) / 70))
    for (let i = 0; i < count; i++) {
      const edge = Phaser.Math.Between(0, 3)
      const along = Phaser.Math.FloatBetween(-0.48, 0.48)
      const out = Phaser.Math.Between(8, 18)
      let fx = cx
      let fy = cy
      if (edge === 0) {
        fx = cx + along * w
        fy = cy - h / 2 - out
      } else if (edge === 1) {
        fx = cx + w / 2 + out
        fy = cy + along * h
      } else if (edge === 2) {
        fx = cx + along * w
        fy = cy + h / 2 + out
      } else {
        fx = cx - w / 2 - out
        fy = cy + along * h
      }
      const r = Phaser.Math.Between(4, 8)
      this.add.circle(fx, fy, r, FOLIAGE_COLOR, 0.85).setDepth(-4)
    }
  }

  /** Trees scattered near a block's edge (avoiding the center, where a house sits). */
  private scatterTrees(cx: number, cy: number, w: number, h: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const rx = Phaser.Math.FloatBetween(w * 0.3, w * 0.46)
      const ry = Phaser.Math.FloatBetween(h * 0.3, h * 0.46)
      const x = cx + Math.cos(angle) * rx
      const y = cy + Math.sin(angle) * ry
      this.trees.push({ x, y })
      const trunk = this.add.circle(x, y, TREE_RADIUS, TREE_COLOR)
      trunk.setStrokeStyle(2, 0x2a4f24, 0.6)
      trunk.setDepth(-5)
    }
  }

  private drawRoads() {
    for (let row = 0; row <= ROWS; row++) {
      const y = ROAD_W / 2 + row * (BLOCK_H + ROAD_W)
      this.add.rectangle(MAP_W / 2, y, MAP_W, ROAD_W, ROAD).setDepth(-20)
      this.drawDashedLine(0, MAP_W, y, true)
    }
    for (let col = 0; col <= COLS; col++) {
      const x = ROAD_W / 2 + col * (BLOCK_W + ROAD_W)
      this.add.rectangle(x, MAP_H / 2, ROAD_W, MAP_H, ROAD).setDepth(-20)
      this.drawDashedLine(0, MAP_H, x, false)
    }
  }

  private drawDashedLine(start: number, end: number, fixedCoord: number, horizontal: boolean) {
    const dashLen = 30
    const gapLen = 22
    for (let p = start; p < end; p += dashLen + gapLen) {
      if (horizontal) {
        this.add.rectangle(p + dashLen / 2, fixedCoord, dashLen, 3, ROAD_LINE).setDepth(-19)
      } else {
        this.add.rectangle(fixedCoord, p + dashLen / 2, 3, dashLen, ROAD_LINE).setDepth(-19)
      }
    }
  }

  // ---------------------------------------------------------------------
  // actors
  // ---------------------------------------------------------------------

  private ensureActorTextures() {
    const build = (key: string, bodyColor: number, marker: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return
      const g = this.add.graphics()
      g.fillStyle(bodyColor, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0xede3cf, 0.9)
      g.strokeRect(1, 1, 22, 30)
      marker(g)
      g.generateTexture(key, 24, 32)
      g.destroy()
    }

    // three player states so it's obvious where real walk-cycle frames go later
    build('hero-front', 0xe3b75e, (g) => {
      // two "eyes" — facing the camera
      g.fillStyle(0x0a0d12, 0.85)
      g.fillRect(7, 10, 3, 3)
      g.fillRect(14, 10, 3, 3)
    })
    build('hero-back', 0xa87b32, (g) => {
      // a collar stripe — back of the head, no face
      g.fillStyle(0x0a0d12, 0.3)
      g.fillRect(6, 6, 12, 5)
    })
    build('hero-side', 0xc79a45, (g) => {
      // authored facing LEFT — flip this one for rightward movement
      g.fillStyle(0x0a0d12, 0.85)
      g.fillTriangle(7, 14, 7, 20, 3, 17)
    })

    HORDE_COLORS.forEach((color) => {
      const key = `chaser-${color.toString(16)}`
      if (this.textures.exists(key)) return
      const g = this.add.graphics()
      g.fillStyle(color, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0x0a0d12, 0.6)
      g.strokeRect(1, 1, 22, 30)
      g.fillStyle(0xede3cf, 0.75)
      g.fillRect(6, 8, 4, 4)
      g.fillRect(14, 8, 4, 4)
      g.generateTexture(key, 24, 32)
      g.destroy()
    })
  }

  private createPlayer(x: number, y: number) {
    const player = this.physics.add.sprite(x, y, 'hero-front')
    player.setCollideWorldBounds(true)
    player.setDepth(10)
    const body = player.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 14).setOffset(2, 16)
    return player
  }

  private createChaser(x: number, y: number, color: number) {
    const key = `chaser-${color.toString(16)}`
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

    // ease out from the tight cutscene framing to the wider free-roam zoom
    this.tweens.add({
      targets: this.cameras.main,
      zoom: FREE_ZOOM,
      duration: 700,
      ease: 'Sine.easeInOut',
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

    this.updateFacing(dir)
    dir.normalize()

    // grazing a wall this frame slows you down — applies to every solid
    // block (water walls and houses alike, since they all share one
    // physics group) and to trees below
    const grazing = body.touching.left || body.touching.right || body.touching.up || body.touching.down
    const inTree = this.trees.some(
      (t) => Phaser.Math.Distance.Between(this.player.x, this.player.y, t.x, t.y) < TREE_RADIUS + PLAYER_RADIUS,
    )

    let mult = 1
    if (grazing) mult = Math.min(mult, GRAZE_SPEED_MULT)
    if (inTree) mult = Math.min(mult, TREE_SLOW_MULT)

    body.setVelocity(dir.x * PLAYER_SPEED * mult, dir.y * PLAYER_SPEED * mult)
  }

  /** Swaps the player's texture based on movement direction; holds the last facing while idle. */
  private updateFacing(dir: Phaser.Math.Vector2) {
    if (dir.x === 0 && dir.y === 0) return

    if (Math.abs(dir.y) >= Math.abs(dir.x)) {
      this.facing = dir.y > 0 ? 'front' : 'back'
      this.player.setFlipX(false)
    } else {
      this.facing = 'side'
      // 'hero-side' is authored facing left — flip it for rightward movement
      this.player.setFlipX(dir.x > 0)
    }

    const textureKey = this.facing === 'front' ? 'hero-front' : this.facing === 'back' ? 'hero-back' : 'hero-side'
    if (this.player.texture.key !== textureKey) {
      this.player.setTexture(textureKey)
    }
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

  // ---------------------------------------------------------------------
  // getting caught
  // ---------------------------------------------------------------------

  private handlePlayerHordeCollide(_playerObj: unknown, hordeObj: unknown) {
    if (this.phase !== 'free' || this.invincible) return
    const sprite = hordeObj as Phaser.Physics.Arcade.Sprite
    const unit = this.horde.find((u) => u.sprite === sprite)
    this.registerHit(unit?.color ?? HORDE_COLORS[0])
  }

  /**
   * One hit: darken the sprite a step further, flash/shake for feedback,
   * grant a brief invincibility window, and — on the 5th hit — hand off
   * to the battle placeholder scene with whichever chaser caught you.
   */
  private registerHit(chaserColor: number) {
    this.hitCount = Math.min(MAX_HITS, this.hitCount + 1)
    this.invincible = true
    this.hitLabel.setText(`HITS ${this.hitCount}/${MAX_HITS}`)

    const from = Phaser.Display.Color.ValueToColor(0xffffff)
    const to = Phaser.Display.Color.ValueToColor(0x2a2a2a)
    const mixed = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, MAX_HITS, this.hitCount)
    this.player.setTint(Phaser.Display.Color.GetColor(mixed.r, mixed.g, mixed.b))

    this.cameras.main.flash(120, 255, 61, 92)
    this.cameras.main.shake(140, 0.004)
    eventBus.emit('player-hit', { hitCount: this.hitCount })

    this.tweens.add({
      targets: this.player,
      alpha: 0.35,
      duration: 90,
      yoyo: true,
      repeat: Math.round(HIT_INVINCIBLE_MS / 180),
      onComplete: () => this.player.setAlpha(1),
    })

    this.time.delayedCall(HIT_INVINCIBLE_MS, () => {
      this.invincible = false
    })

    if (this.hitCount >= MAX_HITS) {
      this.startBattleHandoff(chaserColor)
    }
  }

  private startBattleHandoff(chaserColor: number) {
    this.phase = 'scripted' // freeze input during the handoff
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
    this.horde.forEach((unit) => (unit.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0))

    this.cameras.main.fadeOut(320, 10, 13, 18)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('BattleIntro', { chaserColor })
    })
  }

  // ---------------------------------------------------------------------
  // HUD / letterbox
  // ---------------------------------------------------------------------

  private buildLetterbox() {
    const { width, height } = this.scale
    // noticeably bigger than a standard widescreen crop — this is meant
    // to feel tight and focused on the player + the horde on their tail
    const barHeight = Math.max(90, Math.round(height * 0.24))

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

    this.hitLabel = this.add
      .text(width - 16, 14, `HITS ${this.hitCount}/${MAX_HITS}`, {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12px',
        color: '#ff3d6e',
        backgroundColor: '#0a0d12cc',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100)

    this.tweens.add({
      targets: this.hint,
      alpha: 0,
      delay: 3200,
      duration: 900,
      ease: 'Sine.easeIn',
    })
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize
    this.cameras.main.setSize(width, height)
    if (this.letterboxTop) {
      const barHeight = Math.max(90, Math.round(height * 0.24))
      this.letterboxTop.setPosition(width / 2, barHeight / 2).setSize(width, barHeight)
      this.letterboxBottom.setPosition(width / 2, height - barHeight / 2).setSize(width, barHeight)
    }
    if (this.hint) this.hint.setPosition(width / 2, height - 30)
    if (this.hitLabel) this.hitLabel.setPosition(width - 16, 14)
  }
}
