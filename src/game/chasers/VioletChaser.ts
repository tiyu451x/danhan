import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class VioletChaser extends BaseChaser {
  constructor() {
    super({
      id: 'violet', name: 'Violet · Seeker', color: 0x8a5cff, scale: 1.25,
      roamSpeed: 64, chaseSpeed: 162, detectionRadius: 540, broadRadius: 620, abilityCooldown: 5200,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    if (instance.knowledge !== 'broad' || instance.abilityTimer > 0 || !context.broadLocation) return
    instance.abilityTimer = this.definition.abilityCooldown
    context.createPulse?.(context.broadLocation.x, context.broadLocation.y, 300, this.definition.color)
    instance.searchTarget = context.getRoadPointNear(context.broadLocation.x, context.broadLocation.y)
    instance.state = 'search'
  }
}
