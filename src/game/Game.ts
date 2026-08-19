import Phaser from 'phaser'
import { OpeningScene } from './scenes/OpeningScene'
import { CityMapScene } from './scenes/CityMapScene'

export function createGame(parent: string | HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#05070c',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    render: {
      antialias: true,
    },
    scene: [OpeningScene, CityMapScene],
  })
}
