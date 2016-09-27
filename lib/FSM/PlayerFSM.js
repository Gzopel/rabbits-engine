import CharacterFSM from './CharacterFSM';
/*
* Extending CharacterFSM just to provide automatic action, also both start as IDLE.
* Anyway new requirements might force us to break this relationship.
* eg. to auto attack when hit and idle.
* */
export class PlayerFSM extends CharacterFSM {
  constructor(character,eventEmitter, transitions) {
    super(character, eventEmitter, transitions);
    this.states = [];
  }

  newAction(action) {
    this.states.push(action);
  }

  tick(timestamp) {
    if (!this.stateFinished(timestamp)) {
      console.log("didnt finish")
      return false;
    }

    // TODO: ignoring super.nextState, possible refactor incoming.
    if (!this.states.length) {
      return super.tick(timestamp);
    }

    this.state = this.states.shift();
    this.state.start = timestamp;
  //super.emit(this.state);
    return true;
  }

}