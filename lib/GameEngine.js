import FSMFactory from './FSM';
import ActionApplier from './ActionApplier';
import Character from './rules/Character';

/*
* Contains the characters and their fsms, the map, the rules, and listen for next ticks from the game loop.
* Maybe too much responsibilities.
* This suites the server fine but needs some tweaking for the client.
* Consider splitting the logic in an abstract engine and two concretes (server and client),
* maybe creating different action appliers...
* */

export class GameEngine {
  constructor(map, emitter) {
    this.emitter = emitter;
    this.characters = new Map();
    this.fsms = new Map();
    this.applier = new ActionApplier(map, emitter, this.characters);
    this.fsmFactory = new FSMFactory(emitter);
    emitter.on('characterUpdate', (event) => {
      // Maybe is better to have a special event for this
      if (event.remainingHealth <= 0) {
        this.removeCharacter(event.character);
      }
    });
  }

  addCharacter( characterData, type, transitions) {
    const character = new Character(characterData);
    const fsm = this.fsmFactory.build(character, type, transitions);
    //characters ids are supposed to be unique
    if (type !== 'NNPC') { // nnpc dont even move, they are scenography basically.
      this.fsms.set(characterData.id, fsm);
    }
    this.characters.set(characterData.id, character);
    this.emitter.emit('newCharacter', {
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
  }

  tick = (timestamp) => {
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
  }
}

export default GameEngine;
