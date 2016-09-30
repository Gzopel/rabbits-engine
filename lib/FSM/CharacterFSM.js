import { buildState } from './states';
import { ACTIONS } from '../rules/rules';

/*
* A finite state machine representing any character, its behaviour is defined by the
* transitions look up table.
* */
// TODO as an enhancement we could consider subcribing/desubscribing when changing states,
// to listen just for the relevant updates.
// TODO: states should have an owner (character id), but who sets it?
export class CharacterFSM {
  constructor(eventEmitter, character = {}, transitions = {}) {
    this.character = character;
    this.emitter = eventEmitter;
    this.state = buildState(ACTIONS.IDLE);
    this.state.owner = character.id; // mhm
    this.nextState = null;
    this.transitions = transitions;
    const events = Object.keys(this.transitions);
    if (events.includes('*')) {
      eventEmitter.onAny(this.handleAnyEvent);
    } else {
      events.forEach((event) => {
        eventEmitter.on(event, this.handleEvent);
      });
    }
  }

  handleEvent = (event) => {
    if (!(this.transitions['*'] && (this.transitions['*'][this.state.action] || this.transitions['*']['*'])) &&
      !(this.transitions[event.type] && (this.transitions[event.type]['*'] || this.transitions[event.type][this.state.action]))) {
      return;
    }
    const transition = this.transitions[event.type] ? this.transitions[event.type] : this.transitions['*'];
    const next = transition[this.state.action] ?
      transition[this.state.action](this, event) :
      transition['*'](this, event);
    if (next) {
      this.nextState = next;
    }
  }

  handleAnyEvent = (event,value) => {
    if (!(this.transitions['*'] && (this.transitions['*'][this.state.action] || this.transitions['*']['*'])) &&
      !(this.transitions[value.type] && (this.transitions[value.type]['*'] || this.transitions[value.type][this.state.action]))) {
      return;
    }
    const transition = this.transitions[value.type] ? this.transitions[value.type] : this.transitions['*'];
    const next = transition[this.state.action] ?
      transition[this.state.action](this, value) :
      transition['*'](this, value);
    if (next) {
      this.nextState = next;
    }
  }

  tick(timestamp) {
    if (!this.stateFinished(timestamp)) {
      return false;
    }
    if (this.nextState) {
      this.state = this.nextState;
      this.state.start = timestamp;
      this.nextState = null;
    } else {
      const newState = this.state.next(this);
      // this comes with a start date,
      // maybe pass the timestamp to have unified start dates?
      if (newState.id === this.state.id) {
        return false;
      }
      this.state = newState;
    }
    this.emit(this.state);
    return true;
  }

  stateFinished(t) {
    return ((this.state.duration || 0) + this.state.start) <= t;
  }

  emit(state) {
    // this.emitter.emit('stateChange', state); keeping it synchronous for now
  }
}

export default CharacterFSM;
