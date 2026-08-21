import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class AmberChaser extends BaseChaser {
  constructor() {
    super({
      id: 'amber', name: 'Amber · Dash', color: 0xdb8a3d, scale: 1.0,
      roamSpeed: 112, chaseSpeed: 166, detectionRadius: 490, broadRadius: 480, abilityCooldown: 2800, hasDash: true,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    // All specialists now use the same robust, road-constrained dash.
    instance.abilityTimer = Math.max(0, instance.abilityTimer - context.delta)
  }
}