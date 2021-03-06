import uuid from 'uuid';
import FSMFactory from './FSM';
import buildState from './FSM/states';
import { TRANSITIONS } from './FSM/transitions.js';
import ActionApplier from './ActionApplier';
import { ACTIONS } from './rules/BaseRuleBook';
import Character from './rules/Character';
import Shot from './rules/Shot';

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
    emitter.on('characterUpdate', (event) => {// this is weird.
      if (event.result === 'shoot') {
        this.addCharacter(event, 'shot')
      }
    });
  }

  addCharacter( characterData, role, transitions) {
    let character;
    let fsm;
    if (role === 'shot') { // this is one big ugly hack, we need a better factory.
      characterData.id = uuid.v4();
      character = new Shot(characterData);
      transitions = [TRANSITIONS.attackOnCollisionOrDie, TRANSITIONS.dieAfterAttack];
      fsm = this.fsmFactory.build(character, role, transitions);
      const initialState = buildState('infiniteWalk', { ...fsm.state });
      fsm.setState(initialState, new Date().getTime());
    } else {
      character = new Character(characterData);
      fsm = this.fsmFactory.build(character, role, transitions);//if role nnpc we build without reason.
      fsm.state.origin = characterData.origin;
    }
    //characters ids are supposed to be unique
    if (role !== 'NNPC') { // nnpc dont even move, they are scenography basically.
      this.fsms.set(characterData.id, fsm);
    }
    this.characters.set(characterData.id, character);
    this.emitter.emit('newCharacter', { // not really used, client listens to characterUpdate spwan.
      character: characterData.id,
      characterType: role,
      type: 'newCharacter',
    });
  }

  removeCharacter = (id) => {
    if (!this.characters.has(id)) {
      return;
    }
    this.fsms.get(id).removeListeners();
    this.fsms.delete(id);
    this.characters.delete(id);
    this.emitter.emit('rmCharacter', {
      character: id,
      type: 'rmCharacter',
    });
  };

  handlePlayerAction(action) {
    // precondition: action.character is a player
    if (this.fsms.has(action.character)) {
      this.fsms.get(action.character).newAction(action);
    }
  };

  tick(timestamp) {
    //TODO sort actions somehow, clients might be applying them in other order with potentially other results
    this._preTick();
    const newStates = new Set();
    for (const fsm of this.fsms.values()) {
      if (fsm.tick(timestamp)) {
        newStates.add(fsm.state);
      }
    }
    for (const state of newStates) {
      state.start = timestamp;
      this.applier.handleNewState(state);
    }
    this._postTick();
  }
  _preTick() {}
  _postTick() {}
}

export default AbstractGameEngine;
