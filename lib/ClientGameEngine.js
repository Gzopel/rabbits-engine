import BaseRuleBook from './rules/BaseRuleBook';
import AbstractGameEngine from './AbstractGameEngine';
/*
 * Extends the game engine with the base rulebook and adds some logic needed for the server. eg characterUpdates;
 * */

export class ClientGameEngine extends AbstractGameEngine {
  constructor(map, emitter) {
    super(map, emitter, BaseRuleBook);
    this.updates = [];
  }
  
  onCharacterUpdate(update) {
    this.updates.push(update);
  }

  _preTick() {
    // This approach is rudimentary to say the least, not taking into account timestamps nor network status.
    while (this.updates.length) {
      const update = this.updates.shift();
      if (update.result === 'spawn') {
        this.addCharacter({
          sheet: update.sheet,
          id:update.character,
          position:update}, update.characterType || 'player', update.transitions);
      }
      this.applier.handleUpdate(update);
    }
  }
  
}

export default ClientGameEngine;
