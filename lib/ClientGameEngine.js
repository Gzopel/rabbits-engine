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

  _preLoop() {
    // This approach is rudimentary to say the least, not taking into account timestamps nor network status.
    while (this.updates.length) {
      const update = this.updates.shift();
      this.applier.handleUpdate(update);
    }
  }
  
}

export default ClientGameEngine;
