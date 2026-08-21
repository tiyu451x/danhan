import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class TealChaser extends BaseChaser {
  constructor() {
    super({
      id: 'teal', name: 'Teal · Snare', color: 0x34d1c4, scale: 0.95,
      roamSpeed: 118, chaseSpeed: 170, detectionRadius: 470, broadRadius: 500, abilityCooldown: 6000, hasDash: true,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    // All specialists now use the same robust, road-constrained dash.
    instance.abilityTimer = Math.max(0, instance.abilityTimer - context.delta)
  }
}