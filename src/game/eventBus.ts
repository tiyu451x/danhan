import Phaser from 'phaser'

/**
 * One shared emitter used to cross the React <-> Phaser boundary.
 *
 * Scenes emit on this when something the DOM overlay cares about happens
 * (which scene is active, the player's current location, etc). GameStage.tsx
 * subscribes and mirrors it into React state. Keep payloads small/serializable.
 */
export const eventBus = new Phaser.Events.EventEmitter()

export type StageKey = 'cutscene' | 'chase-intro' | 'overworld'

export interface StageChangeEvent {
  stage: StageKey
}
