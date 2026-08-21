import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class MagentaChaser extends BaseChaser {
  constructor() {
    super({
      id: 'magenta', name: 'Magenta · Blocker', color: 0xff55b8, scale: 1.3,
      roamSpeed: 58, chaseSpeed: 150, detectionRadius: 520, broadRadius: 580, abilityCooldown: 7600,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    if (instance.abilityTimer <= 0 && instance.knowledge === 'broad' && context.broadLocation) {
      instance.abilityTimer = this.definition.abilityCooldown
      const road = context.getRoadPointNear(context.broadLocation.x, context.broadLocation.y)
      context.createHazard?.(road.x, road.y, 110, 2800, 0.66)
    }
  }
}
