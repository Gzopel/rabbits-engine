import { buildState, STATES }from './states';

export const IDLE = 'IDLE';

export class CharacterFSM {
  constructor(character, eventEmitter, transitions) {
    this.character = character;
    this.emitter = eventEmitter;
    this.state = buildState(STATES.IDLE);
    this.nextState = null;
    Object.keys(transitions).forEach((event) => {
      eventEmitter.on(event, (eventData) => {
        if (!transitions[event] || !transitions[event][this.state.action]) {
          return;
        }
        this.nextState = transitions[event][this.state.action](this, eventData);
      });
    });
  }

  tick(timestamp) {
    if (this.state.duration + this.state.start < timestamp) {
      return false;
    }

    const newState = this.nextState || this.state.next(this);
    this.nextState = null;


    if (newState.id === this.state.id) {
      return false;
    }

    this.state = newState;
    this.emit(newState);
    return true;
  }

  emit(action) { // be async, don't want to mess up states during the game loop
    if (process) { // if node
      process.nextTick(() =>  { this.emitter.emit('action', action) });
    } else { // if browser
      setTimeout(() => { this.emitter.emit('action', action); }, 1);
    }
  }
}

export default CharacterFSM;
