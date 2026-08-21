import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class CrimsonChaser extends BaseChaser {
  constructor() {
    super({
      id: 'crimson', name: 'Crimson · Dread', color: 0xff3b5c, scale: 1.05,
      roamSpeed: 108, chaseSpeed: 178, detectionRadius: 500, broadRadius: 500, abilityCooldown: 3600, hasDash: true,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    // All specialists now use the same robust, road-constrained dash.
    instance.abilityTimer = Math.max(0, instance.abilityTimer - context.delta)
  }
}