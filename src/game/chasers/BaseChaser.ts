import Phaser from 'phaser'
import type { ChaserContext, ChaserDefinition, ChaserInstance } from './types'

export abstract class BaseChaser {
  readonly definition: ChaserDefinition

  constructor(definition: ChaserDefinition) {
    this.definition = definition
  }

  createInstance(scene: Phaser.Scene, x: number, y: number): ChaserInstance {
    const key = `chaser-${this.definition.id}`
    const sprite = scene.physics.add.sprite(x, y, key)
    sprite.setScale(this.definition.scale)
    sprite.setCollideWorldBounds(true)
    const body = sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(20 * this.definition.scale, 14 * this.definition.scale)
    body.setOffset((24 - 20) * this.definition.scale / 2, 16 * this.definition.scale)
    body.setBounce(0, 0)
    body.setDrag(0, 0)

    return {
      sprite,
      definition: this.definition,
      state: 'roam',
      knowledge: 'none',
      wanderTarget: new Phaser.Math.Vector2(x, y),
      wanderTimer: Phaser.Math.Between(500, 1500),
      abilityTimer: Phaser.Math.Between(500, Math.max(800, this.definition.abilityCooldown)),
      abilityTelegraphTimer: 0,
      searchTarget: null,
      lastSeenAt: 0,
    }
  }

  abstract update(instance: ChaserInstance, context: ChaserContext): void

  protected faceTarget(sprite: Phaser.Physics.Arcade.Sprite, target: Phaser.Math.Vector2) {
    const dx = target.x - sprite.x
    if (Math.abs(dx) > 2) sprite.setFlipX(dx < 0)
  }

  protected moveDirect(sprite: Phaser.Physics.Arcade.Sprite, target: Phaser.Math.Vector2, speed: number) {
    const dir = new Phaser.Math.Vector2(target.x - sprite.x, target.y - sprite.y)
    if (dir.lengthSq() < 4) {
      ;(sprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
      return
    }
    dir.normalize()
    ;(sprite.body as Phaser.Physics.Arcade.Body).setVelocity(dir.x * speed, dir.y * speed)
    this.faceTarget(sprite, target)
  }
}
