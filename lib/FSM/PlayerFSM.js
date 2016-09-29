import CharacterFSM from './CharacterFSM';
import { buildState } from './states';
/*
* Represents a Player, queues actions for later dispatch.
* Extending CharacterFSM just to provide automatic action, also both start as IDLE.
* Anyway new requirements might force us to break this relationship.
* eg. to auto attack when hit and idle.
* */
export class PlayerFSM extends CharacterFSM {
  constructor(eventEmitter, character, transitions = {} ) {
    super(eventEmitter, character, transitions);
    this.states = [];
  }

  newAction(action) {
    const state = buildState(action.type, {...action, owner: action.character });
    this.states.push(state);
  }

  tick(timestamp) {
    if (!this.stateFinished(timestamp)) {
      return false;
    }

    // TODO: ignoring super.nextState, possible refactor incoming.
    if (!this.states.length) {
      return super.tick(timestamp);
    }

    this.state = this.states.shift();
    this.state.start = timestamp;
    // super.emit(this.state);
    return true;
  }

}

export default PlayerFSM;
