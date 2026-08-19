export type GameSceneKey = 'OpeningScene' | 'CityMapScene'

export type GamePhase =
  | 'idle'
  | 'credits'
  | 'opening'
  | 'map'

export type MemoryCard = {
  id: string
  title: string
  year: string
  summary: string
}
