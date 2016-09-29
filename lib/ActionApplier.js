import { ACTIONS, RuleBook } from './rules/rules';

/*
 * Listen for character state changes, applies the rules to update the characters, and emit an actionUpdate.
 * */

//TODO should update state for action duration
export class ActionApplier {
  constructor(eventEmitter, characters) {
    this.emiter = eventEmitter;
    this.characters = characters;
    this.ruleBook  = new RuleBook(characters);
    this.emiter.on('newState', this.handleNewState);
  }

  handleNewState = (state) => {
    const updates = this.ruleBook.execute(state);
    // I feel like this belongs on some other component, but ....
    // I fear that we will be overloading the emitter if each character listens to this.
    updates.forEach((update) => {
      update.type = 'characterUpdate'; /// mhm....
      switch (update.result) {
        case 'damaged':
          this.characters[update.character].health = update.remainingHealth;
          break;
        case 'collision':
        case 'walk':
          this.characters[update.character].position = update.position;
      }
      this.emiter.emit('characterUpdate', update);
    });
  }
};

export default ActionApplier;
