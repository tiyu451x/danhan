import Phaser from 'phaser'
import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class GoldChaser extends BaseChaser {
  constructor() {
    super({
      id: 'gold', name: 'Gold · Interceptor', color: 0xf0c45c, scale: 1.15,
      roamSpeed: 110, chaseSpeed: 172, detectionRadius: 460, broadRadius: 560, abilityCooldown: 4200, hasDash: true,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    if (instance.knowledge !== 'broad' || instance.abilityTimer > 0 || !context.broadLocation) return
    instance.abilityTimer = this.definition.abilityCooldown
    const player = context.player
    const body = player.body as Phaser.Physics.Arcade.Body
    const vx = body.velocity.x
    const vy = body.velocity.y
    const prediction = 380
    instance.searchTarget = context.getRoadPointNear(context.broadLocation.x + vx * (prediction / 1000), context.broadLocation.y + vy * (prediction / 1000))
    instance.state = 'search'
  }
}
