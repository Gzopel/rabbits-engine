import 'babel-polyfill';
import { buildState } from './states';
import { ACTIONS } from '../rules/BaseRuleBook';

/*
* A finite state machine representing any character, its behaviour is defined by the
* transitions look up table.
* */
// TODO as an enhancement we could consider subcribing/desubscribing when changing states,
// to listen just for the relevant updates.

export class CharacterFSM {
  constructor(eventEmitter, character = {}, transitions = {}) {
    this.character = character;
    this.emitter = eventEmitter;
    this.setState(buildState(ACTIONS.IDLE, { owner: character.id }), new Date().getTime()); // mhm
    this.nextState = null;
    this.transitions = transitions;
    this.listen();
  }

  listen() {
    const events = Object.keys(this.transitions);

    if (events.includes('*')) {
      this.emitter.onAny(this.handleEvent);
    } else {
      events.forEach((event) => {
        this.emitter.on(event, this.handleEvent);
      });
    }
  }

  removeListeners() {
    const events = Object.keys(this.transitions);
    if (events.includes('*')) {
      this.emitter.offAny(this.handleEvent);
    } else {
      events.forEach((event) => {
        this.emitter.removeListener(event, this.handleEvent);
      });
    }
  }

  handleEvent = (event, value) => {
    if (value) {
      event = value; //if wildcard match
    }
    if (!(this.transitions['*'] && (this.transitions['*'][this.state.action] || this.transitions['*']['*'])) &&
      !(this.transitions[event.type] && (this.transitions[event.type]['*'] || this.transitions[event.type][this.state.action]))) {
      return;
    }
    const eventTransitions = this.transitions[event.type] ?
      this.transitions[event.type] :
      this.transitions['*'];
    const transitions = eventTransitions[this.state.action] ?
      eventTransitions[this.state.action] :
      eventTransitions['*'];
    let next = null;
    let i = 0;  // just keeping the first result, maybe in a future some transitions will have priority over others
    while (next === null && i < transitions.length) {
      next = transitions[i++](this, event);
    }
    if (next) {
      this.nextState = next;
    }
  };

  tick(timestamp) {
    if (!this.stateFinished(timestamp)) {
      return false;
    }
    let newState = null;
    if (this.nextState) {
      newState = this.nextState;
      this.nextState = null;
    } else {
      newState = this.state.next(this);
      if (newState.id === this.state.id) {
        return false;
      }
    }
    this.setState(newState, timestamp);
    this.emit(this.state);
    return true;
  }

  setState(state, timestamp) {
    this.state = state;
    this.state.start = timestamp;
  }

  stateFinished(t) {
    // if (!this.state.start) // not even started
    //  return false;        // not always setting start.
    return ((this.state.duration || 0) + (this.state.start||0)) <= t;
  }

  emit(state) {
    // this.emitter.emit('stateChange', state); keeping it synchronous for now
  }
}

export default CharacterFSM;
