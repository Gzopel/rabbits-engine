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
    this.nextState = null;
    this.transitions = transitions;
    Object.keys(this.transitions).forEach((event) => {
      eventEmitter.on(event, this.handleEvent);
    });
  }

  handleEvent = (eventData) => {
    if (!this.transitions[eventData.event] ||
      !this.transitions[eventData.event][this.state.action]) {
      return;
    }
    this.nextState = this.transitions[eventData.event][this.state.action](this, eventData);
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
    return this.state.duration + this.state.start < t;
  }

  emit(state) {
    this.emitter.emit('stateChange', state);
  }
}

export default CharacterFSM;
