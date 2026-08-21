import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class VioletChaser extends BaseChaser {
  constructor() {
    super({
      id: 'violet', name: 'Violet · Seeker', color: 0x8a5cff, scale: 1.25,
      roamSpeed: 106, chaseSpeed: 162, detectionRadius: 540, broadRadius: 620, abilityCooldown: 5200, hasDash: true,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    // All specialists now use the same robust, road-constrained dash.
    instance.abilityTimer = Math.max(0, instance.abilityTimer - context.delta)
  }
}