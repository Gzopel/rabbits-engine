import { PlayerFSM } from './PlayerFSM';
import { CharacterFSM } from './CharacterFSM';

export class FSMFactory {
  constructor(emitter) {
    this.emitter = emitter;
  }
  
  build = (character, type) => {
    switch (type) {
      case 'player':
        return new PlayerFSM(this.emitter, character);
        break;
      default:
        return CharacterFSM(this.emitter, character);
    }
  }
};

export default FSMFactory;
