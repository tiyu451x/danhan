import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class TealChaser extends BaseChaser {
  constructor() {
    super({
      id: 'teal', name: 'Teal · Snare', color: 0x34d1c4, scale: 0.95,
      roamSpeed: 84, chaseSpeed: 170, detectionRadius: 470, broadRadius: 500, abilityCooldown: 6000,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    if (instance.knowledge !== 'broad' || instance.abilityTimer > 0 || !context.broadLocation) return
    instance.abilityTimer = this.definition.abilityCooldown
    context.createHazard?.(context.broadLocation.x, context.broadLocation.y, 82, 2200, 0.48)
  }
}
