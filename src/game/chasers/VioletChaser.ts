import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class VioletChaser extends BaseChaser {
  constructor() {
    super({
      id: 'violet', name: 'Violet · Seeker', color: 0x8a5cff, scale: 1.25,
      roamSpeed: 106, chaseSpeed: 162, detectionRadius: 540, broadRadius: 620, abilityCooldown: 5200,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    const lastDread = (instance.sprite.getData('lastDread') as number | undefined) ?? 0
    if (instance.knowledge === 'exact' && context.time >= lastDread && context.hasLineOfSight(instance.sprite.x, instance.sprite.y, context.player.x, context.player.y)) {
      // Violet is the second visual-dread chaser; the short refresh keeps it tied to sight.
      context.emitScreenEffect?.('dread', 0.2, 500)
      instance.sprite.setData('lastDread', context.time + 420)
    }
    if (instance.knowledge !== 'broad' || instance.abilityTimer > 0 || !context.broadLocation) return
    instance.abilityTimer = this.definition.abilityCooldown
    context.createPulse?.(context.broadLocation.x, context.broadLocation.y, 300, this.definition.color)
    instance.searchTarget = context.getRoadPointNear(context.broadLocation.x, context.broadLocation.y)
    instance.state = 'search'
  }
}
