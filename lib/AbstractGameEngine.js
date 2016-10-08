import FSMFactory from './FSM';
import ActionApplier from './ActionApplier';
import Character from './rules/Character';

/*
 * Contains the characters and their fsms, the map, the rules, and listen for next ticks from the game loop.
 * Maybe too much responsibilities.
 * */

export class AbstractGameEngine {
  constructor(map, emitter, SomeRuleBook) {
    this.emitter = emitter;
    this.characters = new Map();
    this.map = map;
    this.fsms = new Map();
    this.applier = new ActionApplier(map, emitter, SomeRuleBook, this.characters);
    this.fsmFactory = new FSMFactory(emitter);
  }

  addCharacter( characterData, type, transitions) {
    const character = new Character(characterData);
    const fsm = this.fsmFactory.build(character, type, transitions);
    //characters ids are supposed to be unique
    if (type !== 'NNPC') { // nnpc dont even move, they are scenography basically.
      this.fsms.set(characterData.id, fsm);
    }
    this.characters.set(characterData.id, character);
    this.emitter.emit('newCharacter', { // not really used, client listens to characterUpdate spwan.
      character: characterData.id,
      characterType: type,
      type: 'newCharacter',
    });
  }

  removeCharacter = (id) => {
    if (!this.characters.has(id)) {
      return;
    }
    this.fsms.delete(id);
    this.characters.delete(id);
    this.emitter.emit('rmCharacter', {
      characterId: id,
      type: 'rmCharacter',
    });
  };

  handlePlayerAction = (action) => {
    // precondition: action.character is a player
    if (this.fsms.has(action.character)) {
      this.fsms.get(action.character).newAction(action);
    }
  };

  tick(timestamp) {
    //TODO sort actions somehow, clients might be applying them in other order with potentially other results
    this._preTick();
    const newStates = new Set();
    for (let fsm of this.fsms.values()) {
      if (fsm.tick(timestamp)) {
        newStates.add(fsm.state);
      }
    }
    for (let state of newStates) {
      state.start = timestamp;
      this.applier.handleNewState(state);
    }
    this._postTick();
  }
  
  _preTick() {}
  _postTick() {}
}

export default AbstractGameEngine;
