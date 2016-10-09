import { PlayerFSM } from './PlayerFSM';
import { CharacterFSM } from './CharacterFSM';
import { buildTransitionTable, TRANSITIONS} from './transitions.js';

export class FSMFactory {
  constructor(emitter) {
    this.emitter = emitter;
  }
  
  build = (character, type, transitions) => {
    transitions = transitions || [TRANSITIONS.idleAfterCollision, TRANSITIONS.idleAfterSpawn,
        TRANSITIONS.resumeAttackAfterCollision, TRANSITIONS.stopAttackingWhenResultIdle];
    const transitionTable = buildTransitionTable(transitions);
    switch (type) {
      case 'player':
        return new PlayerFSM(this.emitter, character, transitionTable);
        break;
      default:
        return new CharacterFSM(this.emitter, character, transitionTable);
    }
  }
};

export default FSMFactory;
