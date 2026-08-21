import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class CyanChaser extends BaseChaser {
  constructor() {
    super({
      id: 'cyan', name: 'Cyan · Siren', color: 0x39a8ff, scale: 1.0,
      roamSpeed: 116, chaseSpeed: 160, detectionRadius: 430, broadRadius: 520, abilityCooldown: 7000, hasDash: true,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    // All specialists now use the same robust, road-constrained dash.
    instance.abilityTimer = Math.max(0, instance.abilityTimer - context.delta)
  }
}