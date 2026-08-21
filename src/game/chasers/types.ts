import Phaser from 'phaser'

export type ChaserState = 'roam' | 'search' | 'chase'
export type KnowledgeMode = 'none' | 'broad' | 'exact'

export interface ChaserContext {
  player: Phaser.Physics.Arcade.Sprite
  delta: number
  time: number
  isPlayerHidden: boolean
  exactLocation: Phaser.Math.Vector2 | null
  broadLocation: Phaser.Math.Vector2 | null
  broadRadius: number
  hasLineOfSight: (x1: number, y1: number, x2: number, y2: number) => boolean
  moveTowardsRoadTarget: (sprite: Phaser.Physics.Arcade.Sprite, target: Phaser.Math.Vector2, speed: number) => void
  getRoadPointNear: (x: number, y: number) => Phaser.Math.Vector2
  alertAll: (source: Phaser.Physics.Arcade.Sprite) => void
  showAbilityLine?: (source: Phaser.Physics.Arcade.Sprite, angle: number, length: number, color: number) => void
  emitScreenEffect?: (type: string, strength: number, duration: number) => void
  createPulse?: (x: number, y: number, radius: number, color: number) => void
  createHazard?: (x: number, y: number, radius: number, duration: number, slowMultiplier: number) => void
}

export interface ChaserDefinition {
  id: string
  name: string
  color: number
  scale: number
  roamSpeed: number
  chaseSpeed: number
  detectionRadius: number
  broadRadius: number
  abilityCooldown: number
}

export interface ChaserInstance {
  sprite: Phaser.Physics.Arcade.Sprite
  definition: ChaserDefinition
  state: ChaserState
  knowledge: KnowledgeMode
  wanderTarget: Phaser.Math.Vector2
  wanderTimer: number
  abilityTimer: number
  abilityTelegraphTimer: number
  abilityCooldownOverride?: number
  searchTarget: Phaser.Math.Vector2 | null
  lastSeenAt: number
}
