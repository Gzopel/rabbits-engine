import FSMFactory from './FSM';
import ActionApplier from './ActionApplier';

export class GameEngine {
  constructor(emitter) {
    this.emitter = emitter;
    this.characters = new Map();
    this.fsms = new Map();
    this.applier = new ActionApplier(emitter, this.characters);
    this.fsmFactory = new FSMFactory(emitter);
  }

  addCharacter = (character, type, transitions) => {
    //Add character to pool in an async way, we dont really care if it appears on this or the next tick
    const fsm = this.fsmFactory.build(character, type, transitions);
    //characters ids are supposed to be unique
    if (type !== 'NNPC') { // nnpc dont even move, there are scenography basically.
      this.fsms.set(character.id, fsm);
    }
    this.characters.set(character.id, character);
    this.emitter.emit('newCharacter', {
      character:character,
      characterType:type,
      type: 'newCharacter',
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
