import { ACTIONS, RuleBook } from './rules/rules';

/*
 * On character state changes, applies the rules to update the characters, and emit an actionUpdate.
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
    updates.forEach((update) => {
      update.type = 'characterUpdate'; // mhm....
      update.timestamp = state.start;
      switch (update.result) {
        case 'damaged':
          this.characters.get(update.character).health = update.remainingHealth;
          break;
        case 'collision':
        case 'walk':
          this.characters.get(update.character).position = update.position;
      }
      this.emiter.emit('characterUpdate', update);
    });
  }
};

export default ActionApplier;
