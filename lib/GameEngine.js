import FSMFactory from './FSM';
import ActionApplier from './ActionApplier';

export class GameEngine {
  constructor(emitter) {
    this.emitter = emitter;
    this.characters = {}; // TODO why not use Map() ?? ? ?
    this.fsms= {}; // TODO why not use Map() ?? ? ?
    this.applier = new ActionApplier(emitter, this.characters);
    this.fsmFactory = new FSMFactory(emitter);
  }
  addCharacter = (character, type) => {
    //Add character to pool in an async way, we dont really care if it appears on this or the next tick
    const fsm = this.fsmFactory.build(character, type);
    //characters ids are supposed to be unique
    this.fsms[character.id] = fsm;
    this.characters[character.id] = character;
    this.emitter.emit('newCharacter',{
      character:character,
      type:type
    })
  }

  handlePlayerAction = (action) => {
    // precondition: action.character is a player
    this.fsms[action.character].newAction(action);
  }

  tick = (timestamp) => {
    const newStates = [];
    Object.keys(this.fsms).forEach((key) => {
      const character = this.fsms[key];
      if (character.tick(timestamp)) {
        newStates.push(character.state);
      }
    })
    newStates.forEach((state) => {
      this.applier.handleNewState(state);
    });
  };
};

export default GameEngine;
