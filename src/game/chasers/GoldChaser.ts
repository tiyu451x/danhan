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
    // All specialists now use the same robust, road-constrained dash.
    instance.abilityTimer = Math.max(0, instance.abilityTimer - context.delta)
  }
}