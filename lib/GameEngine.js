import FSMFactory from './FSM';
import ActionApplier from './ActionApplier';

/*
* Contains the characters and their fsms, the map, the rules, and listen for next ticks from the game loop.
* Maybe too much responsibilities.
* This suites the server fine but needs some tweaking for the client.
* Consider spitting the logic in an abstract engine and two concretes (server and client);
* */

export class GameEngine {
  constructor(map, emitter) {
    this.emitter = emitter;
    this.characters = new Map();
    this.fsms = new Map();
    this.applier = new ActionApplier(map, emitter, this.characters);
    this.fsmFactory = new FSMFactory(emitter);
  }

  addCharacter( character, type, transitions) {
    const fsm = this.fsmFactory.build(character, type, transitions);
    //characters ids are supposed to be unique
    if (type !== 'NNPC') { // nnpc dont even move, they are scenography basically.
      this.fsms.set(character.id, fsm);
    }
    this.characters.set(character.id, character);
    this.emitter.emit('newCharacter', {
      character: character,
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
      characterId:id,
      type: 'rmCharacter',
    });
  }

  handlePlayerAction = (action) => {
    // precondition: action.character is a player
    this.fsms.get(action.character).newAction(action);
  }

  tick = (timestamp) => {
    const newStates = new Set();
    for (const character of this.fsms.values()) {
      if (character.tick(timestamp)) {
        newStates.add(character.state);
      }
    }
    
    for (const state of newStates) {
      state.start = timestamp;
      this.applier.handleNewState(state);
    };
  };
};

export default GameEngine;
