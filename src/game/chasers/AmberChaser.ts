import Phaser from 'phaser'
import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class AmberChaser extends BaseChaser {
  constructor() {
    super({
      id: 'amber', name: 'Amber · Dash', color: 0xdb8a3d, scale: 1.0,
      roamSpeed: 78, chaseSpeed: 166, detectionRadius: 490, broadRadius: 480, abilityCooldown: 2800,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    if (instance.knowledge !== 'exact' || instance.abilityTimer > 0 || !context.exactLocation) return
    const sprite = instance.sprite
    if (!context.hasLineOfSight(sprite.x, sprite.y, context.player.x, context.player.y)) return

    instance.abilityTimer = this.definition.abilityCooldown
    const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, context.player.x, context.player.y)
    const dashLength = 32 * 5
    context.showAbilityLine?.(sprite, angle, dashLength, this.definition.color)
    const body = sprite.body as Phaser.Physics.Arcade.Body
    body.setVelocity(0, 0)
    context.emitScreenEffect?.('dashWarning', 0.16, 340)
    sprite.setData('dashVelocity', { x: Math.cos(angle) * 650, y: Math.sin(angle) * 650 })
    sprite.setData('dashUntil', context.time + 280)
    body.setVelocity(Math.cos(angle) * 650, Math.sin(angle) * 650)
  }
}
