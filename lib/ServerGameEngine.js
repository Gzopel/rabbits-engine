import RuleBook from './rules/RuleBook';
import AbstractGameEngine from './AbstractGameEngine';
/*
* Extends the game engine with the full rulebook and adds some logic needed for the server. eg getSnapshot;
* */

export class GameEngine extends AbstractGameEngine {
  constructor(map, emitter) {
    super(map, emitter, RuleBook);
    emitter.on('characterUpdate', (event) => {
      // Maybe is better to have a special event for this
      // or even better, another place to deal with this logic. Smells like refactor.
      if (event.result === 'warp' || event.remainingHealth <= 0) {
        this.removeCharacter(event.character);
      }
    });
  }

  getSnapshot() {
    // TODO: This should take a character as an argument
    // and return only characters and map elements in its surroundings.
    const snapshot = {};
    snapshot.map = { ...this.map };
    delete snapshot.map.characters;

    snapshot.characters = {};
    for (let character of this.characters.values()) {
      snapshot.characters[character.id]={
        id: character.id,
        position: character.position,
        sheet: character.sheet,
      }
    }
    for (let fsm of this.fsms.values()) {
      const state = { ...fsm.state };
      delete state.next;
      snapshot.characters[fsm.character.id].state = state;
    }
    return snapshot;
  }
}

export default GameEngine;
