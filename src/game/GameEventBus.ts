export type GameEventMap = {
  phaseChanged: (phase: string) => void
  closeGame: () => void
}

export class GameEventBus {
  private listeners = new Map<keyof GameEventMap, Set<(...args: any[]) => void>>()

  on<K extends keyof GameEventMap>(event: K, listener: GameEventMap[K]) {
    const bucket = this.listeners.get(event) ?? new Set()
    bucket.add(listener as (...args: any[]) => void)
    this.listeners.set(event, bucket)
    return () => this.off(event, listener)
  }

  off<K extends keyof GameEventMap>(event: K, listener: GameEventMap[K]) {
    this.listeners.get(event)?.delete(listener as (...args: any[]) => void)
  }

  emit<K extends keyof GameEventMap>(event: K, ...args: Parameters<GameEventMap[K]>) {
    this.listeners.get(event)?.forEach((listener) => listener(...args))
  }
}

export const gameEventBus = new GameEventBus()
