import { RuleBook } from './rules/RuleBook';
/*
 * On character state changes, applies the rules to update the characters, and emit an actionUpdate.
 * */
// TODO safe check if character exists
export class ActionApplier {
  constructor(map, eventEmitter, characters) {
    this.emiter = eventEmitter;
    this.characters = characters;
    this.ruleBook  = new RuleBook(map, characters);
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
          // if health <= 0 death! how to handle this? mhmmm...
          break;
        case 'collision':
        case 'walk':
          this.characters.get(update.character).position = update.position;
          break;
      }
      //TODO this doesnt work on the browser
      process.nextTick(() => {
        this.emiter.emit('characterUpdate', update);
      })
    });
  }
};

export default ActionApplier;
