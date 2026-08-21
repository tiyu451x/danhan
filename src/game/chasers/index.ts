import { AmberChaser } from './AmberChaser'
import { CrimsonChaser } from './CrimsonChaser'
import { CyanChaser } from './CyanChaser'
import { GoldChaser } from './GoldChaser'
import { MagentaChaser } from './MagentaChaser'
import { TealChaser } from './TealChaser'
import { VioletChaser } from './VioletChaser'
import type { BaseChaser } from './BaseChaser'

export const CHASER_TYPES: BaseChaser[] = [
  new CrimsonChaser(),
  new AmberChaser(),
  new VioletChaser(),
  new TealChaser(),
  new GoldChaser(),
  new CyanChaser(),
  new MagentaChaser(),
]

export { BaseChaser }
export type { ChaserContext, ChaserDefinition, ChaserInstance, ChaserState, KnowledgeMode } from './types'
