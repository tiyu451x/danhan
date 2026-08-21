import Phaser from 'phaser'
import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class CrimsonChaser extends BaseChaser {
  constructor() {
    super({
      id: 'crimson', name: 'Crimson · Dread', color: 0xff3b5c, scale: 1.05,
      roamSpeed: 108, chaseSpeed: 178, detectionRadius: 500, broadRadius: 500, abilityCooldown: 3600,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    if (instance.knowledge === 'exact' && instance.abilityTimer <= 0 && context.hasLineOfSight(instance.sprite.x, instance.sprite.y, context.player.x, context.player.y)) {
      instance.abilityTimer = this.definition.abilityCooldown
      context.emitScreenEffect?.('dread', 0.26, 1000)
    }
  }
}
