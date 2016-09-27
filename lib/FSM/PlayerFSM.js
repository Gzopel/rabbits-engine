import CharacterFSM from 'CharacterFSM';
/*
* Extending CharacterFSM just to provide automatic action,
* eg. to auto attack when hit and idle.
* */
export class PlayerFSM extends CharacterFSM {
  constructor(character, eventEmitter, transitions) {
    super(character, eventEmitter, transitions);
    this.actions = [];
  }

  newAction(action) {
    this.actions.push(action);
  }


}