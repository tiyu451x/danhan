import Phaser from 'phaser'
import { eventBus } from '../eventBus'
import { CHASER_TYPES, type ChaserContext, type ChaserInstance, type KnowledgeMode } from '../chasers'
import { RoadPathfinder, type GridNode } from '../pathfinding'

const COLS = 9
const ROWS = 5
// Half-width and half-height makes the overall playable area one quarter of its old area.
const BLOCK_W = 310
const BLOCK_H = 260
const ROAD_W = 96
const MAP_W = ROAD_W + COLS * (BLOCK_W + ROAD_W)
const MAP_H = ROAD_W + ROWS * (BLOCK_H + ROAD_W)

const PLAYER_SPEED = 220
const PLAYER_ACCELERATION = 18
const STOP_EPSILON = 8
const SCRIPTED_SPEED = 230
const SCRIPTED_DURATION_MS = 2600
const GRAZE_SPEED_MULT = 0.82
const HAZARD_SLOW_MULT_DEFAULT = 0.6
const PLAYER_RADIUS = 12
const WANDER_RADIUS = 480
const BROAD_MEMORY_RADIUS = 560
const EXACT_MEMORY_DURATION = 3000
const MAX_HITS = 5
const HIT_INVINCIBLE_MS = 900
const SCRIPTED_ZOOM = 2.6
const FREE_ZOOM = 2.0

const ROAD = 0x665452
const ROAD_EDGE = 0x8d7770
const BLOCK = 0x17191f
const WALL = 0x34353b
const WALL_CAP = 0x4c4d55
const HIDE_COLOR = 0x090a0e
const HIDE_ACCENT = 0xc79a45

interface Obstacle {
  rect: Phaser.Geom.Rectangle
}
interface HidingSpot {
  x: number
  y: number
  exitX: number
  exitY: number
  facing: 'up' | 'down' | 'left' | 'right'
  label: Phaser.GameObjects.Text
}
interface Hazard {
  x: number
  y: number
  radius: number
  endAt: number
  slowMultiplier: number
  ring: Phaser.GameObjects.Arc
}
interface ScreenEffect {
  type: string
  endAt: number
  strength: number
  duration: number
}

type Facing = 'front' | 'back' | 'side'

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export default class ChaseIntroScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private horde: { ai: (typeof CHASER_TYPES)[number]; instance: ChaserInstance }[] = []
  private obstacleGroup!: Phaser.Physics.Arcade.StaticGroup
  private obstacles: Obstacle[] = []
  private readonly roadPathfinder = new RoadPathfinder(COLS, ROWS)
  private hidingSpots: HidingSpot[] = []
  private hazards: Hazard[] = []
  private exactMemory: Phaser.Math.Vector2 | null = null
  private broadMemory: Phaser.Math.Vector2 | null = null
  private exactMemoryUntil = 0
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private interactKey!: Phaser.Input.Keyboard.Key
  private phase: 'scripted' | 'free' = 'scripted'
  private hidden = false
  private hideExit = new Phaser.Math.Vector2(0, 0)
  private letterboxTop!: Phaser.GameObjects.Rectangle
  private letterboxBottom!: Phaser.GameObjects.Rectangle
  private hint!: Phaser.GameObjects.Text
  private hideHint!: Phaser.GameObjects.Text
  private knowledgeLabel!: Phaser.GameObjects.Text
  private hitLabel!: Phaser.GameObjects.Text
  private effectOverlay!: Phaser.GameObjects.Rectangle
  private effectBorder!: Phaser.GameObjects.Rectangle
  private effectLeft!: Phaser.GameObjects.Rectangle
  private effectRight!: Phaser.GameObjects.Rectangle
  private effectTop!: Phaser.GameObjects.Rectangle
  private effectBottom!: Phaser.GameObjects.Rectangle
  private dashLine!: Phaser.GameObjects.Graphics
  private currentScreenEffects: ScreenEffect[] = []
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
    this.hidden = false
    this.exactMemory = null
    this.broadMemory = null
    this.exactMemoryUntil = 0

    this.cameras.main.fadeIn(200, 10, 13, 18)
    eventBus.emit('scene-change', { stage: 'chase-intro' })
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H)

    this.ensureActorTextures()
    this.drawWorld()

    const spawnX = ROAD_W / 2
    const spawnY = ROAD_W / 2
    this.player = this.createPlayer(spawnX, spawnY)

    const chaserSpawns = this.getChaserSpawnPoints()
    this.horde = CHASER_TYPES.map((ai, i) => {
      const spawn = chaserSpawns[i]
      const instance = ai.createInstance(this, spawn.x, spawn.y)
      instance.sprite.setData('slot', i)
      return { ai, instance }
    })
    this.horde.forEach(({ instance }) => instance.sprite.setDepth(9))

    this.physics.add.collider(this.player, this.obstacleGroup)
    this.horde.forEach(({ instance }) => this.physics.add.collider(instance.sprite, this.obstacleGroup))
    this.physics.add.collider(this.player, this.horde.map(({ instance }) => instance.sprite), this.handlePlayerHordeCollide, undefined, this)
    // Do not make enemies form a traffic jam. Their distinct road targets keep them apart
    // while overlap lets a flanking enemy pass through another one to set a trap.

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
    this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E)

    this.buildLetterbox()
    this.buildEffects()
    this.buildHud()

    this.time.delayedCall(SCRIPTED_DURATION_MS, () => this.endScriptedIntro())
    this.scale.on('resize', this.handleResize, this)
  }

  update(time: number, delta: number) {
    if (this.phase === 'scripted') {
      this.runScriptedStep()
      return
    }

    this.handleHideInteraction(time)
    this.runPlayerMovement()
    this.updateMemory(time)
    this.runHordeAi(time, delta)
    this.updateHazards(time)
    this.updateScreenEffects(time)
    this.updateKnowledgeHud(time)
  }

  // ---------------------------------------------------------------------
  // map: roads are the ONLY walkable surface
  // ---------------------------------------------------------------------

  private drawWorld() {
    this.add.rectangle(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, BLOCK).setDepth(-40)
    this.obstacleGroup = this.physics.add.staticGroup()
    this.obstacles = []
    this.hidingSpots = []

    const rand = mulberry32(20260821)
    this.drawRoads()

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const cx = ROAD_W + col * (BLOCK_W + ROAD_W) + BLOCK_W / 2
        const cy = ROAD_W + row * (BLOCK_H + ROAD_W) + BLOCK_H / 2
        this.buildWallBlock(cx, cy, col, row, rand())
      }
    }
  }

  private drawRoads() {
    for (let row = 0; row <= ROWS; row++) {
      const y = ROAD_W / 2 + row * (BLOCK_H + ROAD_W)
      this.add.rectangle(MAP_W / 2, y, MAP_W, ROAD_W, ROAD).setDepth(-30)
      this.drawDashedLine(0, MAP_W, y, true)
      this.add.rectangle(MAP_W / 2, y - ROAD_W / 2 + 6, MAP_W, 4, ROAD_EDGE, 0.8).setDepth(-29)
      this.add.rectangle(MAP_W / 2, y + ROAD_W / 2 - 6, MAP_W, 4, ROAD_EDGE, 0.8).setDepth(-29)
    }
    for (let col = 0; col <= COLS; col++) {
      const x = ROAD_W / 2 + col * (BLOCK_W + ROAD_W)
      this.add.rectangle(x, MAP_H / 2, ROAD_W, MAP_H, ROAD).setDepth(-30)
      this.drawDashedLine(0, MAP_H, x, false)
      this.add.rectangle(x - ROAD_W / 2 + 6, MAP_H / 2, 4, MAP_H, ROAD_EDGE, 0.8).setDepth(-29)
      this.add.rectangle(x + ROAD_W / 2 - 6, MAP_H / 2, 4, MAP_H, ROAD_EDGE, 0.8).setDepth(-29)
    }
  }

  private getChaserSpawnPoints() {
    const x = (col: number) => ROAD_W / 2 + col * (BLOCK_W + ROAD_W)
    const y = (row: number) => ROAD_W / 2 + row * (BLOCK_H + ROAD_W)
    // Separate intersections give every chaser room to choose its own opening route.
    return [
      new Phaser.Math.Vector2(x(0), y(2)), new Phaser.Math.Vector2(x(2), y(0)),
      new Phaser.Math.Vector2(x(4), y(5)), new Phaser.Math.Vector2(x(6), y(1)),
      new Phaser.Math.Vector2(x(8), y(4)), new Phaser.Math.Vector2(x(3), y(3)),
      new Phaser.Math.Vector2(x(9), y(0)),
    ]
  }

  private drawDashedLine(start: number, end: number, fixedCoord: number, horizontal: boolean) {
    const dashLen = 30
    const gapLen = 22
    for (let p = start; p < end; p += dashLen + gapLen) {
      if (horizontal) this.add.rectangle(p + dashLen / 2, fixedCoord, dashLen, 3, 0xb29c8e, 0.4).setDepth(-28)
      else this.add.rectangle(fixedCoord, p + dashLen / 2, 3, dashLen, 0xb29c8e, 0.4).setDepth(-28)
    }
  }

  private buildWallBlock(cx: number, cy: number, col: number, row: number, roll: number) {
    const wallColor = roll > 0.72 ? 0x3d3438 : WALL
    const block = this.add.rectangle(cx, cy, BLOCK_W, BLOCK_H, wallColor)
    block.setStrokeStyle(4, WALL_CAP, 0.8).setDepth(-20)
    this.physics.add.existing(block, true)
    this.obstacleGroup.add(block)
    this.obstacles.push({ rect: new Phaser.Geom.Rectangle(cx - BLOCK_W / 2, cy - BLOCK_H / 2, BLOCK_W, BLOCK_H) })

    // Every block has at least one wall alcove. It is not a walkable floor tile;
    // interacting here transfers the player into a hidden visual recess.
    const edge = (col + row) % 4
    this.createHidingSpot(cx, cy, edge, col, row)
  }

  private createHidingSpot(cx: number, cy: number, edge: number, col: number, row: number) {
    const pad = 20
    const spotSize = 34
    let x = cx
    let y = cy
    let exitX = cx
    let exitY = cy
    let facing: HidingSpot['facing'] = 'up'

    // The exit is the centre of the adjacent road, never a point inside the solid block.
    if (edge === 0) { x = cx; y = cy - BLOCK_H / 2 - spotSize / 2; exitX = x; exitY = cy - BLOCK_H / 2 - ROAD_W / 2; facing = 'down' }
    if (edge === 1) { x = cx + BLOCK_W / 2 + spotSize / 2; exitX = cx + BLOCK_W / 2 + ROAD_W / 2; exitY = y; facing = 'left' }
    if (edge === 2) { x = cx; y = cy + BLOCK_H / 2 + spotSize / 2; exitX = x; exitY = cy + BLOCK_H / 2 + ROAD_W / 2; facing = 'up' }
    if (edge === 3) { x = cx - BLOCK_W / 2 - spotSize / 2; exitX = cx - BLOCK_W / 2 - ROAD_W / 2; exitY = y; facing = 'right' }

    const alcove = this.add.rectangle(x, y, spotSize, spotSize + 8, HIDE_COLOR)
    alcove.setStrokeStyle(2, HIDE_ACCENT, 0.85).setDepth(-5)
    this.add.text(x, y, 'HIDE', {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '9px', color: '#c79a45',
      backgroundColor: '#08090dcc', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(5)

    if (edge === 0 || edge === 2) {
      this.add.rectangle(x, y, spotSize + 2, 4, HIDE_ACCENT, 0.55).setDepth(-4)
    } else {
      this.add.rectangle(x, y, 4, spotSize + 2, HIDE_ACCENT, 0.55).setDepth(-4)
    }

    const label = this.add.text(x, y - 27, `${col + 1}-${row + 1}`, {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', color: '#8d8877',
    }).setOrigin(0.5).setDepth(5)

    this.hidingSpots.push({ x, y, exitX, exitY, facing, label })
    void pad
  }

  // ---------------------------------------------------------------------
  // actors / textures
  // ---------------------------------------------------------------------

  private ensureActorTextures() {
    const build = (key: string, bodyColor: number, scale = 1, marker?: (g: Phaser.GameObjects.Graphics) => void) => {
      if (this.textures.exists(key)) return
      const g = this.add.graphics()
      g.fillStyle(bodyColor, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0xede3cf, 0.9)
      g.strokeRect(1, 1, 22, 30)
      marker?.(g)
      g.generateTexture(key, Math.round(24 * scale), Math.round(32 * scale))
      g.destroy()
    }

    build('hero-front', 0xe3b75e, 1, (g) => {
      g.fillStyle(0x0a0d12, 0.85); g.fillRect(7, 10, 3, 3); g.fillRect(14, 10, 3, 3)
    })
    build('hero-back', 0xa87b32, 1, (g) => {
      g.fillStyle(0x0a0d12, 0.3); g.fillRect(6, 6, 12, 5)
    })
    build('hero-side', 0xc79a45, 1, (g) => {
      g.fillStyle(0x0a0d12, 0.85); g.fillTriangle(7, 14, 7, 20, 3, 17)
    })

    CHASER_TYPES.forEach((ai) => {
      const key = `chaser-${ai.definition.id}`
      if (this.textures.exists(key)) return
      const g = this.add.graphics()
      g.fillStyle(ai.definition.color, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0x0a0d12, 0.65)
      g.strokeRect(1, 1, 22, 30)
      g.fillStyle(0xede3cf, 0.85)
      g.fillRect(6, 8, 4, 4); g.fillRect(14, 8, 4, 4)
      g.generateTexture(key, 24, 32)
      g.destroy()
    })
  }

  private createPlayer(x: number, y: number) {
    const player = this.physics.add.sprite(x, y, 'hero-front')
    player.setCollideWorldBounds(true).setDepth(10)
    const body = player.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 14).setOffset(2, 16)
    return player
  }

  // ---------------------------------------------------------------------
  // scripted intro
  // ---------------------------------------------------------------------

  private runScriptedStep() {
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(SCRIPTED_SPEED, 0)
    this.horde.forEach(({ instance }, i) => {
      ;(instance.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(SCRIPTED_SPEED * (0.9 - i * 0.02), 0)
    })
  }

  private endScriptedIntro() {
    this.phase = 'free'
    this.horde.forEach(({ instance }) => {
      instance.state = 'roam'
      instance.wanderTarget = this.pickRoadWanderTarget(instance.sprite.x, instance.sprite.y)
      instance.wanderTimer = Phaser.Math.Between(700, 1800)
    })

    this.tweens.add({ targets: [this.letterboxTop, this.letterboxBottom], alpha: 0, duration: 400, onComplete: () => {
      this.letterboxTop.setVisible(false); this.letterboxBottom.setVisible(false)
    } })
    this.tweens.add({ targets: this.cameras.main, zoom: FREE_ZOOM, duration: 700, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: this.hint, alpha: 1, duration: 300 })
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 4400, duration: 900 })
    this.broadMemory = new Phaser.Math.Vector2(this.player.x, this.player.y)
  }

  // ---------------------------------------------------------------------
  // player movement / hiding
  // ---------------------------------------------------------------------

  private runPlayerMovement() {
    const body = this.player.body as Phaser.Physics.Arcade.Body
    if (this.hidden) {
      body.setVelocity(0, 0)
      return
    }

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
    if (dir.lengthSq() > 1) dir.normalize()

    const wallTouching = body.touching.left || body.touching.right || body.touching.up || body.touching.down ||
      body.blocked.left || body.blocked.right || body.blocked.up || body.blocked.down
    let mult = wallTouching ? GRAZE_SPEED_MULT : 1
    for (const hazard of this.hazards) {
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) < hazard.radius) {
        mult = Math.min(mult, hazard.slowMultiplier)
      }
    }

    // Road movement is intentionally non-slippery: releasing every input stops
    // immediately instead of leaving residual velocity.
    body.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED)
    if (dir.lengthSq() === 0) {
      body.setVelocity(0, 0)
      body.setAcceleration(0, 0)
      return
    }

    const desiredX = dir.x * PLAYER_SPEED * mult
    const desiredY = dir.y * PLAYER_SPEED * mult
    body.setAcceleration(
      (desiredX - body.velocity.x) * PLAYER_ACCELERATION,
      (desiredY - body.velocity.y) * PLAYER_ACCELERATION,
    )
  }

  private updateFacing(dir: Phaser.Math.Vector2) {
    if (dir.x === 0 && dir.y === 0) return
    if (Math.abs(dir.y) >= Math.abs(dir.x)) {
      this.facing = dir.y > 0 ? 'front' : 'back'
      this.player.setFlipX(false)
    } else {
      this.facing = 'side'
      this.player.setFlipX(dir.x > 0)
    }
    const textureKey = this.facing === 'front' ? 'hero-front' : this.facing === 'back' ? 'hero-back' : 'hero-side'
    if (this.player.texture.key !== textureKey) this.player.setTexture(textureKey)
  }

  private handleHideInteraction(time: number) {
    const nearby = this.hidingSpots.find((spot) => Phaser.Math.Distance.Between(this.player.x, this.player.y, spot.exitX, spot.exitY) < 46)
    const available = nearby && this.phase === 'free'
    this.hideHint.setVisible(Boolean(available))

    if (!Phaser.Input.Keyboard.JustDown(this.interactKey) || !available) return

    if (this.hidden) {
      this.exitHide(time)
    } else {
      this.enterHide(time)
    }
  }

  private enterHide(_time: number) {
    const spot = this.hidingSpots.find((s) => Phaser.Math.Distance.Between(this.player.x, this.player.y, s.exitX, s.exitY) < 46)
    if (!spot) return
    this.hidden = true
    this.hideExit.set(spot.exitX, spot.exitY)
    this.player.setVisible(false)
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
    this.exactMemory = null
    this.exactMemoryUntil = 0
    this.horde.forEach(({ instance }) => {
      instance.knowledge = 'broad'
      instance.state = 'roam'
      instance.searchTarget = null
      instance.wanderTimer = Phaser.Math.Between(300, 1100)
      instance.wanderTarget = this.pickBroadWanderTarget()
      instance.sprite.clearTint()
    })
  }

  private exitHide(time: number) {
    this.hidden = false
    this.player.setVisible(true)
    ;(this.player.body as Phaser.Physics.Arcade.Body).reset(this.hideExit.x, this.hideExit.y)
    this.updateMemoryFromPlayer(time, true)
    this.alertAllChasers(true)
  }

  // ---------------------------------------------------------------------
  // memory / detection / smart roaming
  // ---------------------------------------------------------------------

  private updateMemory(time: number) {
    if (this.hidden) return
    const seenBy = this.horde.find(({ instance }) => {
      const dx = Phaser.Math.Distance.Between(instance.sprite.x, instance.sprite.y, this.player.x, this.player.y)
      return dx <= instance.definition.detectionRadius && this.hasLineOfSight(instance.sprite.x, instance.sprite.y, this.player.x, this.player.y)
    })

    if (seenBy) {
      this.updateMemoryFromPlayer(time, true)
      this.alertAllChasers(false)
      return
    }

    if (this.broadMemory) {
      // Broad information is a stale search bubble, not a live tracker.
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.broadMemory.x, this.broadMemory.y)
      if (dist > BROAD_MEMORY_RADIUS * 1.5) {
        this.broadMemory = null
        this.horde.forEach(({ instance }) => {
          if (instance.knowledge === 'broad') {
            instance.knowledge = 'none'
            instance.state = 'roam'
          }
        })
      }
    }
    if (this.exactMemory && time > this.exactMemoryUntil) {
      this.exactMemory = null
    }
  }

  private updateMemoryFromPlayer(time: number, exact: boolean) {
    this.broadMemory = new Phaser.Math.Vector2(this.player.x, this.player.y)
    if (exact) {
      this.exactMemory = new Phaser.Math.Vector2(this.player.x, this.player.y)
      this.exactMemoryUntil = time + EXACT_MEMORY_DURATION
    }
  }

  private alertAllChasers(fromHideExit = false) {
    if (!this.broadMemory) this.broadMemory = new Phaser.Math.Vector2(this.player.x, this.player.y)
    this.horde.forEach(({ instance }) => {
      instance.knowledge = 'exact'
      instance.lastSeenAt = this.time.now
      instance.state = 'chase'
      instance.searchTarget = new Phaser.Math.Vector2(this.player.x, this.player.y)
      if (fromHideExit) instance.abilityTimer = Math.min(instance.abilityTimer, 350)
    })
  }

  private updateMemoryForAllAfterDetection(source: Phaser.Physics.Arcade.Sprite) {
    void source
    if (!this.exactMemory) return
    this.alertAllChasers(false)
  }

  private runHordeAi(time: number, delta: number) {
    this.horde.forEach(({ ai, instance }) => {
      const ctx: ChaserContext = {
        player: this.player,
        delta,
        time,
        isPlayerHidden: this.hidden,
        exactLocation: this.exactMemory,
        broadLocation: this.broadMemory,
        broadRadius: BROAD_MEMORY_RADIUS,
        hasLineOfSight: (x1, y1, x2, y2) => this.hasLineOfSight(x1, y1, x2, y2),
        moveTowardsRoadTarget: (sprite, target, speed) => this.moveTowardsRoadTarget(sprite, target, speed),
        getRoadPointNear: (x, y) => this.getRoadPointNear(x, y),
        alertAll: (source) => this.updateMemoryForAllAfterDetection(source),
        showAbilityLine: (source, angle, length, color) => this.showDashLine(source, angle, length, color),
        emitScreenEffect: (type, strength, duration) => this.emitScreenEffect(type, strength, duration),
        createPulse: (x, y, radius, color) => this.createSearchPulse(x, y, radius, color),
        createHazard: (x, y, radius, duration, slowMultiplier) => this.createHazard(x, y, radius, duration, slowMultiplier || HAZARD_SLOW_MULT_DEFAULT),
      }

      if (!this.hidden && this.exactMemory) {
        const directSeen = this.hasLineOfSight(instance.sprite.x, instance.sprite.y, this.player.x, this.player.y)
        if (
          directSeen &&
          Phaser.Math.Distance.Between(instance.sprite.x, instance.sprite.y, this.player.x, this.player.y) <= instance.definition.detectionRadius
        ) {
          instance.knowledge = 'exact'
          instance.state = 'chase'
          instance.lastSeenAt = time
        }
      }

      if (instance.knowledge === 'exact' && time - instance.lastSeenAt > EXACT_MEMORY_DURATION) {
        instance.knowledge = 'broad'
        instance.state = 'search'
      }
      if (instance.knowledge === 'none' && this.broadMemory) instance.knowledge = 'broad'

      // Every chaser gets the same ability now: a road-constrained dash.
      ai.update(instance, ctx)
      if (this.handleActiveDash(instance, time)) return
      if (instance.definition.hasDash) this.tryStartDash(instance, time)
      if (this.handleActiveDash(instance, time)) return

      if (this.hidden) {
        instance.knowledge = 'broad'
        instance.state = 'roam'
        this.runRoam(instance, delta)
        return
      }

      if (instance.knowledge === 'exact') {
        instance.state = 'chase'
        const target = this.getChaseTarget(instance)
        if (target) this.moveTowardsRoadTarget(instance.sprite, target, instance.definition.chaseSpeed)
      } else if (instance.knowledge === 'broad') {
        this.runBroadSearch(instance, delta)
      } else {
        this.runRoam(instance, delta)
      }
    })
  }

  private handleActiveDash(instance: ChaserInstance, time: number) {
    const sprite = instance.sprite
    const body = sprite.body as Phaser.Physics.Arcade.Body
    const dashStart = sprite.getData('dashStart') as number | undefined
    const dashUntil = sprite.getData('dashUntil') as number | undefined
    const dashVelocity = sprite.getData('dashVelocity') as { x: number; y: number } | undefined

    if (dashStart && time < dashStart) {
      body.setVelocity(0, 0)
      return true
    }

    if (dashStart && time >= dashStart) sprite.setData('dashStart', 0)

    if (dashUntil && dashVelocity && time < dashUntil) {
      // Cancel only for a NEW collision in the direction of travel. `touching`
      // is intentionally not used: its previous-frame value used to cancel a
      // dash immediately after its telegraph.
      const hitDashWall =
        (dashVelocity.x < 0 && body.blocked.left) ||
        (dashVelocity.x > 0 && body.blocked.right) ||
        (dashVelocity.y < 0 && body.blocked.up) ||
        (dashVelocity.y > 0 && body.blocked.down)
      if (hitDashWall) {
        body.setVelocity(0, 0)
        sprite.setData('dashUntil', 0)
        sprite.setData('dashVelocity', null)
        sprite.setData('dashStart', 0)
        return false
      }

      body.setVelocity(dashVelocity.x, dashVelocity.y)
      return true
    }

    if (dashUntil && time >= dashUntil) {
      body.setVelocity(0, 0)
      sprite.setData('dashUntil', 0)
      sprite.setData('dashVelocity', null)
    }

    return false
  }

  private tryStartDash(instance: ChaserInstance, time: number) {
    const sprite = instance.sprite
    const existing = sprite.getData('dashStart') as number | undefined
    const dashUntil = sprite.getData('dashUntil') as number | undefined
    if (existing || dashUntil || instance.knowledge !== 'exact' || instance.abilityTimer > 0 || this.hidden) return

    const target = this.getChaseTarget(instance)
    if (!target) return
    // A dash is an attack, not a navigation shortcut. Check the actual
    // player, rather than the intercept point: the intercept point can be
    // around a corner even though the player is plainly visible.
    if (!this.hasLineOfSight(sprite.x, sprite.y, this.player.x, this.player.y)) return

    const directionTarget = this.getNextPathPoint(sprite.x, sprite.y, target.x, target.y)
    if (!directionTarget) return

    const direction = new Phaser.Math.Vector2(directionTarget.x - sprite.x, directionTarget.y - sprite.y)
    if (direction.lengthSq() < 25) return
    direction.normalize()

    // Dashes only travel along the next graph edge. This makes the dash
    // Pac-Man-like: turn at intersections instead of cutting through blocks.
    const edgeDistance = Phaser.Math.Distance.Between(sprite.x, sprite.y, directionTarget.x, directionTarget.y)
    // Never overshoot a junction.  Overshooting was the reason dashes
    // frequently appeared to do nothing: Arcade immediately pushed the
    // chaser back into the wall at the end of the segment.
    const dashDistance = Math.min(Math.max(edgeDistance - 22, 56), 300)
    const telegraphMs = 500
    const dashSpeed = Math.max(instance.definition.chaseSpeed * 1.75, 300)
    const dashMs = (dashDistance / dashSpeed) * 1000

    instance.abilityTimer = instance.definition.abilityCooldown
    sprite.setData('dashStart', time + telegraphMs)
    sprite.setData('dashUntil', time + telegraphMs + dashMs)
    sprite.setData('dashVelocity', { x: direction.x * dashSpeed, y: direction.y * dashSpeed })
    this.showDashLine(sprite, Phaser.Math.Angle.Between(sprite.x, sprite.y, directionTarget.x, directionTarget.y), dashDistance, instance.definition.color, telegraphMs + dashMs)
    this.emitScreenEffect('dashWarning', 0.12, telegraphMs + dashMs)
  }

  private getNextPathPoint(fromX: number, fromY: number, toX: number, toY: number) {
    const direct = this.getRoadPointNear(toX, toY)
    const verticalX = this.nearestRoadCenter(fromX, true)
    const horizontalY = this.nearestRoadCenter(fromY, false)
    const onVertical = Math.abs(fromX - verticalX) <= ROAD_W * 0.42
    const onHorizontal = Math.abs(fromY - horizontalY) <= ROAD_W * 0.42

    // Stay on the current road when the destination is already on it.
    // The old implementation always started A* from the nearest
    // intersection, which made a chaser cut diagonally across a block when
    // it was halfway along a road.
    if (onVertical && Math.abs(direct.x - verticalX) <= 2) {
      return new Phaser.Math.Vector2(verticalX, direct.y)
    }
    if (onHorizontal && Math.abs(direct.y - horizontalY) <= 2) {
      return new Phaser.Math.Vector2(direct.x, horizontalY)
    }

    const fromNode = this.nearestRoadNode(fromX, fromY)
    const toNode = this.nearestRoadNode(direct.x, direct.y)

    // If we are between intersections, first finish the current road
    // segment. Pick the end of that segment that produces the shorter graph
    // route to the destination.
    const fromPoint = this.roadNodeToPoint(fromNode)
    const nearIntersection = Phaser.Math.Distance.Between(fromX, fromY, fromPoint.x, fromPoint.y) < 18
    if ((onHorizontal || onVertical) && !nearIntersection) {
      const candidates: GridNode[] = []
      if (onHorizontal) {
        const row = this.nearestRoadNode(fromX, horizontalY).row
        candidates.push(
          { col: Math.max(0, fromNode.col - 1), row },
          { col: Math.min(COLS, fromNode.col + 1), row },
        )
      } else {
        const col = this.nearestRoadNode(verticalX, fromY).col
        candidates.push(
          { col, row: Math.max(0, fromNode.row - 1) },
          { col, row: Math.min(ROWS, fromNode.row + 1) },
        )
      }
      const viable = candidates
        .filter((node, index, all) => all.findIndex((n) => n.col === node.col && n.row === node.row) === index)
        .map((node) => ({
          node,
          path: this.roadPathfinder.findPath(node, toNode),
          distance: Phaser.Math.Distance.Between(fromX, fromY, this.roadNodeToPoint(node).x, this.roadNodeToPoint(node).y),
        }))
        .sort((a, b) => (a.path.length * 420 + a.distance) - (b.path.length * 420 + b.distance))
      if (viable.length > 0) {
        const chosen = viable[0].node
        const point = this.roadNodeToPoint(chosen)
        // Do not reverse unless that is genuinely the shorter route.
        if (Phaser.Math.Distance.Between(fromX, fromY, point.x, point.y) > 12) return point
      }
    }

    const path = this.roadPathfinder.findPath(fromNode, toNode)
    if (path.length <= 1) {
      const nodePoint = this.roadNodeToPoint(fromNode)
      if (Phaser.Math.Distance.Between(fromX, fromY, direct.x, direct.y) < 18) return direct
      if (Math.abs(fromY - direct.y) <= ROAD_W * 0.45 || Math.abs(fromX - direct.x) <= ROAD_W * 0.45) {
        return direct
      }
      // Same intersection but off-center: re-center on the road node rather
      // than stopping forever in a diagonal/off-road approach.
      if (Phaser.Math.Distance.Between(fromX, fromY, nodePoint.x, nodePoint.y) > 8) return nodePoint
      return direct
    }

    const nextNode = path[1]
    return this.roadNodeToPoint(nextNode)
  }

  private nearestRoadNode(x: number, y: number): GridNode {
    const stepX = BLOCK_W + ROAD_W
    const stepY = BLOCK_H + ROAD_W
    return this.roadPathfinder.nearestNode(
      Math.round((x - ROAD_W / 2) / stepX),
      Math.round((y - ROAD_W / 2) / stepY),
    )
  }

  private roadNodeToPoint(node: GridNode) {
    return new Phaser.Math.Vector2(
      ROAD_W / 2 + node.col * (BLOCK_W + ROAD_W),
      ROAD_W / 2 + node.row * (BLOCK_H + ROAD_W),
    )
  }

  private getChaseTarget(instance: ChaserInstance) {
    const remembered = this.exactMemory ?? this.broadMemory
    if (!remembered) return null
    const slot = (instance.sprite.getData('slot') as number | undefined) ?? 0
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body
    const moving = new Phaser.Math.Vector2(playerBody.velocity.x, playerBody.velocity.y)
    if (moving.lengthSq() < 100) moving.set(slot % 2 === 0 ? 1 : -1, slot < 4 ? 0 : 1)
    else moving.normalize()
    const side = new Phaser.Math.Vector2(-moving.y, moving.x)
    const plans = [
      [0, 0], [220, 0], [160, 150], [160, -150], [-140, 180], [-140, -180], [340, 0],
    ]
    const [ahead, lateral] = plans[slot % plans.length]
    return this.getRoadPointNear(remembered.x + moving.x * ahead + side.x * lateral, remembered.y + moving.y * ahead + side.y * lateral)
  }

  private runRoam(instance: ChaserInstance, delta: number) {
    instance.wanderTimer -= delta
    const d = Phaser.Math.Distance.Between(instance.sprite.x, instance.sprite.y, instance.wanderTarget.x, instance.wanderTarget.y)
    if (instance.wanderTimer <= 0 || d < 28) {
      // Patrol is autonomous. It does not depend on the player generating a
      // new movement event or a new memory point.
      instance.wanderTarget = this.pickRoadWanderTarget(instance.sprite.x, instance.sprite.y)
      instance.wanderTimer = Phaser.Math.Between(650, 1400)
    }
    this.moveTowardsRoadTarget(instance.sprite, instance.wanderTarget, instance.definition.roamSpeed)
  }

  private runBroadSearch(instance: ChaserInstance, delta: number) {
    if (!this.broadMemory) {
      instance.knowledge = 'none'
      this.runRoam(instance, delta)
      return
    }
    if (!instance.searchTarget || Phaser.Math.Distance.Between(instance.sprite.x, instance.sprite.y, instance.searchTarget.x, instance.searchTarget.y) < 28) {
      instance.searchTarget = this.pickBroadWanderTarget()
      instance.wanderTimer = Phaser.Math.Between(450, 900)
    }
    this.moveTowardsRoadTarget(instance.sprite, instance.searchTarget, instance.definition.roamSpeed * 1.16)
    if (instance.wanderTimer > 0) instance.wanderTimer -= delta
    if (instance.wanderTimer <= 0) instance.searchTarget = null
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number) {
    const line = new Phaser.Geom.Line(x1, y1, x2, y2)
    return !this.obstacles.some((o) => Phaser.Geom.Intersects.LineToRectangle(line, o.rect))
  }

  private pickRoadWanderTarget(fromX: number, fromY: number) {
    const point = this.getRoadPointNear(fromX, fromY)
    const axisHorizontal = Math.random() > 0.5
    if (axisHorizontal) point.x = Phaser.Math.Clamp(point.x + Phaser.Math.Between(-Math.round(BLOCK_W * 0.55), Math.round(BLOCK_W * 0.55)), 20, MAP_W - 20)
    else point.y = Phaser.Math.Clamp(point.y + Phaser.Math.Between(-Math.round(BLOCK_H * 0.55), Math.round(BLOCK_H * 0.55)), 20, MAP_H - 20)
    return this.getRoadPointNear(point.x, point.y)
  }

  private pickBroadWanderTarget() {
    if (!this.broadMemory) return this.getRoadPointNear(this.player.x, this.player.y)
    for (let i = 0; i < 8; i++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2)
      const radius = Phaser.Math.FloatBetween(100, BROAD_MEMORY_RADIUS * 0.9)
      const candidate = this.getRoadPointNear(
        this.broadMemory.x + Math.cos(angle) * radius,
        this.broadMemory.y + Math.sin(angle) * radius,
      )
      if (Phaser.Math.Distance.Between(candidate.x, candidate.y, this.broadMemory.x, this.broadMemory.y) <= BROAD_MEMORY_RADIUS) return candidate
    }
    return this.getRoadPointNear(this.broadMemory.x, this.broadMemory.y)
  }

  private getRoadPointNear(x: number, y: number) {
    const nearestVertical = this.nearestRoadCenter(x, true)
    const nearestHorizontal = this.nearestRoadCenter(y, false)
    const dx = Math.abs(x - nearestVertical)
    const dy = Math.abs(y - nearestHorizontal)
    if (dx <= dy) return new Phaser.Math.Vector2(nearestVertical, Phaser.Math.Clamp(y, 0, MAP_H))
    return new Phaser.Math.Vector2(Phaser.Math.Clamp(x, 0, MAP_W), nearestHorizontal)
  }

  private nearestRoadCenter(value: number, vertical: boolean) {
    const count = vertical ? COLS + 1 : ROWS + 1
    const step = BLOCK_W + ROAD_W
    let best = ROAD_W / 2
    let bestDist = Number.POSITIVE_INFINITY
    for (let i = 0; i < count; i++) {
      const c = ROAD_W / 2 + i * step
      const d = Math.abs(value - c)
      if (d < bestDist) { best = c; bestDist = d }
    }
    return best
  }

  private moveTowardsRoadTarget(sprite: Phaser.Physics.Arcade.Sprite, target: Phaser.Math.Vector2, speed: number) {
    const body = sprite.body as Phaser.Physics.Arcade.Body
    const roadTarget = this.getRoadPointNear(target.x, target.y)
    const waypoint = this.getNextPathPoint(sprite.x, sprite.y, roadTarget.x, roadTarget.y)

    if (!waypoint) {
      body.setVelocity(0, 0)
      return
    }

    const dir = new Phaser.Math.Vector2(waypoint.x - sprite.x, waypoint.y - sprite.y)
    if (dir.lengthSq() < 9) {
      body.setVelocity(0, 0)
      return
    }

    dir.normalize()
    body.setMaxVelocity(speed, speed)
    body.setVelocity(dir.x * speed, dir.y * speed)
    sprite.setFlipX(dir.x < 0)
  }

  // ---------------------------------------------------------------------
  // abilities / effects
  // ---------------------------------------------------------------------

  private showDashLine(sprite: Phaser.Physics.Arcade.Sprite, angle: number, length: number, color: number, duration = 650) {
    const x2 = sprite.x + Math.cos(angle) * length
    const y2 = sprite.y + Math.sin(angle) * length
    this.dashLine.clear()
    this.dashLine.lineStyle(5, color, 0.55)
    this.dashLine.strokeLineShape(new Phaser.Geom.Line(sprite.x, sprite.y, x2, y2))
    this.dashLine.lineStyle(1, 0xffffff, 0.8)
    this.dashLine.strokeLineShape(new Phaser.Geom.Line(sprite.x, sprite.y, x2, y2))
    this.dashLine.setVisible(true)
    this.tweens.add({ targets: this.dashLine, alpha: 0, delay: Math.max(0, duration - 220), duration: 220, onComplete: () => {
      this.dashLine.clear().setAlpha(1).setVisible(false)
    } })
  }

  private createSearchPulse(x: number, y: number, radius: number, color: number) {
    const pulse = this.add.circle(x, y, 12, color, 0.05).setStrokeStyle(3, color, 0.65).setDepth(7)
    this.tweens.add({ targets: pulse, radius, alpha: 0, duration: 900, onComplete: () => pulse.destroy() })
  }

  private createHazard(x: number, y: number, radius: number, duration: number, slowMultiplier: number) {
    const ring = this.add.circle(x, y, radius, 0xff55b8, 0.08).setStrokeStyle(3, 0xff55b8, 0.45).setDepth(-1)
    this.hazards.push({ x, y, radius, endAt: this.time.now + duration, slowMultiplier, ring })
  }

  private updateHazards(time: number) {
    this.hazards = this.hazards.filter((h) => {
      if (time >= h.endAt) { h.ring.destroy(); return false }
      const left = h.endAt - time
      h.ring.setAlpha(Math.min(0.18, left / 1600 * 0.18))
      return true
    })
  }

  private emitScreenEffect(type: string, strength: number, duration: number) {
    this.currentScreenEffects.push({ type, strength, endAt: this.time.now + duration, duration })
  }

  private updateScreenEffects(time: number) {
    this.currentScreenEffects = this.currentScreenEffects.filter((e) => time < e.endAt)
    const dread = this.currentScreenEffects.filter((e) => e.type === 'dread').reduce((m, e) => Math.max(m, e.strength), 0)
    const siren = this.currentScreenEffects.filter((e) => e.type === 'siren').reduce((m, e) => Math.max(m, e.strength), 0)
    const dash = this.currentScreenEffects.filter((e) => e.type === 'dashWarning').reduce((m, e) => Math.max(m, e.strength), 0)
    const total = Math.min(0.72, dread + siren + dash)
    this.effectOverlay.setAlpha(Math.min(0.34, total * 0.22))
    this.effectBorder.setAlpha(total)
    this.effectLeft.setAlpha(total)
    this.effectRight.setAlpha(total)
    this.effectTop.setAlpha(total)
    this.effectBottom.setAlpha(total)
  }

  // ---------------------------------------------------------------------
  // collisions / hide state
  // ---------------------------------------------------------------------

  private handlePlayerHordeCollide(_playerObj: unknown, hordeObj: unknown) {
    if (this.phase !== 'free' || this.invincible || this.hidden) return
    const sprite = hordeObj as Phaser.Physics.Arcade.Sprite
    const unit = this.horde.find(({ instance }) => instance.sprite === sprite)
    this.registerHit(unit?.instance.definition.color ?? CHASER_TYPES[0].definition.color)
  }

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

    this.tweens.add({ targets: this.player, alpha: 0.35, duration: 90, yoyo: true, repeat: Math.round(HIT_INVINCIBLE_MS / 180), onComplete: () => this.player.setAlpha(1) })
    this.time.delayedCall(HIT_INVINCIBLE_MS, () => { this.invincible = false })

    if (this.hitCount >= MAX_HITS) this.startBattleHandoff(chaserColor)
  }

  private startBattleHandoff(chaserColor: number) {
    this.phase = 'scripted'
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
    this.horde.forEach(({ instance }) => (instance.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0))
    this.cameras.main.fadeOut(320, 10, 13, 18)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start('BattleIntro', { chaserColor }))
  }

  // ---------------------------------------------------------------------
  // HUD / resize
  // ---------------------------------------------------------------------

  private buildLetterbox() {
    const { width, height } = this.scale
    const barHeight = Math.max(90, Math.round(height * 0.24))
    this.letterboxTop = this.add.rectangle(width / 2, barHeight / 2, width, barHeight, 0x000000).setScrollFactor(0).setDepth(1000)
    this.letterboxBottom = this.add.rectangle(width / 2, height - barHeight / 2, width, barHeight, 0x000000).setScrollFactor(0).setDepth(1000)
  }

  private buildEffects() {
    const { width, height } = this.scale
    this.effectOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x05050a, 0.0).setScrollFactor(0).setDepth(1002)
    this.effectBorder = this.add.rectangle(width / 2, height / 2, width - 40, height - 40, 0x000000, 0).setStrokeStyle(18, 0x000000, 0.8).setScrollFactor(0).setDepth(1003)
    this.effectLeft = this.add.rectangle(18, height / 2, 36, height, 0x000000, 0).setScrollFactor(0).setDepth(1003)
    this.effectRight = this.add.rectangle(width - 18, height / 2, 36, height, 0x000000, 0).setScrollFactor(0).setDepth(1003)
    this.effectTop = this.add.rectangle(width / 2, 18, width, 36, 0x000000, 0).setScrollFactor(0).setDepth(1003)
    this.effectBottom = this.add.rectangle(width / 2, height - 18, width, 36, 0x000000, 0).setScrollFactor(0).setDepth(1003)
    this.dashLine = this.add.graphics().setDepth(1004)
  }

  private buildHud() {
    const { width, height } = this.scale
    this.hint = this.add.text(width / 2, height - 30, 'WASD / ARROWS — run   ·   E — hide', {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#ede3cf', backgroundColor: '#0a0d12cc', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(1001).setAlpha(0)
    this.hideHint = this.add.text(width / 2, height - 58, 'E — enter hiding spot', {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#c79a45', backgroundColor: '#0a0d12dd', padding: { x: 8, y: 4 },
    }).setOrigin(0.5, 1).setScrollFactor(0).setDepth(1001).setVisible(false)
    this.knowledgeLabel = this.add.text(16, 14, 'KNOWLEDGE: BROAD AREA', {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#8d8877', backgroundColor: '#0a0d12cc', padding: { x: 10, y: 6 },
    }).setScrollFactor(0).setDepth(1001)
    this.hitLabel = this.add.text(width - 16, 14, `HITS ${this.hitCount}/${MAX_HITS}`, {
      fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#ff3d6e', backgroundColor: '#0a0d12cc', padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(1001)

    this.tweens.add({ targets: this.hint, alpha: 1, duration: 300, delay: 500 })
    this.tweens.add({ targets: this.hint, alpha: 0, duration: 900, delay: 4200 })
  }

  private updateKnowledgeHud(_time: number) {
    if (this.hidden) this.knowledgeLabel.setText('HIDDEN — EXACT LOCATION LOST')
    else if (this.exactMemory) this.knowledgeLabel.setText('ALERT — EXACT LOCATION SHARED')
    else this.knowledgeLabel.setText('ROAM — BROAD AREA ONLY')
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    const { width, height } = gameSize
    this.cameras.main.setSize(width, height)
    const barHeight = Math.max(90, Math.round(height * 0.24))
    if (this.letterboxTop) this.letterboxTop.setPosition(width / 2, barHeight / 2).setSize(width, barHeight)
    if (this.letterboxBottom) this.letterboxBottom.setPosition(width / 2, height - barHeight / 2).setSize(width, barHeight)
    if (this.hint) this.hint.setPosition(width / 2, height - 30)
    if (this.hideHint) this.hideHint.setPosition(width / 2, height - 58)
    if (this.knowledgeLabel) this.knowledgeLabel.setPosition(16, 14)
    if (this.hitLabel) this.hitLabel.setPosition(width - 16, 14)
    if (this.effectOverlay) this.effectOverlay.setPosition(width / 2, height / 2).setSize(width, height)
    if (this.effectBorder) this.effectBorder.setPosition(width / 2, height / 2).setSize(Math.max(0, width - 40), Math.max(0, height - 40))
    if (this.effectLeft) this.effectLeft.setPosition(18, height / 2).setSize(36, height)
    if (this.effectRight) this.effectRight.setPosition(width - 18, height / 2).setSize(36, height)
    if (this.effectTop) this.effectTop.setPosition(width / 2, 18).setSize(width, 36)
    if (this.effectBottom) this.effectBottom.setPosition(width / 2, height - 18).setSize(width, 36)
  }
}
