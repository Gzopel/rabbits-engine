import { buildState, STATES }from './states';

export const IDLE = 'IDLE';

export class CharacterFSM {
  constructor(character, eventEmitter, transitions) {
    this.character = character;
    this.emitter = eventEmitter;
    this.state = buildState(STATES.IDLE);
    this.nextState = null;
    this.transitions = transitions;
    console.log("CONSTRUCTOR",arguments)
    Object.keys(this.transitions).forEach((event) => {
      console.log("registering",this.handleEvent, 'for ', event);
      eventEmitter.on(event, this.handleEvent);
    });
  }

  handleEvent(eventData) {
    console.log("EVENT",arguments);
    if (!this.transitions[eventData.event] || !this.transitions[eventData.event][this.state.action]) {
      return;
    }
    this.nextState = this.transitions[eventData.event][this.state.action](this, eventData);
  }

  tick(timestamp) {
    console.log("ONTICK")
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

  emit(action) {
    this.emitter.emit('action', action);
  }
}

export default CharacterFSM;
