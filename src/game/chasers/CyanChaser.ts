import { BaseChaser } from './BaseChaser'
import type { ChaserContext, ChaserInstance } from './types'

export class CyanChaser extends BaseChaser {
  constructor() {
    super({
      id: 'cyan', name: 'Cyan · Siren', color: 0x39a8ff, scale: 1.0,
      roamSpeed: 82, chaseSpeed: 160, detectionRadius: 430, broadRadius: 520, abilityCooldown: 7000,
    })
  }

  update(instance: ChaserInstance, context: ChaserContext) {
    instance.abilityTimer -= context.delta
    if (instance.abilityTimer <= 0 && instance.knowledge !== 'none') {
      instance.abilityTimer = this.definition.abilityCooldown
      context.emitScreenEffect?.('siren', 0.12, 900)
      context.alertAll(instance.sprite)
    }
  }
}
