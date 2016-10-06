import CharacterFSM from './CharacterFSM';
import { buildState } from './states';
import { ACTIONS } from '../rules/RuleBook';
/*
* Represents a Player, queues actions for later dispatch.
* Extending CharacterFSM just to provide automatic action.
* eg. to auto attack when hit and idle.
* */
export class PlayerFSM extends CharacterFSM {
  constructor(eventEmitter, character, transitions = {} ) {
    super(eventEmitter, character, transitions);
    this.setState(buildState(ACTIONS.SPAWN, { owner: character.id }), new Date().getTime());
    this.states = [];
  }

  newAction = (action) => {
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

    this.setState(this.states.shift(), timestamp);
    return true;
  }

}

export default PlayerFSM;
