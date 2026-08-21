# Adding Map Transitions — Walking Off-Screen to Adjacent Locations

When the player walks off the edge of one map, they should seamlessly enter an adjacent map (like Undertale's room-to-room system). Here's how to wire it up.

## Overview

1. Create a separate scene for each map/location
2. Add invisible overlap zones at the edges (north, south, east, west)
3. When the player overlaps a zone, trigger a transition to the adjacent scene
4. Pass the player's entry position so they spawn in the right spot

## Step 1: Create a Base Map Class (optional but clean)

Make a reusable parent class so all your maps share the same structure:

```typescript
// src/game/scenes/BaseMapScene.ts
import Phaser from 'phaser'

export interface MapConfig {
  key: string
  width: number
  height: number
  backgroundColor?: number
}

interface TransitionZone {
  direction: 'north' | 'south' | 'east' | 'west'
  targetScene: string
  targetSpawnPoint: { x: number; y: number }
}

export abstract class BaseMapScene extends Phaser.Scene {
  protected player!: Phaser.Physics.Arcade.Sprite
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  protected wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key }
  protected mapWidth: number = 1280
  protected mapHeight: number = 960
  protected transitionZones: TransitionZone[] = []
  protected isTransitioning = false

  abstract drawMap(): void
  abstract createPlayer(): void

  create() {
    this.cameras.main.fadeIn(200, 10, 13, 18)
    this.physics.world.setBounds(0, 0, this.mapWidth, this.mapHeight)

    this.drawMap()
    this.createPlayer()
    this.setupInput()
    this.setupCamera()
    this.createTransitionZones()
    this.scale.on('resize', this.handleResize, this)
  }

  update() {
    this.handleMovement()
  }

  protected setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys()
    this.wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
  }

  protected setupCamera() {
    this.cameras.main.setBounds(0, 0, this.mapWidth, this.mapHeight)
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12)
    this.cameras.main.setZoom(1.4)
  }

  protected createTransitionZones() {
    // Override this in child scenes to define transitions
    // Example:
    // this.transitionZones = [
    //   { direction: 'north', targetScene: 'AlunAlunNorth', targetSpawnPoint: { x: 560, y: 850 } },
    //   { direction: 'south', targetScene: 'AlunAlunSouth', targetSpawnPoint: { x: 560, y: 150 } },
    // ]
  }

  protected handleMovement() {
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

    body.setVelocity(dir.x * 190, dir.y * 190)

    // Check transitions
    this.checkTransitions()
  }

  protected checkTransitions() {
    if (this.isTransitioning) return

    const px = this.player.x
    const py = this.player.y
    const buffer = 30 // pixels from edge to trigger

    if (py < buffer) {
      this.triggerTransition('north')
    } else if (py > this.mapHeight - buffer) {
      this.triggerTransition('south')
    } else if (px < buffer) {
      this.triggerTransition('west')
    } else if (px > this.mapWidth - buffer) {
      this.triggerTransition('east')
    }
  }

  protected triggerTransition(direction: 'north' | 'south' | 'east' | 'west') {
    const zone = this.transitionZones.find((z) => z.direction === direction)
    if (!zone) return

    this.isTransitioning = true
    this.cameras.main.fadeOut(250, 10, 13, 18)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(zone.targetScene, {
        spawnX: zone.targetSpawnPoint.x,
        spawnY: zone.targetSpawnPoint.y,
        entryDirection: direction,
      })
    })
  }

  protected handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setSize(gameSize.width, gameSize.height)
  }
}
```

## Step 2: Refactor MadiunOverworldScene to Extend BaseMapScene

```typescript
// src/game/scenes/MadiunOverworldScene.ts
import Phaser from 'phaser'
import { BaseMapScene } from './BaseMapScene'
import { eventBus } from '../eventBus'

const TILE = 32
const MAP_W = TILE * 40
const MAP_H = TILE * 30
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

const LANDMARKS: Landmark[] = [
  // ... keep existing landmarks
]

export default class MadiunOverworldScene extends BaseMapScene {
  private locationLabel!: Phaser.GameObjects.Text
  private currentLandmarkKey: string | null = null
  private landmarkZones: { landmark: Landmark; rect: Phaser.Geom.Rectangle }[] = []

  constructor() {
    super('MadiunOverworld')
    this.mapWidth = MAP_W
    this.mapHeight = MAP_H
  }

  init(data: { spawnX?: number; spawnY?: number; entryDirection?: string }) {
    // Store spawn position if coming from another map
    this.registry.set('playerSpawnX', data.spawnX ?? 560)
    this.registry.set('playerSpawnY', data.spawnY ?? 560)
  }

  drawMap() {
    this.drawCityGround()
    this.drawRoads()
    this.drawLandmarks()
    this.drawGrid()
  }

  createPlayer() {
    if (!this.textures.exists('player-placeholder')) {
      const g = this.add.graphics()
      g.fillStyle(0xc79a45, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0xede3cf, 0.9)
      g.strokeRect(1, 1, 22, 30)
      g.generateTexture('player-placeholder', 24, 32)
      g.destroy()
    }

    const spawnX = this.registry.get('playerSpawnX') ?? 560
    const spawnY = this.registry.get('playerSpawnY') ?? 560
    const player = this.physics.add.sprite(spawnX, spawnY, 'player-placeholder')
    player.setCollideWorldBounds(true)
    player.setDepth(10)
    const body = player.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 14).setOffset(2, 16)
    this.player = player
  }

  create() {
    eventBus.emit('scene-change', { stage: 'overworld' })
    super.create() // calls parent's create, which calls drawMap() and createPlayer()

    const landmarksGroup = this.physics.add.staticGroup()
    LANDMARKS.forEach((landmark) => {
      if (landmark.key !== 'alun-alun') {
        const block = this.add.rectangle(landmark.x, landmark.y, landmark.w, landmark.h, landmark.color, 1)
        this.physics.add.existing(block, true)
        landmarksGroup.add(block)
      }
    })

    this.physics.add.collider(this.player, landmarksGroup)
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
  }

  update() {
    super.update() // calls handleMovement() which now includes transition checks
    this.updateLocationLabel()
  }

  protected createTransitionZones() {
    this.transitionZones = [
      // North: go to Balai Kota interior or next street
      {
        direction: 'north',
        targetScene: 'BalaiKotaInterior',
        targetSpawnPoint: { x: 560, y: 850 },
      },
      // South: go to Pabrik Gula area
      {
        direction: 'south',
        targetScene: 'PabrikGulaArea',
        targetSpawnPoint: { x: 560, y: 150 },
      },
      // East: go to Masjid area
      {
        direction: 'east',
        targetScene: 'MasjidArea',
        targetSpawnPoint: { x: 100, y: 420 },
      },
      // West: go to Stasiun area
      {
        direction: 'west',
        targetScene: 'StasiunArea',
        targetSpawnPoint: { x: 1180, y: 420 },
      },
    ]
  }

  private drawCityGround() {
    this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x14181f).setDepth(-30)
  }

  private drawRoads() {
    const roadColor = 0x2a2f3a
    const laneLine = 0x3d4459
    this.add.rectangle(this.mapWidth / 2, 420, this.mapWidth, 70, roadColor).setDepth(-20)
    this.add.rectangle(this.mapWidth / 2, 420, this.mapWidth, 2, laneLine).setDepth(-19)
    this.add.rectangle(560, this.mapHeight / 2, 70, this.mapHeight, roadColor).setDepth(-20)
    this.add.rectangle(560, this.mapHeight / 2, 2, this.mapHeight, laneLine).setDepth(-19)
    this.add.rectangle(560, 660, 60, 220, roadColor).setDepth(-20)
  }

  private drawGrid() {
    const grid = this.add.grid(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, TILE, TILE, 0x000000, 0, 0xffffff, 0.03)
    grid.setDepth(-10)
  }

  private drawLandmarks() {
    LANDMARKS.forEach((landmark) => {
      const isOpenGround = landmark.key === 'alun-alun'
      const block = this.add.rectangle(landmark.x, landmark.y, landmark.w, landmark.h, landmark.color, isOpenGround ? 0.55 : 1)
      block.setStrokeStyle(2, 0xede3cf, isOpenGround ? 0.35 : 0.5)

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
  }

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
}
```

## Step 3: Create an Adjacent Map Scene

Here's an example of a simple building interior you'd enter from the north:

```typescript
// src/game/scenes/BalaiKotaInterior.ts
import Phaser from 'phaser'
import { BaseMapScene } from './BaseMapScene'

export default class BalaiKotaInteriorScene extends BaseMapScene {
  private locationLabel!: Phaser.GameObjects.Text

  constructor() {
    super('BalaiKotaInterior')
    this.mapWidth = 800
    this.mapHeight = 600
  }

  init(data: { spawnX?: number; spawnY?: number; entryDirection?: string }) {
    this.registry.set('playerSpawnX', data.spawnX ?? 400)
    this.registry.set('playerSpawnY', data.spawnY ?? 550)
  }

  drawMap() {
    // Interior room background
    this.add.rectangle(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 0x1a1f2e).setDepth(-30)

    // Simple interior layout: walls, a desk, a window
    // Left wall
    this.add.rectangle(30, this.mapHeight / 2, 60, this.mapHeight, 0x4a5568).setDepth(-20)
    // Right wall
    this.add.rectangle(this.mapWidth - 30, this.mapHeight / 2, 60, this.mapHeight, 0x4a5568).setDepth(-20)
    // Desk in center
    this.add.rectangle(this.mapWidth / 2, 250, 200, 80, 0x5c3d2e).setDepth(-20)
    // Window (visual only)
    this.add.rectangle(this.mapWidth / 2, 80, 200, 100, 0x87ceeb).setDepth(-20)

    const grid = this.add.grid(this.mapWidth / 2, this.mapHeight / 2, this.mapWidth, this.mapHeight, 32, 32, 0x000000, 0, 0xffffff, 0.02)
    grid.setDepth(-10)
  }

  createPlayer() {
    if (!this.textures.exists('player-placeholder')) {
      const g = this.add.graphics()
      g.fillStyle(0xc79a45, 1)
      g.fillRect(0, 0, 24, 32)
      g.lineStyle(2, 0xede3cf, 0.9)
      g.strokeRect(1, 1, 22, 30)
      g.generateTexture('player-placeholder', 24, 32)
      g.destroy()
    }

    const spawnX = this.registry.get('playerSpawnX') ?? 400
    const spawnY = this.registry.get('playerSpawnY') ?? 550
    const player = this.physics.add.sprite(spawnX, spawnY, 'player-placeholder')
    player.setCollideWorldBounds(true)
    player.setDepth(10)
    const body = player.body as Phaser.Physics.Arcade.Body
    body.setSize(20, 14).setOffset(2, 16)
    this.player = player
  }

  create() {
    super.create()

    // Simple collision with desk
    const desk = this.physics.add.staticGroup()
    const deskBlock = this.add.rectangle(this.mapWidth / 2, 250, 200, 80, 0x5c3d2e, 0)
    this.physics.add.existing(deskBlock, true)
    desk.add(deskBlock)
    this.physics.add.collider(this.player, desk)

    this.buildHud()
  }

  update() {
    super.update()
  }

  protected createTransitionZones() {
    this.transitionZones = [
      // South: exit back to the main square
      {
        direction: 'south',
        targetScene: 'MadiunOverworld',
        targetSpawnPoint: { x: 560, y: 350 },
      },
    ]
  }

  private buildHud() {
    this.locationLabel = this.add
      .text(16, 14, 'Balai Kota — Interior', {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '13px',
        color: '#e3b75e',
        backgroundColor: '#0a0d12cc',
        padding: { x: 10, y: 6 },
      })
      .setScrollFactor(0)
      .setDepth(100)
  }
}
```

## Step 4: Register the New Scenes in GameStage.tsx

```typescript
// src/game/GameStage.tsx
import PlaceholderCutsceneScene from './scenes/PlaceholderCutsceneScene'
import MadiunOverworldScene from './scenes/MadiunOverworldScene'
import BalaiKotaInteriorScene from './scenes/BalaiKotaInterior'
import PabrikGulaAreaScene from './scenes/PabrikGulaArea' // (create this similarly)
import StasiunAreaScene from './scenes/StasiunArea' // (create this similarly)
import MasjidAreaScene from './scenes/MasjidArea' // (create this similarly)

// in the game config:
scene: [
  PlaceholderCutsceneScene,
  MadiunOverworldScene,
  BalaiKotaInteriorScene,
  PabrikGulaAreaScene,
  StasiunAreaScene,
  MasjidAreaScene,
],
```

## How It Works

1. **Player walks near an edge** → `checkTransitions()` fires every frame and checks if `py < buffer` (north) etc.
2. **Edge detected** → `triggerTransition()` finds the matching zone and fades out the camera
3. **On fade complete** → `scene.start(nextScene, { spawnX, spawnY, entryDirection })` launches the new scene
4. **New scene's `init()`** → grabs the spawn position from `data` and stores it in the registry
5. **New scene's `createPlayer()`** → spawns the player at that position instead of the default
6. **Player now in new map** → the same `checkTransitions()` loop handles exits from this map

## Tips

- **Smooth transitions**: The fade-out/fade-in is fast (250ms) so it feels snappy, not jarring.
- **Buffer zone**: The `buffer = 30` pixels means they don't have to be exactly on the edge — a 30-pixel band near the edge triggers the transition. Adjust to your preference.
- **Multiple exits per map**: You can have many transition zones (north, south, east, west, plus maybe a door to a building interior). Just add them all to `createTransitionZones()`.
- **Bidirectional travel**: Each map needs transition zones pointing back to its neighbors. If Balai Kota Interior points south to the square, the square should point north to Balai Kota Interior.
- **Player data persistence**: If you need to track the player's inventory, health, or card collection across scenes, store it in a shared registry (`this.registry.set()` / `.get()`) or use the eventBus.

That's the pattern — one base class, one scene per map location, and edge-zone detection handles the rest.
