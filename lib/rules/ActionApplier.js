import * as rules from './rules';
import ACTIONS from './actions';

/*
 * Listen for character state changes, applies the rules to update the characters, and emit an actionUpdate.
 * */

//TODO should update state for action duration
export class ActionApplier {
  constructor(eventEmitter, characters) {
    this.emiter = eventEmitter;
    this.characters = characters;
    this.emiter.on('newState', this.handleNewState);
  }

  handleNewState = (state) => {
    let updates;
    switch (state.action) {
      case ACTIONS.BASIC_ATTACK:
        updates = rules.attack(this.characters[state.owner],this.characters[state.target]);
        break;
      case ACTIONS.WALKING:
        updates = rules.walk(this.characters[state.owner],state.direction);
        break;
    }
    if (updates) {
      this.applyUpdates(updates);
    }
  }

  // I feel like this belongs on some other component, but ....
  // I fear that we will be overloading the emitter if each character listens to this.
  applyUpdates = (updates) => {
    updates.forEach((update) => {
      switch (update.result) {
        case 'damaged':
          this.characters[update.character].health = update.remainingHealth;
          break;
        case 'walk':
          this.characters[update.character].position = update.position;
      }
      this.emiter.emit('characterUpdate', update);
    });
  }
};

export default ActionApplier;