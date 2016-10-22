import { getLogger } from './Logger';
const logger = getLogger('ActionApplier');
/*
 * On character state changes, applies the rules to update the characters, and emit an actionUpdate.
 * */
// TODO safe check if character exists
export class ActionApplier {
  constructor(map, eventEmitter, SomeRuleBook, characters) {
    this.emiter = eventEmitter;
    this.characters = characters;
    this.ruleBook  = new SomeRuleBook(map, characters);
    this.emiter.on('newState', this.handleNewState);
    // not being emitted, we are keeping actions synchronous
    // the only reason it still here is that some test use
    // it and I'm to lazy to change them
  }

  handleNewState = (state) => {
    try {
      const updates = this.ruleBook.execute(state);
      updates.forEach((update) => {
        update.type = 'characterUpdate'; // mhm....
        update.timestamp = state.start;
        this.handleUpdate(update);
      });
    } catch (e) {
      logger.error(`Got error applying action ${e}`)
    }
  }
  
  handleUpdate(update) {
    switch (update.result) {
      case 'die':
      case 'damaged':
        this.characters.get(update.character).health = update.remainingHealth;
        // GameEngine is taking care of removing the dead characters...
        // but still there are other things are triggered by death
        // like, who handles the item drop? and the xp ?
        break;
      case 'spawn':
      case 'collision':
      case 'walk':
        this.characters.get(update.character).orientation = update.orientation;
        this.characters.get(update.character).position = update.position;
        break;
    }
    //this.emiter.emit('characterUpdate', update)
    // We postpone the state transitions, first apply all the actions
    if(process) {// HACK!
      process.nextTick(() => this.emiter.emit('characterUpdate', update));
    } else {
      setTimeout(() => this.emiter.emit('characterUpdate', update),1);
    }
  }
  
};

export default ActionApplier;
