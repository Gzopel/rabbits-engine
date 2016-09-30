import { PlayerFSM } from './PlayerFSM';
import { CharacterFSM } from './CharacterFSM';

export class FSMFactory {
  constructor(emitter) {
    this.emitter = emitter;
  }
  
  build = (character, type, transitions) => {
    switch (type) {
      case 'player':
        return new PlayerFSM(this.emitter, character, transitions);
        break;
      default:
        return new CharacterFSM(this.emitter, character, transitions);
    }
  }
};

export default FSMFactory;
