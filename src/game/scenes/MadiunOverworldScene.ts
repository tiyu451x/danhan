import Phaser from 'phaser'
import { eventBus } from '../eventBus'

/**
 * The main gameplay loop: a top-down, Undertale-style room you walk around
 * with arrow keys / WASD. The layout is a stylized (NOT to-scale) map of
 * central Kota Madiun, built from a handful of real landmarks:
 *
 *   - Alun-Alun Kota Madiun sits at the city's real "km 0" — the crossing
 *     of the two main roads — ringed by the Masjid Agung Baitul Hakim to
 *     its east and Balai Kota (city hall) to its north.
 *   - Stasiun Madiun (running since 1882) and Pasar Besar sit a short walk
 *     west of the square.
 *   - Pabrik Gula Rejo Agung (the sugar factory) sits south of the square.
 *
 * Everything is drawn with primitives (rectangles + text) so there's no
 * dependency on art assets yet — swap the `add.rectangle` landmark blocks
 * for real tile/sprite art later without touching the movement, collision,
 * or camera code.
 */

const TILE = 32
const MAP_W = TILE * 40 // 1280
const MAP_H = TILE * 30 // 960
const PLAYER_SPEED = 190

interface Landmark {
  key: string
  label: string
  x: number
  y: number
  w: number
  h: number
  color: number
  note: string
}

// Stylized positions — real cardinal relationships, invented exact distances.
const LANDMARKS: Landmark[] = [
  {
    key: 'alun-alun',
    label: 'Alun-Alun Kota Madiun',
    x: 560,
    y: 420,
    w: 220,
    h: 180,
    color: 0x2c5c3f,
    note: 'The city square — km 0. Open ground, walk right through.',
  },
  {
    key: 'masjid',
    label: 'Masjid Agung Baitul Hakim',
    x: 840,
    y: 420,
    w: 120,
    h: 110,
    color: 0xb08a3e,
    note: 'East side of the square.',
  },
  {
    key: 'balai-kota',
    label: 'Balai Kota Madiun',
    x: 560,
    y: 210,
    w: 170,
    h: 90,
    color: 0x394a63,
    note: 'City hall, north of the square.',
  },
  {
    key: 'stasiun',
    label: 'Stasiun Madiun',
    x: 260,
    y: 420,
    w: 170,
    h: 110,
    color: 0x8a3b3b,
    note: 'Running since 1882.',
  },
  {
    key: 'pasar-besar',
    label: 'Pasar Besar',
    x: 250,
    y: 590,
    w: 140,
    h: 100,
    color: 0x7a6a35,
    note: 'The big market, near the station.',
  },
  {
    key: 'pabrik-gula',
    label: 'Pabrik Gula Rejo Agung',
    x: 560,
    y: 740,
    w: 190,
    h: 100,
    color: 0x555b45,
    note: 'Sugar factory, south of the square.',
  },
]

export default class MadiunOverworldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  private locationLabel!: Phaser.GameObjects.Text
  private currentLandmarkKey: string | null = null
  private landmarkZones: { landmark: Landmark; rect: Phaser.Geom.Rectangle }[] = []

  constructor() {
    super('MadiunOverworld')
  }

  create() {
    this.cameras.main.fadeIn(280, 10, 13, 18)
    eventBus.emit('scene-change', { stage: 'overworld' })

    this.physics.world.setBounds(0, 0, MAP_W, MAP_H)
    this.drawCityGround()
    this.drawRoads()
    const landmarksGroup = this.drawLandmarks()
    this.drawGrid()

    this.player = this.createPlayer()
    this.physics.add.collider(this.player, landmarksGroup)

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(1.4)

    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }

    this.landmarkZones = LANDMARKS.map((landmark) => ({
      landmark,
      rect: new Phaser.Geom.Rectangle(
        landmark.x - landmark.w / 2,
        landmark.y - landmark.h / 2,
        landmark.w,
        landmark.h,
      ),
    }))

    this.buildHud()
    this.scale.on('resize', this.handleResize, this)
  }

  update() {
    this.handleMovement()
    this.updateLocationLabel()
  }

  // ---------------------------------------------------------------------
  // world building
  // ---------------------------------------------------------------------

  private drawCityGround() {
    this.add.rectangle(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, 0x14181f).setDepth(-30)
  }

  private drawGrid() {
    const grid = this.add.grid(MAP_W / 2, MAP_H / 2, MAP_W, MAP_H, TILE, TILE, 0x000000, 0, 0xffffff, 0.03)
    grid.setDepth(-10)
  }

  private drawRoads() {
    const roadColor = 0x2a2f3a
    const laneLine = 0x3d4459
    // Jalan Pahlawan — main east/west road through the square
    this.add.rectangle(MAP_W / 2, 420, MAP_W, 70, roadColor).setDepth(-20)
    this.add.rectangle(MAP_W / 2, 420, MAP_W, 2, laneLine).setDepth(-19)
    // main north/south road, crossing at the square (the real alun-alun
    // sits right at the city's "km 0" road crossing)
    this.add.rectangle(560, MAP_H / 2, 70, MAP_H, roadColor).setDepth(-20)
    this.add.rectangle(560, MAP_H / 2, 2, MAP_H, laneLine).setDepth(-19)
    // spur down to Pabrik Gula
    this.add.rectangle(560, 660, 60, 220, roadColor).setDepth(-20)
  }

  private drawLandmarks() {
    const group = this.physics.add.staticGroup()

    LANDMARKS.forEach((landmark) => {
      // Alun-Alun is open public ground — walkable, not a collider
      const isOpenGround = landmark.key === 'alun-alun'

      const block = this.add.rectangle(landmark.x, landmark.y, landmark.w, landmark.h, landmark.color, isOpenGround ? 0.55 : 1)
      block.setStrokeStyle(2, 0xede3cf, isOpenGround ? 0.35 : 0.5)

      if (!isOpenGround) {
        this.physics.add.existing(block, true)
        group.add(block)
      }

      this.add
        .text(landmark.x, landmark.y - landmark.h / 2 - 14, landmark.label, {
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '12px',
          color: '#ede3cf',
          backgroundColor: '#0a0d12aa',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5, 1)
        .setDepth(20)
    })

    return group
  }

  private createPlayer() {
    // generate a simple placeholder texture so we don't need sprite art yet
    if (!this.textures.exists('player-placeholder')) {
      const g = this.add.graphics()
      g.fillStyle(0xc79a45, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0xede3cf, 0.9)
      g.strokeRect(1, 1, 22, 30)
      g.generateTexture('player-placeholder', 24, 32)
      g.destroy()
    }

    const spawnX = 560
    const spawnY = 560
    const player = this.physics.add.sprite(spawnX, spawnY, 'player-placeholder')
    player.setCollideWorldBounds(true)
    player.setDepth(10)
    const body = player.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 14).setOffset(2, 16)
    return player
  }

  private handleMovement() {
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

    body.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED)
  }

  // ---------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------

  private buildHud() {
    this.locationLabel = this.add
      .text(16, 14, '', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        color: '#e3b75e',
        backgroundColor: '#0a0d12cc',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(100)

    const hint = this.add
      .text(16, this.scale.height - 14, 'WASD / ARROWS — walk', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '11px',
        color: '#8d8877',
        backgroundColor: '#0a0d12cc',
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
      .setDepth(100)

    this.tweens.add({
      targets: hint,
      alpha: 0,
      delay: 3200,
      duration: 900,
      ease: 'Sine.easeIn',
    })
  }

  private updateLocationLabel() {
    const px = this.player.x
    const py = this.player.y
    const hit = this.landmarkZones.find(({ rect }) => Phaser.Geom.Rectangle.Contains(rect, px, py))
    const key = hit?.landmark.key ?? null

    if (key !== this.currentLandmarkKey) {
      this.currentLandmarkKey = key
      this.locationLabel.setText(hit ? `📍 ${hit.landmark.label}` : '')
      eventBus.emit('location-change', { label: hit?.landmark.label ?? null })
    }
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
  }
}
