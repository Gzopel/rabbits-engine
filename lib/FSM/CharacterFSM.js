import { buildState, STATES }from './states';

export const IDLE = 'IDLE';

export class CharacterFSM {
  constructor(eventEmitter, character = {}, transitions = {}) {
    this.character = character;
    this.emitter = eventEmitter;
    this.state = buildState(STATES.IDLE);
    this.nextState = null;
    this.transitions = transitions;
    Object.keys(this.transitions).forEach((event) => {
      eventEmitter.on(event, this.handleEvent);
    });
  }

  handleEvent = (eventData) => {
    if (!this.transitions[eventData.event] || !this.transitions[eventData.event][this.state.action]) {
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
      const newState = this.state.next(this); // this comes with a start date,
                                              // maybe pass the timestamp to have unified start dates?
      if (newState.id === this.state.id) {
        return false;
      } else {
        this.state = newState;
      }
    }
    this.emit(this.state);
    return true;
  }

  stateFinished(t) {
    return this.state.duration + this.state.start < t;
  }

  emit(action) {
    this.emitter.emit('action', action);
  }
}

export default CharacterFSM;
