import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class MagentaChaser extends BaseChaser {
  constructor() {
    super({
      id: 'magenta', name: 'Magenta · Blocker', color: 0xff55b8, scale: 1.3,
      roamSpeed: 104, chaseSpeed: 150, detectionRadius: 520, broadRadius: 580, abilityCooldown: 7600, hasDash: true,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    // All specialists now use the same robust, road-constrained dash.
    instance.abilityTimer = Math.max(0, instance.abilityTimer - context.delta)
  }
}