import { PlayerFSM } from './PlayerFSM';
import { CharacterFSM } from './CharacterFSM';
import { buildTransitionTable, TRANSITIONS} from './transitions.js';

export class FSMFactory {
  constructor(emitter) {
    this.emitter = emitter;
  }
  
  build = (character, type, transitions) => {
    transitions = transitions || buildTransitionTable([TRANSITIONS.idleAfterCollision, TRANSITIONS.idleAfterSpawn,
        TRANSITIONS.resumeAttackAfterCollision]);
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
